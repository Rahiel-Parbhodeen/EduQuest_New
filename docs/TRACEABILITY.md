# EduQuest traceability

Status reflects the current local implementation. PGlite evidence is explicitly not equivalent to real PostgreSQL concurrency evidence.

## Profanity field coverage

| User-visible field                | Backend authority                  | Evidence                                                                          |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| Full name at registration/profile | `nameSchema` / `noProfanity()`     | `backend/tests/profanity.test.js`; direct registration and profile-edit API tests |
| Module and study-group names      | `moduleSchema` / `groupSchema`     | API tests; profanity suite                                                        |
| Resource and quiz titles          | upload and quiz handlers           | API upload tests; profanity suite                                                 |
| Quiz questions/options and topics | quiz schema and AI worker re-check | direct API field matrix; worker integration tests                                 |

The backend never echoes the matched term or logs offending text. The filter has documented limits and requires periodic custom-list review.

| ID             | Implementation                                                    | Evidence/status                                                                                                                               |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01          | `backend/src/app.js` registration                                 | API path implemented; route tests pending                                                                                                     |
| FR-02          | `backend/src/app.js` login/logout/session cookie                  | API path implemented; route tests pending                                                                                                     |
| FR-03          | `requireRole` and session role                                    | API path implemented; route tests pending                                                                                                     |
| FR-04          | Module creation endpoint                                          | API path implemented; route tests pending                                                                                                     |
| FR-05          | Enrollment and module listing                                     | API path implemented; route tests pending                                                                                                     |
| FR-06          | Resource upload endpoint                                          | API path implemented; upload matrix pending                                                                                                   |
| FR-07          | Resource authorization                                            | automated: ownership and role API tests                                                                                                       |
| FR-08          | Study group create/join endpoints                                 | API path implemented; route tests pending                                                                                                     |
| FR-09          | Group resource visibility                                         | automated: group visibility API test                                                                                                          |
| FR-10          | AI service contracts                                              | `ai-service/app.py` implemented                                                                                                               |
| FR-11          | Quiz persistence and AI job integration                           | automated: `backend/tests/ai-worker.test.js`, `frontend/src/main.test.jsx`; games partial, pending team decision                              |
| FR-12          | Attempt start question delivery                                   | automated: `backend/tests/api.test.js`                                                                                                        |
| FR-13          | Answer persistence                                                | automated: `backend/tests/api.test.js`                                                                                                        |
| FR-14          | Server-side scoring                                               | automated: `backend/tests/api.test.js`                                                                                                        |
| FR-15          | Competitive attempt guard                                         | automated: DB invariant and API suites                                                                                                        |
| FR-16          | Derived leaderboard                                               | automated: ranking and module/group scope API test                                                                                            |
| FR-17          | Student leaderboard authorization                                 | automated: student scope and role boundary API test                                                                                           |
| FR-18          | Individual analytics                                              | automated: `/api/v1/me/analytics` API test                                                                                                    |
| FR-19          | Group analytics                                                   | automated: group average API test                                                                                                             |
| FR-20          | Module/topic analytics                                            | automated: lecturer weak-topic API test                                                                                                       |
| FR-21          | `backend/src/profanity/` and visible-text schemas                 | automated: field matrix API tests and worker re-checks                                                                                        |
| FR-22          | Infected solo engine, persistent sessions, API, and responsive UI | automated: engine property tests, DB invariants, API win/loss/exhaustion/access tests, frontend flow tests, Playwright/axe flow               |
| FR-23          | Memory Match solo engine, persistence, API, and responsive UI     | automated: engine/property, API, authorization-matrix, component, and six-project Playwright/axe coverage; rule mapping below                 |
| FR-24          | Timer Trivia solo engine, persistence, API, and responsive UI     | automated: 10 engine, 11 API, 4 component, authorization-matrix, and six-project Playwright/axe coverage; rule mapping below                  |
| FR-25          | Boss Battle solo engine, persistence, API, and responsive UI      | automated: 15 engine, 15 API, 7 component, authorization-matrix, and six-project Playwright/axe coverage; rule mapping below                  |
| FR-26          | Pixel Car Racer solo-vs-Bot engine, persistence, API, and UI      | automated: 10 engine, 9 API, 7 component, authorization-matrix, and six-project Playwright/axe coverage; rule mapping below                   |
| FR-27          | Multiplayer room layer                                            | not started; no room persistence, SSE, or multiplayer behavior                                                                                |
| FR-28          | Island Escape solo survival game                                  | automated: pure-engine/property tests, DB invariants, API access/win/setback/replay/isolation tests, component tests, Playwright/axe flow     |
| NFR01          | Async AI job architecture                                         | automated: `backend/tests/ai-worker.test.js`                                                                                                  |
| NFR02          | bcrypt and secure session cookies                                 | API implementation present                                                                                                                    |
| NFR03          | RBAC middleware                                                   | API implementation present                                                                                                                    |
| NFR04          | React design system                                               | automated: login axe passes in six browser/viewports; manual and remaining screens pending                                                    |
| NFR05          | Responsive CSS                                                    | automated: generation smoke passes at 390/768/1280 in both browsers; full-screen manual review pending                                        |
| NFR06          | Transactional submission                                          | API transaction path; real concurrency pending                                                                                                |
| NFR07          | Database constraints/triggers                                     | 10 DB invariant tests passed                                                                                                                  |
| NFR08          | Zod/Pydantic validation                                           | Current API/AI schemas implemented                                                                                                            |
| NFR09          | Upload size limit                                                 | Size limit implemented; magic-byte tests pending                                                                                              |
| NFR10          | Browser compatibility                                             | automated: 48 browser tests pass (24 Chromium, 24 Firefox), zero skips at 390/768/1280; complete product coverage pending                     |
| NFR11          | Separate frontend/backend/AI modules                              | Implemented                                                                                                                                   |
| NFR12          | Indexes and query paths                                           | Foundation indexes present                                                                                                                    |
| NFR13          | Backup/recovery                                                   | Native `npm run backup:pg`/`restore:pg` against real PostgreSQL; JSON fallback is separately tested and does not satisfy native-dump evidence |
| NFR14          | Resource-level authorization                                      | Automated aggregate projection evidence in `backend/tests/api.test.js`; the broader legacy matrix limitations remain documented               |
| NFR15          | Strict AI schemas                                                 | automated: Pydantic and worker tests for difficulty/explanation shape, instruction text, length, profanity, and non-persistence               |
| NFR16          | Generic error responses                                           | API error handler implemented                                                                                                                 |
| NFR17          | Profanity, generic rejection, cooldown                            | 25 profanity tests passed; API/AI integration pending                                                                                         |
| INV-01, INV-13 | Competitive uniqueness and atomic submission                      | PGlite passes; `npm run test:db:real` required for full row-lock verification                                                                 |

