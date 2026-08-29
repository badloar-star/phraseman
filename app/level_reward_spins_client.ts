import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser } from './cloud_sync';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { getCanonicalUserId } from './user_id_policy';
import { emitAppEvent } from './events';
import {
  ALL_LEVEL_GIFT_DEFS,
  type GiftDef,
} from './level_gift_system';
import { LEVEL_SPIN_REWARD_CATALOG } from './level_spin_reward_catalog';
import {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  LEVEL_SPIN_PENDING_REVEAL_KEY,
  LEVEL_SPIN_OUTBOX_KEY,
} from './level_up_storage_keys';
import { DebugLogger } from './debug-logger';

export {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  LEVEL_SPIN_MATERIALIZED_RESULTS_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  LEVEL_SPIN_PENDING_REVEAL_KEY,
  LEVEL_SPIN_OUTBOX_KEY,
} from './level_up_storage_keys';
const FUNCTIONS_REGION = 'us-central1';
const CALLABLE_TIMEOUT_MS = 15_000;
const LEVEL_SPIN_STATUS_CACHE_TTL_MS = 60_000;

export type LevelSpinOutbox = {
  owner: string;
  requestId: string;
  createdAtMs: number;
};

export type LevelSpinStatus = {
  ok: true;
  stableUid: string;
  balance: number;
  oldest: { id: string; level: number; kind: 'standard' | 'milestone' } | null;
  activeRequestId: string | null;
  pendingResults?: LevelSpinReceipt[];
};

export type LevelSpinReceipt = {
  ok: true;
  stableUid: string;
  requestId: string;
  creditId: string;
  level: number;
  kind: 'standard' | 'milestone';
  baseGiftId: string;
  premiumGiftId: string | null;
  createdAtMs: number;
  expiresAtMs: number;
  balanceAfter: number;
  status: 'awaiting_ack' | 'acknowledged';
  revealState?: 'pending' | 'acknowledged';
  deliveries?: {
    base: LevelSpinPublicLaneState;
    premium?: LevelSpinPublicLaneState;
  };
  catalogVersion: number;
  schemaVersion: number;
  /** Device-owned receipt: never enters the callable delivery protocol. */
  localOnly?: boolean;
};

export type LevelSpinPublicLaneState = {
  state: 'unclaimed' | 'delivering' | 'delivered' | 'expired';
  selectedGiftId?: string;
  deliveryLeaseUntilMs?: number;
};

export type LevelSpinInventoryMaterialization =
  | { kind: 'single'; level: number; receivedAtMs: number; gift: GiftDef }
  | { kind: 'dual'; level: number; receivedAtMs: number; pair: { f2p: GiftDef; prem: GiftDef } };

export type LevelSpinJournalOccurrence = {
  occurrenceId: string;
  lane: 'base' | 'premium';
  giftId: string;
  claimed: boolean;
};

export type LevelSpinJournalEntry = {
  owner: string;
  requestId: string;
  creditId: string;
  level: number;
  receivedAtMs: number;
  expiresAtMs: number;
  occurrences: LevelSpinJournalOccurrence[];
};

export function mergeLevelSpinJournal(
  entries: readonly LevelSpinJournalEntry[],
  entry: LevelSpinJournalEntry,
): LevelSpinJournalEntry[] {
  const existing = entries.find((candidate) => candidate.requestId === entry.requestId);
  if (existing) {
    return entries.map((candidate) => candidate.requestId !== entry.requestId ? candidate : {
      ...entry,
      occurrences: entry.occurrences.map((occurrence) => ({
        ...occurrence,
        claimed: occurrence.claimed === true
          || existing.occurrences.find((prior) => prior.lane === occurrence.lane)?.claimed === true,
      })),
    });
  }
  return [...entries, entry].slice(-64);
}

function isTerminalDelivery(state: LevelSpinPublicLaneState | undefined): boolean {
  return state?.state === 'delivered' || state?.state === 'expired';
}

