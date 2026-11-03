import { describe, it, expect } from 'vitest';
import { totp, verifyTotp, newSecret } from './mfa.js';
import { registrationSchema, profileSchema } from './student-validation.js';
describe('registration validation', () => {
  const valid = {
    email: 'student@example.com',
    fullName: 'Thabo Mokoena',
    password: 'StrongerPass12!',
    confirmPassword: 'StrongerPass12!',
    studyTrack: 'IT',
    studyYear: 1,
    emailVerificationCode: '123456',
  };
  it('requires names, valid email, programme and matching strong passwords', () => {
    expect(registrationSchema.safeParse(valid).success).toBe(true);
    for (const patch of [
      { fullName: 'Thabo' },
      { fullName: 'Thabo Mokoena2' },
      { email: 'not-email' },
      { password: 'weak' },
      { confirmPassword: 'different' },
      { studyTrack: 'Other' },
      { studyYear: 0 },
    ])
      expect(registrationSchema.safeParse({ ...valid, ...patch }).success).toBe(
        false,
      );
  });
  it('accepts international names and applies the same rule to edits', () => {
    expect(
      profileSchema.safeParse({
        fullName: 'Zoë Dlamini-Smith',
        studyTrack: 'Business',
        studyYear: 2,
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        fullName: 'Jane123',
        studyTrack: 'IT',
        studyYear: 1,
      }).success,
    ).toBe(false);
  });
});
describe('RFC 6238 authenticator codes', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  it('matches RFC vector, rejects replay and malformed input', () => {
    expect(totp(secret, 1)).toBe('287082');
    expect(verifyTotp(secret, '287082', -1, 59000)).toBe(1);
    expect(verifyTotp(secret, '287082', 1, 59000)).toBeNull();
    expect(verifyTotp(secret, 'bad', -1, 59000)).toBeNull();
  });
  it('generates unique base32 secrets', () => {
    expect(newSecret()).toMatch(/^[A-Z2-7]{32}$/);
    expect(newSecret()).not.toBe(newSecret());
  });
});
