// @ts-nocheck - request data is strictly validated before database writes.
import path from 'node:path';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import multer from 'multer';
import { z } from 'zod';
import { containsProfanity } from './profanity/index.js';
import rateLimit from 'express-rate-limit';
import { profileSchema } from './student-validation.js';
import {
  roleSchema,
  resetSchema,
  changeRole,
  resetPassword,
  lockRoles,
  audit,
  fail,
} from './admin-service.js';
import { listTables, readTable, updateTable } from './admin-tables.js';
const fields =
  'a.application_id,a.applicant_id,a.applicant_name,a.cv_original_name,a.cv_type,a.cv_size,a.status,a.submitted_at,a.reviewed_at,a.review_note';
export async function registerAdmin({ app, pool, requireAuth, requireRole }) {
  const directory = path.resolve(
    process.env.APPLICATION_UPLOAD_DIR ||
      './private-uploads/lecturer-applications',
  );
  await mkdir(directory, { recursive: true });
  const upload = multer({
    dest: directory,
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 1024 },
  }).single('cv');
  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof z.ZodError)
        return res
          .status(400)
          .json({ error: { message: e.issues[0].message } });
      if (e.status)
        return res.status(e.status).json({ error: { message: e.message } });
      if (['23505', '23503', '23514', '22P02'].includes(e.code))
        return res.status(409).json({
          error: {
            message:
              'This change conflicts with existing records or database rules. Check the values and linked records.',
          },
        });
      next(e);
    }
  };
  const transaction = async (fn) => {
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      const result = await fn(tx);
      await tx.query('COMMIT');
      return result;
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  };
  const adminTransaction = (req, fn) =>
    transaction(async (tx) => {
      await lockRoles(tx);
      const actor = (
        await tx.query('SELECT role FROM users WHERE user_id=$1 FOR SHARE', [
          req.user.userId,
        ])
      ).rows[0];
      if (actor?.role !== 'admin')
        fail(403, 'Administrator access is required.');
      return fn(tx);
    });
  const admin = [requireAuth, requireRole('admin')];
  const applicationLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    limit: Number(process.env.APPLICATION_RATE_LIMIT || 3),
    keyGenerator: (req) => req.user.userId,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message:
          'You have reached today’s application limit. Try again tomorrow.',
      },
    },
  });
  app.post(
    '/api/v1/lecturer-applications',
    requireAuth,
    requireRole('student'),
    applicationLimit,
    (req, res, next) =>
      upload(req, res, (error) => {
        if (error)
          return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
            error: {
              message:
                error.code === 'LIMIT_FILE_SIZE'
                  ? 'Your CV must be 5 MB or smaller.'
                  : 'Upload one PDF or DOCX CV and your full name.',
            },
          });
        next();
      }),
    wrap(async (req, res) => {
      let keep = false;
      try {
        const d = z
          .object({ fullName: profileSchema.shape.fullName })
          .strict()
          .parse(req.body);
        if (!req.file) fail(400, 'Upload your CV as a PDF or DOCX file.');
        const extension = path.extname(req.file.originalname).toLowerCase();
        const bytes = await readFile(req.file.path);
        if (!(
          (extension === '.pdf' &&
            bytes.subarray(0, 5).toString() === '%PDF-') ||
          (extension === '.docx' &&
            bytes.subarray(0, 4).toString('hex') === '504b0304')
        ))
          fail(422, 'Upload a valid PDF or DOCX CV.');
        const name =
          req.file.originalname
            .replace(/[^\p{L}\p{N}._ -]/gu, '_')
            .slice(0, 180) || 'CV' + extension;
        const result = await transaction(async (tx) => {
          const user = (
            await tx.query(
              'SELECT role FROM users WHERE user_id=$1 FOR UPDATE',
              [req.user.userId],
            )
          ).rows[0];
          if (user?.role !== 'student')
            fail(403, 'Only students can apply to become a lecturer.');
          if (
            (
              await tx.query(
                "SELECT 1 FROM lecturer_applications WHERE applicant_id=$1 AND status='pending'",
                [req.user.userId],
              )
            ).rowCount
          )
            fail(409, 'You already have a pending application.');
          return (
            await tx.query(
              'INSERT INTO lecturer_applications(applicant_id,applicant_name,cv_path,cv_original_name,cv_type,cv_size) VALUES($1,$2,$3,$4,$5,$6) RETURNING application_id,status,submitted_at',
              [
                req.user.userId,
                d.fullName,
                req.file.path,
                name,
                extension.slice(1),
                req.file.size,
              ],
            )
          ).rows[0];
        });
        keep = true;
        res.status(201).json({
          application: result,
          message: 'Your lecturer request has been sent to the administrator.',
        });
      } finally {
        if (req.file && !keep) await unlink(req.file.path).catch(() => {});
      }
    }),
  );
  app.get(
    '/api/v1/lecturer-applications/me',
    requireAuth,
    wrap(async (req, res) => {
      res.json({
        data: (
          await pool.query(
            `SELECT ${fields} FROM lecturer_applications a WHERE applicant_id=$1 ORDER BY submitted_at DESC`,
            [req.user.userId],
          )
        ).rows,
      });
    }),
  );
  app.get(
    '/api/v1/lecturer-applications/:applicationId/cv',
    requireAuth,
    wrap(async (req, res) => {
      const id = z.string().uuid().parse(req.params.applicationId);
      const r = (
        await pool.query(
          'SELECT applicant_id,cv_path,cv_original_name FROM lecturer_applications WHERE application_id=$1',
          [id],
        )
      ).rows[0];
      if (
        !r ||
        (req.user.role !== 'admin' && r.applicant_id !== req.user.userId)
      )
        fail(404, 'CV not found.');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.type('application/octet-stream');
      res.download(path.resolve(r.cv_path), r.cv_original_name, (error) => {
        if (error && !res.headersSent)
          res
            .status(404)
            .json({ error: { message: 'The CV file is unavailable.' } });
      });
    }),
  );
  app.get(
    '/api/v1/admin/lecturer-applications',
    ...admin,
    wrap(async (req, res) => {
      const status = z
        .enum(['pending', 'approved', 'rejected', 'all'])
        .parse(req.query.status || 'pending');
      const page = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(req.query.page || 0);
      const result = await pool.query(
        `SELECT ${fields},u.email,u.full_name AS account_name,u.role AS current_role FROM lecturer_applications a JOIN users u ON u.user_id=a.applicant_id WHERE ($1='all' OR a.status=$1) ORDER BY a.submitted_at DESC LIMIT 25 OFFSET $2`,
        [status, page * 25],
      );
      const total = Number(
        (
          await pool.query(
            "SELECT count(*) FROM lecturer_applications WHERE ($1='all' OR status=$1)",
            [status],
          )
        ).rows[0].count,
      );
      res.json({ data: result.rows, total, page });
    }),
  );
  app.post(
    '/api/v1/admin/lecturer-applications/:applicationId/review',
    ...admin,
    wrap(async (req, res) => {
      const id = z.string().uuid().parse(req.params.applicationId);
      const d = z
        .object({
          decision: z.enum(['approved', 'rejected']),
          note: z
            .string()
            .trim()
            .max(1000)
            .refine(
              (value) => !containsProfanity(value),
              'Please use appropriate language in the review note.',
            )
            .default(''),
        })
        .strict()
        .refine(
          (v) => v.decision !== 'rejected' || v.note.length > 0,
          'Enter a reason so the student knows why the request was rejected.',
        )
        .parse(req.body);
      await adminTransaction(req, async (tx) => {
        await lockRoles(tx);
        const a = (
          await tx.query(
            'SELECT * FROM lecturer_applications WHERE application_id=$1 FOR UPDATE',
            [id],
          )
        ).rows[0];
        if (!a) fail(404, 'Application not found.');
        if (a.status !== 'pending')
          fail(409, 'This application has already been reviewed.');
        const user = (
          await tx.query('SELECT role FROM users WHERE user_id=$1 FOR UPDATE', [
            a.applicant_id,
          ])
        ).rows[0];
        if (user?.role !== 'student')
          fail(
            409,
            'This account is no longer a student. Refresh the request list.',
          );
        if (d.decision === 'approved')
          await changeRole(tx, req.user.userId, a.applicant_id, 'lecturer', {
            applicationId: id,
          });
        await tx.query(
          'UPDATE lecturer_applications SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3 WHERE application_id=$4',
          [d.decision, req.user.userId, d.note, id],
        );
        await audit(
          tx,
          req.user.userId,
          'application_' + d.decision,
          'lecturer_application',
          id,
          { applicantId: a.applicant_id, note: d.note },
        );
      });
      res.json({
        message:
          d.decision === 'approved'
            ? 'Request approved. The student is now a lecturer and must sign in again.'
            : 'Request rejected. The student can see your reason.',
      });
    }),
  );
  app.get(
    '/api/v1/admin/users',
    ...admin,
    wrap(async (req, res) => {
      const search = z
        .string()
        .trim()
        .max(120)
        .parse(req.query.search || '');
      const page = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(req.query.page || 0);
      const where =
        "password_hash<>'!curriculum-owner-disabled!' AND (email ILIKE '%'||$1||'%' OR full_name ILIKE '%'||$1||'%')";
      const rows = (
        await pool.query(
          `SELECT user_id,email,full_name,role,study_track,study_year,(mfa_secret IS NOT NULL) AS mfa_enabled FROM users WHERE ${where} ORDER BY created_date DESC,user_id LIMIT 50 OFFSET $2`,
          [search, page * 50],
        )
      ).rows;
      const total = Number(
        (
          await pool.query(`SELECT count(*) FROM users WHERE ${where}`, [
            search,
          ])
        ).rows[0].count,
      );
      res.json({ data: rows, total, page });
    }),
  );
  app.put(
    '/api/v1/admin/users/:userId/role',
    ...admin,
    wrap(async (req, res) => {
      const id = z.string().uuid().parse(req.params.userId);
      const d = z.object({ role: roleSchema }).strict().parse(req.body);
      const result = await adminTransaction(req, (tx) =>
        changeRole(tx, req.user.userId, id, d.role),
      );
      res.json({
        ...result,
        message: 'Role updated. The user must sign in again.',
      });
    }),
  );
  app.put(
    '/api/v1/admin/users/:userId/password',
    ...admin,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: Number(process.env.ADMIN_PASSWORD_RESET_LIMIT || 30),
      keyGenerator: (req) => req.user.userId,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: { message: 'Too many password resets. Try again later.' },
      },
    }),
    wrap(async (req, res) => {
      const id = z.string().uuid().parse(req.params.userId);
      const d = resetSchema.parse(req.body);
      await adminTransaction(req, (tx) =>
        resetPassword(tx, req.user.userId, id, d.newPassword),
      );
      res.json({
        message:
          'Password reset successfully. All sessions for this user have been signed out.',
      });
    }),
  );
  app.get(
    '/api/v1/admin/database/tables',
    ...admin,
    wrap(async (_req, res) => res.json({ data: await listTables(pool) })),
  );
  app.get(
    '/api/v1/admin/database/:table',
    ...admin,
    wrap(async (req, res) => {
      const page = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(req.query.page || 0);
      res.json(await readTable(pool, req.params.table, page));
    }),
  );
  app.patch(
    '/api/v1/admin/database/:table',
    ...admin,
    wrap(async (req, res) => {
      const result = await adminTransaction(req, (tx) =>
        updateTable(tx, req.user.userId, req.params.table, req.body),
      );
      res.json(result);
    }),
  );
}
