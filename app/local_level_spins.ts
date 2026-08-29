import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  LEVEL_SPIN_PENDING_REVEAL_KEY,
} from './level_up_storage_keys';
import { isLocalSpinCreditId, isLocalSpinReceiptCreditId } from './level_spin_credit_ids';
import {
  localJournalEntryForReceipt,
  mergeLocalSpinJournal,
  paidLevelSpinEnvelopeKey,
  paidLevelSpinEnvelopePrefix,
  parsePaidLevelSpinEnvelope,
  parseLocalPendingReveal,
  isRecoverableLocalLevelSpinReceipt,
  type LocalLevelSpinJournalEntry,
  type LocalLevelSpinReceipt,
  type PaidLevelSpinEnvelopeV1,
} from './level_spin_local_contract';
import {
  LEVEL_SPIN_REWARD_CATALOG_VERSION,
  pickLevelSpinRewardExcluding,
} from './level_spin_reward_catalog';
import { listExhaustedSpinRewardIds } from './theme_gift_pool';
import { stableUniqueStrings } from './spin_gift_storage_integrity';
import {
  PAID_LEVEL_SPIN_RUNE_PRICE,
  preparePaidLevelSpinRunePurchase,
  recoverAndHydrateLevelSpinStarGrants,
  sessionAttemptRuneOperationStorageKey,
} from './level_spin_star_grants';
import { commitPhoneStateNonMonetaryEconomyGrant } from './phone_state_economy_bridge';
import {
  hasValidPaidLevelSpinRuneFingerprint,
  parsePaidLevelSpinRuneOperation,
  type PaidLevelSpinRuneOperationV1,
} from '../modules/phone-state/domains/economy';
export { localLevelSpinReceiptToInventory, type LocalLevelSpinReceipt } from './level_spin_local_contract';

/**
 * Device-owned Spin state. A cloud copy may be added later, but no remote call
 * is permitted on the interactive Spin path.
 */
export const LOCAL_LEVEL_SPIN_STATE_KEY = 'local_level_spin_state_v1';

/**
 * Разрешённые идентификаторы кредита спина — ОДИН список на оба фильтра
 * загрузки (сам кредит и ключ идемпотентности).
 *
 * зачем (инцидент 2026-08-23): списки были продублированы вручную и разошлись
 * с источниками. Незнакомый префикс молча вырезался при загрузке состояния:
 * пропадал ключ идемпотентности (тот же матч/сессия выдавали спин ПОВТОРНО) и
 * пропадал сам кредит (игрок терял заработанный спин после перезапуска).
 * Добавляешь новый источник спина — добавь его префикс СЮДА, и оба фильтра
 * подхватят его вместе. Сторож: tests/local_level_spins.test.ts.
 */
const LOCAL_RESULT_TTL_MS = 72 * 60 * 60 * 1000;
const MAX_PAID_LEVEL_SPIN_OUTBOX = 4_096;
// «Второй шанс» остаётся распознаваемым для уже выданных квитанций, но больше
// не участвует в новых розыгрышах: три попытки теперь восстанавливаются
// автоматически после обнуления сессионных рун.
const RETIRED_LEVEL_SPIN_REWARD_IDS = ['attempt_restore_all'] as const;

type LocalSpinCredit = { id: string; level: number };
type LocalSpinState = {
  owner: string;
  credits: LocalSpinCredit[];
  /** Levels already minted locally; prevents a consumed credit being recreated. */
  issuedLevels: number[];
  issuedCreditIds: string[];
  /** Durable local claim intent: restores journal/reveal after a partial write. */
  activeReceipt: LocalLevelSpinReceipt | null;
  closedRequestIds: string[];
};

function ownerFromDevice(): string | null {
  return captureAccountGeneration().stableId ?? null;
}

function localLevelSpinStateKey(owner: string): string {
  return `${LOCAL_LEVEL_SPIN_STATE_KEY}:${encodeURIComponent(owner)}`;
}

export function paidLevelSpinOutboxKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('paid_level_spin_owner_invalid');
  return `paid_level_spin_outbox_v1:${encodeURIComponent(owner)}`;
}

function normalizeLevels(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(Number)
    .filter((level) => Number.isInteger(level) && level >= 2 && level <= 60))]
    .sort((left, right) => left - right);
}

function normalizeState(raw: string | null, owner: string): LocalSpinState {
  try {
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_root');
    const candidate = parsed as Partial<LocalSpinState>;
    if (candidate.owner !== owner || !Array.isArray(candidate.credits)) throw new Error('invalid_owner_or_credits');
    if (candidate.issuedLevels !== undefined && !Array.isArray(candidate.issuedLevels)) throw new Error('invalid_issued_levels');
    if (candidate.issuedCreditIds !== undefined && !Array.isArray(candidate.issuedCreditIds)) throw new Error('invalid_issued_ids');
    if (candidate.closedRequestIds !== undefined && !Array.isArray(candidate.closedRequestIds)) throw new Error('invalid_closed_ids');
    if (candidate.activeReceipt !== undefined && candidate.activeReceipt !== null
      && (typeof candidate.activeReceipt !== 'object' || Array.isArray(candidate.activeReceipt))) {
      throw new Error('invalid_active_receipt');
    }
    const credits = candidate.credits.map((credit) => {
      if (!credit || typeof credit !== 'object') throw new Error('invalid_credit');
      const id = (credit as { id?: unknown }).id;
      const level = (credit as { level?: unknown }).level;
      if (typeof id !== 'string' || !isLocalSpinCreditId(id)
        || !Number.isInteger(level) || (level as number) < 2 || (level as number) > 60) {
        throw new Error('invalid_credit');
      }
      return { id, level: level as number };
    });
    if (new Set(credits.map(({ id }) => id)).size !== credits.length) throw new Error('duplicate_credit');
    const issuedLevelsRaw = candidate.issuedLevels ?? credits.map((credit) => credit.level);
    if (!issuedLevelsRaw.every((level) => Number.isInteger(level) && Number(level) >= 2 && Number(level) <= 60)) {
      throw new Error('invalid_issued_level');
    }
    const issuedCreditIdsRaw = candidate.issuedCreditIds ?? credits.map((credit) => credit.id);
    if (!issuedCreditIdsRaw.every((id) => typeof id === 'string' && isLocalSpinCreditId(id))) {
      throw new Error('invalid_issued_id');
    }
    const closedRequestIdsRaw = candidate.closedRequestIds ?? [];
    if (!closedRequestIdsRaw.every((id) => typeof id === 'string' && /^[a-f0-9-]{16,}$/i.test(id))) {
      throw new Error('invalid_closed_id');
    }
    return {
      owner,
      credits: [...credits].sort((left, right) => left.level - right.level),
      issuedLevels: normalizeLevels(issuedLevelsRaw),
      issuedCreditIds: stableUniqueStrings(issuedCreditIdsRaw as string[]),
      activeReceipt: candidate.activeReceipt as LocalLevelSpinReceipt | null | undefined ?? null,
      closedRequestIds: stableUniqueStrings(closedRequestIdsRaw as string[]).slice(-80),
    };
  } catch {
    // Never turn corrupt authority into an empty writable state. The raw value
    // remains untouched for recovery/support and every grant/claim fails closed.
    throw new Error('local_spin_state_corrupt');
  }
}

