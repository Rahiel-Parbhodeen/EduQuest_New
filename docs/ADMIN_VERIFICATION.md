# Admin and lecturer-application verification

Date: 2 November 2026 (Africa/Johannesburg)

## Completed checks

- Full JavaScript unit/component suite: 165 passed.
- Full database/API suite: 191 passed, including 12 admin/security tests. All 18 migrations were applied to a fresh isolated PGlite database.
- Six mobile/desktop Chromium workflow scenarios passed: application approval with authenticated CV download; lecturer sign-in after approval; admin role/password/database edits; rejection with student feedback; and the existing password/curriculum workflow.
- Two additional mobile/desktop checks verified that existing private CV files cannot be fetched using direct Vite filesystem URLs.
- Initial-admin creation was executed successfully on a newly migrated database. A later attempt refused to overwrite an installation with existing admins.
- Production build, configured TypeScript check and ESLint passed. Source formatting was checked with Prettier.
- A mobile admin inbox screenshot was visually inspected.

## Security and consistency coverage

Tests verify unauthenticated/wrong-role denial; private CV ownership; CV name/type/size validation; one pending application; failed-upload cleanup; atomic approval and one-time decisions; rejection feedback and resubmission; session invalidation; self-role protection; password confirmation/strength/hashing; hidden password/MFA/session fields; unknown-table and protected-field rejection; module and quiz ownership transfer; append-only audit history; and protection of question marks/options after a recorded attempt. Admin text edits use the existing visible-text validation policy.

The multi-step password integration test uses a 15-second deadline for real bcrypt work on resource-limited machines. Its validation and security assertions remain unchanged.

## Scope and limits

Database management edits allowlisted fields in existing application records. It does not expose raw SQL, schema changes, authentication secrets or unrestricted deletion/grade rewriting. CVs are opaque private downloads for human administrator review; they are not automatically assessed by AI or sent by email. No paid AI or email-service request was made.

PGlite tests do not certify native PostgreSQL concurrency behaviour. The API uses transactions, row locks and a shared advisory lock for role-changing admin operations; native PostgreSQL deployment checks remain separate.

Original passwords, curriculum module lists and prior document-generation features are retained. The downloadable archive contains source and setup guidance, not live accounts, private CV files, database storage or environment secrets.