Infected, Island Escape, Memory Match, Boss Battle, Pixel Car Racer, and Timer Trivia are enabled and practice-only. Flashcards remains disabled; `speed_round` and `match_pairs` are removed. All game results remain isolated from quiz attempts, leaderboards, and scored analytics.

Automated axe/Playwright and the manual checklist remain required before NFR04/NFR05/NFR10 can be marked done. `npm run test:db:real` fails loudly unless `REAL_TEST_DATABASE_URL` is supplied; concurrency evidence is therefore marked “needs real PostgreSQL” under PGlite.

The executable matrix has 46 passing tests and includes all Pixel Racer, Boss Battle, Memory Match, Infected, and Island Escape routes plus the aggregate generic-game activity route. Dedicated game integration fixtures additionally prove real session/play ownership, module ownership, exact 422 unknown-field rejection, pre-answer response secrecy, and success shapes. The generic activity response is asserted to contain no student, state, question, or option data. Older routes retain the limitations documented by their existing matrix assertions, so NFR14 remains partial overall.

## Infected invariant evidence

| Invariant | Enforcement                                         | Automated evidence                                       |
| --------- | --------------------------------------------------- | -------------------------------------------------------- |
| INV-16    | Cure check plus engine clamp                        | `database.invariants.test.js`, `infected-engine.test.js` |
| INV-17    | Hearts check plus engine clamp                      | `database.invariants.test.js`, `infected-engine.test.js` |
| INV-18    | Answer trigger and transition table                 | DB raw SQL, API loss run                                 |
| INV-19    | Immutable answered turn, terminal engine/API guards | raw SQL, terminal/replay API tests                       |
| INV-20    | Unique session/question cards                       | raw SQL, card selection and exhaustion tests             |
| INV-21    | Dedicated pre-answer serializers                    | API disclosure assertions and frontend tests             |
| INV-22    | Separate game persistence                           | leaderboard/attempt isolation API test                   |
| INV-23    | Catalog lookup and enabled flag                     | raw SQL catalog assertion                                |

## Shared game-platform foundation evidence

