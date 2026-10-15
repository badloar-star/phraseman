import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 15.10, разбор красных наборов): карта урока V2 (app/learning-v2/lesson/[id].tsx), где жила петля ошибок,
// удалена сознательно 5bef1e710 («dead lesson map screen», §129) — проверки карты сняты вместе с экраном. Остальной смысл
// сторожа сохранён: урок из payload в сессии, «Мои ошибки» не продолжают черновик карточек, текст узла петли без капса,
// счёт петли — только по текущему уроку.
const node = fs.readFileSync(path.join(__dirname, '..', 'components', 'mistake-practice', 'MistakePracticeLoopNode.tsx'), 'utf8');
const legacySession = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'session', '[id].tsx'), 'utf8');
const mistakeSession = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_mistake_loop_runtime.ts'), 'utf8');

describe('Learning V2 optional mistake loop', () => {
  test('the lesson map screen stays removed (5bef1e710)', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'app', 'learning-v2', 'lesson', '[id].tsx'))).toBe(false);
  });

  test('counts only the current lesson', () => {
    expect(runtime).toContain('item.lessonId === input.lessonId');
  });

  test('captures the canonical released lesson id and never resumes the cards draft in Learning V2', () => {
    // зачем: 936b8c09b (30.08) обернул значение в String() ради типов — смысл тот же: урок из payload.
    expect(legacySession).toMatch(/lessonId: (?:String\()?payload\.lessonId/);
    expect(legacySession).not.toContain('lessonId: "lesson-1"');
    expect(mistakeSession).toContain("const persistSession = entrySource === 'cards'");
  });

  test('loop node copy: optional, no shouting caps, Plus presentation', () => {
    expect(node).toContain('Необязательная петля');
    expect(node).not.toContain('styles.eyebrow');
    expect(node).not.toContain('НЕОБЯЗАТЕЛЬНАЯ ПЕТЛЯ</Text>');
    expect(node).toContain('Plus');
  });
});
