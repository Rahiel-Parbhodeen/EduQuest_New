// @ts-nocheck - parameterised queries operate on runtime database records.
export async function claimUnassignedCurriculum(db, lecturerId) {
  await db.query(
    "UPDATE modules m SET lecturer_id=$1 FROM users owner WHERE m.lecturer_id=owner.user_id AND m.curriculum_catalog=true AND owner.password_hash='!curriculum-owner-disabled!'",
    [lecturerId],
  );
}
export async function syncCurrentCurriculum(db, studentId) {
  await db.query(
    "INSERT INTO enrollments(student_id,module_id) SELECT u.user_id,m.module_id FROM users u JOIN modules m ON m.study_track=u.study_track AND m.study_year=3 AND m.curriculum=true WHERE u.user_id=$1 AND u.role='student' ON CONFLICT DO NOTHING",
    [studentId],
  );
}
