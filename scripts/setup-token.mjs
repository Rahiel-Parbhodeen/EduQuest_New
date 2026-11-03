import { randomBytes, randomInt } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const envPath = path.resolve(process.env.ENV_FILE || '.env');
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function createToken(length = 48) {
  return Array.from(
    { length },
    () => alphabet[randomInt(alphabet.length)],
  ).join('');
}

const contents = await readFile(envPath, 'utf8').catch(() => '');
const existing = contents
  .match(/^AI_SERVICE_TOKEN[ \t]*=[ \t]*(\S[^\r\n]*)$/m)?.[1]
  ?.trim();
const emailSecret = contents
  .match(/^EMAIL_VERIFICATION_SECRET[ \t]*=[ \t]*(\S[^\r\n]*)$/m)?.[1]
  ?.trim();
const additions = [];
if (!existing) additions.push(`AI_SERVICE_TOKEN=${createToken()}`);
if (!emailSecret)
  additions.push(`EMAIL_VERIFICATION_SECRET=${randomBytes(32).toString('base64url')}`);
if (additions.length) {
  const prefix = contents.length > 0 && !contents.endsWith('\n') ? '\n' : '';
  await appendFile(envPath, `${prefix}${additions.join('\n')}\n`, 'utf8');
}
console.log(`AI_SERVICE_TOKEN=${existing ? 'present' : 'created'}`);
console.log(`EMAIL_VERIFICATION_SECRET=${emailSecret ? 'present' : 'created'}`);