| Invariant | Enforcement                                           | Automated evidence                                      |
| --------- | ----------------------------------------------------- | ------------------------------------------------------- |
| INV-24    | Difficulty level check and shared tier mapping        | DB, API, AI worker, and `game-foundation.test.js`       |
| INV-25    | Versioned JSONB plus game-owned Zod state schema      | DB and `game-foundation.test.js`                        |
| INV-26    | One in-progress solo play per game/user/quiz          | DB partial-unique test                                  |
| INV-27    | Uniquely ordered append-only move log                 | DB trigger/constraint test                              |
| INV-28    | Terminal generic plays reject moves                   | DB trigger test                                         |
| INV-29    | Lecturer progress is owned-module aggregate data only | Authorization-matrix ownership and response-shape tests |

## Island Escape invariant evidence

| Invariant | Enforcement                                    | Automated evidence                                    |
| --------- | ---------------------------------------------- | ----------------------------------------------------- |
| INV-30    | Immediate setback transition and bounded state | engine property/worked examples and raw SQL           |
| INV-31    | Monotonic score engine and update trigger      | property, replay, API, and raw SQL tests              |
| INV-32    | Strict Zod/SQL doubling-streak relationship    | engine transition/property and raw SQL tests          |
| INV-33    | Engine/state/SQL setback terminal bound        | engine, API fourth-setback run, and raw SQL tests     |
| INV-34    | Attempt-scoped unique question index           | selection/property and raw SQL tests                  |
| INV-35    | Pre-answer serializers omit correctness        | API, component, and Playwright assertions             |
| INV-36    | Separate practice-only persistence             | API leaderboard/attempt/analytics isolation assertion |

## Memory Match rule and invariant evidence

| Rule / invariant                                                            | Enforcement                                                    | Automated evidence                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Minimum six eligible pairs; question ≤140 and correct answer ≤60 characters | Server eligibility query and centralized config                | Engine eligibility test; API “refuses fewer than six eligible questions”; seed coverage assertion            |
| Question and answer card backs are distinguishable                          | Card `kind` in the concealed client view                       | Component availability/rendering test; six-project Playwright flow                                           |
| Unflipped text and pairing stay secret (INV-37)                             | Opaque IDs and dedicated client-view serializer                | Engine metadata test; start/GET/flip whole-response disclosure tests; Playwright pre-flip assertion          |
| Only opposite kinds can form a pair (INV-38)                                | Frozen pure-engine guard and API transaction                   | Engine invalid-flip test; API “rejects a same-kind second flip”                                              |
| Match locks cards; mismatch turns them down before the next flip            | Engine transition and persisted face state                     | API full-clear/mismatch tests; component match/mismatch tests; Playwright full flow                          |
| Score is `max(0, 10 × matches − mismatches)` (INV-39)                       | Server-owned engine state                                      | Engine scoring test; API full-clear and mismatch-clear tests                                                 |
| Resume and refresh preserve only face-up/matched disclosure                 | Partial active-play uniqueness and persisted state             | Same-play resume, API refresh, component refresh, and Playwright reload evidence                             |
| Replay/rapid delivery applies once (INV-40)                                 | Row lock, ordered append-only moves, replay response           | API rapid duplicate and replayed-identical-flip tests                                                        |
| Finished plays reject moves (INV-41)                                        | Engine/API terminal guards and generic DB trigger              | Engine terminal behavior and API finished-play rejection                                                     |
| Access uses `canAccessGame`                                                 | Enrollment, competitive-attempt, and lecturer ownership checks | Dedicated not-enrolled, before/after scored-attempt, and lecturer ownership API tests; Playwright lock state |
| Game output is practice-only (INV-42 / INV-09)                              | Generic game tables are separate from scored attempts          | Start and full-play isolation integration tests                                                              |
| Keyboard, reduced-motion, responsive, and axe coverage                      | Accessible React controls/CSS                                  | Six Playwright/axe projects: Chromium and Firefox at 390/768/1280; component reduced-motion test             |

## Boss Battle rule and invariant evidence

| Rule / invariant                                              | Enforcement                                                     | Automated evidence                                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Minimum 12 eligible questions                                 | Central config and server eligibility query                     | Engine refusal, API under-minimum, catalog eligibility, and seed coverage tests   |
| Tier damage table and bounded HP (INV-43/INV-44)              | Frozen pure engine using shared `tierOf()`                      | Six transition cases, clamp/property tests, API win/loss, component HP assertions |
| Server-shuffled questions never repeat (INV-46)               | Seeded question queue persisted in versioned state              | Engine property/no-repeat and API exhaustion tests                                |
| Terminal plays reject moves and replay is idempotent (INV-45) | Engine guard, row lock, append-only moves, generic DB trigger   | Terminal immutability, duplicate answer, refresh/rebuild, and authorization tests |
| Correctness remains hidden until answer (INV-47)              | Pending-question serializer omits correctness                   | API whole-response secrecy, component pre-answer, and six-project browser checks  |
| Practice output isolation (INV-48/INV-09)                     | Generic game storage is separate from quiz attempts             | API leaderboard/attempt/analytics isolation test                                  |
| Access uses `canAccessGame`                                   | Enrollment, competitive completion, and lecturer ownership      | Dedicated API access cases and competitive-lock browser assertion                 |
| Responsive and accessible presentation                        | Original SVG, textual HP, keyboard controls, live feedback, CSS | Component state tests and axe in Chromium/Firefox at 390, 768, and 1280 pixels    |

