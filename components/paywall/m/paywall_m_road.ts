// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_road.ts — «Что ты скажешь через 30 дней»: по одной фразе из следующих уроков курса (день 10 · 20 · 30).
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q; владелец: «фразы следующих уроков курса, а не обещания»; координатор 25.10): человек видит настоящие фразы, которые его ждут за замком.
// Фразы даёт Learning V2 (learningV2UpcomingCoursePhrasesV1: локальный контент, без сети, только выпущенные уроки, перевод ru/uk); нет фраз — раздел не показываем,
// примеров не выдумываем. Чистый модуль: раскладка по дням; чтение курса — use_paywall_m_person.ts. Тест — tests/paywall_m_road_head_2026_10_25.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
export type PaywallMRoadItem = Readonly<{ day: number; lesson: number; english: string; translation: string }>;

/** Фраза из курса в виде, в котором её отдаёт Learning V2. */
export type PaywallMUpcomingPhrase = Readonly<{ en: string; translation: string; lessonOrdinal: number }>;

export const PAYWALL_M_ROAD_DAYS = [10, 20, 30] as const;

/** Фразы по порядку → дни 10 / 20 / 30; лишние отбрасываются, пустые и без перевода пропускаются (перевод обязателен: русский не подставляем чужому языку). */
export function paywallMRoadFromUpcoming(phrases: readonly PaywallMUpcomingPhrase[]): readonly PaywallMRoadItem[] {
  const usable = phrases.filter((p) => p.en.trim().length > 0 && p.translation.trim().length > 0);
  return usable.slice(0, PAYWALL_M_ROAD_DAYS.length).map((p, i) => ({
    day: PAYWALL_M_ROAD_DAYS[i],
    lesson: p.lessonOrdinal,
    english: p.en.trim(),
    translation: p.translation.trim(),
  }));
}
