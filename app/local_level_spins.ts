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
import {
  localJournalEntryForReceipt,
  mergeLocalSpinJournal,
  parseLocalPendingReveal,
  type LocalLevelSpinJournalEntry,
  type LocalLevelSpinReceipt,
} from './level_spin_local_contract';
export { localLevelSpinReceiptToInventory, type LocalLevelSpinReceipt } from './level_spin_local_contract';

/**
 * Device-owned Spin state. A cloud copy may be added later, but no remote call
 * is permitted on the interactive Spin path.
 */
export const LOCAL_LEVEL_SPIN_STATE_KEY = 'local_level_spin_state_v1';
const LOCAL_RESULT_TTL_MS = 72 * 60 * 60 * 1000;
const LOCAL_GIFT_IDS = [
  'energy_full', 'xp_100', 'xp_250', 'hint_1', 'xp_bank_150', 'xp_2x_24h',
  'energy_plus2', 'chain_shield_1', 'hint_3', 'xp_bank_300', 'cosmetic_avatar_common',
  'xp_2x_48h', 'energy_plus3', 'xp_bank_600',
] as const;

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

function normalizeLevels(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(Number)
    .filter((level) => Number.isInteger(level) && level >= 2 && level <= 60))]
    .sort((left, right) => left - right);
}

function normalizeState(raw: string | null, owner: string): LocalSpinState {
  try {
    const parsed = raw ? JSON.parse(raw) as Partial<LocalSpinState> : null;
    if (parsed?.owner !== owner || !Array.isArray(parsed.credits)) {
      return { owner, credits: [], issuedLevels: [], issuedCreditIds: [], activeReceipt: null, closedRequestIds: [] };
    }
    const credits = parsed.credits
      .map((credit) => ({ id: String(credit?.id ?? ''), level: Number(credit?.level) }))
      .filter((credit) => /^local_spin_(?:v1_\d{3}|dev_[A-Za-z0-9_-]{1,96}|lesson_[A-Za-z0-9_-]{1,96})$/.test(credit.id) && Number.isInteger(credit.level) && credit.level >= 2 && credit.level <= 60)
      .filter((credit, index, all) => all.findIndex((candidate) => candidate.id === credit.id) === index)
      .sort((left, right) => left.level - right.level);
    return {
      owner,
      credits,
      issuedLevels: normalizeLevels(parsed.issuedLevels ?? credits.map((credit) => credit.level)),
      issuedCreditIds: Array.isArray(parsed.issuedCreditIds)
        ? parsed.issuedCreditIds.map(String).filter((id) => /^local_spin_(?:v1_\d{3}|dev_[A-Za-z0-9_-]{1,96}|lesson_[A-Za-z0-9_-]{1,96})$/.test(id)).slice(-160)
        : credits.map((credit) => credit.id),
      activeReceipt: parsed.activeReceipt && typeof parsed.activeReceipt === 'object'
        ? parsed.activeReceipt as LocalLevelSpinReceipt : null,
      closedRequestIds: Array.isArray(parsed.closedRequestIds)
        ? parsed.closedRequestIds.map(String).filter((id) => /^[a-f0-9-]{16,}$/i.test(id)).slice(-80) : [],
    };
  } catch {
    return { owner, credits: [], issuedLevels: [], issuedCreditIds: [], activeReceipt: null, closedRequestIds: [] };
  }
}

function chooseGift(requestId: string): string {
  let hash = 0;
  for (const char of requestId) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return LOCAL_GIFT_IDS[hash % LOCAL_GIFT_IDS.length];
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
  try {
    const parsed = raw ? JSON.parse(raw) as { owner?: unknown; balance?: unknown } : null;
    if (parsed?.owner === owner) cachedBalance = Math.max(0, Math.min(59, Math.floor(Number(parsed.balance) || 0)));
  } catch {
    cachedBalance = 0;
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
  if (!raw) return migrateCachedBalanceToLocalCredits(owner);
  return normalizeState(raw, owner);
}

async function persistLocalReceipt(receipt: LocalLevelSpinReceipt, owner: string): Promise<void> {
  const raw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
  let journal: LocalLevelSpinJournalEntry[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) journal = parsed as LocalLevelSpinJournalEntry[];
  } catch {
    journal = [];
  }
  const nextJournal = mergeLocalSpinJournal(journal, localJournalEntryForReceipt(receipt, owner));
  await AsyncStorage.multiSet([
    [LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(nextJournal)],
    [LEVEL_SPIN_PENDING_REVEAL_KEY, JSON.stringify({ owner, receipt })],
  ]);
}

