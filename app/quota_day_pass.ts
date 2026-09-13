/**
 * quota_day_pass.ts — «дневной пропуск» за жемчужины: +N попыток сверх дневного
 * лимита обычного аккаунта (карточные тренировки, голосовая практика).
 *
 * зачем (владелец, 2026-09-13): жемчужины должны быть реально полезны, но не
 * через ауры/аватары. Пропуск — потребительская ценность «продолжить прямо
 * сейчас», как energy refill. Economy Constitution: ОДНА композитная операция
 * «дебет + grant» через commitShardCompositeOperation, идемпотентность по
 * operationId (стабильный на окно), никаких spend-first/grant-later.
 *
 * Результат — локальный grant `revenue_quota_pass:v1:<uid>:<kind>:<period>`,
 * который читает квота (`revenue_daily_quota.ts`, карточки — RVTD-026).
 */
import { commitShardCompositeOperation, semanticShardOperationId } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import {
  REVENUE_DAY_PASS_EXTRA,
  REVENUE_DAY_PASS_PRICE_PEARLS,
  type RevenueDayPassKind,
} from './revenue_daily_limits';
import { revenueDayPassStorageKey } from './revenue_daily_quota';

export type QuotaDayPassFailReason =
  | 'unlimited'
  | 'invalid_period'
  | 'insufficient_shards'
  | 'stale_account'
  | 'persist_failed';

export type QuotaDayPassResult =
  | Readonly<{ ok: true; spent: number; extra: number; alreadyOwned: boolean }>
  | Readonly<{ ok: false; reason: QuotaDayPassFailReason }>;

export function quotaDayPassPrice(kind: RevenueDayPassKind): number {
  return REVENUE_DAY_PASS_PRICE_PEARLS[kind];
}

export function quotaDayPassExtra(kind: RevenueDayPassKind): number {
  return REVENUE_DAY_PASS_EXTRA[kind];
}

/**
 * @param period — окно квоты из preview (`result.period`, формат `YYYY-MM-DD@TZ`).
 *   Пропуск привязан к окну, а не к «сегодня по часам»: так он согласован с чеками.
 */
export async function buyQuotaDayPass(params: Readonly<{
  kind: RevenueDayPassKind;
  stableUid: string;
  period: string;
  isUnlimited: boolean;
}>): Promise<QuotaDayPassResult> {
  const { kind, stableUid, period, isUnlimited } = params;
  console.log('[DAY-PASS] buy:in', JSON.stringify({ kind, stableUid, period, isUnlimited }));
  if (isUnlimited) return { ok: false, reason: 'unlimited' };
  if (!/^\d{4}-\d{2}-\d{2}@.+$/.test(period) || !stableUid) {
    console.warn('[DAY-PASS] buy:out invalid_period', JSON.stringify({ period, stableUid }));
    return { ok: false, reason: 'invalid_period' };
  }
  const extra = quotaDayPassExtra(kind);
  const cost = quotaDayPassPrice(kind);
  const subjectId = `${kind}:${period}`;
  const storageKey = revenueDayPassStorageKey(stableUid, kind, period);
  try {
    // Стабильный id на окно: повторный тап/ретрай возвращает тот же чек.
    const operationId = await semanticShardOperationId('quota_day_pass', subjectId);
    const purchase = await commitShardCompositeOperation({
      operationId,
      amount: cost,
      reason: 'quota_day_pass',
      grant: { kind: 'quota_day_pass', subjectId, payload: { storageKey, extra } },
      localWrites: [[storageKey, JSON.stringify({ extra, subjectId })]],
    });
    console.log('[DAY-PASS] buy:commit', JSON.stringify({ status: purchase.status, reason: (purchase as { reason?: unknown }).reason ?? null }));
    if (purchase.status === 'insufficient') return { ok: false, reason: 'insufficient_shards' };
    if (purchase.status === 'failed') {
      return { ok: false, reason: (purchase as { reason?: string }).reason === 'stale_account_generation' ? 'stale_account' : 'persist_failed' };
    }
    // Баланс жемчужин леджер публикует сам (`shards_balance_updated`); здесь —
    // сигнал квотам перечитать окно, чтобы кнопка ожила без перезахода.
    emitAppEvent('revenue_quota_pass_granted', { kind, period });
    return { ok: true, spent: cost, extra, alreadyOwned: purchase.status === 'already-satisfied' };
  } catch (error: unknown) {
    DebugLogger.error('quota_day_pass:persist', error instanceof Error ? error : new Error(String(error)), 'warning');
    return { ok: false, reason: 'persist_failed' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
