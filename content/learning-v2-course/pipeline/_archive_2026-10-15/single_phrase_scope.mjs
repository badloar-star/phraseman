// Historical single-phrase migration covered only lessons 1–3. Lesson 4 has
// its own provenance audit and must never be admitted through this ledger.
export function isSinglePhraseMigrationLesson(lesson) {
  return /^l0[1-3]$/u.test(String(lesson ?? ""));
}
