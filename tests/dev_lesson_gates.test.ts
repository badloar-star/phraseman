import { projectDevLessonAccess } from '../app/dev_plus_controls';
import { requiresPremiumForLesson } from '../app/monetization_policy';

/**
 * зачем (Макеты f5564eafa, learn-012/013): в dev-сборке весь курс открыт (DEV_CONTENT_UNLOCK) — тап по экзамену вёл на экран
 * зачёта, окна A11 «Уровень пока закрыт» и A12 «Недоступно» были недостижимы. Подмена в памяти: lessonGates=real / legacyCap=N.
 */
const DEV_ACCESS = { devContentUnlock: true, noLimits: true, legacyFreeLessonCap: 3, freeLessonLimit: 3 } as const;

describe('projectDevLessonAccess — dev-подмена ворот уроков', () => {
  it('без подмены — прежнее поведение (Plus в dev: всё открыто; plus=off: Free с 3 уроками)', () => {
    expect(projectDevLessonAccess(DEV_ACCESS, 'granted', null)).toEqual({ devContentUnlock: true, noLimits: true, legacyFreeLessonCap: 3 });
    expect(projectDevLessonAccess(DEV_ACCESS, 'removed', null)).toEqual({ devContentUnlock: false, noLimits: false, legacyFreeLessonCap: 3 });
  });

  it('lessonGates=real при Plus — dev-открытие выключено (A11: экзамен A2 не открыт → окно «Уровень пока закрыт»)', () => {
    expect(projectDevLessonAccess(DEV_ACCESS, 'granted', { real: true, legacyCap: null }))
      .toEqual({ devContentUnlock: false, noLimits: false, legacyFreeLessonCap: 3 });
    expect(projectDevLessonAccess(DEV_ACCESS, 'inherit', { real: true, legacyCap: null }).devContentUnlock).toBe(false);
  });

  it('legacyCap=8 при plus=off — экзамен A1 без пейвола (A12: окно «Недоступно», а не покупка)', () => {
    const access = projectDevLessonAccess(DEV_ACCESS, 'removed', { real: false, legacyCap: 8 });
    expect(access.legacyFreeLessonCap).toBe(8);
    // Экзамен A1 стоит за уроком 8: со старым потолком 8 он не требует Plus.
    expect(requiresPremiumForLesson(8, access.legacyFreeLessonCap)).toBe(false);
    expect(requiresPremiumForLesson(8, 3)).toBe(true);
  });
});
