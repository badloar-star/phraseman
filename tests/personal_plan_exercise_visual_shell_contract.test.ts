import fs from 'fs';
import path from 'path';

const sourcePath = path.join(process.cwd(), 'app', 'personal_plan_exercise.tsx');

describe('personal plan exercise visual shell', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('uses renderer visual contracts on the live exercise screen', () => {
    expect(source).toContain('planExerciseRendererContractForType');
    expect(source).toContain('chromeForExerciseType(currentExerciseType)');
    expect(source).toContain('PlanExerciseProgressRail');
    expect(source).toContain('chromeTitle');
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
    expect(source).toContain('<AiMistakeCard');
    expect(source).toContain('<PlanExerciseFeedbackInline');
    expect(source).toContain('visible={done}');
    expect(source.match(/PlanExerciseFeedbackModal/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('does not expose developer-only pronunciation copy to users', () => {
    expect(source).not.toMatch(/technical debt|debug copy|developer-only/i);
    expect(source).toContain('PlanPronunciationScoringResult');
  });

  it('makes every exercise shell track progress and expose clear touch targets', () => {
    expect(source).toContain('PlanExerciseProgressRail');
    expect(source).toContain('progressRail');
    expect(source).toContain('style={styles.progressRailTrack}');
    expect(source).toContain('accessibilityRole="progressbar"');
    expect(source).toContain('Прогресс задания: ${correct} из ${target}');
    expect(source).toContain('accessibilityLabel={`Добавить слово: ${word}`}');
    expect(source).toContain('accessibilityLabel="Убрать последнее слово"');
    expect(source).toContain('accessibilityLabel={`Выбрать ответ: ${option}`}');
  });

  it('drives the compact progress rail from persisted correct answers', () => {
    expect(source).toContain('correct={correctIds.length}');
    expect(source).toContain('target={targetCorrect}');
  });

  it('applies plan recovery writes from the live exercise screen with the active study target', () => {
    expect(source).toContain("import { useStudyTarget } from '../components/StudyTargetContext'");
    expect(source).toContain("import { createPlanRecoveryDefaultHandlers } from './personal_plan_recovery_default_handlers'");
    expect(source).toContain('const { studyTarget } = useStudyTarget();');
    expect(source).toContain('const recoveryWrite = useMemo(() => ({');
    expect(source).toContain("mode: 'apply' as const");
    expect(source).toContain('handlers: createPlanRecoveryDefaultHandlers({ studyTarget })');
    expect(source.match(/submitAndStorePlanExerciseAnswer\(session, \{/g)?.length ?? 0).toBe(4);
    expect(source.match(/\brecoveryWrite,/g)?.length ?? 0).toBe(4);
  });
});
