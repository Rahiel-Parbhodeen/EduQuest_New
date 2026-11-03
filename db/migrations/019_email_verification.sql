ALTER TABLE users
  ADD COLUMN email_verified_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE email_verification_challenges (
  challenge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK(email=lower(email)),
  purpose text NOT NULL CHECK(purpose IN ('register','change_email')),
  user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash char(64) NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK(expires_at > requested_at),
  CHECK(consumed_at IS NULL OR consumed_at >= requested_at),
  CHECK((purpose='register' AND user_id IS NULL) OR (purpose='change_email' AND user_id IS NOT NULL))
);

CREATE INDEX email_verification_lookup
  ON email_verification_challenges(email,purpose,user_id,requested_at DESC);