## Pixel Car Racer rule and invariant evidence

| Rule / invariant                                                          | Enforcement                                                      | Automated evidence                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Minimum 10 questions and ten race slots                                   | Central config and server eligibility query                      | Engine refusal, API under-minimum, seed assertion, and competitive-lock browser flow |
| Speed stays 1..5; distance is monotonic (INV-49)                          | Frozen pure engine clamps and versioned state schema             | Transition bounds and property tests; component/API state assertions                 |
| Score is server-owned and never negative (INV-50)                         | Strict answer schema and pure scoring transition                 | Forged-field matrix, property, API, and UI tests                                     |
| Four-correct streak activates nitro on the next question (INV-51)         | Ordered transition using one centralized config                  | Worked seven-answer finish, nitro start/end, component, and Playwright tests         |
| Nitro doubles distance/points and correct answers consume two slots       | Engine transition and persisted slot count                       | Worked-example engine/API tests and stateful browser flow                            |
| Player and deterministic Bot share one question list (INV-53)             | Server selection plus Bot correctness-only RNG                   | Shared-list regression, deterministic Bot, and no-repeat tests                       |
| Terminal moves reject; duplicate delivery is idempotent (INV-52)          | Engine guard, row lock, append-only moves, generic DB trigger    | Terminal/replay engine and API tests                                                 |
| Correctness remains hidden until answer (INV-54)                          | Pending-question serializer                                      | Whole-response API, component, and Playwright assertions                             |
| Practice results are isolated (INV-55/INV-09)                             | Generic game tables remain separate from scored quiz persistence | API leaderboard/attempt/analytics isolation test                                     |
| Keyboard, textual status, reduced motion, and responsive/axe presentation | Accessible controls, CSS media query, live feedback              | Component tests and Chromium/Firefox axe flows at 390, 768, and 1280 pixels          |

FR-22 Stage 1 gate evidence: 131 JavaScript tests, 4 Python tests, and 18 browser tests passed with zero skips. Lint, Prettier, TypeScript, and the production frontend build also pass. Earlier assertion totals were manually estimated and are not treated as verified behavioral evidence.

FR-23–FR-27 Stage 0 gate evidence: 141 JavaScript tests, 4 Python tests, and 18 Chromium/Firefox browser tests passed with zero skips. Lint, Prettier, TypeScript, and the production frontend build passed. This was foundation evidence only; Memory Match has since passed its individual gate, while the other three solo games and multiplayer remain not started.

FR-28 gate evidence: 177 JavaScript tests, 4 Python tests, and 24 Chromium/Firefox browser tests passed with zero skips. Island-specific evidence includes 14 engine/property tests, 11 API integration tests, DB INV-30–INV-34 assertions, component coverage for question/answer/setback/terminal/resume/error states, and axe/keyboard checks at 390/768/1280. All 35 inventoried routes pass the executable authorization-matrix guard. Lint, Prettier, TypeScript, and production build pass.

FR-23 gate evidence: 208 JavaScript tests passed with zero skips (89 pure/frontend and 119 DB/API). Memory Match contributes 4 engine tests, 18 API integration tests, 6 component tests, and coverage in the 40-test executable authorization matrix. The complete browser gate passed 30/30 project runs: 15 Chromium and 15 Firefox at 390, 768, and 1280 pixels, including Memory Match full clear, mismatch, refresh, keyboard operation, concealment, terminal state, competitive lock, and axe analysis. Lint, Prettier, TypeScript, and production build pass.

FR-25 gate evidence: three consecutive complete pre-enable gates each passed lint, Prettier, TypeScript, production build, 248/248 JavaScript tests with zero skipped (111 pure/frontend and 137 DB/API), and 36/36 Playwright/axe project runs. Boss Battle contributes 15 engine tests, 15 API tests, 7 component test cases, three authorization-matrix routes, and one full flow in each Chromium/Firefox viewport at 390, 768, and 1280 pixels. Migration 010 enables the catalog entry only after those gates passed.

