// @ts-nocheck - interactive terminal IO is validated at the CLI boundary.
import 'dotenv/config';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { fullName, strongPassword } from '../src/student-validation.js';
import { lockRoles, audit } from '../src/admin-service.js';
async function secretPrompt(label) {
  stdout.write(label);
  if (!stdin.isTTY) {
    throw Error(
      'Use an interactive terminal, or set ADMIN_SETUP_PASSWORD in the process environment.',
    );
  }
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (buffer) => {
      for (const c of buffer.toString('utf8')) {
        if (c === '\u0003') {
          cleanup();
          reject(Error('Cancelled.'));
          return;
        }
        if (c === '\r' || c === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (c === '\u007f' || c === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (c >= ' ') value += c;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on('data', onData);
  });
}
try {
  if (
    (await pool.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1"))
      .rowCount
  )
    throw Error(
      'An admin already exists. Use that admin account’s Users screen.',
    );
  const rl = createInterface({ input: stdin, output: stdout });
  const email = z
    .string()
    .trim()
    .email()
    .parse(
      process.env.ADMIN_SETUP_EMAIL || (await rl.question('Admin email: ')),
    )
    .toLowerCase();
  const name = fullName.parse(
    process.env.ADMIN_SETUP_NAME || (await rl.question('Full name: ')),
  );
  rl.close();
  const password =
    process.env.ADMIN_SETUP_PASSWORD ||
    (await secretPrompt('Password (hidden): '));
  strongPassword.parse(password);
  if (Buffer.byteLength(password, 'utf8') > 72)
    throw Error('Password exceeds 72 UTF-8 bytes.');
  if (
    !process.env.ADMIN_SETUP_PASSWORD &&
    password !== (await secretPrompt('Confirm password (hidden): '))
  )
    throw Error('Passwords do not match.');
  const hash = await bcrypt.hash(password, 12);
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    await lockRoles(tx);
    if (
      (await tx.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1"))
        .rowCount
    )
      throw Error(
        'An admin already exists. Use that admin account’s Users screen to add another admin.',
      );
    const existing = (
      await tx.query('SELECT user_id FROM users WHERE email=$1', [email])
    ).rows[0];
    if (existing)
      throw Error(
        'This email already belongs to an account. Use a different email for the initial admin.',
      );
    const user = (
      await tx.query(
        "INSERT INTO users(email,password_hash,role,full_name) VALUES($1,$2,'admin',$3) RETURNING user_id",
        [email, hash, name],
      )
    ).rows[0];
    await audit(tx, user.user_id, 'admin_bootstrapped', 'user', user.user_id);
    await tx.query('COMMIT');
    console.log(
      'Initial admin created. Sign in with the email and password you entered.',
    );
  } catch (error) {
    await tx.query('ROLLBACK');
    throw error;
  } finally {
    tx.release();
  }
} catch (error) {
  console.error(
    error instanceof z.ZodError ? error.issues[0].message : error.message,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
