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
  parseLocalPendingReveal,
  isRecoverableLocalLevelSpinReceipt,
  type LocalLevelSpinJournalEntry,
  type LocalLevelSpinReceipt,
} from './level_spin_local_contract';
import {
  LEVEL_SPIN_REWARD_CATALOG_VERSION,
  pickLevelSpinRewardExcluding,
} from './level_spin_reward_catalog';
import { listExhaustedSpinRewardIds } from './theme_gift_pool';
import { stableUniqueStrings } from './spin_gift_storage_integrity';
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
  return isLocalSpinReceiptCreditId(entry.creditId)
    && Number.isInteger(entry.level) && Number(entry.level) >= 2 && Number(entry.level) <= 60
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
    && pending.localOnly === active.localOnly;
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

export async function recoverLocalLevelSpin(): Promise<LocalLevelSpinReceipt | null> {
  const owner = ownerFromDevice();
  if (!owner) return null;
  const state = await loadLocalState(owner);
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
    const excludedRewardIds = await listExhaustedSpinRewardIds();
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
