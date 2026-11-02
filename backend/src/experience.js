import { futureMeeting } from './student-updates.js';
import { years } from './student-updates.js';
// @ts-nocheck - Express runtime inputs are validated with strict Zod schemas.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { strongPassword } from './student-validation.js';
import { readDocument, documentMessages } from './document-text.js';
import { z } from 'zod';
import { newSecret, verifyTotp, challengeHash } from './mfa.js';
export function registerExperience({
  app,
  pool,
  requireAuth,
  requireRole,
  issueSession,
  profileSchema,
}) {
  app.get(
    '/api/v1/generation-status',
    requireAuth,
    requireRole('lecturer'),
    async (_req, res) => {
      try {
        const response = await fetch(
          `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/status`,
          {
            headers: {
              'x-ai-service-token': process.env.AI_SERVICE_TOKEN || '',
            },
            signal: AbortSignal.timeout(4000),
          },
        );
        if (!response.ok) throw Error('unavailable');
        res.json(await response.json());
      } catch {
        res.json({
          mode: 'unavailable',
          configured: false,
          message:
            'The question service is unavailable. Start it with npm run dev.',
        });
      }
    },
  );
  app.get(
    '/api/v1/resources/:resourceId/text-preview',
    requireAuth,
    async (req, res, next) => {
      try {
        const result = await pool.query(
          `SELECT r.* FROM resources r JOIN modules m ON m.module_id=r.module_id WHERE r.resource_id=$1 AND (m.lecturer_id=$2 OR (EXISTS(SELECT 1 FROM enrollments e WHERE e.module_id=m.module_id AND e.student_id=$2) AND (r.group_id IS NULL OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=r.group_id AND gm.student_id=$2))))`,
          [req.params.resourceId, req.user.userId],
        );
        if (!result.rowCount)
          return res
            .status(404)
            .json({ error: { message: 'Resource not found.' } });
        const source = await readDocument(result.rows[0]);
        res.json({
          title: result.rows[0].title,
          text: source.text.slice(0, 12000),
          characters: source.characters,
          sha256: source.sha256,
          truncated: source.text.length > 12000,
        });
      } catch (error) {
        if (documentMessages[error.code])
          return res.status(422).json({
            error: {
              code: error.code,
              message: documentMessages[error.code],
            },
          });
        next(error);
      }
    },
  );
  const handle = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof z.ZodError)
        return res
          .status(400)
          .json({ error: { message: e.issues[0].message } });
      next(e);
    }
  };

  const passwordSchema = z
    .object({
      currentPassword: z
        .string()
        .min(1, 'Enter your current password.')
        .max(200),
      newPassword: strongPassword.refine(
        (value) => Buffer.byteLength(value, 'utf8') <= 72,
        'New password must be at most 72 UTF-8 bytes.',
      ),
      confirmNewPassword: z.string().min(1, 'Confirm your new password.'),
    })
    .strict()
    .refine((value) => value.newPassword === value.confirmNewPassword, {
      message: 'New passwords do not match.',
      path: ['confirmNewPassword'],
    });
  app.put(
    '/api/v1/profile/password',
    requireAuth,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: Number(process.env.PASSWORD_CHANGE_LIMIT || 5),
      keyGenerator: (req) => req.user.userId,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          message:
            'Too many password-change attempts. Please wait 15 minutes and try again.',
        },
      },
    }),
    handle(async (req, res) => {
      const d = passwordSchema.parse(req.body);
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        const row = (
          await tx.query(
            'SELECT password_hash FROM users WHERE user_id=$1 FOR UPDATE',
            [req.user.userId],
          )
        ).rows[0];
        if (
          !row ||
          !(await bcrypt.compare(d.currentPassword, row.password_hash))
        ) {
          await tx.query('ROLLBACK');
          return res.status(400).json({
            error: {
              code: 'CURRENT_PASSWORD_INCORRECT',
              message: 'Your current password is incorrect.',
            },
          });
        }
        if (d.currentPassword === d.newPassword) {
          await tx.query('ROLLBACK');
          return res.status(400).json({
            error: {
              code: 'PASSWORD_UNCHANGED',
              message:
                'Choose a new password that is different from your current password.',
            },
          });
        }
        const hash = await bcrypt.hash(d.newPassword, 12);
        await tx.query('UPDATE users SET password_hash=$1 WHERE user_id=$2', [
          hash,
          req.user.userId,
        ]);
        await tx.query(
          'UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND token_hash<>$2 AND revoked_at IS NULL',
          [
            req.user.userId,
            crypto
              .createHash('sha256')
              .update(req.cookies.eduquest_session)
              .digest('hex'),
          ],
        );
        await tx.query('DELETE FROM login_challenges WHERE user_id=$1', [
          req.user.userId,
        ]);
        await tx.query('COMMIT');
        res.json({
          message:
            'Password changed successfully. Other sessions have been signed out.',
        });
      } catch (e) {
        await tx.query('ROLLBACK');
        throw e;
      } finally {
        tx.release();
      }
    }),
  );
  app.put(
    '/api/v1/profile',
    requireAuth,
    handle(async (req, res) => {
      const d = profileSchema.parse(req.body);
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        const r = await tx.query(
          'UPDATE users SET full_name=$1,study_track=$2,study_year=$3 WHERE user_id=$4 RETURNING user_id,full_name,email,role,study_track,study_year,(mfa_secret IS NOT NULL) AS mfa_enabled',
          [d.fullName, d.studyTrack, d.studyYear, req.user.userId],
        );
        if (req.user.role === 'student')
          await tx.query(
            'INSERT INTO enrollments(student_id,module_id) SELECT $1,module_id FROM modules WHERE curriculum=true AND study_track=$2 AND study_year=$3 ON CONFLICT DO NOTHING',
            [req.user.userId, d.studyTrack, d.studyYear],
          );
        await tx.query('COMMIT');
        res.json({ user: r.rows[0] });
      } catch (e) {
        await tx.query('ROLLBACK');
        throw e;
      } finally {
        tx.release();
      }
    }),
  );
  app.post(
    '/api/v1/auth/mfa/verify',
    handle(async (req, res) => {
      const d = z
        .object({
          challenge: z.string().min(20).max(100),
          code: z.string().regex(/^\d{6}$/),
        })
        .strict()
        .parse(req.body);
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        const r = await tx.query(
          'SELECT c.*,u.mfa_secret,u.mfa_last_counter FROM login_challenges c JOIN users u ON u.user_id=c.user_id WHERE challenge_hash=$1 FOR UPDATE OF c,u',
          [challengeHash(d.challenge)],
        );
        const c = r.rows[0];
        if (!c || new Date(c.expires_at) < new Date() || c.attempts >= 5) {
          await tx.query('ROLLBACK');
          return res.status(401).json({
            error: { message: 'Verification expired. Sign in again.' },
          });
        }
        const step = verifyTotp(c.mfa_secret, d.code, c.mfa_last_counter);
        if (step === null) {
          await tx.query(
            'UPDATE login_challenges SET attempts=attempts+1 WHERE challenge_hash=$1',
            [challengeHash(d.challenge)],
          );
          await tx.query('COMMIT');
          return res.status(401).json({
            error: {
              message: 'Incorrect or already used authenticator code.',
            },
          });
        }
        await tx.query(
          'UPDATE users SET mfa_last_counter=$1 WHERE user_id=$2',
          [step, c.user_id],
        );
        await tx.query('DELETE FROM login_challenges WHERE user_id=$1', [
          c.user_id,
        ]);
        await tx.query('COMMIT');
        await issueSession(c.user_id, res);
        const u = await pool.query(
          'SELECT user_id,full_name,email,role,study_track,study_year,(mfa_secret IS NOT NULL) AS mfa_enabled FROM users WHERE user_id=$1',
          [c.user_id],
        );
        res.json({ user: u.rows[0] });
      } catch (e) {
        await tx.query('ROLLBACK');
        throw e;
      } finally {
        tx.release();
      }
    }),
  );
  app.post(
    '/api/v1/auth/mfa/setup',
    requireAuth,
    handle(async (req, res) => {
      const s = newSecret();
      await pool
        .query(
          'UPDATE users SET mfa_pending_secret=$1 WHERE user_id=$2 AND mfa_secret IS NULL',
          [s, req.user.userId],
        )
        .then((r) => {
          if (!r.rowCount) throw new Error('MFA already enabled');
        });
      res.json({
        secret: s,
        uri: `otpauth://totp/EduQuest:${encodeURIComponent(req.user.email)}?secret=${s}&issuer=EduQuest&digits=6&period=30`,
      });
    }),
  );
  app.post(
    '/api/v1/auth/mfa/enable',
    requireAuth,
    handle(async (req, res) => {
      const d = z
        .object({ code: z.string().regex(/^\d{6}$/) })
        .strict()
        .parse(req.body);
      const r = await pool.query(
        'SELECT mfa_pending_secret FROM users WHERE user_id=$1',
        [req.user.userId],
      );
      const s = r.rows[0].mfa_pending_secret;
      const step = s ? verifyTotp(s, d.code) : null;
      if (step === null)
        return res
          .status(400)
          .json({ error: { message: 'Incorrect authenticator code.' } });
      const updated = await pool.query(
        'UPDATE users SET mfa_secret=$1,mfa_pending_secret=NULL,mfa_last_counter=$2 WHERE user_id=$3 AND mfa_secret IS NULL AND mfa_pending_secret=$1',
        [s, step, req.user.userId],
      );
      if (!updated.rowCount)
        return res
          .status(409)
          .json({ error: { message: 'Setup changed. Start again.' } });
      await pool.query(
        'UPDATE sessions SET revoked_at=now() WHERE user_id=$1',
        [req.user.userId],
      );
      await issueSession(req.user.userId, res);
      res.json({ enabled: true });
    }),
  );
  app.get(
    '/api/v1/curriculum',
    requireAuth,
    handle(async (req, res) => {
      const u = (
        await pool.query(
          'SELECT study_track,study_year FROM users WHERE user_id=$1',
          [req.user.userId],
        )
      ).rows[0];
      res.json({
        data: (
          await pool.query(
            'SELECT module_id,module_code,module_name,study_track,study_year,curriculum_catalog,curriculum_position FROM modules WHERE curriculum=true AND study_track=$1 ORDER BY study_year,curriculum_position,module_code',
            [u.study_track],
          )
        ).rows,
        currentYear: u.study_year,
      });
    }),
  );
  app.post(
    '/api/v1/curriculum',
    requireAuth,
    requireRole('lecturer'),
    handle(async (req, res) => {
      const d = z
        .object({
          moduleCode: z.string().trim().max(30).optional(),
          moduleName: z.string().trim().min(1).max(120),
          studyTrack: z.enum(['IT', 'Business']),
          studyYear: z.number().int().min(1).max(4),
        })
        .strict()
        .parse(req.body);
      if (!years[d.studyYear]?.some(name=>name.toLowerCase()===d.moduleName.toLowerCase())) return res.status(400).json({error:{message:'Choose a module name for the selected year.'}});
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[d.studyTrack+":"+d.studyYear+":"+d.moduleName]);
        const existing = await tx.query('SELECT * FROM modules WHERE study_track=$1 AND study_year=$2 AND lower(module_name)=lower($3) ORDER BY curriculum_catalog DESC LIMIT 1 FOR UPDATE',[d.studyTrack,d.studyYear,d.moduleName]);
        if(existing.rowCount){
          const owner=await tx.query('SELECT role,password_hash FROM users WHERE user_id=$1',[existing.rows[0].lecturer_id]);
          if(existing.rows[0].lecturer_id!==req.user.userId && owner.rows[0]?.password_hash!=='!curriculum-owner-disabled!') {await tx.query('ROLLBACK');return res.status(409).json({error:{message:'This module already has a lecturer.'}});}
          await tx.query('UPDATE modules SET lecturer_id=$1,curriculum=true WHERE module_id=$2',[req.user.userId,existing.rows[0].module_id]);
          await tx.query("INSERT INTO enrollments(student_id,module_id) SELECT user_id,$1 FROM users WHERE role='student' AND study_track=$2 AND (study_year=$3 OR $3=3) ON CONFLICT DO NOTHING",[existing.rows[0].module_id,d.studyTrack,d.studyYear]);
          await tx.query('COMMIT');return res.status(201).json({module:existing.rows[0]});
        }
        const m = (
          await tx.query(
            'INSERT INTO modules(lecturer_id,module_code,module_name,join_code,study_track,study_year,curriculum) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING *',
            [
              req.user.userId,
              'MOD-' + crypto.randomBytes(8).toString('hex'),
              d.moduleName,
              crypto.randomBytes(12).toString('base64url'),
              d.studyTrack,
              d.studyYear,
            ],
          )
        ).rows[0];
        await tx.query(
          "INSERT INTO enrollments(student_id,module_id) SELECT user_id,$1 FROM users WHERE role='student' AND study_track=$2 AND (study_year=$3 OR $3=3) ON CONFLICT DO NOTHING",
          [m.module_id, d.studyTrack, d.studyYear],
        );
        await tx.query('COMMIT');
        const { join_code, ...module } = m;
        res.status(201).json({ module });
      } catch (e) {
        await tx.query('ROLLBACK');
        throw e;
      } finally {
        tx.release();
      }
    }),
  );
  app.get(
    '/api/v1/study-groups',
    requireAuth,
    handle(async (req, res) => {
      const data = (
        await pool.query(
          `SELECT g.*,u.full_name AS leader_name,m.module_name,m.module_code,m.study_track,EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=g.group_id AND gm.student_id=$1) AS joined FROM study_groups g JOIN modules m ON m.module_id=g.module_id JOIN users u ON u.user_id=g.created_by WHERE m.lecturer_id=$1 OR EXISTS(SELECT 1 FROM enrollments e WHERE e.module_id=m.module_id AND e.student_id=$1) ORDER BY g.group_name`,
          [req.user.userId],
        )
      ).rows;
      res.json({ data });
    }),
  );
  const groupDetails = z
    .object({
      language: z.enum(['English','Afrikaans','Zulu']),
      currentActivity: z.string().trim().min(1).max(500),
      nextActivity: z.string().trim().max(500).optional().default(''),
      meetingAt: futureMeeting,
      meetingDetails: z.string().trim().min(1).max(300),
    })
    .strict();
  app.put(
    '/api/v1/study-groups/:id',
    requireAuth,
    handle(async (req, res) => {
      const d = groupDetails.parse(req.body);
      const r = await pool.query(
        'UPDATE study_groups SET language=$1,current_activity=$2,next_activity=$3,meeting_details=$4,meeting_at=$7 WHERE group_id=$5 AND created_by=$6 RETURNING *',
        [
          d.language,
          d.currentActivity,
          d.nextActivity,
          d.meetingDetails,
          req.params.id,
          req.user.userId,
          d.meetingAt,
        ],
      );
      if (!r.rowCount)
        return res.status(403).json({
          error: { message: 'Only the group leader can edit this group.' },
        });
      res.json({ group: r.rows[0] });
    }),
  );
}