export function journalEntryForReceipt(receipt: LevelSpinReceipt, stableId: string): LevelSpinJournalEntry {
  const baseDelivery = receipt.deliveries?.base;
  const premiumDelivery = receipt.deliveries?.premium;
  return {
    owner: stableId,
    requestId: receipt.requestId,
    creditId: receipt.creditId,
    level: receipt.level,
    receivedAtMs: receipt.createdAtMs,
    expiresAtMs: receipt.expiresAtMs,
    occurrences: [
      {
        occurrenceId: `level-spin:${receipt.requestId}:base`,
        lane: 'base',
        giftId: baseDelivery?.selectedGiftId ?? receipt.baseGiftId,
        claimed: isTerminalDelivery(baseDelivery),
      },
      ...(receipt.premiumGiftId ? [{
        occurrenceId: `level-spin:${receipt.requestId}:premium`,
        lane: 'premium' as const,
        giftId: premiumDelivery?.selectedGiftId ?? receipt.premiumGiftId,
        claimed: isTerminalDelivery(premiumDelivery),
      }] : []),
    ],
  };
}

export function parsePendingLevelSpinReveal(raw: string | null, owner: string): LevelSpinReceipt | null {
  try {
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown; receipt?: Partial<LevelSpinReceipt> } : null;
    const receipt = parsed?.receipt as LevelSpinReceipt | undefined;
    const requestId = String(receipt?.requestId ?? '');
    const expiresAtMs = Number(receipt?.expiresAtMs);
    if (parsed?.owner !== owner
      || receipt?.ok !== true
      || receipt.stableUid !== owner
      || !/^[A-Za-z0-9_-]{16,96}$/.test(requestId)
      || !Number.isFinite(expiresAtMs)
      || expiresAtMs <= Date.now()) return null;
    levelSpinReceiptToInventory(receipt);
    return receipt;
  } catch {
    return null;
  }
}

async function quarantineInvalidPendingReveal(raw: string | null, owner: string): Promise<void> {
  try {
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown } : null;
    if (parsed?.owner === owner) await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
  } catch {
    // A malformed account-local key is safe to remove; the next server status
    // reconciliation will recreate a valid reveal if one still exists.
    if (raw) await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY).catch(() => {});
  }
}

const balancePeekByOwner = new Map<string, number>();
const enrolledV1Owners = new Set<string>();
const enrollmentInFlight = new Map<string, Promise<void>>();
const statusCacheByOwner = new Map<string, { updatedAtMs: number; status: LevelSpinStatus }>();
const statusInFlightByOwner = new Map<string, Promise<LevelSpinStatus>>();

function boundedBalance(raw: unknown): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function giftById(giftId: string): GiftDef {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId);
  if (!gift) throw new Error(`level_spin_catalog_mismatch:${giftId}`);
  return { ...gift, choices: gift.choices?.map((choice) => ({ ...choice })) };
}

function giftWithSpinAuthority(
  giftId: string,
  receipt: LevelSpinReceipt,
  lane: 'base' | 'premium',
): GiftDef {
  const gift = giftById(giftId);
  const spinTier = LEVEL_SPIN_REWARD_CATALOG.find((entry) => entry.id === giftId)?.tier;
  if (receipt.localOnly) return {
    ...gift,
    ...(spinTier ? { spinTier } : {}),
    choices: gift.choices?.map((choice) => ({ ...choice })),
  };
  return {
    ...gift,
    ...(spinTier ? { spinTier } : {}),
    spinRewardReceipt: { requestId: receipt.requestId, lane, giftId },
    choices: gift.choices?.map((choice) => ({
      ...choice,
      spinRewardReceipt: { requestId: receipt.requestId, lane, giftId: choice.id },
    })),
  };
}

export function parseLevelSpinOutbox(raw: string | null, owner: string): LevelSpinOutbox | null {
  try {
    const value = raw ? JSON.parse(raw) as Partial<LevelSpinOutbox> : null;
    if (!value || value.owner !== owner || !/^[A-Za-z0-9_-]{16,96}$/.test(String(value.requestId ?? ''))) {
      return null;
    }
    const createdAtMs = Number(value.createdAtMs);
    return {
      owner,
      requestId: String(value.requestId),
      createdAtMs: Number.isFinite(createdAtMs) ? Math.max(0, createdAtMs) : 0,
    };
  } catch {
    return null;
  }
}

