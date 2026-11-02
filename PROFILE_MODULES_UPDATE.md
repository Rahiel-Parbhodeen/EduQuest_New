# Password and IT curriculum update

## Profile passwords

Profile now has Current password, New password and Confirm new password fields. It reports an incorrect current password, a confirmation mismatch, a weak password, an unchanged password or a successful change. New passwords use the existing 12–72-character uppercase/lowercase/number/special-character policy, with a 72-byte bcrypt limit. The backend verifies the current password and updates its hash transactionally. A successful change keeps the current session and signs out other sessions; password fields are cleared in the browser.

## IT module lists

| Year | Modules                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 1    | Information Systems; Maths; Programming; Web Technology; Networks                                           |
| 2    | Programming; Database Systems; Information Systems; Cloud Computing; Networks                               |
| 3    | Programming; Mobile App Development; Operating Systems; Human Computer Interaction; Artificial Intelligence |

These are the prescribed IT modules. The Business curriculum is unchanged. Year 4 has no new prescribed IT list because none was supplied.

- Registration assigns the selected year's modules automatically.
- Existing students receive missing current-year modules when Modules or Resources loads.
- First-year students can preview second year; second-year students can preview third year.
- Modules and Resources use the same module records. Repeated names have distinct IDs and year labels, so Programming resources stay with the correct year.
- A profile year change updates the active curriculum view while preserving old enrolment records and results.
- Existing additional lecturer-created courses are preserved. Old sample IT modules and the old generic demo module are omitted from the student's active IT list. Lecturer access to those original records is retained.
- New curriculum modules exist after migration, without requiring the demo seed. If no lecturer exists yet, a disabled internal owner holds them; the first real lecturer viewing Modules takes ownership. On a demo installation, the demo lecturer owns the new modules after seeding.

## Updating your existing installation

1. Stop the app with Ctrl+C and back up the project, including `.env`, `uploads` and `.pgdata`.
2. Extract this ZIP into a separate folder. Its root contains `package.json` directly.
3. Copy the updated source/configuration files into your current project, replacing their earlier versions. Keep your existing `.env`, `.venv`, `uploads` and `.pgdata`.
4. Open a terminal in the folder containing `package.json` and run each command separately:

```powershell
npm ci
.\.venv\Scripts\python.exe -m pip install -r ai-service/requirements.txt
npm run db:start
npm run db:migrate
npm run dev
```

Do not run the demo seed again over your own data. Migration `016_it_curriculum.sql` installs the fifteen prescribed modules and enrols existing students. The earlier source-reading migration 015 is also included and will be applied if missing. Existing passwords remain unchanged until a user changes their own password.

Original uploads, quizzes and results stay attached to their original module; the migration does not guess which new year an old resource belongs to or silently move content between years. Lecturers can upload the correct material into the new year-specific module through Resources.

For a fresh installation, follow START_HERE.md and optionally run the demo seed. The prior code-free module workflow and uploaded-text/AI improvements are retained. Live AI configuration remains in AI_SETUP.md.
