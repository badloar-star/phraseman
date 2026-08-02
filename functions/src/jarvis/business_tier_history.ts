/**
 * Чистая логика истории "тира бизнеса" — точки временного ряда по метрикам
 * (регистрации/активные/деньги) и разбор разнотипных полей времени
 * users.created_at / revenuecat_premium_events.createdAt.
 *
 * зачем: вынесено из Firestore-обвязки (business_tier_history_store.ts,
 * business_tier_backfill.ts), чтобы день-бакетинг и парсинг времени
 * тестировались без эмулятора/моков Firestore — тот же приём, что у
 * decision.ts/app_tier.ts в этой папке.
 *
 * зачем честные деньги вместо прокси (слияние 2026-08-02 с параллельной
 * веткой admin/business_growth): revenuecat_premium_events уже хранит
 * ГОТОВЫЕ нормализованные финансовые поля на каждом событии (billingCadence/
 * financialCoverage/grossUsdMicros/estimatedProceedsUsdMicros — пишутся при
 * приёме вебхука в revenuecat_shards.ts:617-618 через
 * normalizeRevenueCatFinancials/classifyRevenueCatBillingCadence). Историю
 * бизнеса больше не считаем прокси-числом без суммы — читаем эти поля
 * напрямую через .select(), без повторной нормализации сырых price-полей.
 */

export const DAY_MS = 24 * 60 * 60 * 1_000;

export type BusinessTierFinancialCoverage = 'complete' | 'partial' | 'unavailable';
export type BusinessTierBillingCadence = 'monthly' | 'yearly' | 'lifetime' | 'unknown';

/** Одна точка временного ряда — один день, один документ в business_tier_history. */
export interface BusinessTierHistoryPoint {
  readonly dayKey: string; // 'YYYY-MM-DD', UTC
  readonly cumulativeUsers: number;
  readonly newUsers: number;
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
  /** newPaying + renewals - refunds — счётчик событий, НЕ деньги (для обратной совместимости старых точек). */
  readonly revenueProxy: number;
  /** Сумма по событиям с известной суммой (financialCoverage !== 'unavailable' для gross в этот день). */
  readonly grossUsdMicros: number;
  /** "MRR-эквивалент" — месячные как есть, годовые /12, lifetime исключён (не подписочный поток). */
  readonly mrrEquivalentProceedsUsdMicros: number;
  /** Честный флаг: 'partial'/'unavailable', если хоть одно событие дня не имело полных денежных полей — UI обязан это показать, не молчать. */
  readonly dayMoneyCoverage: BusinessTierFinancialCoverage;
  /**
   * Снимок активных пользователей НА КОНЕЦ дня. null для дней бэкфилла
   * "задним числом" — этой метрики нет ретроактивно (посчитать активность
   * прошлого дня сегодня нечестно, данные о ней не хранились). Крон
   * заполняет её ежедневно начиная с момента включения фичи — честный
   * прочерк лучше сфабрикованного нуля.
   */
  readonly activeUsers: number | null;
}