export function levelSpinReceiptToInventory(receipt: LevelSpinReceipt): LevelSpinInventoryMaterialization {
  if (!Number.isInteger(receipt.level) || receipt.level < 2 || receipt.level > 60) {
    throw new Error('level_spin_receipt_level_invalid');
  }
  const expectedCreditId = `level_spin_v1_${String(receipt.level).padStart(3, '0')}`;
  const examCredit = /^level_exam_spin_v1_(A1|A2|B1|B2)$/.test(receipt.creditId);
  const milestoneLevels = new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  const expectedKind = examCredit ? 'standard' : (milestoneLevels.has(receipt.level) ? 'milestone' : 'standard');
  if ((!examCredit && receipt.creditId !== expectedCreditId) || receipt.kind !== expectedKind) {
    throw new Error('level_spin_receipt_credit_invalid');
  }
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(receipt.requestId)
    || receipt.catalogVersion !== 1
    || receipt.schemaVersion !== 1) {
    throw new Error('level_spin_receipt_schema_invalid');
  }
  if (!Number.isFinite(receipt.createdAtMs) || receipt.expiresAtMs !== receipt.createdAtMs + 259_200_000) {
    throw new Error('level_spin_receipt_ttl_invalid');
  }
  const base = giftWithSpinAuthority(receipt.baseGiftId, receipt, 'base');
  if (!receipt.premiumGiftId) {
    return { kind: 'single', level: receipt.level, receivedAtMs: receipt.createdAtMs, gift: base };
  }
  return {
    kind: 'dual',
    level: receipt.level,
    receivedAtMs: receipt.createdAtMs,
    pair: { f2p: base, prem: giftWithSpinAuthority(receipt.premiumGiftId, receipt, 'premium') },
  };
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), CALLABLE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function currentFor(token: AccountGenerationToken, stableId: string): boolean {
  return isCurrentAccountGeneration(token, stableId);
}

async function persistBalance(stableId: string, balance: number, token: AccountGenerationToken): Promise<void> {
  if (!currentFor(token, stableId)) return;
  const safeBalance = boundedBalance(balance);
  const previousBalance = balancePeekByOwner.get(stableId);
  await AsyncStorage.setItem(LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner: stableId, balance: safeBalance }));
  if (!currentFor(token, stableId)) return;
  balancePeekByOwner.delete(stableId);
  balancePeekByOwner.set(stableId, safeBalance);
  while (balancePeekByOwner.size > 8) {
    const oldest = balancePeekByOwner.keys().next().value;
    if (!oldest) break;
    balancePeekByOwner.delete(oldest);
  }
  if (previousBalance !== safeBalance) {
    emitAppEvent('level_spin_balance_changed');
  }
}

export async function persistAuthoritativeLevelSpinBalance(
  stableId: string,
  balance: number,
): Promise<void> {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new Error('level_spin_invalid_balance');
  }
  const token = captureAccountGeneration();
  if (!currentFor(token, stableId)) return;
  await persistBalance(stableId, balance, token);
}

export function peekLevelSpinBalance(stableId: string | null | undefined): number | null {
  if (!stableId) return null;
  return balancePeekByOwner.get(stableId) ?? null;
}

export async function readCachedLevelSpinBalance(stableId: string): Promise<number | null> {
  const token = captureAccountGeneration();
  if (!isCurrentAccountGeneration(token, stableId)) return null;
  try {
    const raw = await AsyncStorage.getItem(LEVEL_SPIN_BALANCE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown; balance?: unknown } : null;
    if (!parsed || parsed.owner !== stableId) return null;
    const balance = boundedBalance(parsed.balance);
    if (!isCurrentAccountGeneration(token, stableId)) return null;
    balancePeekByOwner.set(stableId, balance);
    return balance;
  } catch {
    return null;
  }
}

async function prepareNetwork(): Promise<void> {
  await ensureAnonUser();
  await initFirebaseAppCheckIfAvailable().catch(() => false);
}

