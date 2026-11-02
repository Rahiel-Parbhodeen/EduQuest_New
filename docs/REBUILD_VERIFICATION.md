# Rebuild verification — 1 November 2026

## Completed checks

- Production frontend build: passed with Vite 8.3.5.
- JavaScript unit/component suite: 160 passed.
- Database/API integration suite: 170 passed against a fresh PGlite database, applying all 14 migrations.
- Python AI service/extraction suite: 34 passed. One upstream Starlette/AnyIO deprecation warning remains.
- TypeScript check of configured backend/scripts: passed. The baseline Express runtime files retain their existing ts-nocheck strategy; runtime request validation is performed with Zod.
- ESLint: passed.
- Full source formatting check: passed after formatting the changed files.
- Runtime dependency audit (`npm audit --omit=dev`): zero vulnerabilities at the time of the check. The complete dependency audit reports five moderate development-tool findings; no high/critical findings.

## Browser checks

Chromium was exercised at 390px mobile, 768px tablet and 1280px desktop. The baseline authentication/game/axe checks and real lecturer manual-quiz/generation/publication flow passed. Student checks exercise registration, current/next-year curriculum, profile save, leader-owned group activities, language filtering, resource tiles and the sandboxed HTML/JavaScript preview. Selector corrections were needed because textarea/option contents are included by Playwright's exact label-text matcher; the final scenarios use accessible roles and scope assertions to the unique group created by each run.

Final browser result: all 30 Chromium scenarios passed across the three viewport sizes (27 in the full run and the three corrected student scenarios in a targeted rerun). The targeted student rerun also verified that the preview button executes JavaScript and changes the page. Mobile and desktop screenshots were visually inspected.

## Scope and limits

- All provider adapters were tested with fake clients; offline generation was exercised end-to-end. No paid live-provider request was made and no API key is included.
- Real PostgreSQL concurrency/row-lock behaviour was not tested; PGlite results do not certify it.
- Firefox was not run during this rebuild. The retained six-project browser configuration also supports it after `npx playwright install firefox`.
- PDF extraction was verified with a text-based PDF and a blank PDF. DOCX/PPTX XML extraction and text size/error handling were tested. OCR, embedded images and speaker notes are not supported.
- MFA uses authenticator TOTP; it is opt-in through Profile. Email syntax is checked, but mailbox ownership/email or SMS delivery is not implemented. Keep the setup key for recovery.
- Sample modules are demonstrative. Lecturers configure their institution's actual module list.
- Original ZIP preserved. The downloadable archive excludes secrets, original database files, uploads, installed dependencies, Git history and test caches.
