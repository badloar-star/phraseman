/**
 * revenue_daily_quota.ts — дневная квота обычного аккаунта по иммутабельным чекам.
 *
 * зачем (владелец, 2026-09-13): у голосовой практики не было дневного лимита —
 * обычный аккаунт упирался в глухой пейвол «только в Plus». Здесь тот же принцип,
 * что у карточных тренировок (Epic 2A, `revenue_quota_access.ts`): каждая
 * успешная попытка — чек `revenue_quota:v1:<kind>:<lineage>:<receiptId>` под уже
 * поддержанным фактом `attempt` PhoneState. Баланс — проекция чеков, повтор с тем
 * же receiptId идемпотентен, Plus и «Фри»-флаг Пульта лимита не имеют.
 *
 * Отличие от карточек: сверх лимита учитывается «дневной пропуск» за жемчужины
 * (`quota_day_pass.ts`) — локальный grant композитной операции, читается как
 * добавка к лимиту текущего окна.
 *
 * Долг RVTD-026: ядро квоты (эпохи/окна) дублирует revenue_quota_access.ts,
 * потому что тот файл одновременно правится другой сессией; слить в один
 * параметризованный модуль после стабилизации Epic 2A.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AccountGenerationToken, AccountTransitionLockLease } from './account_generation';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import { shouldGateFeature, type FeatureGate } from './feature_gates';
import {
  commitPhoneStatePracticeReceipt,
  readPhoneStatePracticeFactProjection,
} from './phone_state_practice_bridge';
import { getVerifiedPremiumAccessStatusForAccountLease } from './premium_guard';
import { REVENUE_DAILY_LIMITS, type RevenueDayPassKind } from './revenue_daily_limits';
import { resolveRevenueQuotaDailyWindow } from './revenue_quota_calendar';

export type RevenueDailyQuotaKind = 'speaking_attempts' | 'arena_match_starts' | 'mistake_practice_starts';

export type RevenueDailyQuotaStatus = 'waiting' | 'allowed' | 'exhausted' | 'unavailable' | 'stale_account';
export type RevenueDailyQuotaBypass = 'plus' | 'remote_config' | 'idempotent' | null;

export type RevenueDailyQuotaResult = Readonly<{
  status: RevenueDailyQuotaStatus;
  used: number;
  /** null — лимита нет (Plus / «Фри»). */
  limit: number | null;
  /** Сколько добавил купленный дневной пропуск в текущем окне. */
  extra: number;
  resetAt: number | null;
  period: string | null;
  bypass: RevenueDailyQuotaBypass;
}>;

export type RevenueDailyQuotaReceipt = Readonly<{
  schemaVersion: 'revenue-quota.v1';
  quota: RevenueDailyQuotaKind;
  lineage: number;
  period: string;
  timeZone: string;
  resetAt: number;
  observedAtMs: number;
  receiptId: string;
  /** Поверхность, откуда пришла попытка — только для аналитики/диагностики. */
  surface: string;
}>;

/**
 * passKind необязателен: дневной пропуск за жемчужины есть не у каждой квоты.
 * Нет пропуска — `extra` всегда 0, лимит равен базовому (см. project ниже).
 */
const QUOTA_POLICY: Readonly<Record<RevenueDailyQuotaKind, Readonly<{ limit: number; gate: FeatureGate; passKind: RevenueDayPassKind | null }>>> = Object.freeze({
  speaking_attempts: Object.freeze({
    limit: REVENUE_DAILY_LIMITS.speaking_attempts,
    gate: 'speaking',
    passKind: 'speaking_attempts',
  }),
  // зачем (владелец 2026-09-14): 1 матч Арены в сутки, общий счётчик на быстрый
  // и рейтинговый. Пропуска за жемчужины у Арены нет — там платит энергия,
  // вторая покупаемая валюта на том же действии путала бы экономику.
  arena_match_starts: Object.freeze({
    limit: REVENUE_DAILY_LIMITS.arena_match_starts,
    gate: 'arena',
    passKind: null,
  }),
  // зачем (владелец 2026-09-14): «Работа над ошибками» - 1 сессия в сутки
  // бесплатно, дальше Plus. Пропуска за жемчужины нет: короткие наборы (1-4
  // ошибки) и так без энергии, вторая валюта здесь путала бы экономику.
  mistake_practice_starts: Object.freeze({
    limit: REVENUE_DAILY_LIMITS.mistake_practice_starts,
    gate: 'mistake_practice',
    passKind: null,
  }),
});

