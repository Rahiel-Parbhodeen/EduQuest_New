// @ts-nocheck - integration fixtures use runtime API response records.
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll } from 'vitest';
import { totp } from '../src/mfa.js';
process.env.NODE_ENV = 'development';
process.env.COOKIE_SECURE = 'false';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { app } = await import('../src/app.js');
const { pool } = await import('../db.js');
const password = 'StrongerPass12!';
let lecturer, student, outsider, module, group, studentId;
const registration = {
  email: 'rebuild-student@example.com',
  fullName: 'Rebuild Student',
  password,
  confirmPassword: password,
  studyTrack: 'IT',
  studyYear: 1,
};
beforeAll(async () => {
  await pool.query(
    "INSERT INTO users(email,password_hash,role,full_name) VALUES('rebuild-lecturer@example.com',$1,'lecturer','Rebuild Lecturer')",
    [await bcrypt.hash(password, 4)],
  );
  lecturer = request.agent(app);
  await lecturer
    .post('/api/v1/auth/login')
    .send({ email: 'rebuild-lecturer@example.com', password });
  student = request.agent(app);
  outsider = request.agent(app);
});
describe('rebuilt student experience', () => {
  it('creates current and next-year modules; rejects student curriculum writes', async () => {
    module = (
      await lecturer.post('/api/v1/curriculum').send({
        moduleCode: 'RB101',
        moduleName: 'Rebuild Computing',
        studyTrack: 'IT',
        studyYear: 1,
      })
    ).body.module;
    expect(module).toBeTruthy();
    expect(
      (
        await lecturer.post('/api/v1/curriculum').send({
          moduleCode: 'RB201',
          moduleName: 'Next Year Computing',
          studyTrack: 'IT',
          studyYear: 2,
        })
      ).status,
    ).toBe(201);
    expect((await request(app).get('/api/v1/curriculum')).status).toBe(401);
  });
  it('rejects invalid registrations and automatically enrols a valid student', async () => {
    for (const patch of [
      { fullName: 'First' },
      { fullName: 'First Last3' },
      { confirmPassword: 'different' },
      { password: 'short' },
      { email: 'broken' },
    ])
      expect(
        (
          await request(app)
            .post('/api/v1/auth/register')
            .send({ ...registration, ...patch })
        ).status,
      ).toBe(400);
    const r = await student.post('/api/v1/auth/register').send(registration);
    expect(r.status).toBe(201);
    studentId = r.body.user.user_id;
    expect(
      (await student.get('/api/v1/modules')).body.data.some(
        (m) => m.module_id === module.module_id,
      ),
    ).toBe(true);
    expect(
      (await student.get('/api/v1/curriculum')).body.data.some(
        (m) => m.study_year === 2,
      ),
    ).toBe(true);
    expect((await student.post('/api/v1/curriculum').send({})).status).toBe(
      403,
    );
  });
  it('validates profile edits and reflects valid changes', async () => {
    expect(
      (
        await student
          .put('/api/v1/profile')
          .send({ fullName: '123', studyTrack: 'IT', studyYear: 1 })
      ).status,
    ).toBe(400);
    expect(
      (
        await student
          .put('/api/v1/profile')
          .send({ fullName: 'Updated Student', studyTrack: 'IT', studyYear: 1 })
      ).status,
    ).toBe(200);
    expect((await student.get('/api/v1/auth/me')).body.user.fullName).toBe(
      'Updated Student',
    );
  });
  it('blocks join-code bypass and protects group updates', async () => {
    await outsider.post('/api/v1/auth/register').send({
      ...registration,
      email: 'rebuild-other@example.com',
      studyTrack: 'Business',
    });
    expect(
      (
        await outsider
          .post(`/api/v1/modules/${module.module_id}/groups`)
          .send({ groupName: 'Intruder' })
      ).status,
    ).toBe(403);
    group = (
      await student
        .post(`/api/v1/modules/${module.module_id}/groups`)
        .send({ groupName: 'Revision Club' })
    ).body.group;
    const details = {
      language: 'isiZulu',
      currentActivity: 'Database keys',
      nextActivity: 'Normalization',
      meetingDetails: 'Friday at the library',
    };
    expect(
      (
        await student
          .put('/api/v1/study-groups/' + group.group_id)
          .send(details)
      ).status,
    ).toBe(200);
    expect(
      (
        await outsider
          .put('/api/v1/study-groups/' + group.group_id)
          .send(details)
      ).status,
    ).toBe(403);
    const g = (await student.get('/api/v1/study-groups')).body.data.find(
      (g) => g.group_id === group.group_id,
    );
    expect(g.leader_name).toBe('Updated Student');
    expect(g.language).toBe('isiZulu');
    expect(
      (await outsider.get('/api/v1/study-groups')).body.data.some(
        (g) => g.group_id === group.group_id,
      ),
    ).toBe(false);
  });
  it('enables TOTP, requires the second factor, and rejects code replay', async () => {
    const setup = await student.post('/api/v1/auth/mfa/setup').send({});
    expect(setup.status).toBe(200);
    const counter = Math.floor(Date.now() / 30000);
    expect(
      (await student.post('/api/v1/auth/mfa/enable').send({ code: 'wrong' }))
        .status,
    ).toBe(400);
    expect(
      (
        await student
          .post('/api/v1/auth/mfa/enable')
          .send({ code: totp(setup.body.secret, counter) })
      ).status,
    ).toBe(200);
    const login = request.agent(app);
    const r = await login
      .post('/api/v1/auth/login')
      .send({ email: registration.email, password });
    expect(r.body.mfaRequired).toBe(true);
    expect((await login.get('/api/v1/modules')).status).toBe(401);
    expect(
      (
        await login.post('/api/v1/auth/mfa/verify').send({
          challenge: r.body.challenge,
          code: totp(setup.body.secret, counter),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await login.post('/api/v1/auth/mfa/verify').send({
          challenge: r.body.challenge,
          code: totp(setup.body.secret, counter + 1),
        })
      ).status,
    ).toBe(200);
    expect((await login.get('/api/v1/modules')).status).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/mfa/verify')
          .send({
            challenge: r.body.challenge,
            code: totp(setup.body.secret, counter + 1),
          })
      ).status,
    ).toBe(401);
  });
});

