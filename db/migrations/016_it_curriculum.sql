ALTER TABLE modules ADD COLUMN curriculum_catalog boolean NOT NULL DEFAULT false;
ALTER TABLE modules ADD COLUMN curriculum_position integer NOT NULL DEFAULT 0;
-- A disabled internal owner lets the catalogue exist even before a lecturer is created.
-- The first real lecturer may claim only these unassigned catalogue modules.
DO $$
DECLARE owner_id uuid;
BEGIN
 SELECT user_id INTO owner_id FROM users WHERE role='lecturer' AND password_hash <> '!curriculum-owner-disabled!' ORDER BY created_date,user_id LIMIT 1;
 IF owner_id IS NULL THEN
  INSERT INTO users(email,password_hash,role,full_name) VALUES('curriculum-'||gen_random_uuid()::text||'@eduquest.invalid','!curriculum-owner-disabled!','lecturer','Curriculum Administrator') RETURNING user_id INTO owner_id;
 END IF;
 INSERT INTO modules(lecturer_id,module_code,module_name,join_code,study_track,study_year,curriculum,curriculum_catalog,curriculum_position)
 SELECT owner_id,c.code,c.name,replace(gen_random_uuid()::text,'-',''),'IT',c.year,true,true,c.position FROM (VALUES
('EQ-IT101','Information Systems',1,1),
('EQ-IT102','Maths',1,2),
('EQ-IT103','Programming',1,3),
('EQ-IT104','Web Technology',1,4),
('EQ-IT105','Networks',1,5),
('EQ-IT201','Programming',2,1),
('EQ-IT202','Database Systems',2,2),
('EQ-IT203','Information Systems',2,3),
('EQ-IT204','Cloud Computing',2,4),
('EQ-IT205','Networks',2,5),
('EQ-IT301','Programming',3,1),
('EQ-IT302','Mobile App Development',3,2),
('EQ-IT303','Operating Systems',3,3),
('EQ-IT304','Human Computer Interaction',3,4),
('EQ-IT305','Artificial Intelligence',3,5)
 ) AS c(code,name,year,position)
 ON CONFLICT(module_code) DO UPDATE SET module_name=EXCLUDED.module_name,study_track='IT',study_year=EXCLUDED.study_year,curriculum=true,curriculum_catalog=true,curriculum_position=EXCLUDED.curriculum_position;
END $$;
-- Preserve old sample rows/resources, but retire them from the active IT curriculum.
UPDATE modules SET curriculum=false WHERE study_track='IT' AND module_code LIKE 'SAMPLE-IT%';
INSERT INTO enrollments(student_id,module_id)
SELECT u.user_id,m.module_id FROM users u JOIN modules m ON m.curriculum_catalog=true AND m.study_track=u.study_track AND m.study_year=u.study_year WHERE u.role='student'
ON CONFLICT DO NOTHING;