async function writeLocalState(state: LocalSpinState): Promise<void> {
  await AsyncStorage.multiSet([
    [localLevelSpinStateKey(state.owner), JSON.stringify(state)],
    [LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner: state.owner, balance: state.credits.length })],
  ]);
  emitAppEvent('level_spin_balance_changed');
}

async function migrateCachedBalanceToLocalCredits(owner: string): Promise<LocalSpinState> {
  const raw = await AsyncStorage.getItem(LEVEL_SPIN_BALANCE_CACHE_KEY);
  let cachedBalance = 0;
  if (raw !== null) try {
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown; balance?: unknown } : null;
    if (parsed?.owner === owner) {
      if (!Number.isSafeInteger(parsed.balance) || Number(parsed.balance) < 0 || Number(parsed.balance) > 59) {
        throw new Error('invalid_balance');
      }
      cachedBalance = Number(parsed.balance);
    }
  } catch {
    throw new Error('local_spin_balance_cache_corrupt');
  }
  const state: LocalSpinState = {
    owner,
    credits: Array.from({ length: cachedBalance }, (_, index) => {
      const level = index + 2;
      return { id: `local_spin_v1_${String(level).padStart(3, '0')}`, level };
    }),
    issuedLevels: Array.from({ length: cachedBalance }, (_, index) => index + 2),
    issuedCreditIds: Array.from({ length: cachedBalance }, (_, index) => `local_spin_v1_${String(index + 2).padStart(3, '0')}`),
    activeReceipt: null,
    closedRequestIds: [],
  };
  await writeLocalState(state);
  return state;
}

async function loadLocalState(owner: string): Promise<LocalSpinState> {
  const raw = await AsyncStorage.getItem(localLevelSpinStateKey(owner));
  if (raw === null) return migrateCachedBalanceToLocalCredits(owner);
  return normalizeState(raw, owner);
}

function isValidLocalSpinJournalEntry(value: unknown): value is LocalLevelSpinJournalEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<LocalLevelSpinJournalEntry>;
  if (typeof entry.owner !== 'string' || entry.owner.trim().length === 0
    || typeof entry.requestId !== 'string' || !/^[A-Za-z0-9_-]{16,96}$/.test(entry.requestId)
    || !Array.isArray(entry.occurrences)
    || entry.occurrences.length < 1
    || entry.occurrences.length > 2) return false;
  const lanes = new Set<string>();
  const occurrencesValid = entry.occurrences.every((occurrence) => {
    if (!occurrence || (occurrence.lane !== 'base' && occurrence.lane !== 'premium')
      || lanes.has(occurrence.lane)
      || typeof occurrence.giftId !== 'string' || occurrence.giftId.trim().length === 0
      || typeof occurrence.claimed !== 'boolean') return false;
    lanes.add(occurrence.lane);
    return occurrence.occurrenceId === undefined
      || occurrence.occurrenceId === `level-spin:${entry.requestId}:${occurrence.lane}`;
  });
  if (!occurrencesValid) return false;
  // Historical server receipts share this journal and do not have localOnly.
  // Preserve them after validating their public shape; local authority itself
  // must satisfy the stronger immutable receipt projection below.
  if (entry.localOnly !== true) return entry.localOnly === undefined || entry.localOnly === false;
  const paidEntry = entry.creditId === `paid_level_spin:${entry.requestId}` && entry.level === 0;
  return (paidEntry || (isLocalSpinReceiptCreditId(entry.creditId)
      && Number.isInteger(entry.level) && Number(entry.level) >= 2 && Number(entry.level) <= 60))
    && Number.isSafeInteger(entry.receivedAtMs) && Number(entry.receivedAtMs) > 0
    && Number.isSafeInteger(entry.expiresAtMs)
    && Number(entry.expiresAtMs) === Number(entry.receivedAtMs) + LOCAL_RESULT_TTL_MS
    && entry.occurrences.length === 1
    && entry.occurrences[0]?.lane === 'base'
    && entry.occurrences[0]?.occurrenceId === `level-spin:${entry.requestId}:base`;
}

async function readLocalSpinJournal(): Promise<LocalLevelSpinJournalEntry[]> {
  const raw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidLocalSpinJournalEntry)) throw new Error('invalid_journal');
    return parsed as LocalLevelSpinJournalEntry[];
  } catch {
    throw new Error('local_spin_gift_journal_corrupt');
  }
}

