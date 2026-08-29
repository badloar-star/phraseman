import { normalizeEvidence, type Evidence, type EvidenceState } from './decision';

/**
 * Читатель источников департамента «Деньги».
 *
 * зачем: та же защита, что у «Качества» — план запрещает передавать модели
 * PII и лишние поля. eventType/periodType-классификация скопирована 1:1
 * с admin_daily_digest.ts:406-414 (уже проверенный боевой контракт), чтобы
 * не изобретать вторую версию правды о том, что считается "новым платящим".
 * productId и любые другие поля сюда не попадают — только счётчики.
 */

export const MONEY_REPORT_COLLECTIONS = [
  'revenuecat_premium_events',
  'voice_minute_events',
  'paywall_funnel',
  // зачем (2026-08-29): client_economy_opening/operations мертвы навсегда
  // (писателя снёс чекпойнт 96c32bb97; сторож требует, чтобы они ОСТАВАЛИСЬ
  // мёртвыми, личный журнал PhoneState закрыт приватностью). Диагностика
  // экономики переехала на ОБЕЗЛИЧЕННЫЙ дневной агрегат: клиент сам сверяет
  // свою цепочку revision/balance и шлёт только счётчики аномалий.
  'economy_daily_stats',
  'external_economy_events',
] as const;
export type MoneyReportCollection = typeof MONEY_REPORT_COLLECTIONS[number];

export interface MoneyRawRow {
  readonly eventType: string | null;
  readonly periodType: string | null;
  readonly environment?: string | null;
  readonly ownerStableId?: string | null;
  readonly openingBalance?: number | null;
  readonly direction?: string | null;
  readonly delta?: number | null;
  readonly balanceBefore?: number | null;
  readonly balanceAfter?: number | null;
  readonly revision?: number | null;
  readonly source?: string | null;
  readonly createdAtMs?: number | null;
}

export interface MoneyAggregate {
  readonly totalCount: number;
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
  readonly trials: number;
}

export interface PersonalEconomyDiagnostics {
  readonly openingOwners: number;
  readonly operationCount: number;
  readonly externalEventCount: number;
  readonly invalidRows: number;
  readonly revisionDiscontinuities: number;
  readonly balanceDiscontinuities: number;
  readonly duplicateExternalFacts: number;
  readonly netClientDelta: number;
  readonly netExternalDelta: number;
}

export interface MoneySourceFetchResult {
  readonly sourceId: MoneyReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly MoneyRawRow[];
  readonly observedAtMs: number;
}

function upper(value: string | null): string {
  return (value ?? '').toUpperCase();
}

/**
 * Копия классификации admin_daily_digest.ts:406-414. Единственная версия
 * правды о том, что считается новым платящим/продлением/возвратом/пробным.
 */
export function aggregateMoneyRows(rows: readonly MoneyRawRow[]): MoneyAggregate {
  let newPaying = 0;
  let renewals = 0;
  let refunds = 0;
  let trials = 0;
  for (const row of rows) {
    const event = upper(row.eventType);
    const period = upper(row.periodType);
    if (event === 'NON_RENEWING_PURCHASE' || (event === 'INITIAL_PURCHASE' && period !== 'TRIAL')) newPaying += 1;
    else if (event === 'RENEWAL') renewals += 1;
    else if (event === 'REFUND') refunds += 1;
    else if (event === 'INITIAL_PURCHASE' && period === 'TRIAL') trials += 1;
  }
  return Object.freeze({ totalCount: rows.length, newPaying, renewals, refunds, trials });
}

export function diagnosePersonalEconomy(
  fetches: readonly MoneySourceFetchResult[],
): PersonalEconomyDiagnostics {
  // зачем (2026-08-29): построчный разбор личной цепочки revision/balance
  // ушёл вместе с client_economy_* — теперь эти проверки делает САМ КЛИЕНТ
  // (app/economy/economy_daily_stats_reporter.ts) по своему локальному хвосту,
  // а сюда приходят только дневные СЧЁТЧИКИ. Ни одного личного поля в этом
  // пути больше нет.
  const daily = fetches.find((fetch) => fetch.sourceId === 'economy_daily_stats')?.rows ?? [];
  const external = fetches.find((fetch) => fetch.sourceId === 'external_economy_events')?.rows ?? [];
  let invalidRows = 0;
  let revisionDiscontinuities = 0;
  let balanceDiscontinuities = 0;
  let operationCount = 0;
  let netClientDelta = 0;
  for (const row of daily) {
    const stats = row as MoneyRawRow & {
      ops?: unknown; invalidOps?: unknown; revisionGaps?: unknown; balanceGaps?: unknown;
      amountGranted?: unknown; amountSpent?: unknown;
    };
    const ops = Number(stats.ops ?? 0);
    if (!Number.isSafeInteger(ops) || ops < 0) { invalidRows += 1; continue; }
    operationCount += ops;
    invalidRows += Math.max(0, Number(stats.invalidOps ?? 0) || 0);
    revisionDiscontinuities += Math.max(0, Number(stats.revisionGaps ?? 0) || 0);
    balanceDiscontinuities += Math.max(0, Number(stats.balanceGaps ?? 0) || 0);
    netClientDelta += (Number(stats.amountGranted ?? 0) || 0) - (Number(stats.amountSpent ?? 0) || 0);
  }
  const externalKeys = new Set<string>();
  let duplicateExternalFacts = 0;
  let netExternalDelta = 0;
  for (const row of external) {
    const owner = row.ownerStableId ?? '';
    const source = row.source ?? '';
    const eventId = row.eventType ?? '';
    const delta = Number(row.delta);
    if (!owner || !source || !eventId || !Number.isSafeInteger(delta) || delta === 0) {
      invalidRows += 1;
      continue;
    }
    const key = `${owner}:${source}:${eventId}`;
    if (externalKeys.has(key)) duplicateExternalFacts += 1;
    externalKeys.add(key);
    netExternalDelta += delta;
  }
  return Object.freeze({
    // Обезличенный агрегат не знает владельцев — и не должен. Поле оставлено
    // ради стабильности формы Decision-текста; 0 читается как «per-owner
    // разреза больше нет», а не как «никто не открывал кошелёк».
    openingOwners: 0,
    operationCount,
    externalEventCount: external.length,
    invalidRows,
    revisionDiscontinuities,
    balanceDiscontinuities,
    duplicateExternalFacts,
    netClientDelta,
    netExternalDelta,
  });
}

export function buildMoneyEvidence(fetch: MoneySourceFetchResult): Evidence {
  const aggregate = aggregateMoneyRows(fetch.rows);
  const trustworthy = (fetch.state === 'ready' || fetch.state === 'empty')
    && !fetch.truncated
    && fetch.droppedCount === 0;
  return normalizeEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    count: aggregate.totalCount,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    observedAtMs: fetch.observedAtMs,
    digest: trustworthy ? JSON.stringify(aggregate) : '',
  });
}
