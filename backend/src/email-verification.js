import crypto, { randomInt } from 'node:crypto';

const emailSecret = () => {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('EMAIL_VERIFICATION_SECRET_NOT_CONFIGURED');
  return secret;
};

export const createEmailCode = () => String(randomInt(100000, 1000000));

export const hashEmailCode = ({ email, purpose, userId = '', code }) =>
  crypto
    .createHmac('sha256', emailSecret())
    .update(`${purpose}\0${userId}\0${email.toLowerCase()}\0${code}`)
    .digest('hex');

const equalHash = (left, right) => {
  const a = Buffer.from(left || '', 'hex');
  const b = Buffer.from(right || '', 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};

export async function issueEmailCode(tx, { email, purpose, userId = null }) {
  const recent = await tx.query(
    `SELECT 1 FROM email_verification_challenges
     WHERE email=$1 AND purpose=$2 AND user_id IS NOT DISTINCT FROM $3
       AND requested_at > now()-interval '60 seconds'
     LIMIT 1`,
    [email.toLowerCase(), purpose, userId],
  );
  if (recent.rowCount) return { error: 'EMAIL_CODE_COOLDOWN' };
  const code = createEmailCode();
  const codeHash = hashEmailCode({ email, purpose, userId: userId || '', code });
  await tx.query(
    `UPDATE email_verification_challenges SET consumed_at=now()
     WHERE email=$1 AND purpose=$2 AND user_id IS NOT DISTINCT FROM $3 AND consumed_at IS NULL`,
    [email.toLowerCase(), purpose, userId],
  );
  await tx.query(
    `INSERT INTO email_verification_challenges(email,purpose,user_id,code_hash,expires_at)
     VALUES($1,$2,$3,$4,now()+interval '10 minutes')`,
    [email.toLowerCase(), purpose, userId, codeHash],
  );
  return { code };
}

export async function consumeEmailCode(tx, { email, purpose, userId = null, code }) {
  const result = await tx.query(
    `SELECT challenge_id,code_hash,attempts,expires_at FROM email_verification_challenges
     WHERE email=$1 AND purpose=$2 AND user_id IS NOT DISTINCT FROM $3
       AND consumed_at IS NULL
     ORDER BY requested_at DESC LIMIT 1 FOR UPDATE`,
    [email.toLowerCase(), purpose, userId],
  );
  const challenge = result.rows[0];
  if (!challenge || challenge.attempts >= 5 || new Date(challenge.expires_at) <= new Date())
    return false;
  const expected = hashEmailCode({ email, purpose, userId: userId || '', code });
  if (!equalHash(challenge.code_hash, expected)) {
    await tx.query(
      'UPDATE email_verification_challenges SET attempts=attempts+1 WHERE challenge_id=$1',
      [challenge.challenge_id],
    );
    return false;
  }
  await tx.query(
    'UPDATE email_verification_challenges SET consumed_at=now() WHERE challenge_id=$1',
    [challenge.challenge_id],
  );
  return true;
}