async function persistLocalReceipt(receipt: LocalLevelSpinReceipt, owner: string): Promise<void> {
  const journal = await readLocalSpinJournal();
  const nextJournal = mergeLocalSpinJournal(journal, localJournalEntryForReceipt(receipt, owner));
  await AsyncStorage.multiSet([
    [LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(nextJournal)],
    [LEVEL_SPIN_PENDING_REVEAL_KEY, JSON.stringify({ owner, receipt })],
  ]);
}

async function restoreActiveReceipt(state: LocalSpinState): Promise<LocalLevelSpinReceipt | null> {
  const receipt = state.activeReceipt;
  if (!receipt) return null;

  const closed = typeof receipt.requestId === 'string' && state.closedRequestIds.includes(receipt.requestId);
  if (receipt.schemaVersion === 3) {
    let envelope: PaidLevelSpinEnvelopeV1 | null = null;
    if (!closed) {
      try {
        const raw = await AsyncStorage.getItem(paidLevelSpinEnvelopeKey(state.owner, receipt.requestId));
        envelope = raw ? await parsePaidLevelSpinEnvelope(JSON.parse(raw), state.owner) : null;
      } catch {
        envelope = null;
      }
    }
    if (!envelope) {
      await writeLocalState({ ...state, activeReceipt: null }).catch(() => {});
      await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY).catch(() => {});
      return null;
    }
    const authoritative = envelope.receipt;
    if (!sameLocalSpinReceiptAuthority(receipt, authoritative)) {
      await writeLocalState({ ...state, activeReceipt: authoritative }).catch(() => {});
    }
    await persistLocalReceipt(authoritative, state.owner).catch(() => {});
    return authoritative;
  }
  const parsedReceipt = closed ? null : parseLocalPendingReveal(
    JSON.stringify({ owner: state.owner, receipt }),
    state.owner,
  );
  const activeShapeValid = parsedReceipt !== null
    && isRecoverableLocalLevelSpinReceipt(receipt, state.owner);

  if (!activeShapeValid) {
    const journal = await readLocalSpinJournal();
    const claimedOccurrence = journal.some((entry) => entry.owner === state.owner
      && entry.requestId === receipt.requestId
      && entry.occurrences.length === 1
      && entry.occurrences[0]?.lane === 'base'
      && entry.occurrences[0]?.claimed === true);
    const rawCreditId = typeof receipt.creditId === 'string' ? receipt.creditId : '';
    const creditId = rawCreditId.replace(/^level_spin_v1_/, 'local_spin_v1_');
    const level = Number(receipt.level);
    const recoverableCredit = !closed && !claimedOccurrence
      && receipt.stableUid === state.owner
      && isLocalSpinCreditId(creditId)
      && Number.isInteger(level)
      && level >= 2
      && level <= 60
      && (!creditId.startsWith('local_spin_v1_')
        || creditId === `local_spin_v1_${String(level).padStart(3, '0')}`);
    const alreadyQueued = state.credits.some((candidate) => candidate.id === creditId);
    const credits = recoverableCredit && !alreadyQueued
      ? [...state.credits, { id: creditId, level }].sort((left, right) => left.level - right.level)
      : state.credits;
    await writeLocalState({
      ...state,
      credits,
      issuedLevels: recoverableCredit && creditId.startsWith('local_spin_v1_')
        ? normalizeLevels([...state.issuedLevels, level])
        : state.issuedLevels,
      issuedCreditIds: recoverableCredit
        ? stableUniqueStrings([...state.issuedCreditIds, creditId])
        : state.issuedCreditIds,
      activeReceipt: null,
      closedRequestIds: claimedOccurrence && typeof receipt.requestId === 'string'
        ? stableUniqueStrings([...state.closedRequestIds, receipt.requestId])
        : state.closedRequestIds,
    });
    const pendingRaw = await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
    let pendingMatchesInvalidReceipt = false;
    try {
      const pending = pendingRaw ? JSON.parse(pendingRaw) as {
        owner?: unknown;
        receipt?: { requestId?: unknown };
      } : null;
      pendingMatchesInvalidReceipt = pending?.owner === state.owner
        && pending.receipt?.requestId === receipt.requestId;
    } catch {
      pendingMatchesInvalidReceipt = false;
    }
    if (pendingMatchesInvalidReceipt) {
      await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
    }
    return null;
  }
  await persistLocalReceipt(receipt, state.owner);
  return receipt;
}

function sameLocalSpinReceiptAuthority(
  pending: LocalLevelSpinReceipt,
  active: LocalLevelSpinReceipt,
): boolean {
  return pending.ok === active.ok
    && pending.stableUid === active.stableUid
    && pending.requestId === active.requestId
    && pending.creditId === active.creditId
    && pending.level === active.level
    && pending.kind === active.kind
    && pending.baseGiftId === active.baseGiftId
    && pending.premiumGiftId === active.premiumGiftId
    && pending.createdAtMs === active.createdAtMs
    && pending.expiresAtMs === active.expiresAtMs
    && pending.balanceAfter === active.balanceAfter
    && pending.status === active.status
    && pending.revealState === active.revealState
    && pending.deliveries?.base?.state === active.deliveries?.base?.state
    && Object.keys(pending.deliveries ?? {}).length === Object.keys(active.deliveries ?? {}).length
    && pending.catalogVersion === active.catalogVersion
    && pending.schemaVersion === active.schemaVersion
    && pending.paymentKind === active.paymentKind
    && (pending.schemaVersion !== 3 || (active.schemaVersion === 3
      && pending.runeOperationId === active.runeOperationId
      && pending.runePrice === active.runePrice))
    && pending.localOnly === active.localOnly;
}

