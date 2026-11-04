/**
 * зачем (владелец 04.11, «энергия от Пика»; замок 28.10 «запас ровно 5» отменён): запас энергии = 5 + бонус Пика (не-Plus).
 * Бонус — сколько лиг человек набрал ПОСЛЕ выхода правила: +1 за каждое повышение, −1 за каждое понижение, не ниже 0, не выше 11.
 * Хранение без чтений и без двойного счёта: финализ пишет в leaderboard/{uid}.spireEnergyDeltas.{lang}.{weekId} = ±1 (ключ недели —
 * повтор финализа перезаписывает ту же запись, а не прибавляет второй раз). Пик один на все языки → берётся максимум по языкам
 * (смена языка запас не режет). У существующих игроков карты нет → бонус 0 (grandfather сам: растёт только от повышений после выхода).
 */
export const SPIRE_ENERGY_BONUS_MAX = 11;

/** Бонус одного языка: сумма ±1 по неделям, зажатая в 0..11. */
export function spireEnergyBonusForLang(weeks: unknown): number {
  if (!weeks || typeof weeks !== 'object' || Array.isArray(weeks)) return 0;
  let sum = 0;
  for (const value of Object.values(weeks as Record<string, unknown>)) {
    const n = Number(value);
    if (Number.isFinite(n)) sum += Math.trunc(n);
  }
  return Math.max(0, Math.min(SPIRE_ENERGY_BONUS_MAX, sum));
}

/** Бонус игрока: максимум по языкам. Нет карты/мусор → 0. */
export function spireEnergyBonusFromDeltas(deltasByLang: unknown): number {
  if (!deltasByLang || typeof deltasByLang !== 'object' || Array.isArray(deltasByLang)) return 0;
  let best = 0;
  for (const weeks of Object.values(deltasByLang as Record<string, unknown>)) {
    best = Math.max(best, spireEnergyBonusForLang(weeks));
  }
  return best;
}

/** Запись для финализа: дельта недели по языку, только если лига сменилась. */
export function spireEnergyDeltaForWeek(prevTier: number, newTier: number): number {
  const d = Math.trunc(newTier) - Math.trunc(prevTier);
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}
