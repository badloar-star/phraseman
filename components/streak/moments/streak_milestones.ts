// ═══════════════════════════════════════════════════════════════════════════
// streak_milestones.ts — чистые данные рубежей серии дней (эталон docs/design/v2-app/streak-milestones.html, 19 рубежей).
//
// зачем (владелец 14.10: «перенести полноценно все модалы, точно по макетам»; координатор): уровень праздника растёт с редкостью рубежа —
// малый тост ≤ 1,5 с, средний ≈ 3 с, большой ≈ 5–6 с, «Год»/«Два года»/«Легенда» ≈ 7–9 с с «Пропустить». Список — ровно образца (730, а не 750/700 каталога достижений:
// сведение каталога — после R1 у Ядра). Здесь нет вида и нет побочных эффектов: решения «какая сцена, сколько длится, какая стадия огня».
// ═══════════════════════════════════════════════════════════════════════════

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 50, 100, 150, 200, 250, 300, 365, 400, 500, 600, 730, 800, 900, 1000] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/** Сцена рубежа: тост на Главной, экран среднего/большого уровня или собственная сцена. */
export type StreakMomentKind = 'toast' | 'medium' | 'big' | 'half500' | 'year' | 'twoYears' | 'legend';

const KIND: Readonly<Record<StreakMilestone, StreakMomentKind>> = {
  1: 'toast', 3: 'toast', 7: 'big', 14: 'toast', 30: 'big', 50: 'medium', 100: 'big', 150: 'toast', 200: 'medium', 250: 'toast',
  300: 'medium', 365: 'year', 400: 'medium', 500: 'half500', 600: 'medium', 730: 'twoYears', 800: 'medium', 900: 'medium', 1000: 'legend',
};

/** Полная длительность сцены, мс (эталон: тост ≤ 1,5 с; средний ≈ 3; большой ≈ 5; год 8,5; два года 7; легенда 9). */
export const STREAK_MOMENT_DURATION_MS: Readonly<Record<StreakMomentKind, number>> = {
  toast: 1500, medium: 3000, big: 5000, half500: 5500, year: 8500, twoYears: 7000, legend: 9000,
};

/** Стадии огня образца: 0 обычный → 1 яркий (7) → 2 синий (30) → 3 белый (100) → 4 звёздный (365) → 5 золотой (1000). */
export type StreakFlameStage = 0 | 1 | 2 | 3 | 4 | 5;
export function streakFlameStage(days: number): StreakFlameStage {
  return days >= 1000 ? 5 : days >= 365 ? 4 : days >= 100 ? 3 : days >= 30 ? 2 : days >= 7 ? 1 : 0;
}

export function isStreakMilestone(days: number): days is StreakMilestone {
  return (STREAK_MILESTONES as readonly number[]).includes(days);
}

export function streakMomentKind(milestone: StreakMilestone): StreakMomentKind {
  return KIND[milestone];
}

/** Следующий рубеж после `days`; после 1000 — null (дальше только Легенда). */
export function nextStreakMilestone(days: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m > days) ?? null;
}

/** Рубежи, у которых в каталоге достижений есть своя ачивка `streak_N` (achievement_catalog_v2); показываем иконку только у них. */
export const STREAK_MILESTONES_WITH_ACHIEVEMENT: readonly StreakMilestone[] = [3, 7, 14, 30, 100, 365, 1000];
export function streakAchievementId(milestone: StreakMilestone): string | null {
  return STREAK_MILESTONES_WITH_ACHIEVEMENT.includes(milestone) ? `streak_${milestone}` : null;
}

/** «Поделиться» есть у рубежей-событий (образец: 100, 365, 500, 730, 1000). */
export const STREAK_MILESTONES_WITH_SHARE: readonly StreakMilestone[] = [100, 365, 500, 730, 1000];

/** Метки хронометража: когда в сцене наступает следующий такт (мс от начала). Совпадают с тайм-листом образца. */
export type StreakCue = Readonly<{ at: number; id: string }>;
export const STREAK_MOMENT_TIMELINE: Readonly<Record<StreakMomentKind, readonly StreakCue[]>> = {
  toast: [{ at: 300, id: 'burst' }],
  medium: [{ at: 300, id: 'burst' }, { at: 700, id: 'text' }],
  big: [{ at: 800, id: 'morph' }, { at: 1400, id: 'text' }, { at: 1600, id: 'extra' }],
  half500: [{ at: 300, id: 'ring' }, { at: 1900, id: 'burst' }, { at: 2300, id: 'text' }],
  year: [{ at: 300, id: 'months' }, { at: 3600, id: 'act2' }, { at: 4400, id: 'morph' }, { at: 6800, id: 'act3' }],
  twoYears: [{ at: 300, id: 'months' }, { at: 3400, id: 'fireworks' }, { at: 4200, id: 'text' }],
  legend: [{ at: 900, id: 'morph' }, { at: 2800, id: 'act2' }, { at: 3600, id: 'fire1' }, { at: 4100, id: 'fire2' }, { at: 4600, id: 'fire3' }, { at: 6400, id: 'act3' }],
};

/** Месяцы кольца года: 12 на год (365) и 24 на два (730). Шаг зажигания, мс (образец: 240 и 120). */
export const STREAK_MONTH_ARCS = { year: { rings: 1, stepMs: 240 }, twoYears: { rings: 2, stepMs: 120 } } as const;