async function restoreActiveReceipt(state: LocalSpinState): Promise<LocalLevelSpinReceipt | null> {
  const receipt = state.activeReceipt;
  if (!receipt || state.closedRequestIds.includes(receipt.requestId)) return null;
  if (receipt.stableUid !== state.owner || receipt.expiresAtMs <= Date.now()) return null;
  await persistLocalReceipt(receipt, state.owner);
  return receipt;
}

export async function readLocalLevelSpinBalance(): Promise<number> {
  const owner = ownerFromDevice();
  if (!owner) return 0;
  const token = captureAccountGeneration();
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
      issuedCreditIds: [...current.issuedCreditIds, ...additions.map((level) => `local_spin_v1_${String(level).padStart(3, '0')}`)].slice(-160),
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
      issuedCreditIds: [...current.issuedCreditIds, id].slice(-160),
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
      issuedCreditIds: [...current.issuedCreditIds, id].slice(-160),
    });
    return true;
  });
}

export async function recoverLocalLevelSpin(): Promise<LocalLevelSpinReceipt | null> {
  const owner = ownerFromDevice();
  if (!owner) return null;
  const state = await loadLocalState(owner);
  const pending = parseLocalPendingReveal(await AsyncStorage.getItem(LEVEL_SPIN_PENDING_REVEAL_KEY), owner);
  if (pending && !state.closedRequestIds.includes(pending.requestId)) return pending;
  return restoreActiveReceipt(state);
}

export async function acknowledgeLocalLevelSpin(requestId: string): Promise<void> {
  const owner = ownerFromDevice();
  if (!owner) return;
  await withAccountTransitionLock(async () => {
    const state = await loadLocalState(owner);
    if (state.activeReceipt?.requestId !== requestId && !state.closedRequestIds.includes(requestId)) return;
    await writeLocalState({
      ...state,
      activeReceipt: state.activeReceipt?.requestId === requestId ? null : state.activeReceipt,
      closedRequestIds: [...state.closedRequestIds, requestId].slice(-80),
    });
    await AsyncStorage.removeItem(LEVEL_SPIN_PENDING_REVEAL_KEY);
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
    const current = await loadLocalState(owner);
    const credit = current.credits[0];
    if (!credit) throw new Error('local_spin_empty');
    const requestId = Crypto.randomUUID();
    const nowMs = Date.now();
    const receipt: LocalLevelSpinReceipt = {
      ok: true,
      stableUid: owner,
      requestId,
      creditId: credit.id.startsWith('local_spin_') && !credit.id.startsWith('local_spin_v1_')
        ? credit.id : `level_spin_v1_${String(credit.level).padStart(3, '0')}`,
      level: credit.level,
      kind: credit.level % 5 === 0 ? 'milestone' : 'standard',
      baseGiftId: chooseGift(requestId),
      premiumGiftId: null,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + LOCAL_RESULT_TTL_MS,
      balanceAfter: current.credits.length - 1,
      status: 'awaiting_ack',
      revealState: 'pending',
      deliveries: { base: { state: 'unclaimed' } },
      catalogVersion: 1,
      schemaVersion: 1,
      localOnly: true,
    };
    const rawJournal = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
    let journal: LocalLevelSpinJournalEntry[] = [];
    try { journal = rawJournal && Array.isArray(JSON.parse(rawJournal)) ? JSON.parse(rawJournal) as LocalLevelSpinJournalEntry[] : []; } catch { /* safe empty journal */ }
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