async function readPaidLevelSpinOutbox(owner: string): Promise<PaidLevelSpinRuneOperationV1[]> {
  const raw = await AsyncStorage.getItem(paidLevelSpinOutboxKey(owner));
  if (raw === null) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('paid_level_spin_outbox_corrupt'); }
  if (!Array.isArray(parsed) || parsed.length > MAX_PAID_LEVEL_SPIN_OUTBOX) {
    throw new Error('paid_level_spin_outbox_corrupt');
  }
  const result: PaidLevelSpinRuneOperationV1[] = [];
  const seen = new Map<string, string>();
  for (const candidate of parsed) {
    const operation = parsePaidLevelSpinRuneOperation(candidate);
    if (!operation || operation.ownerStableId !== owner
      || !await hasValidPaidLevelSpinRuneFingerprint(operation)) {
      throw new Error('paid_level_spin_outbox_corrupt');
    }
    const prior = seen.get(operation.operationId);
    if (prior && prior !== operation.requestFingerprint) {
      throw new Error('paid_level_spin_outbox_corrupt');
    }
    if (!prior) result.push(operation);
    seen.set(operation.operationId, operation.requestFingerprint);
  }
  return result;
}

async function readPaidLevelSpinEnvelopes(owner: string): Promise<PaidLevelSpinEnvelopeV1[]> {
  const prefix = paidLevelSpinEnvelopePrefix(owner);
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
  if (keys.length > MAX_PAID_LEVEL_SPIN_OUTBOX) throw new Error('paid_level_spin_envelope_history_too_large');
  const rows = await AsyncStorage.multiGet(keys);
  const envelopes: PaidLevelSpinEnvelopeV1[] = [];
  for (const [key, raw] of rows) {
    if (raw === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error('paid_level_spin_envelope_corrupt'); }
    const envelope = await parsePaidLevelSpinEnvelope(parsed, owner);
    if (!envelope || key !== paidLevelSpinEnvelopeKey(owner, envelope.requestId)) {
      throw new Error('paid_level_spin_envelope_corrupt');
    }
    envelopes.push(envelope);
  }
  return envelopes;
}

function samePaidLevelSpinOperation(
  left: PaidLevelSpinRuneOperationV1,
  right: PaidLevelSpinRuneOperationV1,
): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.operationId === right.operationId
    && left.ownerStableId === right.ownerStableId
    && left.accountGeneration === right.accountGeneration
    && left.requestId === right.requestId
    && left.giftId === right.giftId
    && left.catalogVersion === right.catalogVersion
    && left.runeDelta === right.runeDelta
    && left.price === right.price
    && left.balanceBefore === right.balanceBefore
    && left.balanceAfter === right.balanceAfter
    && left.reason === right.reason
    && left.createdAtMs === right.createdAtMs
    && left.requestFingerprint === right.requestFingerprint;
}

async function readMaterializedPaidLevelSpinOperation(
  owner: string,
  operationId: string,
): Promise<PaidLevelSpinRuneOperationV1 | null> {
  const raw = await AsyncStorage.getItem(sessionAttemptRuneOperationStorageKey(owner, operationId));
  if (raw === null) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('paid_level_spin_operation_corrupt'); }
  const operation = parsePaidLevelSpinRuneOperation(parsed);
  if (!operation
    || operation.ownerStableId !== owner
    || operation.operationId !== operationId
    || !await hasValidPaidLevelSpinRuneFingerprint(operation)) {
    throw new Error('paid_level_spin_operation_corrupt');
  }
  return operation;
}

async function pendingPaidLevelSpinRunePurchases(
  owner: string,
  token: AccountGenerationToken,
): Promise<PaidLevelSpinRuneOperationV1[]> {
  const [envelopes, outbox] = await Promise.all([
    readPaidLevelSpinEnvelopes(owner),
    readPaidLevelSpinOutbox(owner),
  ]);
  if (!isCurrentAccountGeneration(token, owner)) return [];

  const envelopeByOperationId = new Map<string, PaidLevelSpinRuneOperationV1>();
  const pendingByOperationId = new Map<string, PaidLevelSpinRuneOperationV1>();
  for (const { operation } of envelopes) {
    if (operation.accountGeneration !== token.generation) {
      throw new Error('paid_level_spin_envelope_account_generation_mismatch');
    }
    const materialized = await readMaterializedPaidLevelSpinOperation(owner, operation.operationId);
    if (materialized && !samePaidLevelSpinOperation(operation, materialized)) {
      throw new Error('paid_level_spin_operation_authority_conflict');
    }
    const prior = envelopeByOperationId.get(operation.operationId);
    if (prior && !samePaidLevelSpinOperation(prior, operation)) {
      throw new Error('paid_level_spin_envelope_conflict');
    }
    envelopeByOperationId.set(operation.operationId, operation);
    pendingByOperationId.set(operation.operationId, operation);
  }

  for (const operation of outbox) {
    if (operation.accountGeneration !== token.generation) {
      throw new Error('paid_level_spin_outbox_account_generation_mismatch');
    }
    const envelopeOperation = envelopeByOperationId.get(operation.operationId) ?? null;
    const materialized = await readMaterializedPaidLevelSpinOperation(owner, operation.operationId);
    const authority = envelopeOperation ?? materialized;
    if (!authority || !samePaidLevelSpinOperation(operation, authority)
      || (envelopeOperation && materialized
        && !samePaidLevelSpinOperation(envelopeOperation, materialized))) {
      throw new Error('paid_level_spin_outbox_authority_conflict');
    }
    const prior = pendingByOperationId.get(operation.operationId);
    if (prior && !samePaidLevelSpinOperation(prior, operation)) {
      throw new Error('paid_level_spin_pending_conflict');
    }
    pendingByOperationId.set(operation.operationId, authority);
  }
  return [...pendingByOperationId.values()];
}

async function removeConfirmedPaidLevelSpinOutboxOperation(
  owner: string,
  token: AccountGenerationToken,
  confirmed: PaidLevelSpinRuneOperationV1,
): Promise<void> {
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return;
    const current = await readPaidLevelSpinOutbox(owner);
    const matching = current.find((operation) => operation.operationId === confirmed.operationId);
    if (matching && !samePaidLevelSpinOperation(matching, confirmed)) {
      throw new Error('paid_level_spin_outbox_confirmed_operation_conflict');
    }
    if (!matching || !isCurrentAccountGeneration(token, owner)) return;
    await AsyncStorage.setItem(
      paidLevelSpinOutboxKey(owner),
      JSON.stringify(current.filter((operation) => operation.operationId !== confirmed.operationId)),
    );
  });
}

