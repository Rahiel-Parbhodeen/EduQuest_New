# Password and IT curriculum verification

Date: 2 November 2026 (Africa/Johannesburg)

- Full JavaScript unit/component suite: 165 passed.
- Full database/API suite: 179 passed against a fresh isolated PGlite instance, applying all 16 migrations.
- Eight Chromium browser scenarios passed at mobile and desktop sizes. These include second-year registration, matching Resource choices, third-year preview, password error/success feedback, old-password rejection and new-password login, plus the existing student, manual-quiz and uploaded-source workflows.
- Registration API tests cover the exact prescribed catalogue for years 1, 2 and 3. Another test checks year changes, and resource tests verify distinct module IDs and access separation for Programming in different years.
- Password tests cover authentication, incorrect current password, mismatch, strength, unchanged password, hashed storage, current-session preservation and revocation of other sessions.
- Production build, configured TypeScript check and ESLint passed. Prettier formatting was applied and checked.
- Mobile profile screenshot visually inspected. Fields clear after success; both feedback text and the new controls fit the mobile layout.

No paid AI request was made. The prior AI changes were retained but were not extended by this password/curriculum task. PGlite verification does not certify real PostgreSQL concurrency behaviour. Historical resources were preserved in their existing modules rather than automatically moved across years.
