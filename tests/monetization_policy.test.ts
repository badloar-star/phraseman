import {
  FREE_LESSON_LIMIT,
  buildPremiumLessonUnlocks,
  buildSequentialFreeLessonUnlocks,
  hasLegacyFreeLessonAccess,
  isFreeLesson,
  isLegacyLessonGrandfatheredOpen,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from '../app/monetization_policy';

describe('monetization_policy: первые три урока free, остальное Plus', () => {
  it('оставляет free только первые три урока', () => {
    expect(FREE_LESSON_LIMIT).toBe(3);
    for (const lessonId of [1, 2, 3]) {
      expect(isFreeLesson(lessonId)).toBe(true);
      expect(requiresPremiumForLesson(lessonId)).toBe(false);
      expect(lessonPaywallContext(lessonId)).toBeNull();
    }
    for (const lessonId of [4, 9, 19, 29, 32]) {
      expect(isFreeLesson(lessonId)).toBe(false);
      expect(requiresPremiumForLesson(lessonId)).toBe(true);
      expect(lessonPaywallContext(lessonId)).toBe('course_after_lesson3');
    }
  });

  // ВНИМАНИЕ: до 2026-09-20 этот тест требовал 'available' для уроков 2 и 3 —
  // т.е. охранял ОТМЕНЁННОЕ правило. Владелец 2026-09-20: безусловен только
  // урок 1; 2 и 3 без пейвола, но за 2★ (D121: 60%) или за 100 жемчужин.
  it('безусловно открыт только урок 1', () => {
    expect(resolveLessonAccess({ lessonId: 1, unlocked: false, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 2, unlocked: false, isPremium: false })).toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: 3, unlocked: false, isPremium: false })).toBe('progress_required');
  });

  it('уроки 2–3 открывает бронза или покупка, а не подписка', () => {
    expect(resolveLessonAccess({ lessonId: 2, unlocked: true, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 2, unlocked: false, purchased: true, isPremium: false })).toBe('available');
    // Пейвола на них нет: Free получает замок прогресса, а НЕ premium_required.
    expect(resolveLessonAccess({ lessonId: 3, unlocked: false, isPremium: true })).toBe('progress_required');
  });

  it('free направляется на Plus после третьего урока, а Plus сохраняет последовательный замок', () => {
    expect(resolveLessonAccess({ lessonId: 4, unlocked: true, isPremium: false })).toBe('premium_required');
    expect(resolveLessonAccess({ lessonId: 4, unlocked: false, purchased: true, isPremium: false })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: true })).toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: 32, unlocked: true, isPremium: true })).toBe('available');
  });

  it('free-список не открывает урок 4 старым прогрессом', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: [5, 5, 5], lessonCount: 4 })).toEqual([true, true, true, false]);
  });

  it('free-список без прогресса открывает ТОЛЬКО урок 1', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: [], lessonCount: 4 })).toEqual([true, false, false, false]);
  });

  // D121: 2★ = 60% правильных = оценка 3 из 5 (было 2 = 40%).
  it('free-список открывает урок 2 только от 2★ (60%) на первом', () => {
    expect(buildSequentialFreeLessonUnlocks({ scores: [2.9], lessonCount: 3 })).toEqual([true, false, false]);
    expect(buildSequentialFreeLessonUnlocks({ scores: [2.5], lessonCount: 3 })).toEqual([true, false, false]);
    expect(buildSequentialFreeLessonUnlocks({ scores: [3], lessonCount: 3 })).toEqual([true, true, false]);
    expect(buildSequentialFreeLessonUnlocks({ scores: [3, 3], lessonCount: 3 })).toEqual([true, true, true]);
  });

  it('D121: урок, уже открытый по старому порогу, не закрывается', () => {
    // Урок 2 лежит в сохранённом списке, на первом 2.5 (50%) — открыт по старому правилу.
    expect(buildSequentialFreeLessonUnlocks({ scores: [2.5], persistedUnlocked: [2], lessonCount: 3 }))
      .toEqual([true, true, false]);
    // Запись без оценки старого порога (≥40%) доступа не даёт.
    expect(buildSequentialFreeLessonUnlocks({ scores: [1.5], persistedUnlocked: [2], lessonCount: 3 }))
      .toEqual([true, false, false]);
    const plusScores = new Array(32).fill(0);
    plusScores[9] = 2;
    expect(buildPremiumLessonUnlocks({ scores: plusScores, persistedUnlocked: [11] })[10]).toBe(true);
    // ЗАМОК ВЛАДЕЛЬЦА 28.10 ~21:05 («Plus открывает все 32»): у Plus урок 11 открыт и без сохранённого списка и без бронзы на 10-м
    expect(buildPremiumLessonUnlocks({ scores: plusScores })[10]).toBe(true);
  });

  it('купленный за жемчужины урок 3 открывается без бронзы, но НЕ тянет соседей', () => {
    expect(
      buildSequentialFreeLessonUnlocks({ scores: [], purchasedLessons: [3], lessonCount: 4 }),
    ).toEqual([true, false, true, false]);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 28.10 ~21:05 («Plus открывает все 32») отменяет решение 2026-09-20 (Plus снимал пейвол, но не замок прогресса): Plus открывает все 32 сразу.
  it('Plus сразу открывает все 32 урока', () => {
    const unlocked = buildPremiumLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked.flatMap((open, index) => open ? [index + 1] : [])).toEqual(Array.from({ length: 32 }, (_v, i) => i + 1));
  });

  it('у Plus уроки 2–3 открыты и без бронзы (ЗАМОК ВЛАДЕЛЬЦА 28.10 ~21:05 («Plus открывает все 32»))', () => {
    const unlocked = buildPremiumLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked[1]).toBe(true);
    expect(unlocked[2]).toBe(true);
  });

  it('Plus открывает остальные уроки без бронзы на предыдущем (ЗАМОК ВЛАДЕЛЬЦА 28.10 ~21:05 («Plus открывает все 32»))', () => {
    const scores = new Array(32).fill(0);
    scores[8] = 3;
    scores[18] = 2.9;
    const unlocked = buildPremiumLessonUnlocks({ scores });
    expect(unlocked[9]).toBe(true); // урок 10
    expect(unlocked[19]).toBe(true); // урок 20 — бронза на 19-м не нужна
    expect(unlocked[27]).toBe(true); // и дальше по курсу
    expect(unlocked.every(Boolean)).toBe(true);
  });

  it('free-список держит замок на 2–3, закрывает старый прогресс и сохраняет купленные права', () => {
    // Без прогресса открыт только урок 1 (владелец 2026-09-20).
    const unlocked = buildSequentialFreeLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked.slice(0, 3)).toEqual([true, false, false]);
    expect(unlocked.slice(3).some(Boolean)).toBe(false);

    const withOldProgress = buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(5),
      persistedUnlocked: [4, 9, 19, 29],
      purchasedLessons: [5, 20],
      passedExams: { A1: true, A2: true, B1: true },
    });
    expect(withOldProgress.slice(0, 3)).toEqual([true, true, true]);
    expect(withOldProgress[3]).toBe(false);
    expect(withOldProgress[4]).toBe(true);
    expect(withOldProgress[8]).toBe(false);
    expect(withOldProgress[18]).toBe(false);
    expect(withOldProgress[19]).toBe(true);
    expect(withOldProgress[28]).toBe(false);
  });

  it('no-limits остаётся доступом для QA', () => {
    // tester_no_limits — ЯВНО включённый флаг с диска, его читает и lesson_menu
    // (isTesterNoLimitsActive). Обе стороны считают одинаково — доступ честный.
    expect(resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, noLimits: true })).toBe('available');
  });

  // зачем (владелец 22.09, «урок 2 — пустой экран и сразу кидает назад»):
  // этот тест раньше ЗАКРЕПЛЯЛ баг — он требовал, чтобы devMode открывал любой
  // урок. Но devMode это DEV_CONTENT_UNLOCK, безусловная константа дев-сборки,
  // а lesson_menu.tsx:547 её не читает и урок честно блокировал. Список пускал
  // тап, lesson_menu выбрасывал назад ([LESSON-LOCK] menu:bounce_back), модала
  // никто не показывал. Инвариант: если здесь 'available', lesson_menu ОБЯЗАН
  // открыться. Сторож ломать нельзя — он держит две логики в согласии.
  it('devMode НЕ открывает урок, закрытый по прогрессу (иначе тап уходит в пустой экран)', () => {
    expect(
      resolveLessonAccess({ lessonId: 32, unlocked: false, isPremium: false, devMode: true }),
    ).toBe('progress_required');
    // Урок 2 из жалобы владельца: закрыт прогрессом → список обязан показать модал.
    expect(
      resolveLessonAccess({ lessonId: 2, unlocked: false, isPremium: false, devMode: true }),
    ).toBe('progress_required');
    // Пройденный по прогрессу урок в дев-сборке открывается без подписки:
    // devMode снимает премиум-требование, но не замок прогресса.
    expect(
      resolveLessonAccess({ lessonId: 32, unlocked: true, isPremium: false, devMode: true }),
    ).toBe('available');
    // Без devMode тот же урок честно уходит на пейвол.
    expect(
      resolveLessonAccess({ lessonId: 32, unlocked: true, isPremium: false }),
    ).toBe('premium_required');
  });

  // D122 (владелец 2026-09-30): кому уроки 4–8 были бесплатны, тем доступ сохраняется.
  // До D122 этот тест требовал premium_required для урока 6 legacy-пользователя.
  it('legacy-потолок сохраняет бесплатный доступ старым пользователям (D122)', () => {
    expect(hasLegacyFreeLessonAccess(6, 6)).toBe(true);
    expect(hasLegacyFreeLessonAccess(7, 6)).toBe(false);
    expect(isLegacyLessonGrandfatheredOpen(6, 6)).toBe(true);
    expect(isLegacyLessonGrandfatheredOpen(2, 3)).toBe(false);
    expect(requiresPremiumForLesson(6, 6)).toBe(false);
    expect(requiresPremiumForLesson(7, 6)).toBe(true);
    expect(resolveLessonAccess({ lessonId: 6, unlocked: true, isPremium: false, legacyFreeLessonCap: 6 })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 7, unlocked: true, isPremium: false, legacyFreeLessonCap: 6 })).toBe('premium_required');
    const list = buildSequentialFreeLessonUnlocks({ scores: [], legacyFreeLessonCap: 6, lessonCount: 8 });
    expect(list).toEqual([true, true, true, true, true, true, false, false]);
  });

  it('новый аккаунт (потолок 3 или нет потолка) получает ровно 3 бесплатных урока (D122)', () => {
    for (const cap of [undefined, 3, 2, Number.NaN]) {
      expect(requiresPremiumForLesson(4, cap)).toBe(true);
      expect(resolveLessonAccess({ lessonId: 4, unlocked: true, isPremium: false, legacyFreeLessonCap: cap })).toBe('premium_required');
      expect(buildSequentialFreeLessonUnlocks({ scores: [], legacyFreeLessonCap: cap, lessonCount: 5 }))
        .toEqual([true, false, false, false, false]);
    }
    // Потолок никогда не выходит за 8.
    expect(requiresPremiumForLesson(9, 99)).toBe(true);
  });
});