/** users.created_at / revenuecat createdAt хранятся вперемешку как number/string/Timestamp-like. */
export function parseMixedTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (value && typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (value as { toMillis: () => number }).toMillis();
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/** UTC day key 'YYYY-MM-DD' — стабильный ключ документа business_tier_history/{day}. */
export function dayKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dayKeyToStartMs(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00.000Z`);
}

export function nextDayKey(dayKey: string): string {
  return dayKeyFromMs(dayKeyToStartMs(dayKey) + DAY_MS);
}

/** Список UTC-дней [fromDayKey, toDayKeyExclusive) — используется бэкфиллом и кроном для планирования страниц. */
export function enumerateDayKeys(fromDayKey: string, toDayKeyExclusive: string): readonly string[] {
  const days: string[] = [];
  let cursor = fromDayKey;
  let guard = 0;
  while (cursor < toDayKeyExclusive && guard < 100_000) {
    days.push(cursor);
    cursor = nextDayKey(cursor);
    guard += 1;
  }
  return Object.freeze(days);
}

function upperEventType(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

function upperPeriodType(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

/**
 * Классификация ровно как admin_daily_digest.ts:406-414 / money_source_reader.ts —
 * единственная версия правды о "новый платящий/продление/возврат".
 */
export function classifyRevenueEvent(eventType: unknown, periodType: unknown): 'new_paying' | 'renewal' | 'refund' | 'trial' | 'other' {
  const event = upperEventType(eventType);
  const period = upperPeriodType(periodType);
  if (event === 'NON_RENEWING_PURCHASE' || (event === 'INITIAL_PURCHASE' && period !== 'TRIAL')) return 'new_paying';
  if (event === 'RENEWAL') return 'renewal';
  if (event === 'REFUND') return 'refund';
  if (event === 'INITIAL_PURCHASE' && period === 'TRIAL') return 'trial';
  return 'other';
}

interface MutableDayBucket {
  newUsers: number;
  newPaying: number;
  renewals: number;
  refunds: number;
  grossUsdMicros: number;
  mrrEquivalentProceedsUsdMicros: number;
  completeEvents: number;
  partialEvents: number;
  unavailableEvents: number;
}

function emptyMetricRow(): MutableDayBucket {
  return {
    newUsers: 0, newPaying: 0, renewals: 0, refunds: 0,
    grossUsdMicros: 0, mrrEquivalentProceedsUsdMicros: 0,
    completeEvents: 0, partialEvents: 0, unavailableEvents: 0,
  };
}

export interface RawRevenueEventForBucketing {
  readonly atMs: number | null;
  readonly eventType: unknown;
  readonly periodType: unknown;
  /** Уже нормализованные поля с самого события (revenuecat_shards.ts:617-618) — не пересчитываем. */
  readonly grossUsdMicros?: number | null;
  readonly estimatedProceedsUsdMicros?: number | null;
  readonly financialCoverage?: BusinessTierFinancialCoverage | null;
  readonly billingCadence?: BusinessTierBillingCadence | null;
}

export interface DayBucketResult {
  readonly newUsers: number;
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
  readonly grossUsdMicros: number;
  readonly mrrEquivalentProceedsUsdMicros: number;
  readonly dayMoneyCoverage: BusinessTierFinancialCoverage;
}

function mrrEquivalentOf(proceedsUsdMicros: number, cadence: BusinessTierBillingCadence | null | undefined): number {
  if (cadence === 'monthly') return proceedsUsdMicros;
  if (cadence === 'yearly') return proceedsUsdMicros / 12;
  return 0; // lifetime/unknown/отсутствует — единоразовый доход, не поток подписки
}

function dayMoneyCoverageOf(bucket: MutableDayBucket): BusinessTierFinancialCoverage {
  if (bucket.completeEvents === 0 && bucket.partialEvents === 0) return 'unavailable';
  if (bucket.unavailableEvents > 0 || bucket.partialEvents > 0) return 'partial';
  return 'complete';
}

/**
 * Строит по-дневные метрики (регистрации + честные деньги) из сырых
 * временных меток пользователей и revenuecat-событий. Дни без данных не
 * попадают в результат — вызывающий код обязан явно решить, что значит их
 * отсутствие (честный ноль, а не молчаливый пропуск).
 */
export function bucketRawEventsByDay(
  userCreatedAtMsList: readonly (number | null)[],
  revenueEvents: readonly RawRevenueEventForBucketing[],
): ReadonlyMap<string, DayBucketResult> {
  const byDay = new Map<string, MutableDayBucket>();

  const touch = (dayKey: string): MutableDayBucket => {
    const existing = byDay.get(dayKey);
    if (existing) return existing;
    const created = emptyMetricRow();
    byDay.set(dayKey, created);
    return created;
  };

  for (const ms of userCreatedAtMsList) {
    if (ms === null) continue;
    touch(dayKeyFromMs(ms)).newUsers += 1;
  }

  for (const ev of revenueEvents) {
    if (ev.atMs === null) continue;
    const kind = classifyRevenueEvent(ev.eventType, ev.periodType);
    if (kind === 'other' || kind === 'trial') continue;
    const row = touch(dayKeyFromMs(ev.atMs));
    if (kind === 'new_paying') row.newPaying += 1;
    else if (kind === 'renewal') row.renewals += 1;
    else if (kind === 'refund') row.refunds += 1;

    const coverage = ev.financialCoverage ?? 'unavailable';
    if (coverage === 'complete') row.completeEvents += 1;
    else if (coverage === 'partial') row.partialEvents += 1;
    else row.unavailableEvents += 1;

    if (ev.grossUsdMicros != null) row.grossUsdMicros += ev.grossUsdMicros;
    if (ev.estimatedProceedsUsdMicros != null) {
      row.mrrEquivalentProceedsUsdMicros += mrrEquivalentOf(ev.estimatedProceedsUsdMicros, ev.billingCadence);
    }
  }

  const result = new Map<string, DayBucketResult>();
  for (const [dayKey, bucket] of byDay) {
    result.set(dayKey, {
      newUsers: bucket.newUsers,
      newPaying: bucket.newPaying,
      renewals: bucket.renewals,
      refunds: bucket.refunds,
      grossUsdMicros: bucket.grossUsdMicros,
      mrrEquivalentProceedsUsdMicros: bucket.mrrEquivalentProceedsUsdMicros,
      dayMoneyCoverage: dayMoneyCoverageOf(bucket),
    });
  }
  return result;
}

export function revenueProxyOf(newPaying: number, renewals: number, refunds: number): number {
  return newPaying + renewals - refunds;
}