async function upsertPaidLevelSpinOutboxOperation(
  owner: string,
  operation: PaidLevelSpinRuneOperationV1,
): Promise<void> {
  const current = await readPaidLevelSpinOutbox(owner);
  const matching = current.find((candidate) => candidate.operationId === operation.operationId);
  if (matching) {
    if (!samePaidLevelSpinOperation(matching, operation)) {
      throw new Error('paid_level_spin_outbox_operation_conflict');
    }
    return;
  }
  if (current.length >= MAX_PAID_LEVEL_SPIN_OUTBOX) {
    throw new Error('paid_level_spin_outbox_full');
  }
  await AsyncStorage.setItem(
    paidLevelSpinOutboxKey(owner),
    JSON.stringify([...current, operation]),
  );
}

async function syncPendingPaidLevelSpinRunePurchases(token: AccountGenerationToken): Promise<void> {
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) return;
  const pending = await pendingPaidLevelSpinRunePurchases(owner, token);
  for (const operation of pending) {
    if (!isCurrentAccountGeneration(token, owner)) return;
    const stored = await commitPhoneStateNonMonetaryEconomyGrant({
      operationId: operation.operationId,
      kind: 'paid_level_spin_rune_purchase',
      entitlementId: operation.operationId,
      expectedOwnerStableId: owner,
      expectedAccountGeneration: token.generation,
      exactResult: operation,
    });
    if (!stored || !isCurrentAccountGeneration(token, owner)) continue;
    await removeConfirmedPaidLevelSpinOutboxOperation(owner, token, operation);
  }
}

export async function syncPendingPaidLevelSpinRunePurchasesForCurrentAccount(): Promise<void> {
  await syncPendingPaidLevelSpinRunePurchases(captureAccountGeneration());
}

export async function readLocalLevelSpinBalance(): Promise<number> {
  const owner = ownerFromDevice();
  if (!owner) return 0;
  const token = captureAccountGeneration();
  void import('./level_spin_star_grants')
    .then(({ recoverAndHydrateLevelSpinStarGrants }) => (
      recoverAndHydrateLevelSpinStarGrants(token)
    ))
    .catch(() => {});
  const state = await loadLocalState(owner);
  return isCurrentAccountGeneration(token, owner) ? state.credits.length : 0;
}

export async function grantLocalLevelSpins(levels: readonly number[]): Promise<number[]> {
  return grantLocalLevelSpinsForAccount(levels, captureAccountGeneration());
}

export async function grantLocalLevelSpinsForAccount(
  levels: readonly number[], token: AccountGenerationToken, accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<number[]> {
  const owner = token.stableId;
  if (!owner) return [];
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return [];
    const current = await loadLocalState(owner);
    const additions = [...new Set(levels.map(Number))]
      .filter((level) => Number.isInteger(level) && level >= 2 && level <= 60)
      .sort((left, right) => left - right)
      .filter((level) => !current.issuedLevels.includes(level));
    if (additions.length === 0) return [];
    const next: LocalSpinState = {
      ...current,
      credits: [...current.credits, ...additions.map((level) => ({ id: `local_spin_v1_${String(level).padStart(3, '0')}`, level }))],
      issuedLevels: normalizeLevels([...current.issuedLevels, ...additions]),
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, ...additions.map((level) => `local_spin_v1_${String(level).padStart(3, '0')}`)]),
    };
    await writeLocalState(next);
    return additions;
  }, accountTransitionLockLease);
}

/** DEV-only one-off credit: distinct from level credits so every press is visible immediately. */
export async function grantLocalDevSpin(token: AccountGenerationToken): Promise<boolean> {
  const owner = token.stableId;
  if (!owner) return false;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    const current = await loadLocalState(owner);
    const id = `local_spin_dev_${Crypto.randomUUID().replace(/-/g, '')}`;
    const next: LocalSpinState = {
      ...current,
      credits: [...current.credits, { id, level: 2 }],
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, id]),
    };
    await writeLocalState(next);
    return true;
  });
}

/** First confirmed completion of each lesson produces exactly one local Spin. */
export async function grantLocalLessonCompletionSpin(
  lessonId: number, studyTarget: string | null | undefined, token: AccountGenerationToken,
): Promise<boolean> {
  const owner = token.stableId;
  const safeLesson = Math.trunc(lessonId);
  if (!owner || !Number.isInteger(safeLesson) || safeLesson < 1) return false;
  const scope = `${String(studyTarget ?? 'default').replace(/[^A-Za-z0-9_-]/g, '_')}-${safeLesson}`;
  const id = `local_spin_lesson_${scope}`;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    const current = await loadLocalState(owner);
    if (current.issuedCreditIds.includes(id)) return false;
    await writeLocalState({
      ...current,
      credits: [...current.credits, { id, level: 2 }],
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, id]),
    });
    return true;
  });
}

/**
 * Первое прохождение каждой сессии курса Learning V2 даёт ровно один спин.
 *
 * зачем (владелец, 23.08): спин обязан быть наградой и за повышение уровня, и
 * за пройденную сессию. Уровни уже покрыты очередью level-up, урок — функцией
 * выше; здесь закрывается курс V2. Повторы спин НЕ дают: иначе одну лёгкую
 * сессию можно было бы перепроходить ради призов (решение владельца — только
 * первое прохождение).
 *
 * Идемпотентность — по `issuedCreditIds`, как у уроков: тот же ключ второй раз
 * не создаёт кредит, поэтому повторный вызов при ретрае безопасен.
 */
