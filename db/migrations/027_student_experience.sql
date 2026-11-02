ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS meeting_at timestamptz;
CREATE TABLE IF NOT EXISTS student_direct_messages (
 message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sender_id uuid NOT NULL REFERENCES users(user_id),
 recipient_id uuid NOT NULL REFERENCES users(user_id),
 body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(sender_id<>recipient_id)
);
CREATE INDEX IF NOT EXISTS student_direct_messages_pair ON student_direct_messages(sender_id,recipient_id,created_at);
INSERT INTO enrollments(student_id,module_id) SELECT u.user_id,m.module_id FROM users u JOIN modules m ON m.study_track=u.study_track AND m.study_year=3 AND m.curriculum=true WHERE u.role='student' ON CONFLICT DO NOTHING;
