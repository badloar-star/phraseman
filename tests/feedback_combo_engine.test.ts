/**
 * Юнит-тесты чистого combo-движка FeedbackKit (спек §2, §4 генератора).
 * Запуск: npx jest tests/feedback_combo_engine.test.ts --watchman=false
 */
import {
  createComboEngine,
  comboLevelFor,
  COMBO_SPARK_AT,
  COMBO_LIGHTNING_AT,
  COMBO_STORM_AT,
} from '../app/feedback/combo_engine';

describe('comboLevelFor', () => {
  it('maps values to levels by thresholds 3/5/10', () => {
    expect(comboLevelFor(0)).toBe(0);
    expect(comboLevelFor(2)).toBe(0);
    expect(comboLevelFor(3)).toBe(1);
    expect(comboLevelFor(4)).toBe(1);
    expect(comboLevelFor(5)).toBe(2);
    expect(comboLevelFor(9)).toBe(2);
    expect(comboLevelFor(10)).toBe(3);
    expect(comboLevelFor(42)).toBe(3);
  });

  it('uses the exported threshold constants', () => {
    expect(COMBO_SPARK_AT).toBe(3);
    expect(COMBO_LIGHTNING_AT).toBe(5);
    expect(COMBO_STORM_AT).toBe(10);
  });
});

describe('createComboEngine — increments', () => {
  it('increments value on each correct and exposes value/level getters', () => {
    const engine = createComboEngine();
    expect(engine.value).toBe(0);
    expect(engine.level).toBe(0);

    const e1 = engine.onCorrect();
    expect(e1.value).toBe(1);
    expect(e1.level).toBe(0);
    expect(engine.value).toBe(1);

    engine.onCorrect();
    expect(engine.value).toBe(2);
    expect(engine.level).toBe(0);
  });
});

describe('createComboEngine — thresholds crossed exactly once', () => {
  it('sets crossedThreshold=1 only on the step reaching 3', () => {
    const engine = createComboEngine();
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 1
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 2
    const spark = engine.onCorrect(); // 3
    expect(spark.crossedThreshold).toBe(1);
    expect(spark.level).toBe(1);
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 4 — still level 1
  });

  it('sets crossedThreshold=2 only on the step reaching 5', () => {
    const engine = createComboEngine();
    for (let i = 0; i < 4; i++) engine.onCorrect(); // -> 4
    const lightning = engine.onCorrect(); // 5
    expect(lightning.crossedThreshold).toBe(2);
    expect(lightning.level).toBe(2);
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 6
  });

  it('sets crossedThreshold=3 only on the step reaching 10', () => {
    const engine = createComboEngine();
    for (let i = 0; i < 9; i++) engine.onCorrect(); // -> 9
    const storm = engine.onCorrect(); // 10
    expect(storm.crossedThreshold).toBe(3);
    expect(storm.level).toBe(3);
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 11
  });

  it('never re-fires a threshold while staying within the same level band', () => {
    const engine = createComboEngine();
    const crossings: number[] = [];
    for (let i = 0; i < 12; i++) {
      const ev = engine.onCorrect();
      if (ev.crossedThreshold !== undefined) crossings.push(ev.value);
    }
    // Пороги пересечены ровно на 3, 5, 10 — по одному разу.
    expect(crossings).toEqual([3, 5, 10]);
  });
});

describe('createComboEngine — break (onWrong)', () => {
  it('reports broke + brokenFrom when a series is active', () => {
    const engine = createComboEngine();
    for (let i = 0; i < 6; i++) engine.onCorrect(); // value 6
    const broken = engine.onWrong();
    expect(broken.broke).toBe(true);
    expect(broken.brokenFrom).toBe(6);
    expect(broken.value).toBe(0);
    expect(broken.level).toBe(0);
    expect(engine.value).toBe(0);
  });

  it('does NOT report broke when there was no active series', () => {
    const engine = createComboEngine();
    const ev = engine.onWrong();
    expect(ev.broke).toBeUndefined();
    expect(ev.brokenFrom).toBeUndefined();
    expect(ev.value).toBe(0);
  });
});

describe('createComboEngine — reset & re-cross', () => {
  it('reset() clears value with no break event, and thresholds fire again afterwards', () => {
    const engine = createComboEngine();
    for (let i = 0; i < 5; i++) engine.onCorrect(); // level 2
    engine.reset();
    expect(engine.value).toBe(0);
    expect(engine.level).toBe(0);

    // После сброса пороги должны пересекаться заново.
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 1
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 2
    expect(engine.onCorrect().crossedThreshold).toBe(1); // 3 again
  });

  it('re-crosses spark threshold after an onWrong break', () => {
    const engine = createComboEngine();
    for (let i = 0; i < 3; i++) engine.onCorrect(); // reach 3 (spark)
    engine.onWrong(); // break to 0
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 1
    expect(engine.onCorrect().crossedThreshold).toBeUndefined(); // 2
    expect(engine.onCorrect().crossedThreshold).toBe(1); // 3 again
  });
});
