import type { AccountTransitionLockLease, AccountGenerationToken } from './account_generation';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import { getVerifiedPremiumAccessStatusForAccountLease } from './premium_guard';
import { isFlashcardsPremiumGated } from './remote_flags';
import {
  commitFlashcardTrainingQuotaReceipt,
  readFlashcardTrainingQuotaReceipts,
  type FlashcardTrainingQuotaMode,
  type RevenueQuotaReceipt,
  type RevenueQuotaReceiptCommit,
  type RevenueQuotaReceiptRead,
} from './revenue_quota_store';
import { resolveRevenueQuotaDailyWindow } from './revenue_quota_calendar';

const FLASHCARD_TRAINING_DAILY_LIMIT = 3;

export type RevenueQuotaAccessStatus = 'waiting' | 'allowed' | 'exhausted' | 'unavailable' | 'stale_account';
export type RevenueQuotaBypass = 'plus' | 'remote_config' | 'idempotent' | null;

export type RevenueQuotaAccessResult = Readonly<{
  status: RevenueQuotaAccessStatus;
  used: number;
  limit: number | null;
  resetAt: number | null;
  period: string | null;
  bypass: RevenueQuotaBypass;
}>;

type PreviewInput = Readonly<{
  token: AccountGenerationToken;
  accessResolved: boolean;
  hasPremiumAccess: boolean;
}>;

type ConsumeInput = Readonly<{
  token: AccountGenerationToken;
  accessResolved: boolean;
  receiptId: string;
  mode: FlashcardTrainingQuotaMode;
}>;

type Dependencies = Readonly<{
  now: () => number;
  timeZone: () => string;
  isGateEnabled: () => boolean;
  isCurrentAccount: (token: AccountGenerationToken) => boolean;
  withAccountLock: <T>(work: (lease: AccountTransitionLockLease) => Promise<T>) => Promise<T>;
  verifyPaidAccess: (token: AccountGenerationToken, lease: AccountTransitionLockLease) => Promise<boolean>;
  readReceipts: (stableUid: string) => Promise<RevenueQuotaReceiptRead>;
  commitReceipt: (stableUid: string, receipt: RevenueQuotaReceipt) => Promise<RevenueQuotaReceiptCommit>;
}>;

const base = (status: RevenueQuotaAccessStatus): RevenueQuotaAccessResult => Object.freeze({
  status,
  used: 0,
  limit: FLASHCARD_TRAINING_DAILY_LIMIT,
  resetAt: null,
  period: null,
  bypass: null,
});

const unlimited = (bypass: Exclude<RevenueQuotaBypass, 'idempotent' | null>): RevenueQuotaAccessResult => Object.freeze({
  status: 'allowed', used: 0, limit: null, resetAt: null, period: null, bypass,
});