export async function grantLocalCourseSessionCompletionSpin(
  sessionId: string, studyTarget: string | null | undefined, token: AccountGenerationToken,
): Promise<boolean> {
  const owner = token.stableId;
  const safeSession = String(sessionId ?? '').trim();
  if (!owner || !safeSession) return false;
  const scope = `${String(studyTarget ?? 'default').replace(/[^A-Za-z0-9_-]/g, '_')}-${safeSession.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)}`;
  const id = `local_spin_session_${scope}`;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    const current = await loadLocalState(owner);
    if (current.issuedCreditIds.includes(id)) return false;
    await writeLocalState({
      ...current,
      credits: [...current.credits, { id, level: 2 }],
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, id]),
    });
    return true;
  });
}

/**
 * Победа в рейтинговом матче Арены над реальным игроком даёт ровно один спин
 * из ОБЩЕГО каталога подарков — тот же, что за уровень и сессию.
 *
 * зачем (владелец, 23.08): раньше победа в Арене копила отдельный «кредит
 * Арены» на сервере (`arena_v2_spin_credits`), который разыгрывался своей
 * рулеткой (только жемчужины 5/10/20) через отдельный экран звёздного
 * кошелька. Владелец прямо запретил параллельные спины — в приложении должен
 * существовать один спин, доступный из раздела «Подарки». Сервер теперь лишь
 * гарантирует сам факт награды (`reward.spinAwarded`, см. `arenaRareSpin` в
 * functions/src/arena_v2_core.ts) и присылает `spinReceiptId` = matchId;
 * розыгрыш приза остаётся локальным, как у остальных источников спина.
 *
 * Идемпотентность — по matchId: тот же матч не может выдать кредит дважды,
 * даже если экран результата перемонтируется или сервер повторит ответ.
 */
export async function grantLocalArenaRankedWinSpin(
  matchId: string, token: AccountGenerationToken,
): Promise<boolean> {
  const owner = token.stableId;
  const safeMatchId = String(matchId ?? '').trim();
  if (!owner || !safeMatchId) return false;
  const id = `local_spin_arena_ranked_${safeMatchId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}`;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    const current = await loadLocalState(owner);
    if (current.issuedCreditIds.includes(id)) return false;
    await writeLocalState({
      ...current,
      credits: [...current.credits, { id, level: 2 }],
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, id]),
    });
    return true;
  });
}

/**
 * Спин из сундука (лига, друзья) — та же общая рулетка, что уровень/урок/Арена.
 *
 * зачем (владелец, 2026-08-26): в сундуках наградой значилась жемчужина, но
 * сервер клал дроп с amount=0 (все shard-константы были обнулены планом
 * 2026-07-20), а модалка всё равно рисовала «+N жемчужин». Игрок видел награду,
 * которой не существовало. Владелец заменил её на 1 спин.
 *
 * Идемпотентность — по `dropKey` = «id клейма + id дропа»: сундук лиги при
 * КАЖДОМ повторном обращении получает от сервера тот же пакет наград
 * (alreadyClaimed + rewards), поэтому без ключа один сундук выдавал бы спин
 * снова и снова при каждом заходе на экран.
 */
export async function grantLocalChestSpin(
  dropKey: string, token: AccountGenerationToken,
): Promise<boolean> {
  const owner = token.stableId;
  const safeKey = String(dropKey ?? '').trim();
  if (!owner || !safeKey) return false;
  const id = `local_spin_chest_${safeKey.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100)}`;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    const current = await loadLocalState(owner);
    if (current.issuedCreditIds.includes(id)) return false;
    await writeLocalState({
      ...current,
      credits: [...current.credits, { id, level: 2 }],
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, id]),
    });
    return true;
  });
}

/**
 * Confirmed support reward. One report message can mint 1..3 deterministic
 * credits; retries observe the same IDs and can never increase the balance.
 */
export async function grantLocalReportRewardSpins(
  messageId: string,
  count: number,
  token: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<boolean> {
  const owner = token.stableId;
  const safeMessageId = String(messageId ?? '').trim()
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 96);
  const safeCount = Math.trunc(count);
  if (!owner || !safeMessageId || safeCount < 1 || safeCount > 3) return false;
  const ids = Array.from({ length: safeCount }, (_, index) => (
    `local_spin_report_${safeMessageId}_${index + 1}`
  ));
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    const current = await loadLocalState(owner);
    const missingIds = ids.filter((id) => !current.issuedCreditIds.includes(id));
    if (missingIds.length === 0) return true;
    await writeLocalState({
      ...current,
      credits: [...current.credits, ...missingIds.map((id) => ({ id, level: 2 }))],
      issuedCreditIds: stableUniqueStrings([...current.issuedCreditIds, ...missingIds]),
    });
    return isCurrentAccountGeneration(token, owner);
  }, accountTransitionLockLease);
}

export async function recoverLocalLevelSpin(): Promise<LocalLevelSpinReceipt | null> {
  const owner = ownerFromDevice();
  if (!owner) return null;
  const token = captureAccountGeneration();
  void syncPendingPaidLevelSpinRunePurchases(token).catch(() => {});
  const state = await loadLocalState(owner);
  if (state.activeReceipt?.schemaVersion === 3) {
    return restoreActiveReceipt(state);
  }
  if (!state.activeReceipt) {
    const envelopes = await readPaidLevelSpinEnvelopes(owner);
    const envelope = [...envelopes].reverse().find((candidate) => (
      !state.closedRequestIds.includes(candidate.requestId)
    ));
    if (envelope) {
      const recoveredState = { ...state, activeReceipt: envelope.receipt };
      await writeLocalState(recoveredState).catch(() => {});
      await persistLocalReceipt(envelope.receipt, owner).catch(() => {});
      return envelope.receipt;
    }
  }
  const pendingRaw = await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
  const pending = parseLocalPendingReveal(pendingRaw, owner);
  if (pending && state.activeReceipt
    && !state.closedRequestIds.includes(pending.requestId)
    && sameLocalSpinReceiptAuthority(pending, state.activeReceipt)) return pending;
  if (pendingRaw) {
    try {
      const envelope = JSON.parse(pendingRaw) as { owner?: unknown };
      if (envelope?.owner === owner) await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
    } catch {
      await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
    }
  }
  return restoreActiveReceipt(state);
}

