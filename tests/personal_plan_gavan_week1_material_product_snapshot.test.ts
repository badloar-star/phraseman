import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1MaterialProductSnapshot,
  GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH,
  writeGavanWeek1MaterialProductSnapshot,
} from '../tools/personal_plan_gavan_week1_material_product_snapshot';

const GENERATED_AT = '2026-06-03T12:00:00.000Z';

describe('Gavan week 1 material product snapshot', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH)) {
      rmSync(GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH, { force: true });
    }
  });

  it('summarizes the full non-live week 1 material chain for product review', () => {
    const snapshot = buildGavanWeek1MaterialProductSnapshot({
      generatedAt: GENERATED_AT,
    });

    expect(snapshot).toEqual(expect.objectContaining({
      kind: 'gavan_week1_material_product_snapshot',
      planId: 'gavan',
      weekId: 'gavan-week1',
      liveIntegration: false,
      generatedAt: GENERATED_AT,
    }));
    expect(snapshot.days).toHaveLength(7);
    expect(snapshot.days.map((day) => day.dayIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(snapshot.days.every((day) => day.sourceKind === 'material_candidate')).toBe(true);
    expect(snapshot.days[6]).toEqual(expect.objectContaining({
      dayId: 'gavan-week1-day7',
      status: 'day7_material_candidate_not_live',
      quizQuestionCount: 10,
    }));
    expect(snapshot.days.every((day) => day.phraseCount > 0)).toBe(true);
    expect(snapshot.days.every((day) => day.exerciseTypes.length >= 4)).toBe(true);
    expect(snapshot.summary).toEqual(expect.objectContaining({
      days: 7,
      materialCandidateDays: 7,
      blueprintCandidateDays: 0,
      liveIntegratedDays: 0,
      finalAudioReadyDays: 0,
      finalPronunciationReadyDays: 0,
    }));
  });

  it('marks media and production bridge work as explicit next actions instead of pretending release readiness', () => {
    const snapshot = buildGavanWeek1MaterialProductSnapshot({
      generatedAt: GENERATED_AT,
    });

    expect(snapshot.releaseReady).toBe(false);
    expect(snapshot.days.some((day) => day.nextActions.includes('generate_and_approve_audio'))).toBe(true);
    expect(snapshot.days.some((day) => day.nextActions.includes('build_final_quiz'))).toBe(true);
    expect(snapshot.days.some((day) => day.nextActions.includes('build_live_exercise_renderer'))).toBe(true);
  });

  it('writes deterministic JSON only under the temp product snapshot path', () => {
    const result = writeGavanWeek1MaterialProductSnapshot({
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-material-product-snapshot.json',
    ));
    expect(existsSync(GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_material_product_snapshot');
    expect(parsed.days).toHaveLength(7);
  });
});
