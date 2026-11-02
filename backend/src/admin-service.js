// @ts-nocheck - strict boundary validation is applied by the API routes.
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { strongPassword } from './student-validation.js';
export const roleSchema = z.enum(['student', 'lecturer', 'admin']);
export const resetSchema = z
  .object({
    newPassword: strongPassword.refine(
      (v) => Buffer.byteLength(v, 'utf8') <= 72,
      'Password is too long in UTF-8.',
    ),
    confirmNewPassword: z.string(),
  })
  .strict()
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: 'New passwords do not match.',
  });
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export const lockRoles = (tx) =>
  tx.query(
    "SELECT pg_advisory_xact_lock(hashtext('eduquest-admin-role-change'))",
  );
export async function audit(tx, adminId, action, type, id, details = {}) {
  await tx.query(
    'INSERT INTO admin_audit_log(admin_id,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5)',
    [adminId, action, type, String(id), JSON.stringify(details)],
  );
}
export async function revokeAccess(tx, userId) {
  await tx.query(
    'UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
    [userId],
  );
  await tx.query('DELETE FROM login_challenges WHERE user_id=$1', [userId]);
}
export async function changeRole(
  tx,
  adminId,
  userId,
  newRole,
  { applicationId = null } = {},
) {
  await lockRoles(tx);
  if (adminId === userId)
    fail(409, 'Use another administrator to change your own role.');
  const row = (
    await tx.query(
      'SELECT user_id,role,password_hash FROM users WHERE user_id=$1 FOR UPDATE',
      [userId],
    )
  ).rows[0];
  if (!row) fail(404, 'User not found.');
  if (row.password_hash === '!curriculum-owner-disabled!')
    fail(409, 'The internal curriculum account cannot be changed.');
  if (row.role === newRole) fail(409, 'This user already has that role.');
  if (
    row.role === 'admin' &&
    newRole !== 'admin' &&
    Number(
      (await tx.query("SELECT count(*) FROM users WHERE role='admin'")).rows[0]
        .count,
    ) <= 1
  )
    fail(409, 'At least one administrator must remain.');
  if (row.role === 'lecturer' && newRole !== 'lecturer') {
    const owned = await tx.query(
      'SELECT 1 FROM modules WHERE lecturer_id=$1 LIMIT 1',
      [userId],
    );
    const jobs = await tx.query(
      "SELECT 1 FROM ai_generation_jobs WHERE requested_by=$1 AND status IN ('queued','running') LIMIT 1",
      [userId],
    );
    if (owned.rowCount || jobs.rowCount)
      fail(
        409,
        'Transfer this lecturer’s modules and finish their pending generation jobs before changing their role.',
      );
  }
  await tx.query('UPDATE users SET role=$1::user_role WHERE user_id=$2', [
    newRole,
    userId,
  ]);
  await revokeAccess(tx, userId);
  if (!applicationId)
    await tx.query(
      "UPDATE lecturer_applications SET status='rejected',reviewed_by=$1,reviewed_at=now(),review_note='Closed because an administrator changed the account role.' WHERE applicant_id=$2 AND status='pending'",
      [adminId, userId],
    );
  await audit(tx, adminId, 'role_changed', 'user', userId, {
    previousRole: row.role,
    newRole,
    applicationId,
  });
  return { userId, role: newRole };
}
export async function resetPassword(tx, adminId, userId, password) {
  if (adminId === userId)
    fail(
      409,
      'Use Profile to change your own password with your current password.',
    );
  const row = (
    await tx.query(
      'SELECT user_id,password_hash FROM users WHERE user_id=$1 FOR UPDATE',
      [userId],
    )
  ).rows[0];
  if (!row) fail(404, 'User not found.');
  if (row.password_hash === '!curriculum-owner-disabled!')
    fail(409, 'The internal curriculum account cannot be changed.');
  const hash = await bcrypt.hash(password, 12);
  await tx.query('UPDATE users SET password_hash=$1 WHERE user_id=$2', [
    hash,
    userId,
  ]);
  await revokeAccess(tx, userId);
  await audit(tx, adminId, 'password_reset', 'user', userId);
}
