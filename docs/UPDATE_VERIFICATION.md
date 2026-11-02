# Module and AI update verification

Date: 1 November 2026 (Africa/Johannesburg)

- Full JavaScript suite passed: 163 unit/component tests and 174 database/API tests.
- An additional wrong-document worker regression was then added. All four worker tests passed in a targeted rerun on a freshly migrated database.
- Python service/extraction suite: 39 passed. One upstream Starlette/AnyIO deprecation warning remains.
- Six Chromium browser scenarios passed: uploaded-source provenance, existing student workflow and lecturer manual/generation/publication workflow, each at mobile and desktop sizes.
- The provenance browser test uploaded fresh biology notes, checked that the preview exactly matched them, generated three questions and verified all three excerpts existed in the upload. It checked that unrelated seeded database material was absent from the draft.
- Production build, configured TypeScript check and ESLint passed. The source was formatted with Prettier.
- All 15 migrations were applied successfully against isolated PGlite databases. The schema update is additive.
- A desktop screenshot was visually inspected for the preview, mode label, source count and supporting excerpts.

## Limits

No API key was supplied, so no paid live-provider call was made. Provider adapters are covered by fake-client tests; OpenAI setup instructions link to official documentation. Offline mode remains an explicitly labelled practice fallback. Exact excerpt matching and source fingerprints prove linkage to extracted text, not semantic correctness; lecturers must review the draft.

Email ownership is not newly verified in this update. Module allocation uses programme/year rather than an email address alone. Existing institutional email verification would need a separate SSO or verification integration.

Existing data, uploaded files and environment secrets are not included in the downloadable source ZIP. UPDATE_GUIDE.md explains how to preserve them and apply migration 015.
