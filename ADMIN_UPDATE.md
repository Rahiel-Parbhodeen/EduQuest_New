# Admin role and lecturer requests

## New features

- Students have a **Become a lecturer** tab. They enter their full name and upload a PDF or DOCX CV, up to 5 MB.
- One pending application is allowed per student. The student sees the status and any rejection reason, and can submit a new application after rejection (subject to the daily submission limit).
- Admins have **Lecturer requests**, **Users**, **Database** and **Profile** tabs. The request inbox refreshes automatically and supports pending/approved/rejected views.
- Approval changes the same account from student to lecturer in one database transaction. Existing sessions are revoked; the user signs in again to see lecturer navigation. Historical student records are retained.
- Rejection leaves the student role unchanged and shows the administrator's reason to the applicant.
- CVs are downloaded through authenticated routes. Only the applicant and admins can retrieve them. They are not public static uploads and are not sent by email.

## Upgrade your current project

1. Stop the app with Ctrl+C, then run `npm run db:stop` before backing up its database directory.
2. Back up your existing folder, including `.env`, `.pgdata`, `uploads` and `private-uploads` if it exists.
3. Extract the new ZIP separately. Copy its updated source and configuration files into your existing project, keeping your own `.env`, `.venv`, `.pgdata`, `uploads` and `private-uploads`.
4. Open a terminal in the project folder containing `package.json`, then run each command separately:

```powershell
npm ci
npm run db:start
npm run db:migrate
npm run admin:create
npm run dev
```

Migrations **017** and **018** add the admin role, lecturer applications and audit history. Existing earlier migrations remain included and will be applied only if missing. These migrations do not erase your accounts or academic data.

`admin:create` is for the **first admin only**. It asks for a new account email, first/last name and a strong password. Password entry is hidden. Use an email that does not already belong to another account. Once an admin exists, sign in to that account and use Users to promote additional admins. The command will not overwrite an existing account or password.

Do not rerun the demo seed over your own installation; it resets demo account values.

## Fresh local demonstration

For a new demo database, follow START_HERE.md and run `npm run seed` after migration. The default local-demo administrator is:

- Email: `demo-admin@example.com`
- Password: `EduQuestDemo123!`

These are demonstration credentials. For your own installation, use `npm run admin:create` to choose your own credentials. The existing demo lecturer/student logins remain available when demo seeding is used.

## Review a lecturer request

1. Sign in as admin and open **Lecturer requests**.
2. Open the applicant's CV using **Download CV**. Compare the submitted name and account details.
3. For approval, optionally enter a review note and select **Approve request**.
4. For rejection, enter a reason and select **Reject request**.
5. The approved user signs in again. If they need to teach existing modules, assign those modules to their lecturer account through Database. Approval does not take modules away from another lecturer automatically.

These are in-app requests and status updates; no email notification service is configured.

## Manage roles and passwords

- Open **Users**, search by name/email, select a role and choose **Save role**.
- Open **Reset password** on another account, enter and confirm a strong new password, then select **Reset user password**. All sessions for that account are revoked. Existing MFA remains enabled.
- Passwords are hashed and cannot be viewed. Use Profile and your current password to change your own password.
- An admin cannot change their own role through this screen. The server also prevents removing the last admin.
- Before changing a lecturer to a student/admin, transfer all their modules to another lecturer and finish their pending generation jobs.

## Edit database records

Open **Database**, choose a table, select **Edit record**, change the permitted fields and choose **Save record**. This edits existing rows; it is not a SQL console or a tool for changing the database schema.

Editable tables include users (profile fields), modules, enrolments, study groups, group memberships, resource titles, topics, quizzes, unused questions/options and game-type settings. Roles and passwords use their dedicated Users controls. Authentication secrets, stored file paths, audit history and academic/game history cannot be edited through the generic editor. Questions/options with recorded quiz attempts are protected; create a new quiz version instead.

To transfer a module, copy the destination lecturer's account ID from **Users → Account ID**, then edit the module's **Lecturer id** field in Database. The destination must be a lecturer. Related quiz ownership is updated in the same transaction. Generation jobs for that module must finish first.

Admin edits, role/password actions and application decisions are recorded in **admin_audit_log**, which can be viewed read-only through Database. Passwords and authentication secrets are never included in that audit data.

## Preserve CVs and existing features

CV files live in `private-uploads/lecturer-applications`; `APPLICATION_UPLOAD_DIR` can configure another private storage location. Keep that folder with your database backups. The downloadable source ZIP excludes submitted CVs and environment secrets. Existing CV records use their stored paths, so keep the existing installation directory when updating source files.

Your password-change form, year-specific IT modules, matching resource selections and prior document/AI improvements are retained.