FR-26 gate evidence: three consecutive complete pre-enable gates each passed lint, Prettier, TypeScript, production build, 277/277 JavaScript tests with zero skipped (128 pure/frontend and 149 DB/API), and 42/42 Playwright/axe project runs. Pixel Racer contributes 10 engine/property tests, 9 API integration tests, 7 component test cases, three authorization-matrix routes, and one stateful nitro/race/competitive-lock flow in each Chromium/Firefox viewport at 390, 768, and 1280 pixels. Migration 011 enables the catalog entry only after those gates passed.

FR-24 gate evidence: Timer Trivia contributes 10 engine/property tests, 11 API integration tests, 7 frontend component/visual tests, four authorization-matrix routes, and 6/6 targeted Playwright/axe runs in Chromium and Firefox at 390, 768, and 1280 pixels. `frontend/src/timer-trivia.test.jsx` separately proves one-time 10-second/5-second announcements, refresh persistence, and extended-time thresholds; the Playwright flow asserts both threshold messages. Migration 013 enables the catalog entry only after the three complete gates pass. The board, server deadline, timeout, extended-time preference, cell reuse, pre-answer secrecy, and practice-data isolation are covered by the listed engine/API/browser tests.

## Rebuild requirements

| Requirement                       | Implementation                                     | Evidence                                                               |
| --------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Registration/profile validation   | student-validation.js, experience.jsx, profile API | mfa.test.js, experience.test.js, experience.test.jsx                   |
| TOTP multifactor authentication   | mfa.js, experience.js, Profile                     | RFC-vector unit tests and full login challenge/replay integration test |
| Current and next-year modules     | migration 014, curriculum routes, Curriculum       | experience.test.js, rebuild.spec.js                                    |
| Resource tiles/search/dropdown    | Resources                                          | rebuild.spec.js                                                        |
| Language/leader/activity groups   | StudyGroups, experience.js                         | experience.test.js, rebuild.spec.js                                    |
| Manual quizzes                    | ManualQuiz and existing quiz API                   | API regression suite, rebuild.spec.js                                  |
| Working material-based generation | extract_text.py, ai-worker.js, provider prompts    | test_rebuild.py, AI worker tests, browser generated-draft flow         |
| Interactive code changes          | CodeLab                                            | experience.test.jsx, rebuild.spec.js                                   |

## Module and source-reading update

| Requirement                           | Implementation                                     | Verification                                                           |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| No join-code UI                       | Curriculum; module enrolment synchronisation       | experience.test.jsx, experience.test.js                                |
| Show actual uploaded text             | document-text.js; text-preview endpoint            | preview ownership/error API tests; provenance.spec.js                  |
| Explain offline/live mode             | /status; generation-status proxy; GenerationNotice | test_rebuild.py; browser test                                          |
| Questions linked to provided material | source_excerpt; source SHA-256; migration 015      | wrong-source worker test; Python quote test; fresh-upload browser test |
| Beginner live AI setup                | AI_SETUP.md                                        | official model documentation checked; no paid calls made               |

## Password and IT curriculum requirements

| Requirement                                | Implementation                                | Evidence                                                                      |
| ------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------- |
| Current/new/confirm password with feedback | Profile PasswordChange; PUT /profile/password | password-curriculum.test.js; experience.test.jsx; password-curriculum.spec.js |
| First/second/third-year lists              | migration 016 and curriculum synchronisation  | registration API tests for all three years                                    |
| Preview next year                          | Curriculum year tabs                          | first-year rebuild browser test; second-year password-curriculum browser test |
| Matching resource modules                  | shared module endpoint and year-aware labels  | per-year resource API isolation tests; browser resource selector assertions   |

## Admin and lecturer requests

| Requirement                       | Implementation                                 | Evidence                                                        |
| --------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Admin role and user management    | migrations 017/018; admin.js; admin-service.js | admin.test.js access, role, reset and session tests             |
| Student name/CV application       | LecturerApplication; private multipart route   | upload type/size/name/duplicate tests; admin.spec.js            |
| Accept/reject and role switch     | AdminRequests; transactional review service    | approval/rejection API tests and two-context browser flows      |
| Edit application database records | AdminDatabase; admin-tables.js                 | protected-field, allowlist, transfer and audit tests            |
| Initial admin setup               | admin:create CLI                               | successful initial-admin creation on isolated migrated database |


## Student and lecturer updates (2026-11-02)
Year-three module/resource views use the existing catalogue, without deleting other years. Lecturer module names are validated by year; internal codes are generated for compatibility. Private document access checks enrolment and group membership. Student direct messaging checks roles, recipients, profanity and rate limits. Meetings require English/Afrikaans/Zulu and a future timestamp. Existing records are preserved.
