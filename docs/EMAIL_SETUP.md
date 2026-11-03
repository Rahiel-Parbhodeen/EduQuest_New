# Email verification setup

EduQuest sends verification codes before new student registration and before a signed-in user changes their email address. Configure these variables in the server's ignored `.env` file:

- `EMAIL_VERIFICATION_SECRET`: at least 32 characters; `npm run setup:token` creates it if missing.
- `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE`: mail server connection settings (`465` uses TLS by default).
- `SMTP_USER` and `SMTP_PASSWORD`: credentials when the mail server requires authentication.
- `EMAIL_FROM`: verified sender address accepted by the mail provider.

Restart the backend after configuring SMTP. Registration fails closed with a configuration message until mail delivery is available. Verification codes expire after ten minutes and are limited to five attempts.
