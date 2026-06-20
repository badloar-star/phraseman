import {
  reachedCourseLevel,
  isScenarioLevelUnlocked,
  dialogLevelsInOrder,
} from '../app/ai_dialog_level_lock';

// COURSE_LEVEL_RANGES: A1=[1,8], A2=[9,18], B1=[19,28], B2=[29,32]

describe('reachedCourseLevel', () => {
  it('пустой/невалидный прогресс → A1 (урок 1 открыт всегда)', () => {
    expect(reachedCourseLevel([])).toBe('A1');
    expect(reachedCourseLevel(null)).toBe('A1');
    expect(reachedCourseLevel(undefined)).toBe('A1');
    expect(reachedCourseLevel([NaN as unknown as number])).toBe('A1');
  });

  it('берёт уровень самого старшего открытого урока', () => {
    expect(reachedCourseLevel([1, 2, 3])).toBe('A1');
    expect(reachedCourseLevel([1, 9])).toBe('A2');
    expect(reachedCourseLevel([5, 19, 12])).toBe('B1'); // 19 — старший → B1
    expect(reachedCourseLevel([29])).toBe('B2');
    expect(reachedCourseLevel([8])).toBe('A1');
    expect(reachedCourseLevel([18])).toBe('A2'); // граница A2
  });

  it('игнорирует мусор в массиве, но учитывает валидные числа', () => {
    expect(reachedCourseLevel([1, 'x' as unknown as number, 19])).toBe('B1');
  });
});

describe('isScenarioLevelUnlocked', () => {
  it('Premium открывает любой уровень', () => {
    expect(isScenarioLevelUnlocked('B2', 'A1', true)).toBe(true);
    expect(isScenarioLevelUnlocked('B1', 'A1', true)).toBe(true);
  });

  it('без Premium: открыт уровень не выше достигнутого', () => {
    // достигнут A2
    expect(isScenarioLevelUnlocked('A1', 'A2', false)).toBe(true);
    expect(isScenarioLevelUnlocked('A2', 'A2', false)).toBe(true);
    expect(isScenarioLevelUnlocked('B1', 'A2', false)).toBe(false);
    expect(isScenarioLevelUnlocked('B2', 'A2', false)).toBe(false);
  });

  it('новичок (A1) видит только A1-сценарии', () => {
    expect(isScenarioLevelUnlocked('A1', 'A1', false)).toBe(true);
    expect(isScenarioLevelUnlocked('A2', 'A1', false)).toBe(false);
  });

  it('дошедший до B2 открывает всё и без Premium', () => {
    for (const lvl of ['A1', 'A2', 'B1', 'B2'] as const) {
      expect(isScenarioLevelUnlocked(lvl, 'B2', false)).toBe(true);
    }
  });

  it('неизвестный уровень сценария (вне A1–B2) не прячется молча', () => {
    expect(isScenarioLevelUnlocked('C1', 'A1', false)).toBe(true);
  });
});

describe('dialogLevelsInOrder', () => {
  it('канонический порядок A1→B2', () => {
    expect(dialogLevelsInOrder()).toEqual(['A1', 'A2', 'B1', 'B2']);
  });
});
