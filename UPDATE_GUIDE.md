# Module and AI update

## What changed

- Module join-code prompts and lecturer join-code labels are removed. Current-year curriculum modules are assigned by programme and study year. Opening Modules also synchronises missing curriculum enrolments for existing students.
- Authenticator sign-in MFA is unchanged. Email syntax validation remains; this update does not claim or implement institutional email ownership verification.
- Resources shows the actual offline/live mode and a preview of the text extracted from each uploaded document.
- Generation records the source character count and fingerprint. Each newly generated question includes a verbatim supporting excerpt; source mismatches are rejected before the quiz is saved.
- Extraction errors explain unreadable/scanned documents and excessive size; offline generation explains insufficient material. PowerPoint slides are read in numeric slide order.
- See AI_SETUP.md for beginner-friendly live-provider setup. No API key is bundled and no paid request has been made.

## Update your current installation safely

1. Stop the running app with Ctrl+C. Back up your existing project, especially `.env`, `uploads` and `.pgdata`.
2. Extract this ZIP into a separate folder so you can inspect it. The source files are directly inside its single `EduQuest-Updated` folder.
3. Copy the updated source folders and root configuration files into your existing project folder, replacing their earlier versions. Keep your own `.env`, `.venv`, `uploads` and `.pgdata`. Do not replace `.env` with `.env.example`.
4. Open a terminal in the existing project folder containing `package.json`.
5. Run `npm ci`.
6. Run `.\.venv\Scripts\python.exe -m pip install -r ai-service/requirements.txt`.
7. Run `npm run db:start`, then `npm run db:migrate`. Migration **015_document_provenance.sql** adds source metadata fields; it does not erase data. Do not run the demo seed again on your own data.
8. Configure live AI using AI_SETUP.md if desired, then run `npm run dev`.

For a brand-new installation, follow the usual START_HERE.md instructions and optional demo seed. Existing generated quizzes keep their earlier content and do not acquire source excerpts automatically; regenerate from the original upload to obtain evidence.

Legacy database join-code columns and the older API enrolment endpoint are retained for compatibility with existing data/integrations. They are not used or displayed by the current module interface. Module identifiers such as IT101 are course names/codes, not join passwords.