async function enrollLevelSpinV1(stableId: string, token: AccountGenerationToken): Promise<void> {
  if (enrolledV1Owners.has(stableId)) return;
  const existing = enrollmentInFlight.get(stableId);
  if (existing) return existing;
  const request = (async () => {
    const response = await withTimeout(
      callable<{ stableId: string }, { ok: true; stableUid: string }>('levelRewardSpinEnrollV1')({ stableId }),
      'level_spin_enroll_v1',
    );
    if (response.data.stableUid !== stableId) throw new Error('level_spin_owner_mismatch');
    if (currentFor(token, stableId)) enrolledV1Owners.add(stableId);
  })().finally(() => enrollmentInFlight.delete(stableId));
  enrollmentInFlight.set(stableId, request);
  return request;
}

async function fetchLevelSpinStatusUncached(
  stableId: string,
  token: AccountGenerationToken,
): Promise<LevelSpinStatus> {
  await prepareNetwork();
  await enrollLevelSpinV1(stableId, token);
  const response = await withTimeout(
    callable<{ stableId: string }, LevelSpinStatus>('levelRewardSpinStatus')({ stableId }),
    'level_spin_status',
  );
  if (response.data.stableUid !== stableId) throw new Error('level_spin_owner_mismatch');
  await withAccountTransitionLock(async () => {
    if (!currentFor(token, stableId)) return;
    if (response.data.pendingResults?.length) {
      const raw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
      let journal: LevelSpinJournalEntry[] = [];
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) journal = parsed as LevelSpinJournalEntry[];
      } catch {
        journal = [];
      }
      for (const receipt of response.data.pendingResults) {
        if (receipt.stableUid !== stableId) throw new Error('level_spin_receipt_owner_mismatch');
        levelSpinReceiptToInventory(receipt);
        journal = mergeLevelSpinJournal(journal, journalEntryForReceipt(receipt, stableId));
      }
      await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(journal));
      const verifiedRaw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
      const verified = (() => {
        try { return verifiedRaw ? JSON.parse(verifiedRaw) as LevelSpinJournalEntry[] : []; }
        catch { return [] as LevelSpinJournalEntry[]; }
      })();
      if (!response.data.pendingResults.every((receipt) => verified.some((entry) => (
        entry.owner === stableId && entry.requestId === receipt.requestId
      )))) throw new Error('level_spin_journal_write_failed');
    }
    await persistBalance(stableId, response.data.balance, token);
  });
  return response.data;
}

export async function fetchLevelSpinStatus(
  options: { force?: boolean } = {},
): Promise<LevelSpinStatus> {
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('level_spin_identity_unavailable');
  const token = captureAccountGeneration();
  const now = Date.now();
  const cached = statusCacheByOwner.get(stableId);
  if (!options.force && cached && now - cached.updatedAtMs < LEVEL_SPIN_STATUS_CACHE_TTL_MS) {
    return cached.status;
  }
  const existing = statusInFlightByOwner.get(stableId);
  if (existing) return existing;
  const request = fetchLevelSpinStatusUncached(stableId, token).then((status) => {
    if (currentFor(token, stableId)) {
      statusCacheByOwner.set(stableId, { updatedAtMs: Date.now(), status });
    }
    return status;
  }).finally(() => statusInFlightByOwner.delete(stableId));
  statusInFlightByOwner.set(stableId, request);
  return request;
}

