ALTER TABLE ai_generation_jobs ADD COLUMN source_characters integer;
ALTER TABLE ai_generation_jobs ADD COLUMN source_sha256 text;
ALTER TABLE ai_generation_jobs ADD COLUMN generation_mode text;
ALTER TABLE questions ADD COLUMN source_excerpt text;
