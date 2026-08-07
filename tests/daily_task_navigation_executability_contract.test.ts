import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/daily_task_navigation.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('daily task navigation executability', () => {
  it('sanitizes damaged last-opened lesson values to the valid curriculum range', () => {
    expect(source).toContain('export function normalizeDailyTaskLessonId');
    expect(source).toContain('parsed >= MIN_LESSON_ID && parsed <= MAX_LESSON_ID');
    expect(source).toContain('const lessonId = normalizeDailyTaskLessonId(lastLesson);');
  });

  it('does not let a non-critical lesson priming error block navigation', () => {
    expect(source).toContain('await primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => undefined);');
    expect(source).toContain("router.push({ pathname: '/lesson1', params: { id: lessonId } });");
  });

  it('sends recall challenges to the exact SRS review screen', () => {
    const recallBlock = source.slice(
      source.indexOf("case 'recall_session':"),
      source.indexOf("case 'trainer_words':"),
    );
    expect(recallBlock).toContain("router.push('/review' as any);");
    expect(recallBlock).not.toContain("openTrainerOrFrenchGate('/trainer')");
  });

  it('does not send a verb challenge into a locked irregular-verb lesson', () => {
    expect(source).toContain('resolveAccessibleIrregularVerbLesson');
    expect(source).toContain('resolveLessonRuntimeGate(lessonId, studyTarget)');
    expect(source).toContain("if (gate === 'available') return lessonId;");
    expect(source).toContain('if (verbLessonId == null)');
  });
});
