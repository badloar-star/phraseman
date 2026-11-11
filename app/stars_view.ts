/**
 * Клиентская проекция недельного счётчика монет (`users/{uid}.stars`).
 *
 * зачем: правило владельца 2026-08-12 (D-11) — недельный счётчик хранится вместе со СВОИМ ключом недели, и читать его
 * отдельно от ключа запрещено линтом: устаревшее число выглядит как настоящее. Это единственный файл, где сырые поля
 * читаются напрямую; наружу счётчик выходит только в паре с ключом (`starsWeekBuckets`) или по названной неделе
 * (`starsWeekEarned`, зеркало серверной проекции из `functions/src/stars_ledger.ts`).
 *
 * Что входит в недельную сумму (U35), решает сервер в журнале; клиент число не пересчитывает.
 */

export type StarsWeekBucket = Readonly<{ weekKey: string; earned: number }>;

export type StarsWeekBuckets = Readonly<{
  current: StarsWeekBucket;
  previous: StarsWeekBucket | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWeekKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-W\d{2}$/.test(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Строгий разбор недельных полей сырого `stars`. Любое сомнение — `null`: показать чужое или битое число хуже,
 * чем не показать ничего (экран останется на счёте из комнаты).
 */
export function starsWeekBuckets(raw: unknown): StarsWeekBuckets | null {
  if (!isRecord(raw) || !isWeekKey(raw.weekKey) || !isNonNegativeSafeInteger(raw.weekEarned)) return null;
  const prevWeekKey = raw.prevWeekKey;
  const prevWeekEarned = raw.prevWeekEarned;
  let previous: StarsWeekBucket | null = null;
  if (prevWeekKey !== undefined && prevWeekKey !== '') {
    if (
      !isWeekKey(prevWeekKey)
      || prevWeekKey === raw.weekKey
      || !isNonNegativeSafeInteger(prevWeekEarned)
    ) return null;
    previous = Object.freeze({ weekKey: prevWeekKey, earned: prevWeekEarned });
  } else if (prevWeekEarned !== undefined && prevWeekEarned !== 0) {
    // зачем: счётчик прошлой недели без её ключа — признак повреждённого состояния, а не «нуля».
    return null;
  }
  return Object.freeze({
    current: Object.freeze({ weekKey: raw.weekKey, earned: raw.weekEarned }),
    previous,
  });
}

/** D-11: заработано за указанную неделю. Чужая или устаревшая неделя честно даёт ноль. */
export function starsWeekEarned(raw: unknown, weekKeyNow: string): number {
  const buckets = starsWeekBuckets(raw);
  if (!buckets) return 0;
  if (buckets.current.weekKey === weekKeyNow) return buckets.current.earned;
  if (buckets.previous?.weekKey === weekKeyNow) return buckets.previous.earned;
  return 0;
}
