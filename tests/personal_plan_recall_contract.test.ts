import fs from 'fs';
import path from 'path';
import { shouldShowLessonTeachingNote } from '../app/lesson_teaching_notes';
import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan phrase recall contract', () => {
  const navSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_navigation.ts'), 'utf8');
  const lessonSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1 = gavan.days[0];

  it('can model reinforcement as a separate recall task without depending on rejected content ids', () => {
    const recallTask = {
      ...day1.tasks[2],
      kind: 'plan_phrase_recall',
      destination: {
        type: 'plan_phrase_recall',
        lessonId: 'gavan_future_content_unit',
        requiredPhrases: 5,
        afterLessonId: 1,
      },
    } as any;

    expect(recallTask.kind).toBe('plan_phrase_recall');
    expect(recallTask.destination.type).toBe('plan_phrase_recall');
    if (recallTask.destination.type === 'plan_phrase_recall') {
      expect(recallTask.destination.lessonId).toBe('gavan_future_content_unit');
      expect(recallTask.destination.requiredPhrases).toBe(5);
    }
  });

  it('opens recall in the standalone personal plan exercise renderer', () => {
    expect(navSource).toContain("destination.type === 'plan_phrase_recall'");
    expect(navSource).toContain("pathname: '/personal_plan_exercise'");
    expect(navSource).toContain("rendererType: 'plan_phrase_recall'");
    expect(navSource).toContain("requiredCorrect: String(destination.requiredPhrases)");
  });

  it('passes the active plan instance through plan task routes', () => {
    expect(navSource).toContain('planInstanceId?: string');
    expect(navSource).toContain('planInstanceId');
    expect(lessonSource).toContain('planInstanceId?: string | string[]');
    expect(lessonSource).toContain('planInstanceId,');
  });

  it('keeps recall storage and hints separate from the first plan phrase pass', () => {
    expect(lessonSource).toContain('planPhraseMode?: string | string[]');
    expect(lessonSource).toContain("planPhraseMode === 'recall'");
    expect(lessonSource).toContain('plan_phrase_recall_');
    expect(lessonSource).toContain('buildPlanPhraseRecallOrder');
    expect(lessonSource).toContain('if (isPlanLessonTask || isPlanPhraseLessonTask || isPlanPhraseRecallTask) return;');
    expect(lessonSource).toContain("{!settings.hardMode && !isPlanPhraseRecallTask && status === 'playing' && shuffled.length > 0 && (");
  });

  it('keeps recall strict: no correct-answer teaching help, but wrong answers still get explanations', () => {
    expect(shouldShowLessonTeachingNote({ isPlanPhraseRecallTask: true, isRight: true })).toBe(false);
    expect(shouldShowLessonTeachingNote({ isPlanPhraseRecallTask: true, isRight: false })).toBe(true);
    expect(shouldShowLessonTeachingNote({ isPlanPhraseRecallTask: false, isRight: true })).toBe(true);

    expect(lessonSource).toContain('shouldShowLessonTeachingNote');
    expect(lessonSource).toContain('isPlanPhraseRecallTask');
  });

  it('returns missed recall phrases through the lesson error replay queue', () => {
    expect(lessonSource).toContain('errorQueueRef.current.push(progressCell)');
    expect(lessonSource).toContain('questionsSinceErrorRef.current >= ERROR_REPLAY_DELAY_ANSWERS');
    expect(lessonSource).toContain('replayCell = errorQueueRef.current[0]');
    expect(lessonSource).toContain('setOverridePhraseCell(replayCell)');
  });
});