function validToken(deps: Dependencies, token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return token.phase === 'active' && typeof token.stableId === 'string' && token.stableId.length > 0
    && deps.isCurrentAccount(token);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeReceipts(receipts: readonly RevenueQuotaReceipt[]): readonly RevenueQuotaReceipt[] {
  const groups = new Map<string, RevenueQuotaReceipt[]>();
  for (const receipt of receipts) {
    const group = groups.get(receipt.receiptId);
    if (group) group.push(receipt);
    else groups.set(receipt.receiptId, [receipt]);
  }
  return Object.freeze([...groups.values()].map((group) => {
    const deterministic = [...group].sort((left, right) =>
      right.resetAt - left.resetAt
      || left.observedAtMs - right.observedAtMs
      || compareText(left.period, right.period)
      || compareText(left.timeZone, right.timeZone)
      || compareText(left.mode, right.mode))[0];
    return Object.freeze({
      ...deterministic,
      observedAtMs: Math.min(...group.map((item) => item.observedAtMs)),
      resetAt: Math.max(...group.map((item) => item.resetAt)),
    });
  }));
}

function preferEpochBoundaryOwner(left: RevenueQuotaReceipt, right: RevenueQuotaReceipt): RevenueQuotaReceipt {
  if (left.resetAt !== right.resetAt) return left.resetAt > right.resetAt ? left : right;
  const order = compareText(left.period, right.period)
    || compareText(left.timeZone, right.timeZone)
    || compareText(left.receiptId, right.receiptId);
  return order <= 0 ? left : right;
}

function stateFromRead(deps: Dependencies, read: Extract<RevenueQuotaReceiptRead, { status: 'available' }>) {
  const receipts = [...normalizeReceipts(read.receipts)].sort((left, right) =>
    left.observedAtMs - right.observedAtMs || compareText(left.receiptId, right.receiptId));
  const effectiveNowMs = Math.max(deps.now(), ...receipts.map((item) => item.observedAtMs));
  const epochs: { receipts: RevenueQuotaReceipt[]; owner: RevenueQuotaReceipt; resetAt: number }[] = [];
  for (const receipt of receipts) {
    const active = epochs[epochs.length - 1];
    if (!active || receipt.observedAtMs >= active.resetAt) {
      epochs.push({ receipts: [receipt], owner: receipt, resetAt: receipt.resetAt });
    } else {
      active.receipts.push(receipt);
      active.owner = preferEpochBoundaryOwner(active.owner, receipt);
      active.resetAt = Math.max(active.resetAt, receipt.resetAt);
    }
  }
  const active = [...epochs].reverse().find((epoch) => effectiveNowMs < epoch.resetAt);
  if (active) {
    const window = Object.freeze({
      period: active.owner.period,
      timeZone: active.owner.timeZone,
      observedAtMs: active.owner.observedAtMs,
      resetAt: active.owner.resetAt,
      effectiveNowMs,
    });
    return { window, current: active.receipts, used: active.receipts.length, receipts };
  }
  const window = resolveRevenueQuotaDailyWindow({
    nowMs: effectiveNowMs,
    requestedTimeZone: deps.timeZone(),
    observations: receipts,
  });
  return { window, current: [] as RevenueQuotaReceipt[], used: 0, receipts };
}

export function createFlashcardTrainingQuotaAccess(deps: Dependencies) {
  return Object.freeze({
    async preview(input: PreviewInput): Promise<RevenueQuotaAccessResult> {
      // зачем: владелец «кнопка нажимается, но ничего не происходит» — экран молча
      // не пускал при любом не-'allowed' статусе. Каждая ветка обязана печатать
      // ЗНАЧЕНИЕ, которое её выбрало, иначе диагноз приходится угадывать.
      const startedAtMs = deps.now();
      console.log('[FC-TRAIN-ENTRY] preview:in', JSON.stringify({
        accessResolved: input.accessResolved,
        hasPremiumAccess: input.hasPremiumAccess,
        tokenPhase: input.token.phase,
        tokenStableId: input.token.stableId,
        tokenGeneration: input.token.generation,
        isCurrentAccount: deps.isCurrentAccount(input.token),
      }));
      if (!input.accessResolved) {
        console.log('[FC-TRAIN-ENTRY] preview:out waiting — accessResolved=false (премиум ещё не разрешён)');
        return base('waiting');
      }
      if (!validToken(deps, input.token)) {
        console.log('[FC-TRAIN-ENTRY] preview:out stale_account — невалидный токен', JSON.stringify({
          phase: input.token.phase,
          stableId: input.token.stableId,
          stableIdLen: typeof input.token.stableId === 'string' ? input.token.stableId.length : null,
          isCurrentAccount: deps.isCurrentAccount(input.token),
        }));
        return base('stale_account');
      }
      if (input.hasPremiumAccess) {
        console.log('[FC-TRAIN-ENTRY] preview:out allowed/plus — премиум, лимита нет');
        return unlimited('plus');
      }
      const gateEnabled = deps.isGateEnabled();
      if (!gateEnabled) {
        console.log('[FC-TRAIN-ENTRY] preview:out allowed/remote_config — isFlashcardsPremiumGated=false');
        return unlimited('remote_config');
      }
      const read = await deps.readReceipts(input.token.stableId);
      console.log('[FC-TRAIN-ENTRY] preview:read', JSON.stringify({
        readStatus: read.status,
        receipts: read.status === 'available' ? read.receipts.length : null,
        lineage: read.status === 'available' ? read.lineage : null,
        tookMs: deps.now() - startedAtMs,
      }));
      if (!deps.isCurrentAccount(input.token)) {
        console.log('[FC-TRAIN-ENTRY] preview:out stale_account — аккаунт сменился, пока читали чеки');
        return base('stale_account');
      }
      if (read.status !== 'available') {
        console.log(`[FC-TRAIN-ENTRY] preview:out ${read.status} — чеки не прочитались (источник phone_state_practice_bridge)`);
        return base(read.status);
      }
      const { window, used } = stateFromRead(deps, read);
      return Object.freeze({
        status: used >= FLASHCARD_TRAINING_DAILY_LIMIT ? 'exhausted' : 'allowed',
        used,
        limit: FLASHCARD_TRAINING_DAILY_LIMIT,
        resetAt: window.resetAt,
        period: window.period,
        bypass: null,
      });
    },

    async consume(input: ConsumeInput): Promise<RevenueQuotaAccessResult> {
      if (!input.accessResolved) return base('waiting');
      if (!input.receiptId.trim() || !validToken(deps, input.token)) return base('stale_account');
      if (!deps.isGateEnabled()) return unlimited('remote_config');
      return deps.withAccountLock(async (lease) => {
        if (!validToken(deps, input.token)) return base('stale_account');
        if (await deps.verifyPaidAccess(input.token, lease)) return unlimited('plus');
        if (!deps.isCurrentAccount(input.token)) return base('stale_account');
        const read = await deps.readReceipts(input.token.stableId);
        if (!deps.isCurrentAccount(input.token)) return base('stale_account');
        /**
         * зачем (владелец 2026-09-13): хранилище квоты физически недоступно —
         * база phone-state не открылась. Раньше это давало отказ, и человек не
         * мог начать тренировку ВООБЩЕ: из хаба его пускали, а здесь выбрасывало
         * с откатом энергии. Решение владельца — не наказывать за нашу аварию.
         * Записать чек всё равно некуда, поэтому пропускаем как разовый обход;
         * bypass помечен, чтобы это было видно в аналитике, а не выглядело
         * обычным платным стартом. Сам ЛИМИТ при этом не отменён: как только
         * база откроется, счёт снова ведётся честно.
         */
        if (read.status === 'unavailable') {
          console.warn('[FC-TRAIN-ENTRY] consume: хранилище квоты недоступно — пускаем без списания');
          return unlimited('remote_config');
        }
        if (read.status !== 'available') return base(read.status);
        const { window, used, receipts } = stateFromRead(deps, read);
        const replay = receipts.some((receipt) => receipt.receiptId === input.receiptId);
        if (replay) {
          return Object.freeze({ status: 'allowed', used, limit: FLASHCARD_TRAINING_DAILY_LIMIT,
            resetAt: window.resetAt, period: window.period, bypass: 'idempotent' });
        }
        if (used >= FLASHCARD_TRAINING_DAILY_LIMIT) {
          return Object.freeze({ status: 'exhausted', used, limit: FLASHCARD_TRAINING_DAILY_LIMIT,
            resetAt: window.resetAt, period: window.period, bypass: null });
        }
        const receipt: RevenueQuotaReceipt = Object.freeze({
          schemaVersion: 'revenue-quota.v1',
          quota: 'flashcard_training_starts',
          lineage: read.lineage,
          period: window.period,
          timeZone: window.timeZone,
          resetAt: window.resetAt,
          observedAtMs: window.effectiveNowMs,
          receiptId: input.receiptId,
          mode: input.mode,
        });
        const committed = await deps.commitReceipt(input.token.stableId, receipt);
        if (!deps.isCurrentAccount(input.token)) return base('stale_account');
        if (committed.status === 'stale_account') return base('stale_account');
        if (committed.status !== 'committed') return base('unavailable');
        return Object.freeze({ status: 'allowed', used: used + (committed.duplicate ? 0 : 1),
          limit: FLASHCARD_TRAINING_DAILY_LIMIT, resetAt: window.resetAt,
          period: window.period, bypass: committed.duplicate ? 'idempotent' : null });
      });
    },
  });
}

const defaultAccess = createFlashcardTrainingQuotaAccess({
  now: () => Date.now(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  isGateEnabled: isFlashcardsPremiumGated,
  isCurrentAccount: isCurrentAccountGeneration,
  withAccountLock: withAccountTransitionLock,
  verifyPaidAccess: getVerifiedPremiumAccessStatusForAccountLease,
  readReceipts: readFlashcardTrainingQuotaReceipts,
  commitReceipt: commitFlashcardTrainingQuotaReceipt,
});

export const previewFlashcardTrainingQuota = defaultAccess.preview;
export const consumeFlashcardTrainingQuota = defaultAccess.consume;
export { captureAccountGeneration };

export default function __RouteShim() {
  return null;
}
