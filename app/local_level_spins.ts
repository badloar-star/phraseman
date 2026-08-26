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
import { isLocalSpinCreditId } from './level_spin_credit_ids';
import {
  localJournalEntryForReceipt,
  mergeLocalSpinJournal,
  parseLocalPendingReveal,
  type LocalLevelSpinJournalEntry,
  type LocalLevelSpinReceipt,
} from './level_spin_local_contract';
import {
  LEVEL_SPIN_REWARD_CATALOG_VERSION,
  pickLevelSpinRewardExcluding,
} from './level_spin_reward_catalog';
import { listExhaustedSpinRewardIds } from './theme_gift_pool';
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
    const parsed = raw ? JSON.parse(raw) as Partial<LocalSpinState> : null;
    if (parsed?.owner !== owner || !Array.isArray(parsed.credits)) {
      return { owner, credits: [], issuedLevels: [], issuedCreditIds: [], activeReceipt: null, closedRequestIds: [] };
    }
    const credits = parsed.credits
      .map((credit) => ({ id: String(credit?.id ?? ''), level: Number(credit?.level) }))
      // зачем (2026-08-23): тот же список источников, что и у фильтра
      // issuedCreditIds ниже. Незнакомый префикс здесь стирал САМ кредит —
      // игрок терял заработанный спин при первом же перезапуске приложения.
      .filter((credit) => isLocalSpinCreditId(credit.id) && Number.isInteger(credit.level) && credit.level >= 2 && credit.level <= 60)
      .filter((credit, index, all) => all.findIndex((candidate) => candidate.id === credit.id) === index)
      .sort((left, right) => left.level - right.level);
    return {
      owner,
      credits,
      issuedLevels: normalizeLevels(parsed.issuedLevels ?? credits.map((credit) => credit.level)),
      issuedCreditIds: Array.isArray(parsed.issuedCreditIds)
        ? parsed.issuedCreditIds.map(String).filter(isLocalSpinCreditId).slice(-160)
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
  if (!receipt) return null;

  const closed = typeof receipt.requestId === 'string' && state.closedRequestIds.includes(receipt.requestId);
  const parsedReceipt = closed ? null : parseLocalPendingReveal(
    JSON.stringify({ owner: state.owner, receipt }),
    state.owner,
  );
  const activeShapeValid = parsedReceipt !== null
    && receipt.ok === true
    && receipt.status === 'awaiting_ack'
    && (receipt.revealState === undefined || receipt.revealState === 'pending')
    && receipt.premiumGiftId === null
    && receipt.deliveries?.base?.state === 'unclaimed'
    && Number.isSafeInteger(receipt.balanceAfter)
    && receipt.balanceAfter >= 0
    && (receipt.kind === 'standard' || receipt.kind === 'milestone')
    && receipt.kind === (receipt.level % 5 === 0 ? 'milestone' : 'standard')
    && receipt.expiresAtMs > Date.now();

  if (!activeShapeValid) {
    const rawCreditId = typeof receipt.creditId === 'string' ? receipt.creditId : '';
    const creditId = rawCreditId.replace(/^level_spin_v1_/, 'local_spin_v1_');
    const level = Number(receipt.level);
    const recoverableCredit = !closed
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
        ? [...new Set([...state.issuedCreditIds, creditId])].slice(-160)
        : state.issuedCreditIds,
      activeReceipt: null,
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
      issuedCreditIds: [...current.issuedCreditIds, id].slice(-160),
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
      issuedCreditIds: [...current.issuedCreditIds, id].slice(-160),
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