describe('code-free modules and readable source preview', () => {
  it('repairs missing curriculum enrolments without a join code and hides legacy codes', async () => {
    const owner = (
      await pool.query(
        "SELECT user_id FROM users WHERE email='rebuild-lecturer@example.com'",
      )
    ).rows[0].user_id;
    const m = (
      await pool.query(
        "INSERT INTO modules(lecturer_id,module_code,module_name,join_code,study_track,study_year,curriculum) VALUES($1,'SYNC101','Synchronised curriculum','INTERNAL-SYNC-2026','IT',1,true) RETURNING module_id",
        [owner],
      )
    ).rows[0];
    const result = await student.get('/api/v1/modules');
    expect(result.status).toBe(200);
    expect(result.body.data.some((row) => row.module_id === m.module_id)).toBe(
      true,
    );
    expect(
      result.body.data.every((row) => !Object.hasOwn(row, 'join_code')),
    ).toBe(true);
  });
  it('previews exactly the uploaded material with owner and role checks', async () => {
    const text =
      'Unique lecture material: photosynthesis converts light energy into chemical energy. Chlorophyll absorbs light in plant cells.';
    const upload = await lecturer
      .post(`/api/v1/modules/${module.module_id}/resources`)
      .field('title', 'Photosynthesis notes')
      .attach('file', Buffer.from(text), 'photosynthesis.txt');
    expect(upload.status).toBe(201);
    const path = `/api/v1/resources/${upload.body.resource.resource_id}/text-preview`;
    expect((await request(app).get(path)).status).toBe(401);
    expect((await student.get(path)).status).toBe(403);
    const preview = await lecturer.get(path);
    expect(preview.status).toBe(200);
    expect(preview.body.text).toBe(text);
    expect(preview.body.characters).toBe(text.length);
    expect(preview.body.sha256).toMatch(/^[a-f0-9]{64}$/);
    await pool.query(
      "INSERT INTO users(email,password_hash,role,full_name) VALUES('preview-other@example.com',$1,'lecturer','Other Lecturer')",
      [await bcrypt.hash(password, 4)],
    );
    const other = request.agent(app);
    await other
      .post('/api/v1/auth/login')
      .send({ email: 'preview-other@example.com', password });
    expect((await other.get(path)).status).toBe(404);
  });
  it('returns a useful error when a document has no readable text', async () => {
    const upload = await lecturer
      .post(`/api/v1/modules/${module.module_id}/resources`)
      .field('title', 'Very short notes')
      .attach('file', Buffer.from('short'), 'short.txt');
    const r = await lecturer.get(
      `/api/v1/resources/${upload.body.resource.resource_id}/text-preview`,
    );
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('DOCUMENT_NO_TEXT');
  });
  it('protects provider status from unauthenticated and student access', async () => {
    expect((await request(app).get('/api/v1/generation-status')).status).toBe(
      401,
    );
    expect((await student.get('/api/v1/generation-status')).status).toBe(403);
  });
});
