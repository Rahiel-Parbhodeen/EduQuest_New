import crypto from 'node:crypto';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newSecret() {
  return Array.from(crypto.randomBytes(32), (b) => alphabet[b % 32]).join('');
}
/** @param {string} secret */
function decode(secret) {
  let bits = '';
  for (const c of secret)
    bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from((bits.match(/.{8}/g) || []).map((v) => parseInt(v, 2)));
}
/** @param {string} secret @param {number} counter */
export function totp(secret, counter) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(counter));
  const hash = crypto.createHmac('sha1', decode(secret)).update(bytes).digest();
  const offset = hash[19] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    '0',
  );
}
/** @param {string} secret @param {string} code @param {number} [last] @param {number} [now] */
export function verifyTotp(secret, code, last = -1, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(now / 30000);
  for (const step of [counter - 1, counter, counter + 1])
    if (
      step > Number(last ?? -1) &&
      crypto.timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))
    )
      return step;
  return null;
}
/** @param {string} value */
export const challengeHash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');