export const REVENUE_DAILY_QUOTA_PREFIX = 'revenue_quota:v1:';
export const REVENUE_DAY_PASS_STORAGE_PREFIX = 'revenue_quota_pass:v1:';

export function revenueDayPassStorageKey(stableUid: string, kind: RevenueDayPassKind, period: string): string {
  return `${REVENUE_DAY_PASS_STORAGE_PREFIX}${encodeURIComponent(stableUid)}:${kind}:${period}`;
}

type Dependencies = Readonly<{
  now: () => number;
  timeZone: () => string;
  /** true → лимит действует (флаг «Премиум» в Пульте, без boon). */
  isGateEnabled: (gate: FeatureGate) => boolean;
  isCurrentAccount: (token: AccountGenerationToken) => boolean;
  withAccountLock: <T>(work: (lease: AccountTransitionLockLease) => Promise<T>) => Promise<T>;
  verifyPaidAccess: (token: AccountGenerationToken, lease: AccountTransitionLockLease) => Promise<boolean>;
  readFacts: (stableUid: string) => ReturnType<typeof readPhoneStatePracticeFactProjection>;
  commitReceipt: typeof commitPhoneStatePracticeReceipt;
  readStorage: (key: string) => Promise<string | null>;
}>;

type PreviewInput = Readonly<{
  kind: RevenueDailyQuotaKind;
  token: AccountGenerationToken;
  accessResolved: boolean;
  hasPremiumAccess: boolean;
}>;

type ConsumeInput = Readonly<{
  kind: RevenueDailyQuotaKind;
  token: AccountGenerationToken;
  accessResolved: boolean;
  receiptId: string;
  surface: string;
}>;

function base(kind: RevenueDailyQuotaKind, status: RevenueDailyQuotaStatus): RevenueDailyQuotaResult {
  return Object.freeze({
    status, used: 0, limit: QUOTA_POLICY[kind].limit, extra: 0, resetAt: null, period: null, bypass: null,
  });
}

function unlimited(bypass: 'plus' | 'remote_config'): RevenueDailyQuotaResult {
  return Object.freeze({ status: 'allowed', used: 0, limit: null, extra: 0, resetAt: null, period: null, bypass });
}

function validToken(deps: Dependencies, token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return token.phase === 'active' && typeof token.stableId === 'string' && token.stableId.length > 0
    && deps.isCurrentAccount(token);
}

function isReceipt(value: unknown, kind: RevenueDailyQuotaKind, lineage: number): value is RevenueDailyQuotaReceipt {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RevenueDailyQuotaReceipt>;
  return item.schemaVersion === 'revenue-quota.v1'
    && item.quota === kind
    && item.lineage === lineage
    && typeof item.period === 'string' && item.period.length > 0
    && typeof item.timeZone === 'string' && item.timeZone.length > 0
    && Number.isFinite(item.resetAt) && (item.resetAt as number) > 0
    && Number.isFinite(item.observedAtMs) && (item.observedAtMs as number) >= 0
    && typeof item.receiptId === 'string' && item.receiptId.trim().length > 0;
}

