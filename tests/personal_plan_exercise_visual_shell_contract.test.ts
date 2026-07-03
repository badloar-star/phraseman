import fs from 'fs';
import path from 'path';

const sourcePath = path.join(process.cwd(), 'app', 'personal_plan_exercise.tsx');

describe('personal plan exercise visual shell', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('uses renderer visual contracts on the live exercise screen', () => {
    expect(source).toContain('planExerciseRendererContractForType');
    expect(source).toContain('chromeForExerciseType(currentExerciseType)');
    expect(source).toContain('PlanExerciseModeStrip');
    expect(source).toContain('chrome.iconName');
  });

  it('keeps every exercise mode on a premium liquid UI surface', () => {
    expect(source).toContain('modeRow');
    expect(source).toContain('modeIcon');
    expect(source).toContain('liquidRail');
    expect(source).toContain('PlanExerciseFeedbackSurface');
    expect(source).toContain('PlanExerciseFeedbackModal');
    expect(source).toContain('<Modal');
    expect(source).toContain('modalBackdrop');
    expect(source).toContain('modalSheet');
    expect(source).toContain('feedbackSurface');
    expect(source).toContain('feedbackIcon');
    expect(source).toContain('feedbackSurface: \'liquid_panel\'');
    expect(source).toContain('minHeight: 72');
    expect(source).toContain('borderRadius: 30');
  });

  it('routes answer states through one shared feedback surface', () => {
    expect(source).toContain("tone=\"blocked\"");
    expect(source).toContain("tone=\"success\"");
    expect(source).toContain("tone=\"info\"");
    expect(source).toContain("tone={lastResult === 'correct' ? 'success' : 'error'}");
    expect(source).toContain('visible={Boolean(lastResult && explanation)}');
    expect(source).toContain('visible={done}');
    expect(source.match(/PlanExerciseFeedbackModal/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('does not expose developer-only pronunciation copy to users', () => {
    expect(source).not.toMatch(/scorer|technical debt|debug copy|developer-only/i);
    expect(source).toContain('Проверка произношения появится здесь только когда она будет честной.');
  });

  it('makes every exercise shell track progress and expose clear touch targets', () => {
    expect(source).toContain('PlanExerciseProgressRail');
    expect(source).toContain('progressRail');
    expect(source).toContain('progressFill');
    expect(source).toContain('accessibilityRole="progressbar"');
    expect(source).toContain('Прогресс задания: ${correct} из ${target}');
    expect(source).toContain('accessibilityLabel={`Добавить слово: ${word}`}');
    expect(source).toContain('accessibilityLabel="Убрать последнее слово"');
    expect(source).toContain('accessibilityLabel="Проверить ответ"');
    expect(source).toContain('accessibilityLabel={`Выбрать ответ: ${option}`}');
    expect(source).toContain('accessibilityLabel="Засчитать произношение"');
  });

  it('keeps the active progress cell on the answered prompt until next is pressed', () => {
    expect(source).toContain("const progressRailCurrent = lastResult === 'correct'");
    expect(source).toContain('current={progressRailCurrent}');
    expect(source).not.toContain('current={correctIds.length}\n          target={targetCorrect}');
  });

  it('applies plan recovery writes from the live exercise screen with the active study target', () => {
    expect(source).toContain("import { useStudyTarget } from '../components/StudyTargetContext'");
    expect(source).toContain("import { createPlanRecoveryDefaultHandlers } from './personal_plan_recovery_default_handlers'");
    expect(source).toContain('const { studyTarget } = useStudyTarget();');
    expect(source).toContain('const recoveryWrite = useMemo(() => ({');
    expect(source).toContain("mode: 'apply' as const");
    expect(source).toContain('handlers: createPlanRecoveryDefaultHandlers({ studyTarget })');
    expect(source.match(/submitAndStorePlanExerciseAnswer\(session, \{/g)?.length ?? 0).toBe(4);
    expect(source.match(/recoveryWrite,\n    \}\)\.catch/g)?.length ?? 0).toBe(4);
  });
});
