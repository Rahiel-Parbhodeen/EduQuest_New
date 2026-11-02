# Current admin and lecturer-request update

Read [ADMIN_UPDATE.md](ADMIN_UPDATE.md) first for administrator setup, lecturer applications and safe upgrade steps.

# Current password and curriculum update

Read [PROFILE_MODULES_UPDATE.md](PROFILE_MODULES_UPDATE.md) first for the new module lists, password changes and safe upgrade steps.

# Module and AI update

Read [UPDATE_GUIDE.md](UPDATE_GUIDE.md) before replacing an existing installation. For live AI setup, follow [AI_SETUP.md](AI_SETUP.md).

# EduQuest rebuild — start here

This is a clean source-code rebuild of your original IT project. The original ZIP was not modified.

## Run on Windows

Install Node.js 22.12+ (Node 24 recommended) and Python 3.11+. Open a terminal in this folder, then run:

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ai-service/requirements.txt
Copy-Item .env.example .env
npm run db:start
npm run db:migrate
npm run seed
npm run dev
```

Open http://127.0.0.1:5173. Keep the terminal open. The dev launcher automatically uses the project's `.venv`; activation is unnecessary. `PYTHON_COMMAND` can override the interpreter.

For macOS/Linux, use `python3 -m venv .venv`, `.venv/bin/python -m pip install -r ai-service/requirements.txt`, and `cp .env.example .env`.

Demo accounts (local demo only):

- Lecturer: `demo-lecturer@example.com`, password `EduQuestDemo123!`.
- Students: `demo-student-1@example.com` through `demo-student-5@example.com`, same password.

The seed is optional for a real installation. It creates clearly labelled **SAMPLE** IT/Business curriculum modules in years 1–4. These are examples, not an institution's official curriculum. The lecturer Modules screen can add real curriculum modules. Students with matching programme/year are enrolled automatically. Next-year modules are previews until the student's year changes.

## What changed

- Registration: first and last names, Unicode letters, no numbers; valid email syntax; 12–72-character passwords with uppercase, lowercase, numbers and special characters; password confirmation; programme and year.
- Profile: validated editing of your own name, programme and study year. Email is displayed rather than silently changed without mailbox verification.
- MFA: optional authenticator-app TOTP setup in Profile; verify setup before enabling; subsequent sign-ins require password plus a fresh code. Challenges expire after five minutes, allow five tries and cannot be reused. Enabling MFA revokes other sessions. Keep the setup key securely so you can recover access if you lose the app. There is no email/SMS sender or self-service MFA reset in this build.
- Modules: current modules shown immediately; next-year tab; lecturer curriculum setup; automatic programme/year enrolment.
- Resources: module tiles, name/code search, module dropdown, refreshed listing after upload.
- Groups: programme recommendations, language filtering, named leaders, current/next activities and meeting details. Only leaders can update their group's activities. Students cannot bypass enrolment by creating a group in an unrelated module.
- Quizzes: lecturer manual multiple-choice editor with marks, topics, difficulty, explanations and competitive mode. The existing six practice games remain available.
- Code lab: edit HTML/CSS/JavaScript, run the result in an isolated iframe, save a comparison point and see changed lines. Other languages are not executed. The comparison point is in-memory and line-based, not a Git diff.
- Document pipeline: extracts TXT/MD, text-based PDFs, DOCX paragraphs/tables and PPTX slide text. Rejects empty/unreadable files; scanned PDFs require external OCR. Office archive expansion, extraction time and text size are bounded.
- AI: actual source material, requested count/difficulty and explicit output schema reach configured live providers. Outputs are validated before creating a draft. Offline mode creates source-grounded fill-in-the-blank multiple-choice questions; it is an offline fallback, not a live LLM. If there is insufficient material it fails instead of inventing questions.

## Live AI configuration

Offline generation works without a key. To use a live provider, edit your local `.env`:

```dotenv
AI_PROVIDER=anthropic
AI_MODEL=your-provider-model-id
ANTHROPIC_API_KEY=your-key
```

Alternatively use `AI_PROVIDER=openai` with `OPENAI_API_KEY`, or `AI_PROVIDER=openai_compatible` with `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`. Use a model ID supported by your account; no provider key or live-model result is included in the download. Restart `npm run dev` after configuration changes. Live generation transmits the extracted learning material to that provider.

Lecturer workflow: Resources → choose a module → upload material → request questions → review the draft's difficulty/explanations → publish. For a completely hand-authored quiz use Quizzes → Create a quiz manually. Ask fewer questions if your document is short.

## Checks

```powershell
npm test
.\.venv\Scripts\python.exe -m pytest ai-service -q
npm run build
npm run typecheck
npx playwright install chromium firefox
npm run test:e2e
```

See `docs/REBUILD_VERIFICATION.md` for the checks actually performed for this download. Live paid-provider calls and real PostgreSQL concurrency need your own credentials/server and are not certified by offline checks.

## Updating an existing database

Back up first. Migration `014_student_experience.sql` adds the new profile, curriculum, group and MFA fields; earlier migrations are retained. Existing students choose programme/year in Profile to receive their curriculum. The clean ZIP includes neither your original database, uploads, secrets nor Git history. To retain your existing data, apply the new source and migration to a separately backed-up installation; do not overwrite your `.env`, uploads or `.pgdata`.

`npm run db:stop` stops the local database servers created by this copy. Production HTTPS deployments need `COOKIE_SECURE=true` and deployment-specific CORS/origin settings. The provided configuration is for local development.

The original project documentation and reports describe the baseline and may show older screens; this guide and the rebuild notes describe the delivered changes.