async function persistReceipt(
  receipt: LevelSpinReceipt,
  stableId: string,
  token: AccountGenerationToken,
): Promise<void> {
  levelSpinReceiptToInventory(receipt);
  await withAccountTransitionLock(async () => {
    if (!currentFor(token, stableId)) return;
    const journalRaw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
    if (!currentFor(token, stableId)) return;
    const journal = (() => {
      try {
        const value = journalRaw ? JSON.parse(journalRaw) : [];
        return Array.isArray(value) ? value as LevelSpinJournalEntry[] : [];
      } catch { return [] as LevelSpinJournalEntry[]; }
    })();
    const entry = journalEntryForReceipt(receipt, stableId);
    const nextJournal = mergeLevelSpinJournal(journal, entry);
    await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(nextJournal));
    const verifiedJournalRaw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
    const verifiedJournal = (() => {
      try { return verifiedJournalRaw ? JSON.parse(verifiedJournalRaw) as LevelSpinJournalEntry[] : []; }
      catch { return [] as LevelSpinJournalEntry[]; }
    })();
    if (!verifiedJournal.some((candidate) => (
      candidate.owner === stableId && candidate.requestId === receipt.requestId
    ))) throw new Error('level_spin_journal_write_failed');
    if (!currentFor(token, stableId)) return;
    const revealState = receipt.revealState
      ?? (receipt.status === 'acknowledged' ? 'acknowledged' : 'pending');
    const writes: [string, string][] = [
      [LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner: stableId, balance: boundedBalance(receipt.balanceAfter) })],
    ];
    if (revealState === 'pending') {
      writes.unshift([LEVEL_SPIN_PENDING_REVEAL_KEY, JSON.stringify({ owner: stableId, receipt })]);
    }
    await AsyncStorage.multiSet(writes);
    if (revealState === 'acknowledged') {
      const pendingRaw = await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
      try {
        const pending = pendingRaw ? JSON.parse(pendingRaw) as { owner?: unknown; receipt?: { requestId?: unknown } } : null;
        if (pending?.owner === stableId && pending.receipt?.requestId === receipt.requestId) {
          await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
        }
      } catch (e) {
      // A malformed account-local reveal is ignored and replaced by the next valid claim.
      DebugLogger.error('level_reward_spins_client:pending', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
    if (!currentFor(token, stableId)) return;
    balancePeekByOwner.set(stableId, boundedBalance(receipt.balanceAfter));
    emitAppEvent('level_spin_balance_changed');
  });
}

async function finishPersistedClaim(outbox: LevelSpinOutbox, token: AccountGenerationToken): Promise<LevelSpinReceipt> {
  await prepareNetwork();
  const response = await withTimeout(
    callable<{ stableId: string; requestId: string }, LevelSpinReceipt>('levelRewardSpinClaim')({
      stableId: outbox.owner,
      requestId: outbox.requestId,
    }),
    'level_spin_claim',
  );
  const receipt = response.data;
  if (receipt.stableUid !== outbox.owner || receipt.requestId !== outbox.requestId) {
    throw new Error('level_spin_receipt_owner_mismatch');
  }
  await persistReceipt(receipt, outbox.owner, token);
  if (!currentFor(token, outbox.owner)) throw new Error('level_spin_identity_changed');
  return receipt;
}

function isActiveSpinPendingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const data = error as { code?: unknown; message?: unknown; details?: unknown };
  return [data.code, data.message, data.details]
    .some((value) => String(value ?? '').includes('ACTIVE_SPIN_PENDING'));
}

async function finishWithServerRecovery(
  outbox: LevelSpinOutbox,
  token: AccountGenerationToken,
): Promise<LevelSpinReceipt> {
  try {
    return await finishPersistedClaim(outbox, token);
  } catch (error) {
    if (!isActiveSpinPendingError(error) || !currentFor(token, outbox.owner)) throw error;
    const status = await fetchLevelSpinStatus({ force: true });
    if (!currentFor(token, outbox.owner)) throw new Error('level_spin_identity_changed');
    const activeRequestId = status.activeRequestId;
    if (!activeRequestId || activeRequestId === outbox.requestId) throw error;
    const authoritativeOutbox: LevelSpinOutbox = {
      owner: outbox.owner,
      requestId: activeRequestId,
      createdAtMs: Date.now(),
    };
    await withAccountTransitionLock(async () => {
      if (!currentFor(token, outbox.owner)) return;
      await AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY, JSON.stringify(authoritativeOutbox));
    });
    if (!currentFor(token, outbox.owner)) throw new Error('level_spin_identity_changed');
    return finishPersistedClaim(authoritativeOutbox, token);
  }
}

const revealAckInFlight = new Map<string, Promise<void>>();

