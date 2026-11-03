// @ts-nocheck - API response fixtures are checked at runtime.
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { it, expect } from 'vitest';
import { registerVerifiedStudent } from './helpers/email-verification.js';
process.env.NODE_ENV = 'development';
process.env.COOKIE_SECURE = 'false';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.PASSWORD_CHANGE_LIMIT = '100';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { app } = await import('../src/app.js');
const { pool } = await import('../db.js');
const password = 'InitialPassword12!';
const nextPassword = 'ChangedPassword34!';
const years = [
  ['Information Systems', 'Maths', 'Programming', 'Web Technology', 'Networks'],
  [
    'Programming',
    'Database Systems',
    'Information Systems',
    'Cloud Computing',
    'Networks',
  ],
  [
    'Programming',
    'Mobile App Development',
    'Operating Systems',
    'Human Computer Interaction',
    'Artificial Intelligence',
  ],
];
const register = async (year, email) => {
  const agent = request.agent(app);
  const result = await registerVerifiedStudent(agent, {
    email,
    password,
    confirmPassword: password,
    fullName: 'Curriculum Student',
    studyTrack: 'IT',
    studyYear: year,
  });
  expect(result.status).toBe(201);
  return { agent, user: result.body.user };
};
it('assigns the five requested modules for each year without a seed or join code', async () => {
  for (let year = 1; year <= 3; year++) {
    const { agent } = await register(year, `catalog-year-${year}@example.com`);
    const rows = (await agent.get('/api/v1/modules')).body.data;
    expect(
      rows.filter((m) => m.curriculum_catalog).map((m) => m.module_name),
    ).toEqual(years[year - 1]);
    expect(
      rows.filter((m) => m.curriculum).every((m) => m.study_year === year),
    ).toBe(true);
    const preview = (await agent.get('/api/v1/curriculum')).body.data;
    expect(
      preview
        .filter((m) => m.curriculum_catalog && m.study_year === 2)
        .map((m) => m.module_name),
    ).toEqual(years[1]);
  }
});
it('updates current module and resource choices when a profile changes year', async () => {
  const { agent } = await register(1, 'catalog-change-year@example.com');
  expect(
    (
      await agent.put('/api/v1/profile').send({
        fullName: 'Curriculum Student',
        studyTrack: 'IT',
        studyYear: 2,
      })
    ).status,
  ).toBe(200);
  const modules = (await agent.get('/api/v1/modules')).body.data;
  expect(
    modules.filter((m) => m.curriculum_catalog).map((m) => m.module_name),
  ).toEqual(years[1]);
  for (const m of modules)
    expect(
      (await agent.get(`/api/v1/modules/${m.module_id}/resources`)).status,
    ).toBe(200);
});
it('keeps same-name modules and their resources separate between years', async () => {
  const { agent: yearOne } = await register(
    1,
    'catalog-resource-one@example.com',
  );
  const { agent: yearTwo } = await register(
    2,
    'catalog-resource-two@example.com',
  );
  const one = (await yearOne.get('/api/v1/modules')).body.data.find(
    (m) => m.module_name === 'Programming',
  );
  const two = (await yearTwo.get('/api/v1/modules')).body.data.find(
    (m) => m.module_name === 'Programming',
  );
  expect(one.module_id).not.toBe(two.module_id);
  const owner = (
    await pool.query('SELECT lecturer_id FROM modules WHERE module_id=$1', [
      two.module_id,
    ])
  ).rows[0].lecturer_id;
  await pool.query(
    "INSERT INTO resources(uploaded_by,module_id,title,resource_type,file_location,file_size_bytes) VALUES($1,$2,'Year two programming notes','txt','fixture.txt',12)",
    [owner, two.module_id],
  );
  expect(
    (
      await yearTwo.get(`/api/v1/modules/${two.module_id}/resources`)
    ).body.data.some((r) => r.title === 'Year two programming notes'),
  ).toBe(true);
  expect(
    (await yearOne.get(`/api/v1/modules/${two.module_id}/resources`)).status,
  ).toBe(403);
  expect(
    (
      await yearOne.get(`/api/v1/modules/${one.module_id}/resources`)
    ).body.data.some((r) => r.title === 'Year two programming notes'),
  ).toBe(false);
});
it('verifies current password, confirmation and strength before changing the hash', async () => {
  const { agent, user } = await register(1, 'password-profile@example.com');
  const original = (
    await pool.query('SELECT password_hash FROM users WHERE user_id=$1', [
      user.user_id,
    ])
  ).rows[0].password_hash;
  const submit = (body) => agent.put('/api/v1/profile/password').send(body);
  const valid = {
    currentPassword: password,
    newPassword: nextPassword,
    confirmNewPassword: nextPassword,
  };
  expect(
    (await request(app).put('/api/v1/profile/password').send(valid)).status,
  ).toBe(401);
  expect(
    (await submit({ ...valid, currentPassword: 'IncorrectPassword12!' })).body
      .error.code,
  ).toBe('CURRENT_PASSWORD_INCORRECT');
  expect(
    (await submit({ ...valid, confirmNewPassword: 'Mismatch12!' })).status,
  ).toBe(400);
  expect(
    (
      await submit({
        ...valid,
        newPassword: 'weak',
        confirmNewPassword: 'weak',
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await submit({
        currentPassword: password,
        newPassword: password,
        confirmNewPassword: password,
      })
    ).body.error.code,
  ).toBe('PASSWORD_UNCHANGED');
  expect(
    (
      await pool.query('SELECT password_hash FROM users WHERE user_id=$1', [
        user.user_id,
      ])
    ).rows[0].password_hash,
  ).toBe(original);
  const other = request.agent(app);
  expect(
    (
      await other
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
    ).status,
  ).toBe(200);
  const success = await submit(valid);
  expect(success.status).toBe(200);
  expect(success.body.message).toContain('Password changed successfully');
  expect((await agent.get('/api/v1/auth/me')).status).toBe(200);
  expect((await other.get('/api/v1/auth/me')).status).toBe(401);
  const changed = (
    await pool.query('SELECT password_hash FROM users WHERE user_id=$1', [
      user.user_id,
    ])
  ).rows[0].password_hash;
  expect(changed).not.toBe(nextPassword);
  expect(await bcrypt.compare(nextPassword, changed)).toBe(true);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: nextPassword })
    ).status,
  ).toBe(200);
}, 15000);