/**
 * Вернуть недоставленный чек обратно в кредит спина.
 *
 * зачем (владелец 2026-08-26, инцидент «всегда 20 жемчужин»): если начисление
 * приза провалилось, чек оставался активным навсегда. claimLocalLevelSpin
 * сначала зовёт recoverLocalLevelSpin и отдаёт ТОТ ЖЕ чек, не списывая кредит —
 * поэтому игрок бесконечно видел один и тот же приз, баланс спинов не менялся,
 * а на счёт ничего не падало. Возврат в кредит разрывает этот круг: спин снова
 * доступен, и следующая попытка честно разыгрывает НОВЫЙ requestId.
 *
 * Кредит возвращается только если приз действительно не был выдан (в журнале
 * нет claimed-occurrence) — двойной выдачи это не создаёт.
 */
export async function releaseUndeliveredLocalLevelSpin(requestId: string): Promise<boolean> {
  const owner = ownerFromDevice();
  if (!owner || !requestId) return false;
  return withAccountTransitionLock(async () => {
    const state = await loadLocalState(owner);
    const receipt = state.activeReceipt;
    if (!receipt || receipt.requestId !== requestId) return false;
    if (receipt.schemaVersion === 3) return false;
    if (state.closedRequestIds.includes(requestId)) return false;
    const journal = await readLocalSpinJournal();
    const alreadyClaimed = journal.some((entry) => entry.owner === owner
      && entry.requestId === requestId
      && entry.occurrences.some((occurrence) => occurrence.claimed === true));
    // Приз уже выдан — кредит возвращать нельзя, это была бы вторая награда.
    if (alreadyClaimed) return false;
    const rawCreditId = typeof receipt.creditId === 'string' ? receipt.creditId : '';
    const creditId = rawCreditId.replace(/^level_spin_v1_/, 'local_spin_v1_');
    const level = Number(receipt.level);
    const restorable = receipt.stableUid === owner
      && isLocalSpinCreditId(creditId)
      && Number.isInteger(level) && level >= 2 && level <= 60
      && (!creditId.startsWith('local_spin_v1_')
        || creditId === `local_spin_v1_${String(level).padStart(3, '0')}`);
    if (!restorable) return false;
    const alreadyQueued = state.credits.some((candidate) => candidate.id === creditId);
    await writeLocalState({
      ...state,
      credits: alreadyQueued
        ? state.credits
        : [...state.credits, { id: creditId, level }].sort((left, right) => left.level - right.level),
      issuedCreditIds: stableUniqueStrings([...state.issuedCreditIds, creditId]),
      activeReceipt: null,
      closedRequestIds: stableUniqueStrings([...state.closedRequestIds, requestId]).slice(-80),
    });
    await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
    return true;
  });
}

export async function acknowledgeLocalLevelSpin(requestId: string): Promise<void> {
  const owner = ownerFromDevice();
  if (!owner) return;
  await withAccountTransitionLock(async () => {
    const state = await loadLocalState(owner);
    if (state.activeReceipt?.requestId !== requestId && !state.closedRequestIds.includes(requestId)) return;
    const paidReceipt = state.activeReceipt?.requestId === requestId
      && state.activeReceipt.schemaVersion === 3
      ? state.activeReceipt
      : null;
    let paidEnvelopeStorageKey: string | null = null;
    const possiblePaidEnvelopeStorageKey = paidLevelSpinEnvelopeKey(owner, requestId);
    if (paidReceipt || state.closedRequestIds.includes(requestId)) {
      const raw = await AsyncStorage.getItem(possiblePaidEnvelopeStorageKey);
      let parsed: unknown;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
      const envelope = await parsePaidLevelSpinEnvelope(parsed, owner);
      if (paidReceipt && (!envelope || envelope.receipt.runeOperationId !== paidReceipt.runeOperationId)) return;
      if (envelope) {
        paidEnvelopeStorageKey = possiblePaidEnvelopeStorageKey;
        // The single owner outbox value is the durable retry authority after ACK.
        // Upsert it before any receipt/envelope retirement; a failed validation
        // or setItem leaves the composite envelope intact for safe recovery.
        await upsertPaidLevelSpinOutboxOperation(owner, envelope.operation);
        // Before retiring the receipt envelope, make the immutable rune operation
        // independently durable in one value. Projection remains rebuildable.
        await AsyncStorage.setItem(
          sessionAttemptRuneOperationStorageKey(owner, envelope.operation.operationId),
          JSON.stringify(envelope.operation),
        );
      }
    }
    await writeLocalState({
      ...state,
      activeReceipt: state.activeReceipt?.requestId === requestId ? null : state.activeReceipt,
      closedRequestIds: [...state.closedRequestIds, requestId].slice(-80),
    });
    await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
    if (paidEnvelopeStorageKey) await AsyncStorage.removeItem(paidEnvelopeStorageKey);
  });
}

