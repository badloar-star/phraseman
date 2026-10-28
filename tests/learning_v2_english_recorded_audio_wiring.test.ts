import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'app/learning_v2_direct_session_player_v1.tsx'), 'utf8');

test('English and Spanish prepare audio using their own account-scoped progress', () => {
  expect(source).toContain('(studyTarget !== "en" && studyTarget !== "es")');
  expect(source).toContain('createLearningV2CourseLocalProgressStoreV1(AsyncStorage, studyTarget)');
  expect(source).toContain('runtime.prepare({ studyTarget, completedPrefixCount: progress.chainCompletedCount');
});

test('English and Spanish replay through the local recorded-audio path', () => {
  expect(source).toContain('systemTtsOnly: studyTarget !== "en" && studyTarget !== "es"');
  expect(source).toContain('learningV2Recorded: (studyTarget === "en" || studyTarget === "es")');
  expect(source).toContain('? { studyTarget, lessonOrdinal, sessionOrdinal }');
});
