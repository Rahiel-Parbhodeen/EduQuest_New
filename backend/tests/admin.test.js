// @ts-nocheck - integration fixtures drive real Express/database boundaries.
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { readdir } from 'node:fs/promises';
import { describe, it, expect, beforeAll } from 'vitest';
process.env.NODE_ENV = 'development';
process.env.COOKIE_SECURE = 'false';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.APPLICATION_RATE_LIMIT = '100';
process.env.ADMIN_PASSWORD_RESET_LIMIT = '100';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { app } = await import('../src/app.js');
const { pool } = await import('../db.js');
const password = 'AdminFixturePass12!';
const cv = Buffer.from('%PDF-1.7\nFixture curriculum vitae\n%%EOF');
let admin,
  student,
  otherStudent,
  lecturer,
  adminId,
  studentId,
  otherId,
  lecturerId,
  destinationId,
  applicationId,
  rejectedId;
const login = async (email, pass = password) => {
  const agent = request.agent(app);
  const r = await agent
    .post('/api/v1/auth/login')
    .send({ email, password: pass });
  expect(r.status).toBe(200);
  return agent;
};
const apply = (
  agent,
  name = 'Applicant Student',
  file = cv,
  filename = 'cv.pdf',
) =>
  agent
    .post('/api/v1/lecturer-applications')
    .field('fullName', name)
    .attach('cv', file, filename);