export function acknowledgeLevelSpinReveal(requestId: string): Promise<void> {
  const existing = revealAckInFlight.get(requestId);
  if (existing) return existing;
  const operation = (async () => {
    const stableId = await getCanonicalUserId();
    if (!stableId) throw new Error('level_spin_identity_unavailable');
    const token = captureAccountGeneration();
    const pending = parsePendingLevelSpinReveal(
      await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY),
      stableId,
    );
    if (!pending || pending.requestId !== requestId || !currentFor(token, stableId)) return;
    await prepareNetwork();
    await withTimeout(
      callable<{ stableId: string; requestId: string }, { ok: true }>('levelRewardSpinAcknowledge')({
        stableId,
        requestId,
      }),
      'level_spin_acknowledge',
    );
    await withAccountTransitionLock(async () => {
      if (!currentFor(token, stableId)) return;
      const currentPending = parsePendingLevelSpinReveal(
        await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY),
        stableId,
      );
      const outbox = parseLevelSpinOutbox(await AsyncStorage.getItem(LEVEL_SPIN_OUTBOX_KEY), stableId);
      const removals: string[] = [];
      if (currentPending?.requestId === requestId) removals.push(LEVEL_SPIN_PENDING_REVEAL_KEY);
      if (outbox?.requestId === requestId) removals.push(LEVEL_SPIN_OUTBOX_KEY);
      if (removals.length) await AsyncStorage.multiRemove(removals);
    });
  })().finally(() => revealAckInFlight.delete(requestId));
  revealAckInFlight.set(requestId, operation);
  return operation;
}

export async function recoverLevelSpinClaim(): Promise<LevelSpinReceipt | null> {
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  const token = captureAccountGeneration();
  const pendingRaw = await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
  const pendingReveal = parsePendingLevelSpinReveal(pendingRaw, stableId);
  if (pendingRaw && !pendingReveal) await quarantineInvalidPendingReveal(pendingRaw, stableId);
  if (pendingReveal && currentFor(token, stableId)) {
    return pendingReveal;
  }
  let outbox = parseLevelSpinOutbox(await AsyncStorage.getItem(LEVEL_SPIN_OUTBOX_KEY), stableId);
  if (!currentFor(token, stableId)) return null;
  if (!outbox) {
    const status = await fetchLevelSpinStatus({ force: true });
    const outstanding = status.pendingResults?.find((result) => (
      result.requestId === status.activeRequestId && result.revealState !== 'acknowledged'
    )) ?? null;
    if (outstanding) {
      await persistReceipt(outstanding, stableId, token);
      return currentFor(token, stableId) ? outstanding : null;
    }
    if (!status.activeRequestId) return null;
    if (!currentFor(token, stableId)) return null;
    outbox = { owner: stableId, requestId: status.activeRequestId, createdAtMs: Date.now() };
    await AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY, JSON.stringify(outbox));
    if (!currentFor(token, stableId)) return null;
  }
  return finishWithServerRecovery(outbox, token);
}

export async function claimLevelSpin(): Promise<LevelSpinReceipt> {
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('level_spin_identity_unavailable');
  const token = captureAccountGeneration();
  const pendingRaw = await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
  const pendingReveal = parsePendingLevelSpinReveal(pendingRaw, stableId);
  if (pendingRaw && !pendingReveal) await quarantineInvalidPendingReveal(pendingRaw, stableId);
  if (pendingReveal && currentFor(token, stableId)) {
    return pendingReveal;
  }
  const existing = parseLevelSpinOutbox(await AsyncStorage.getItem(LEVEL_SPIN_OUTBOX_KEY), stableId);
  if (!currentFor(token, stableId)) throw new Error('level_spin_identity_changed');
  const outbox = existing ?? { owner: stableId, requestId: Crypto.randomUUID(), createdAtMs: Date.now() };
  if (!existing) {
    await AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY, JSON.stringify(outbox));
    if (!currentFor(token, stableId)) throw new Error('level_spin_identity_changed');
  }
  return finishWithServerRecovery(outbox, token);
}

export const __levelRewardSpinsClientTestHooks = {
  reset: (): void => {
    balancePeekByOwner.clear();
    enrolledV1Owners.clear();
    enrollmentInFlight.clear();
    statusCacheByOwner.clear();
    statusInFlightByOwner.clear();
  },
};
