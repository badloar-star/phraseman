import {
  bucketRawEventsByDay,
  dayKeyFromMs,
  parseMixedTimestampMs,
  revenueProxyOf,
  type BusinessTierBillingCadence,
  type BusinessTierFinancialCoverage,
  type BusinessTierHistoryPoint,
} from './business_tier_history';

/**
 * Разовый (но продолжаемый) бэкфилл истории тира бизнеса — считает историю
 * "задним числом" с момента реального запуска приложения, а не с момента
 * появления этой фичи.
 *
 * зачем HTTP-callable с курсором, а не scheduled function: владелец должен
 * видеть прогресс бэкфилла сразу в админке (клик → "страница готова, ещё
 * N дней осталось") и мочь повторить вызов немедленно, а не ждать следующего
 * тика крона (потенциально сутки простоя между страницами). Таймаут функции
 * ~9 минут — одна страница users (постранично через .select()-проекцию, тот
 * же приём, что re_engage_push.ts:397-409) обрабатывается за секунды, так что
 * один HTTP-вызов покрывает МНОГО дней; курсор в Firestore переживает обрыв
 * между вызовами, если данных окажется неожиданно много.
 *
 * Экономия трафика: .select() тянет только created_at пользователей и
 * eventType/periodType/createdAt revenuecat-событий — не целые документы.
 */

export const BACKFILL_PAGE_SIZE = 500;

export interface RawUserRow {
  readonly createdAtMs: number | null;
}

export interface RawRevenueRow {
  readonly atMs: number | null;
  readonly eventType: unknown;
  readonly periodType: unknown;
  /**
   * Уже нормализованные финансовые поля с самого события
   * (revenuecat_shards.ts пишет их при приёме вебхука) — бэкфилл их только
   * читает через .select(), не пересчитывает сырые price-поля заново.
   * Отсутствуют у старых событий — тогда день честно помечается 'unavailable'.
   */
  readonly grossUsdMicros?: number | null;
  readonly estimatedProceedsUsdMicros?: number | null;
  readonly financialCoverage?: BusinessTierFinancialCoverage | null;
  readonly billingCadence?: BusinessTierBillingCadence | null;
}

export interface BackfillPageInput {
  /** Пользователи, СТРОГО отсортированные по created_at (или __name__ как прокси), уже спроецированные .select(). */
  readonly userRows: readonly RawUserRow[];
  readonly revenueRows: readonly RawRevenueRow[];
  /** Кумулятив зарегистрированных до этой страницы (перенос из курсора). */
  readonly cumulativeUsersBeforePage: number;
}

export interface BackfillPageResult {
  readonly points: readonly BusinessTierHistoryPoint[];
  readonly cumulativeUsersAfterPage: number;
}

/**
 * Строит точки истории для одной уже прочитанной страницы сырых строк.
 * Чистая функция — вызывающий код (callable) отвечает за постраничное
 * чтение Firestore и передачу сюда уже спроецированных полей.
 */
export function buildHistoryPointsFromPage(input: BackfillPageInput): BackfillPageResult {
  const userMs = input.userRows.map((row) => row.createdAtMs);
  const byDay = bucketRawEventsByDay(userMs, input.revenueRows);

  const dayKeys = [...byDay.keys()].sort();
  let cumulative = input.cumulativeUsersBeforePage;
  const points: BusinessTierHistoryPoint[] = [];
  for (const dayKey of dayKeys) {
    // guard-ok: byDay — обычный in-memory Map, построенный выше bucketRawEventsByDay,
    // не Firestore-запрос; .get() тут не читает сеть/базу, ложное срабатывание guard'а.
    const row = byDay.get(dayKey)!;
    cumulative += row.newUsers;
    points.push(Object.freeze({
      dayKey,
      cumulativeUsers: cumulative,
      newUsers: row.newUsers,
      newPaying: row.newPaying,
      renewals: row.renewals,
      refunds: row.refunds,
      revenueProxy: revenueProxyOf(row.newPaying, row.renewals, row.refunds),
      grossUsdMicros: row.grossUsdMicros,
      mrrEquivalentProceedsUsdMicros: row.mrrEquivalentProceedsUsdMicros,
      dayMoneyCoverage: row.dayMoneyCoverage,
      // зачем null: активных пользователей за ПРОШЛЫЙ день сегодня посчитать
      // нечестно — last_active_at хранит только последнюю активность, история
      // ежедневных срезов не велась. Крон заполняет метрику начиная с момента
      // включения фичи; честный прочерк лучше сфабрикованного нуля.
      activeUsers: null,
    }));
  }

  return Object.freeze({ points: Object.freeze(points), cumulativeUsersAfterPage: cumulative });
}

export function parseUserCreatedAt(raw: unknown): RawUserRow {
  return Object.freeze({ createdAtMs: parseMixedTimestampMs(raw) });
}

function financeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function financeCoverage(value: unknown): BusinessTierFinancialCoverage | null {
  return value === 'complete' || value === 'partial' || value === 'unavailable' ? value : null;
}

function financeCadence(value: unknown): BusinessTierBillingCadence | null {
  return value === 'monthly' || value === 'yearly' || value === 'lifetime' || value === 'unknown' ? value : null;
}

/**
 * Имена полей совпадают с тем, что пишет вебхук RevenueCat
 * (revenuecat_shards.ts:617-618 → normalizeRevenueCatFinancials +
 * classifyRevenueCatBillingCadence) — читаем как есть, без пересчёта.
 * Неизвестное/битое значение схлопывается в null, а не в подставной ноль:
 * bucketRawEventsByDay сам пометит такой день как 'unavailable'.
 */
export function parseRevenueEventRow(raw: {
  readonly createdAt: unknown;
  readonly eventType: unknown;
  readonly periodType: unknown;
  readonly grossUsdMicros?: unknown;
  readonly estimatedProceedsUsdMicros?: unknown;
  readonly financialCoverage?: unknown;
  readonly billingCadence?: unknown;
}): RawRevenueRow {
  return Object.freeze({
    atMs: parseMixedTimestampMs(raw.createdAt),
    eventType: raw.eventType,
    periodType: raw.periodType,
    grossUsdMicros: financeNumber(raw.grossUsdMicros),
    estimatedProceedsUsdMicros: financeNumber(raw.estimatedProceedsUsdMicros),
    financialCoverage: financeCoverage(raw.financialCoverage),
    billingCadence: financeCadence(raw.billingCadence),
  });
}

/** Наименьший день среди строк страницы — для честного отчёта "докуда дошли". */
export function earliestDayKeyOfPage(userRows: readonly RawUserRow[]): string | null {
  const validMs = userRows.map((r) => r.createdAtMs).filter((ms): ms is number => ms !== null);
  if (validMs.length === 0) return null;
  return dayKeyFromMs(Math.min(...validMs));
}