export async function claimLocalLevelSpin(): Promise<LocalLevelSpinReceipt> {
  const owner = ownerFromDevice();
  if (!owner) throw new Error('local_spin_identity_unavailable');
  const token = captureAccountGeneration();
  const pending = await recoverLocalLevelSpin();
  if (pending) return pending;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('local_spin_identity_changed');
    let current = await loadLocalState(owner);
    // A second claim can pass the optimistic recovery check while the first
    // claim is waiting for this lock. Re-read the durable intent under the
    // same lock before consuming another credit.
    const activeReceipt = await restoreActiveReceipt(current);
    if (activeReceipt) return activeReceipt;
    // Invalid/expired active receipts can be repaired back into a credit by
    // restoreActiveReceipt. Continue from that freshly persisted state.
    current = await loadLocalState(owner);
    const credit = current.credits[0];
    if (!credit) throw new Error('local_spin_empty');
    const requestId = Crypto.randomUUID();
    const nowMs = Date.now();
    // зачем (владелец 2026-08-26): исчерпаемые награды не должны выпадать
    // впустую. Если все платные темы уже открыты, «тема оформления» выбывает
    // из розыгрыша, а её вес честно достаётся остальным наградам.
    const excludedRewardIds = stableUniqueStrings([
      ...await listExhaustedSpinRewardIds(),
      ...RETIRED_LEVEL_SPIN_REWARD_IDS,
    ]);
    const receipt: LocalLevelSpinReceipt = {
      ok: true,
      stableUid: owner,
      requestId,
      creditId: credit.id.startsWith('local_spin_') && !credit.id.startsWith('local_spin_v1_')
        ? credit.id : `level_spin_v1_${String(credit.level).padStart(3, '0')}`,
      level: credit.level,
      kind: credit.level % 5 === 0 ? 'milestone' : 'standard',
      baseGiftId: pickLevelSpinRewardExcluding(requestId, excludedRewardIds).id,
      premiumGiftId: null,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + LOCAL_RESULT_TTL_MS,
      balanceAfter: current.credits.length - 1,
      status: 'awaiting_ack',
      revealState: 'pending',
      deliveries: { base: { state: 'unclaimed' } },
      catalogVersion: LEVEL_SPIN_REWARD_CATALOG_VERSION,
      schemaVersion: 2,
      localOnly: true,
    };
    const journal = await readLocalSpinJournal();
    const next: LocalSpinState = {
      ...current,
      credits: current.credits.filter((candidate) => candidate.id !== credit.id),
      activeReceipt: receipt,
    };
    await AsyncStorage.multiSet([
      [localLevelSpinStateKey(owner), JSON.stringify(next)],
      [LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner, balance: next.credits.length })],
      [LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(mergeLocalSpinJournal(journal, localJournalEntryForReceipt(receipt, owner)))],
      [LEVEL_SPIN_PENDING_REVEAL_KEY, JSON.stringify({ owner, receipt })],
    ]);
    emitAppEvent('level_spin_balance_changed');
    return receipt;
  });
}

export async function claimLocalLevelSpinWithRunes(): Promise<LocalLevelSpinReceipt> {
  const owner = ownerFromDevice();
  if (!owner) throw new Error('local_spin_identity_unavailable');
  const token = captureAccountGeneration();
  const pending = await recoverLocalLevelSpin();
  if (pending) return pending;

  const receipt = await withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('local_spin_identity_changed');
    const current = await loadLocalState(owner);
    const activeReceipt = await restoreActiveReceipt(current);
    if (activeReceipt) return activeReceipt;

    const requestId = Crypto.randomUUID();
    const nowMs = Date.now();
    const excludedRewardIds = stableUniqueStrings([
      ...await listExhaustedSpinRewardIds(),
      ...RETIRED_LEVEL_SPIN_REWARD_IDS,
    ]);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('local_spin_identity_changed');
    const giftId = pickLevelSpinRewardExcluding(requestId, excludedRewardIds).id;
    const paid = await preparePaidLevelSpinRunePurchase({
      token,
      requestId,
      giftId,
      catalogVersion: LEVEL_SPIN_REWARD_CATALOG_VERSION,
      createdAtMs: nowMs,
    }, lease);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('local_spin_identity_changed');

    const currentJournal = await readLocalSpinJournal();
    const currentOutbox = await readPaidLevelSpinOutbox(owner);
    if (currentOutbox.length >= MAX_PAID_LEVEL_SPIN_OUTBOX) {
      throw new Error('paid_level_spin_outbox_full');
    }
    const runeOperationId = paid.operation.operationId;
    const nextReceipt: LocalLevelSpinReceipt = {
      ok: true,
      stableUid: owner,
      requestId,
      paymentKind: 'runes',
      runeOperationId,
      runePrice: PAID_LEVEL_SPIN_RUNE_PRICE,
      creditId: runeOperationId as `paid_level_spin:${string}`,
      level: 0,
      kind: 'standard',
      baseGiftId: giftId,
      premiumGiftId: null,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + LOCAL_RESULT_TTL_MS,
      balanceAfter: current.credits.length,
      status: 'awaiting_ack',
      revealState: 'pending',
      deliveries: { base: { state: 'unclaimed' } },
      catalogVersion: LEVEL_SPIN_REWARD_CATALOG_VERSION,
      schemaVersion: 3,
      localOnly: true,
    };
    const nextState: LocalSpinState = { ...current, activeReceipt: nextReceipt };
    const nextOutbox = currentOutbox.some((candidate) => candidate.operationId === runeOperationId)
      ? currentOutbox
      : [...currentOutbox, paid.operation];
    const envelope: PaidLevelSpinEnvelopeV1 = Object.freeze({
      schemaVersion: 'paid-level-spin-envelope.v1',
      ownerStableId: owner,
      requestId,
      operation: paid.operation,
      receipt: nextReceipt,
    });
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('local_spin_identity_changed');
    // The one authoritative commit. AsyncStorage.multiSet can tear per entry on
    // iOS, so every row below is only a rebuildable projection of this envelope.
    await AsyncStorage.setItem(
      paidLevelSpinEnvelopeKey(owner, requestId),
      JSON.stringify(envelope),
    );
    try {
      await AsyncStorage.multiSet([
        ...paid.durableWrites.map(([key, value]) => [key, value] as [string, string]),
        [paidLevelSpinOutboxKey(owner), JSON.stringify(nextOutbox)],
        [localLevelSpinStateKey(owner), JSON.stringify(nextState)],
        [LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner, balance: current.credits.length })],
        [LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(mergeLocalSpinJournal(
          currentJournal,
          localJournalEntryForReceipt(nextReceipt, owner),
        ))],
        [LEVEL_SPIN_PENDING_REVEAL_KEY, JSON.stringify({ owner, receipt: nextReceipt })],
      ]);
    } catch {
      // Envelope remains authoritative; recovery rebuilds every torn row.
    }
    return nextReceipt;
  });

  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  void syncPendingPaidLevelSpinRunePurchases(token).catch(() => {});
  return receipt;
}
