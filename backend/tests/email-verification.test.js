import 'dotenv/config';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTestEmailCode, testEmailCode } from './helpers/email-verification.js';
import { setEmailDeliveryForTests } from '../src/email-delivery.js';

process.env.NODE_ENV = 'development';
process.env.COOKIE_SECURE = 'false';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { app } = await import('../src/app.js');
const { pool } = await import('../db.js');

describe('email verification', () => {
  beforeEach(() => setEmailDeliveryForTests(async ({ email, code }) => setTestEmailCode(email, code)));
  it('requires a delivered, one-time code before registration', async () => {
    const agent = request.agent(app);
    const registration = {
      confirmPassword: 'VerifyStudentPassword1!',
      studyTrack: 'IT',
      studyYear: 1,
      email: `verified-${Date.now()}@example.com`,
      password: 'VerifyStudentPassword1!',
      fullName: 'Verified Student',
    };
    const unverified = await agent.post('/api/v1/auth/register').send(registration);
    expect(unverified.status).toBe(400);
    expect(unverified.body.error.fields.emailVerificationCode).toBeTruthy();

    expect((await agent.post('/api/v1/auth/email-verification/request').send({ email: registration.email })).status).toBe(200);
    const code = testEmailCode(registration.email);
    expect(code).toMatch(/^\d{6}$/);
    const wrong = await agent.post('/api/v1/auth/register').send({ ...registration, emailVerificationCode: '000000' === code ? '000001' : '000000' });
    expect(wrong.status).toBe(400);
    const valid = await agent.post('/api/v1/auth/register').send({ ...registration, emailVerificationCode: code });
    expect(valid.status).toBe(201);
    const replay = await request(app).post('/api/v1/auth/register').send({ ...registration, emailVerificationCode: code });
    expect(replay.status).toBe(400);
  });

  it('returns server validation errors under their field names', async () => {
    const result = await request(app).post('/api/v1/auth/register').send({ email: 'bad', password: 'short' });
    expect(result.status).toBe(400);
    expect(result.body.error.fields).toMatchObject({ email: expect.any(String), password: expect.any(String) });
  });

  it('forbids admins from requesting or confirming an email change', async () => {
    const password = 'AdminDemoPassword123!';
    const hash = await bcrypt.hash(password, 4);
    const existingAdmin = await pool.query(
      'SELECT user_id FROM users WHERE email=$1',
      ['email-policy-admin@example.com'],
    );
    if (existingAdmin.rowCount)
      await pool.query(
        "UPDATE users SET password_hash=$1,role='admin' WHERE user_id=$2",
        [hash, existingAdmin.rows[0].user_id],
      );
    else
      await pool.query(
        "INSERT INTO users(email,password_hash,role,full_name) VALUES('email-policy-admin@example.com',$1,'admin','Email Policy Admin')",
        [hash],
      );
    const admin = request.agent(app);
    expect((await admin.post('/api/v1/auth/login').send({ email: 'email-policy-admin@example.com', password })).status).toBe(200);
    for (const [path, body] of [
      ['/api/v1/profile/email/verification/request', { currentPassword: password, newEmail: 'new-admin-address@example.com' }],
      ['/api/v1/profile/email/verification/confirm', { newEmail: 'new-admin-address@example.com', emailVerificationCode: '123456' }],
    ]) {
      const response = await admin.post(path).send(body);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });
});
