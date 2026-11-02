// @ts-nocheck - table metadata is allowlisted; Zod validates editable values.
import { z } from 'zod';
import { containsProfanity } from './profanity/index.js';
import { profileSchema } from './student-validation.js';
import { fail, audit, revokeAccess } from './admin-service.js';
import { syncCurrentCurriculum } from './curriculum.js';
const text = (max) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !containsProfanity(value),
      'Please use appropriate language.',
    );
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !containsProfanity(value),
      'Please use appropriate language.',
    );
const uuid = z.string().uuid();
const definitions = {
  users: {
    key: ['user_id'],
    hidden: [
      'password_hash',
      'mfa_secret',
      'mfa_pending_secret',
      'mfa_last_counter',
    ],
    fields: {
      full_name: profileSchema.shape.fullName,
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      study_track: z.enum(['IT', 'Business']).nullable(),
      study_year: z.number().int().min(1).max(4),
      extended_time: z.boolean(),
    },
  },
  modules: {
    key: ['module_id'],
    hidden: ['join_code'],
    fields: {
      module_name: text(120),
      module_code: text(30),
      lecturer_id: uuid,
      study_track: z.enum(['IT', 'Business']).nullable(),
      study_year: z.number().int().min(1).max(4),
      curriculum: z.boolean(),
    },
  },
  enrollments: {
    key: ['enrolment_id'],
    fields: { student_id: uuid, module_id: uuid },
  },
  study_groups: {
    key: ['group_id'],
    fields: {
      group_name: text(120),
      language: text(60),
      current_activity: text(500),
      next_activity: text(500),
      meeting_details: text(300),
    },
  },
  group_members: {
    key: ['group_id', 'student_id'],
    fields: { joined_date: z.string().datetime() },
  },
  resources: {
    key: ['resource_id'],
    hidden: ['file_location'],
    fields: { title: text(200) },
  },
  topics: { key: ['topic_id'], fields: { name: text(200) } },
  quizzes: {
    key: ['quiz_id'],
    fields: {
      title: text(200),
      status: z.enum(['draft', 'published']),
      closes_at: z.string().datetime().nullable(),
    },
  },
  questions: {
    key: ['question_id'],
    fields: {
      question_text: text(5000),
      marks: z.number().positive().max(10000),
      difficulty_level: z.number().int().min(1).max(5),
      explanation: optionalText(300).nullable(),
    },
  },
  question_options: {
    key: ['option_id'],
    fields: { option_text: text(2000), is_correct: z.boolean() },
  },
  game_types: {
    key: ['game_type_id'],
    fields: { display_name: text(120), is_enabled: z.boolean() },
  },
  games: { key: ['game_id'] },
  quiz_attempts: { key: ['attempt_id'] },
  student_answers: { key: ['answer_id'] },
  ai_generation_jobs: { key: ['job_id'] },
  game_sessions: { key: ['session_id'] },
  game_plays: { key: ['play_id'] },
  lecturer_applications: { key: ['application_id'], hidden: ['cv_path'] },
  admin_audit_log: { key: ['audit_id'] },
};
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name))
    throw Error('Invalid internal identifier');
  return '"' + name + '"';
};
export function tableDefinition(name) {
  const definition = Object.hasOwn(definitions, name)
    ? definitions[name]
    : null;
  if (!definition)
    fail(404, 'This table is not available in the admin browser.');
  return definition;
}
export async function listTables(db) {
  const rows = (
    await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
    )
  ).rows;
  const existing = new Set(rows.map((r) => r.table_name));
  return Object.entries(definitions)
    .filter(([name]) => existing.has(name))
    .map(([name, d]) => ({
      name,
      key: d.key,
      editableFields: Object.keys(d.fields || {}),
      readOnly: !d.fields,
    }));
}
export async function readTable(db, name, page) {
  const d = tableDefinition(name);
  const columns = (
    await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
      [name],
    )
  ).rows
    .map((r) => r.column_name)
    .filter((c) => !(d.hidden || []).includes(c));
  if (!columns.length) fail(404, 'Table not found.');
  const where =
    name === 'users'
      ? " WHERE password_hash<>'!curriculum-owner-disabled!'"
      : '';
  const rows = (
    await db.query(
      `SELECT ${columns.map(ident).join(',')} FROM ${ident(name)}${where} ORDER BY ${d.key.map(ident).join(',')} LIMIT 25 OFFSET $1`,
      [page * 25],
    )
  ).rows;
  const total = Number(
    (await db.query(`SELECT count(*) FROM ${ident(name)}${where}`)).rows[0]
      .count,
  );
  return {
    data: rows,
    columns,
    key: d.key,
    editableFields: Object.keys(d.fields || {}),
    page,
    total,
  };
}
export async function updateTable(tx, adminId, name, body) {
  const d = tableDefinition(name);
  if (!d.fields)
    fail(
      403,
      'This table is protected history. Use the dedicated application or user controls when available.',
    );
  const key = z
    .object(Object.fromEntries(d.key.map((k) => [k, uuid])))
    .strict()
    .parse(body.key);
  const changes = z
    .object(d.fields)
    .partial()
    .strict()
    .refine(
      (v) => Object.keys(v).length > 0,
      'Choose at least one editable field.',
    )
    .parse(body.changes);
  z.object({ key: z.unknown(), changes: z.unknown() }).strict().parse(body);
  const keys = Object.keys(key),
    values = Object.values(key);
  const condition = keys.map((k, i) => `${ident(k)}=$${i + 1}`).join(' AND ');
  const row = (
    await tx.query(
      `SELECT * FROM ${ident(name)} WHERE ${condition} FOR UPDATE`,
      values,
    )
  ).rows[0];
  if (!row) fail(404, 'Record not found.');
  if (name === 'users' && row.password_hash === '!curriculum-owner-disabled!')
    fail(409, 'The internal curriculum account cannot be changed.');
  if (['questions', 'question_options'].includes(name)) {
    const qid = name === 'questions' ? row.question_id : row.question_id;
    if (
      (
        await tx.query(
          'SELECT 1 FROM quiz_attempts a JOIN questions q ON q.quiz_id=a.quiz_id WHERE q.question_id=$1 LIMIT 1',
          [qid],
        )
      ).rowCount
    )
      fail(
        409,
        'Questions and answers with recorded attempts are protected. Create a new quiz version instead.',
      );
  }
  if (
    name === 'modules' &&
    changes.lecturer_id &&
    changes.lecturer_id !== row.lecturer_id
  ) {
    if (
      !(
        await tx.query(
          "SELECT 1 FROM users WHERE user_id=$1 AND role='lecturer' AND password_hash<>'!curriculum-owner-disabled!'",
          [changes.lecturer_id],
        )
      ).rowCount
    )
      fail(400, 'Choose an existing lecturer as module owner.');
    if (
      (
        await tx.query(
          "SELECT 1 FROM ai_generation_jobs j JOIN resources r ON r.resource_id=j.resource_id WHERE r.module_id=$1 AND j.status IN ('queued','running') LIMIT 1",
          [row.module_id],
        )
      ).rowCount
    )
      fail(
        409,
        'Finish pending generation jobs before transferring this module.',
      );
  }
  const fields = Object.keys(changes);
  await tx.query(
    `UPDATE ${ident(name)} SET ${fields.map((k, i) => `${ident(k)}=$${keys.length + i + 1}`).join(',')} WHERE ${condition}`,
    [...values, ...Object.values(changes)],
  );
  if (name === 'modules' && changes.lecturer_id)
    await tx.query('UPDATE quizzes SET created_by=$1 WHERE module_id=$2', [
      changes.lecturer_id,
      row.module_id,
    ]);
  if (name === 'users') {
    if (row.role === 'student') await syncCurrentCurriculum(tx, row.user_id);
    if (changes.email && changes.email !== row.email)
      await revokeAccess(tx, row.user_id);
  }
  const before = Object.fromEntries(fields.map((k) => [k, row[k]]));
  await audit(tx, adminId, 'record_updated', name, JSON.stringify(key), {
    fields,
    before,
    after: changes,
  });
  return { updated: true, message: 'Record updated successfully.' };
}