beforeAll(async () => {
  const hash = await bcrypt.hash(password, 4);
  for (const [email, role, name] of [
    ['admin-fixture@example.com', 'admin', 'Fixture Administrator'],
    ['applicant-fixture@example.com', 'student', 'Applicant Student'],
    ['other-applicant@example.com', 'student', 'Other Student'],
    ['managed-lecturer@example.com', 'lecturer', 'Managed Lecturer'],
    ['destination-lecturer@example.com', 'lecturer', 'Destination Lecturer'],
  ])
    await pool.query(
      'INSERT INTO users(email,password_hash,role,full_name,study_track,study_year) VALUES($1,$2,$3,$4,$5,1)',
      [email, hash, role, name, role === 'student' ? 'IT' : null],
    );
  const rows = (
    await pool.query(
      "SELECT user_id,email FROM users WHERE email IN ('admin-fixture@example.com','applicant-fixture@example.com','other-applicant@example.com','managed-lecturer@example.com','destination-lecturer@example.com')",
    )
  ).rows;
  const ids = Object.fromEntries(rows.map((r) => [r.email, r.user_id]));
  adminId = ids['admin-fixture@example.com'];
  studentId = ids['applicant-fixture@example.com'];
  otherId = ids['other-applicant@example.com'];
  lecturerId = ids['managed-lecturer@example.com'];
  destinationId = ids['destination-lecturer@example.com'];
  admin = await login('admin-fixture@example.com');
  student = await login('applicant-fixture@example.com');
  otherStudent = await login('other-applicant@example.com');
  lecturer = await login('managed-lecturer@example.com');
});
describe('administrator and lecturer applications', () => {
  it('blocks unauthenticated and wrong-role admin access without exposing hashes', async () => {
    for (const url of [
      '/api/v1/admin/users',
      '/api/v1/admin/lecturer-applications',
      '/api/v1/admin/database/tables',
      '/api/v1/admin/database/users',
    ]) {
      expect((await request(app).get(url)).status).toBe(401);
      expect((await student.get(url)).status).toBe(403);
      expect((await lecturer.get(url)).status).toBe(403);
    }
    const users = await admin.get('/api/v1/admin/users');
    expect(users.status).toBe(200);
    expect(JSON.stringify(users.body)).not.toMatch(
      /password_hash|mfa_secret|token_hash/,
    );
  });
  it('requires a name and a PDF/DOCX CV, checks size and rejects lecturers', async () => {
    expect(
      (
        await student
          .post('/api/v1/lecturer-applications')
          .field('fullName', 'Applicant Student')
      ).status,
    ).toBe(400);
    expect((await apply(student, 'Onlyfirst')).status).toBe(400);
    expect(
      (
        await apply(
          student,
          'Applicant Student',
          Buffer.from('<html>bad</html>'),
          'cv.html',
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await apply(
          student,
          'Applicant Student',
          Buffer.alloc(5 * 1024 * 1024 + 1),
          'cv.pdf',
        )
      ).status,
    ).toBe(413);
    expect((await apply(lecturer, 'Managed Lecturer')).status).toBe(403);
  });
  it('sends an application to admin, keeps the CV private and cleans duplicate uploads', async () => {
    const result = await apply(student);
    expect(result.status).toBe(201);
    applicationId = result.body.application.application_id;
    const own = await student.get('/api/v1/lecturer-applications/me');
    expect(own.body.data[0].status).toBe('pending');
    expect(JSON.stringify(own.body)).not.toContain('cv_path');
    const queue = await admin.get(
      '/api/v1/admin/lecturer-applications?status=pending',
    );
    expect(
      queue.body.data.some((a) => a.application_id === applicationId),
    ).toBe(true);
    expect(
      (
        await request(app).get(
          `/api/v1/lecturer-applications/${applicationId}/cv`,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await otherStudent.get(
          `/api/v1/lecturer-applications/${applicationId}/cv`,
        )
      ).status,
    ).toBe(404);
    const downloaded = await admin.get(
      `/api/v1/lecturer-applications/${applicationId}/cv`,
    );
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers['content-disposition']).toContain('attachment');
    expect(downloaded.headers['content-type']).toContain(
      'application/octet-stream',
    );
    expect(
      (await student.get(`/api/v1/lecturer-applications/${applicationId}/cv`))
        .status,
    ).toBe(200);
    const directory =
      process.env.APPLICATION_UPLOAD_DIR ||
      './private-uploads/lecturer-applications';
    const before = (await readdir(directory)).length;
    expect((await apply(student)).status).toBe(409);
    expect((await readdir(directory)).length).toBe(before);
  });
  it('approves atomically, switches role, revokes student sessions and prevents a second decision', async () => {
    expect(
      (
        await student
          .post(`/api/v1/admin/lecturer-applications/${applicationId}/review`)
          .send({ decision: 'approved', note: '' })
      ).status,
    ).toBe(403);
    const result = await admin
      .post(`/api/v1/admin/lecturer-applications/${applicationId}/review`)
      .send({ decision: 'approved', note: 'CV reviewed.' });
    expect(result.status).toBe(200);
    expect(
      (await pool.query('SELECT role FROM users WHERE user_id=$1', [studentId]))
        .rows[0].role,
    ).toBe('lecturer');
    expect((await student.get('/api/v1/auth/me')).status).toBe(401);
    student = await login('applicant-fixture@example.com');
    expect((await student.get('/api/v1/auth/me')).body.user.role).toBe(
      'lecturer',
    );
    expect((await apply(student)).status).toBe(403);
    expect(
      (
        await admin
          .post(`/api/v1/admin/lecturer-applications/${applicationId}/review`)
          .send({ decision: 'rejected', note: 'Changed opinion' })
      ).status,
    ).toBe(409);
    expect(
      (await student.get('/api/v1/lecturer-applications/me')).body.data.find(
        (a) => a.application_id === applicationId,
      ).status,
    ).toBe('approved');
  });
  it('rejects with feedback, keeps the student role and allows a new application', async () => {
    rejectedId = (await apply(otherStudent, 'Other Student')).body.application
      .application_id;
    expect(
      (
        await admin
          .post(`/api/v1/admin/lecturer-applications/${rejectedId}/review`)
          .send({ decision: 'rejected', note: '' })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin
          .post(`/api/v1/admin/lecturer-applications/${rejectedId}/review`)
          .send({
            decision: 'rejected',
            note: 'Please provide teaching experience.',
          })
      ).status,
    ).toBe(200);
    const history = (await otherStudent.get('/api/v1/lecturer-applications/me'))
      .body.data;
    expect(history[0].review_note).toBe('Please provide teaching experience.');
    expect((await otherStudent.get('/api/v1/auth/me')).body.user.role).toBe(
      'student',
    );
    expect((await apply(otherStudent, 'Other Student')).status).toBe(201);
  });
  it('allows audited role changes, rejects self-demotion and blocks raw role bypass', async () => {
    expect(
      (
        await otherStudent
          .put(`/api/v1/admin/users/${adminId}/role`)
          .send({ role: 'student' })
      ).status,
    ).toBe(403);
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${adminId}/role`)
          .send({ role: 'student' })
      ).status,
    ).toBe(409);
    expect(
      (
        await admin
          .patch('/api/v1/admin/database/users')
          .send({ key: { user_id: otherId }, changes: { role: 'admin' } })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${otherId}/role`)
          .send({ role: 'admin' })
      ).status,
    ).toBe(200);
    expect((await otherStudent.get('/api/v1/auth/me')).status).toBe(401);
    otherStudent = await login('other-applicant@example.com');
    expect((await otherStudent.get('/api/v1/admin/users')).status).toBe(200);
    expect(
      (await pool.query("SELECT count(*) FROM users WHERE role='admin'"))
        .rows[0].count,
    ).not.toBe('0');
  });
  it('resets another user password, validates confirmation and invalidates sessions', async () => {
    const newPassword = 'ResetManagedPass34!';
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${adminId}/password`)
          .send({ newPassword, confirmNewPassword: newPassword })
      ).status,
    ).toBe(409);
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${lecturerId}/password`)
          .send({ newPassword, confirmNewPassword: 'different' })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${lecturerId}/password`)
          .send({ newPassword: 'weak', confirmNewPassword: 'weak' })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${lecturerId}/password`)
          .send({ newPassword, confirmNewPassword: newPassword })
      ).status,
    ).toBe(200);
    expect((await lecturer.get('/api/v1/auth/me')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'managed-lecturer@example.com', password })
      ).status,
    ).toBe(401);
    lecturer = await login('managed-lecturer@example.com', newPassword);
    expect(
      (
        await pool.query('SELECT password_hash FROM users WHERE user_id=$1', [
          lecturerId,
        ])
      ).rows[0].password_hash,
    ).not.toBe(newPassword);
    const logs = (await admin.get('/api/v1/admin/database/admin_audit_log'))
      .body;
    expect(JSON.stringify(logs)).not.toContain(newPassword);
  });
  it('edits allowlisted records and protects secrets, immutable history and table names', async () => {
    expect((await admin.get('/api/v1/admin/database/sessions')).status).toBe(
      404,
    );
    expect(
      (await admin.get('/api/v1/admin/database/users%3BDELETE')).status,
    ).toBe(404);
    const users = (await admin.get('/api/v1/admin/database/users')).body;
    expect(JSON.stringify(users)).not.toMatch(
      /password_hash|mfa_secret|token_hash/,
    );
    expect(
      (
        await admin.patch('/api/v1/admin/database/users').send({
          key: { user_id: studentId },
          changes: { full_name: 'Approved Lecturer' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await admin.patch('/api/v1/admin/database/users').send({
          key: { user_id: studentId },
          changes: { password_hash: 'tamper' },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin
          .patch('/api/v1/admin/database/admin_audit_log')
          .send({ key: { audit_id: adminId }, changes: { action: 'tamper' } })
      ).status,
    ).toBe(403);
    expect(
      (
        await pool.query('SELECT full_name FROM users WHERE user_id=$1', [
          studentId,
        ])
      ).rows[0].full_name,
    ).toBe('Approved Lecturer');
  });
  it('requires module transfer before lecturer demotion and transfers quiz ownership consistently', async () => {
    const module = (
      await lecturer.post('/api/v1/modules').send({
        moduleCode: 'ADMIN-XFER',
        moduleName: 'Administration Transfer Course',
      })
    ).body.module;
    expect(module).toBeTruthy();
    const quiz = (
      await lecturer.post('/api/v1/quizzes').send({
        moduleId: module.module_id,
        title: 'Transfer test',
        isCompetitive: false,
        questions: [
          {
            questionText: 'Which option is correct?',
            topic: 'Transfer',
            marks: 1,
            difficultyLevel: 3,
            options: [
              { optionText: 'Correct', isCorrect: true },
              { optionText: 'Incorrect', isCorrect: false },
            ],
          },
        ],
      })
    ).body.quiz;
    expect(quiz).toBeTruthy();
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${lecturerId}/role`)
          .send({ role: 'student' })
      ).status,
    ).toBe(409);
    expect(
      (
        await admin.patch('/api/v1/admin/database/modules').send({
          key: { module_id: module.module_id },
          changes: { lecturer_id: destinationId },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await pool.query('SELECT created_by FROM quizzes WHERE quiz_id=$1', [
          quiz.quiz_id,
        ])
      ).rows[0].created_by,
    ).toBe(destinationId);
    expect(
      (
        await admin
          .put(`/api/v1/admin/users/${lecturerId}/role`)
          .send({ role: 'student' })
      ).status,
    ).toBe(200);
  });
  it('records decisions and mutations in an append-only audit history', async () => {
    const actions = (
      await pool.query('SELECT action FROM admin_audit_log WHERE admin_id=$1', [
        adminId,
      ])
    ).rows.map((r) => r.action);
    expect(actions).toContain('application_approved');
    expect(actions).toContain('application_rejected');
    expect(actions).toContain('role_changed');
    expect(actions).toContain('password_reset');
    expect(actions).toContain('record_updated');
    await expect(
      pool.query(
        "UPDATE admin_audit_log SET action='tampered' WHERE admin_id=$1",
        [adminId],
      ),
    ).rejects.toHaveProperty('code', '23514');
  });
});

it('protects question marks and answers after a recorded attempt', async () => {
  const question = (
    await pool.query(
      "SELECT q.question_id,q.quiz_id FROM questions q JOIN quizzes z ON z.quiz_id=q.quiz_id WHERE z.title='Transfer test' LIMIT 1",
    )
  ).rows[0];
  expect(question).toBeTruthy();
  await pool.query(
    'INSERT INTO quiz_attempts(quiz_id,student_id) VALUES($1,$2)',
    [question.quiz_id, lecturerId],
  );
  expect(
    (
      await admin.patch('/api/v1/admin/database/questions').send({
        key: { question_id: question.question_id },
        changes: { marks: 2 },
      })
    ).status,
  ).toBe(409);
  const option = (
    await pool.query(
      'SELECT option_id FROM question_options WHERE question_id=$1 LIMIT 1',
      [question.question_id],
    )
  ).rows[0];
  expect(
    (
      await admin.patch('/api/v1/admin/database/question_options').send({
        key: { option_id: option.option_id },
        changes: { option_text: 'Rewritten after submission' },
      })
    ).status,
  ).toBe(409);
  expect(
    Number(
      (
        await pool.query('SELECT marks FROM questions WHERE question_id=$1', [
          question.question_id,
        ])
      ).rows[0].marks,
    ),
  ).toBe(1);
  expect((await admin.get('/api/v1/admin/database/constructor')).status).toBe(
    404,
  );
});

it('applies the shared visible-text policy to administrator edits', async () => {
  const id = (await pool.query('SELECT game_type_id FROM game_types LIMIT 1'))
    .rows[0].game_type_id;
  const result = await admin
    .patch('/api/v1/admin/database/game_types')
    .send({ key: { game_type_id: id }, changes: { display_name: 'fuck' } });
  expect(result.status).toBe(400);
  expect(JSON.stringify(result.body)).not.toContain('fuck');
});