function readExtra(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    const extra = Number((parsed as { extra?: unknown } | null)?.extra);
    return Number.isSafeInteger(extra) && extra > 0 ? extra : 0;
  } catch (error: unknown) {
    console.warn('[DAILY-QUOTA] pass:parse → 0', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

type WindowState = Readonly<{
  period: string;
  timeZone: string;
  resetAt: number;
  effectiveNowMs: number;
  used: number;
  replay: boolean;
}>;

/**
 * Чеки одного окна = чеки, наблюдённые до его resetAt. Дубликаты по receiptId
 * схлопываются; смена часового пояса даёт объединённое окно с самой поздней
 * границей (консервативно: не открывает лишнюю попытку).
 */
function windowState(deps: Dependencies, receipts: readonly RevenueDailyQuotaReceipt[], receiptId: string | null): WindowState {
  const unique = new Map<string, RevenueDailyQuotaReceipt>();
  for (const receipt of receipts) {
    const prior = unique.get(receipt.receiptId);
    if (!prior || receipt.resetAt > prior.resetAt) unique.set(receipt.receiptId, receipt);
  }
  const sorted = [...unique.values()].sort((left, right) =>
    left.observedAtMs - right.observedAtMs || (left.receiptId < right.receiptId ? -1 : 1));
  const effectiveNowMs = Math.max(deps.now(), ...sorted.map((item) => item.observedAtMs));
  const active = sorted.filter((item) => effectiveNowMs < item.resetAt);
  const replay = receiptId !== null && unique.has(receiptId);
  if (active.length > 0) {
    const owner = active.reduce((best, item) => (item.resetAt > best.resetAt ? item : best));
    return Object.freeze({
      period: owner.period, timeZone: owner.timeZone, resetAt: owner.resetAt,
      effectiveNowMs, used: active.length, replay,
    });
  }
  const window = resolveRevenueQuotaDailyWindow({
    nowMs: effectiveNowMs,
    requestedTimeZone: deps.timeZone(),
    observations: sorted,
  });
  return Object.freeze({
    period: window.period, timeZone: window.timeZone, resetAt: window.resetAt,
    effectiveNowMs: window.effectiveNowMs, used: 0, replay,
  });
}

function receiptsFromFacts(facts: Readonly<Record<string, unknown>>, kind: RevenueDailyQuotaKind, lineage: number): RevenueDailyQuotaReceipt[] {
  const prefix = `${REVENUE_DAILY_QUOTA_PREFIX}${kind}:${lineage}:`;
  return Object.entries(facts)
    .filter(([entityId, value]) => entityId.startsWith(prefix) && isReceipt(value, kind, lineage))
    .map(([, value]) => value as RevenueDailyQuotaReceipt);
}

export function createRevenueDailyQuotaAccess(deps: Dependencies) {
  async function project(kind: RevenueDailyQuotaKind, stableUid: string, receiptId: string | null) {
    const read = await deps.readFacts(stableUid);
    if (read.status !== 'available') return { status: read.status } as const;
    const receipts = receiptsFromFacts(read.facts, kind, read.lineage);
    const state = windowState(deps, receipts, receiptId);
    // Квота без дневного пропуска (Арена) в хранилище не ходит вовсе — лишнее
    // чтение на входе в матч ничего бы не дало, кроме задержки первого кадра.
    const passKind = QUOTA_POLICY[kind].passKind;
    const extra = passKind === null
      ? 0
      : readExtra(await deps.readStorage(revenueDayPassStorageKey(stableUid, passKind, state.period)));
    return { status: 'available', lineage: read.lineage, state, extra } as const;
  }

  function result(kind: RevenueDailyQuotaKind, state: WindowState, extra: number, bypass: RevenueDailyQuotaBypass, usedOverride?: number): RevenueDailyQuotaResult {
    const limit = QUOTA_POLICY[kind].limit + extra;
    const used = usedOverride ?? state.used;
    // usedOverride = «после списания»: попытка уже выдана, статус allowed даже
    // когда она была последней; exhausted — только для СЛЕДУЮЩЕЙ попытки.
    const granted = usedOverride !== undefined || bypass === 'idempotent';
    return Object.freeze({
      status: !granted && used >= limit ? 'exhausted' : 'allowed',
      used, limit, extra, resetAt: state.resetAt, period: state.period, bypass,
    });
  }

  return Object.freeze({
    async preview(input: PreviewInput): Promise<RevenueDailyQuotaResult> {
      const policy = QUOTA_POLICY[input.kind];
      console.log('[DAILY-QUOTA] preview:in', JSON.stringify({
        kind: input.kind, accessResolved: input.accessResolved, hasPremiumAccess: input.hasPremiumAccess,
        tokenPhase: input.token.phase, stableId: input.token.stableId,
      }));
      if (!input.accessResolved) return base(input.kind, 'waiting');
      if (!validToken(deps, input.token)) {
        console.log('[DAILY-QUOTA] preview:out stale_account — токен не активен или аккаунт сменился');
        return base(input.kind, 'stale_account');
      }
      if (input.hasPremiumAccess) return unlimited('plus');
      if (!deps.isGateEnabled(policy.gate)) {
        console.log(`[DAILY-QUOTA] preview:out allowed/remote_config — gate ${policy.gate} снят или boon`);
        return unlimited('remote_config');
      }
      const projection = await project(input.kind, input.token.stableId, null);
      if (!deps.isCurrentAccount(input.token)) return base(input.kind, 'stale_account');
      if (projection.status !== 'available') {
        console.log(`[DAILY-QUOTA] preview:out ${projection.status} — чеки не прочитались`);
        return base(input.kind, projection.status);
      }
      const out = result(input.kind, projection.state, projection.extra, null);
      console.log('[DAILY-QUOTA] preview:out', JSON.stringify({ status: out.status, used: out.used, limit: out.limit, extra: out.extra, period: out.period }));
      return out;
    },

    /**
     * Авторитетное списание одной попытки. Под замком смены аккаунта повторно
     * проверяет Plus и актуальность токена. Повтор того же receiptId — bypass
     * 'idempotent', вторая попытка не списывается.
     */
    async consume(input: ConsumeInput): Promise<RevenueDailyQuotaResult> {
      const policy = QUOTA_POLICY[input.kind];
      if (!input.accessResolved) return base(input.kind, 'waiting');
      if (!input.receiptId.trim() || !validToken(deps, input.token)) return base(input.kind, 'stale_account');
      if (!deps.isGateEnabled(policy.gate)) return unlimited('remote_config');
      return deps.withAccountLock(async (lease) => {
        if (!validToken(deps, input.token)) return base(input.kind, 'stale_account');
        if (await deps.verifyPaidAccess(input.token, lease)) return unlimited('plus');
        if (!deps.isCurrentAccount(input.token)) return base(input.kind, 'stale_account');
        const projection = await project(input.kind, input.token.stableId, input.receiptId);
        if (!deps.isCurrentAccount(input.token)) return base(input.kind, 'stale_account');
        if (projection.status !== 'available') {
          console.log(`[DAILY-QUOTA] consume:out ${projection.status} — чеки не прочитались (kind=${input.kind})`);
          return base(input.kind, projection.status);
        }
        const { state, extra, lineage } = projection;
        if (state.replay) return result(input.kind, state, extra, 'idempotent');
        if (state.used >= policy.limit + extra) {
          console.log('[DAILY-QUOTA] consume:out exhausted', JSON.stringify({ kind: input.kind, used: state.used, limit: policy.limit + extra, period: state.period }));
          return result(input.kind, state, extra, null);
        }
        const receipt: RevenueDailyQuotaReceipt = Object.freeze({
          schemaVersion: 'revenue-quota.v1',
          quota: input.kind,
          lineage,
          period: state.period,
          timeZone: state.timeZone,
          resetAt: state.resetAt,
          observedAtMs: state.effectiveNowMs,
          receiptId: input.receiptId,
          surface: input.surface,
        });
        const entityId = `${REVENUE_DAILY_QUOTA_PREFIX}${input.kind}:${lineage}:${input.receiptId}`;
        const committed = await deps.commitReceipt('attempt', entityId, receipt, entityId, input.token.stableId, lineage);
        if (!deps.isCurrentAccount(input.token) || committed.status === 'stale_account') return base(input.kind, 'stale_account');
        if (committed.status !== 'committed') {
          console.warn(`[DAILY-QUOTA] consume:out unavailable — commit ${committed.status} (kind=${input.kind})`);
          return base(input.kind, 'unavailable');
        }
        const out = result(input.kind, state, extra, committed.duplicate ? 'idempotent' : null, state.used + (committed.duplicate ? 0 : 1));
        console.log('[DAILY-QUOTA] consume:out', JSON.stringify({ kind: input.kind, receiptId: input.receiptId, status: out.status, used: out.used, limit: out.limit, extra: out.extra, period: out.period, duplicate: committed.duplicate }));
        return out;
      });
    },
  });
}

const defaultAccess = createRevenueDailyQuotaAccess({
  now: () => Date.now(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  // hasPremiumAccess=false → остаётся флаг Пульта + недельный boon.
  isGateEnabled: (gate) => shouldGateFeature(gate, false),
  isCurrentAccount: isCurrentAccountGeneration,
  withAccountLock: withAccountTransitionLock,
  verifyPaidAccess: getVerifiedPremiumAccessStatusForAccountLease,
  readFacts: (stableUid) => readPhoneStatePracticeFactProjection('attempt', stableUid),
  commitReceipt: commitPhoneStatePracticeReceipt,
  readStorage: (key) => AsyncStorage.getItem(key),
});

export const previewRevenueDailyQuota = defaultAccess.preview;
export const consumeRevenueDailyQuota = defaultAccess.consume;
export { captureAccountGeneration };

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
