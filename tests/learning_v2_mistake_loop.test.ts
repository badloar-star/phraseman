import fs from 'node:fs';
import path from 'node:path';

const map = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'lesson', '[id].tsx'), 'utf8');
const node = fs.readFileSync(path.join(__dirname, '..', 'components', 'mistake-practice', 'MistakePracticeLoopNode.tsx'), 'utf8');
const legacySession = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'session', '[id].tsx'), 'utf8');
const mistakeSession = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_mistake_loop_runtime.ts'), 'utf8');

describe('Learning V2 optional mistake loop', () => {
  test('uses only current lesson active projection with a five-item threshold', () => {
    expect(map).toContain('mistakeLoopCount');
    expect(map).toContain('learningV2CourseLessonIdV1(lessonOrdinal)');
    expect(map).not.toContain('`lesson-${lessonOrdinal}`');
    expect(runtime).toContain('item.lessonId === input.lessonId');
    expect(map).toContain('loadLearningV2MistakeLoopCount');
    expect(map).toContain('mistakeLoopCount >= 5');
    expect(map).toContain('MistakePracticeLoopNode');
  });

  test('captures the canonical released lesson id and never resumes the cards draft in Learning V2', () => {
    expect(legacySession).toContain('lessonId: payload.lessonId');
    expect(legacySession).not.toContain('lessonId: "lesson-1"');
    expect(mistakeSession).toContain("const persistSession = entrySource === 'cards'");
  });

  test('does not enter the authored road item model or progression', () => {
    expect(node).toContain('Необязательная петля');
    expect(node).not.toContain('styles.eyebrow');
    expect(node).not.toContain('НЕОБЯЗАТЕЛЬНАЯ ПЕТЛЯ</Text>');
    const roadItemsDeclaration = map.slice(map.indexOf('const roadItems ='), map.indexOf('const pathIndexByItemId'));
    expect(roadItemsDeclaration).not.toContain('mistakeLoop');
  });

  test('supports locked Plus presentation and the shared session route', () => {
    expect(map).toContain("context: 'mistake_practice'");
    expect(map).toContain("pathname: '/mistake_practice_session'");
    expect(node).toContain('Plus');
  });
});
