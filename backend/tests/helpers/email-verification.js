import { setEmailDeliveryForTests } from '../../src/email-delivery.js';

const codes = new Map();
export const setTestEmailCode = (email, code) => codes.set(email.toLowerCase(), code);
setEmailDeliveryForTests(async ({ email, code }) => setTestEmailCode(email, code));

export const testEmailCode = (email) => codes.get(email.toLowerCase());

export async function registerVerifiedStudent(agent, registration) {
  const requested = await agent
    .post('/api/v1/auth/email-verification/request')
    .send({ email: registration.email });
  if (requested.status !== 200)
    throw new Error(`Email verification request failed: ${requested.status}`);
  const emailVerificationCode = testEmailCode(registration.email);
  if (!emailVerificationCode) throw new Error('Test email code was not delivered.');
  return agent
    .post('/api/v1/auth/register')
    .send({ ...registration, emailVerificationCode });
}
