CREATE TABLE lecturer_applications (
 application_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 applicant_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
 applicant_name text NOT NULL CHECK(length(trim(applicant_name)) BETWEEN 1 AND 120),
 cv_path text NOT NULL,
 cv_original_name text NOT NULL,
 cv_type text NOT NULL CHECK(cv_type IN ('pdf','docx')),
 cv_size integer NOT NULL CHECK(cv_size BETWEEN 1 AND 5242880),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES users(user_id) ON DELETE RESTRICT,
 reviewed_at timestamptz,
 review_note text NOT NULL DEFAULT '',
 CHECK((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (status<>'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_pending_lecturer_application ON lecturer_applications(applicant_id) WHERE status='pending';
CREATE INDEX lecturer_application_queue ON lecturer_applications(status,submitted_at);
CREATE TABLE admin_audit_log (
 audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admin_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
 action text NOT NULL,
 target_type text NOT NULL,
 target_id text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION preserve_admin_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'admin audit history is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER admin_audit_append_only BEFORE UPDATE OR DELETE ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION preserve_admin_audit();
