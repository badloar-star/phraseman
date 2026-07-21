// ════════════════════════════════════════════════════════════════════════════
// shards_system.ts — Валюта "Осколки знаний" 💎
// Хранение: AsyncStorage 'shards_balance' + Firestore /users/{uid}/shards
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';
import { getCanonicalUserId } from './user_id_policy';
import { emitAppEvent } from './events';
import { bumpLifetimeShardsEarned, bumpLifetimeShardsSpent } from './lifetime_profile_stats';
import {
  consumeExactLegacyQuarantinedShardDelta,
  enqueueAppliedShardDeltaWithStorage,
  hasExactLegacyQuarantinedShardDelta,
  hasQuarantinedShardDeltaQueue,
  newShardOpId,
  readShardDeltaQueue,
  removeShardDeltas,
  type LegacyShardDeltaRecoveryIdentity,
} from './shards_delta_queue';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { SHARD_SPEND_OP_LEDGER_KEY } from '../constants/customization_storage_keys';

export type ShardSpendReason =
  | 'buy_energy'     // −N осколков, N = число слотов энергии (max 5–6)
  | 'streak_freeze'  // -X Заморозка цепочки
  | 'streak_revive'  // -X Восстановление потерянной цепочки (≤24ч после обнуления)
  | 'wager_bet'      // -X Ставка в турнире
  | 'arena_match_wager_loss' // -X Проигрыш ставки на рейтинг-матч арены
  | 'card_pack'      // -X Набор карточек за осколки
  | 'arena_plays_refill' // -5 Восстановление дневных слотов рейтинг-матчей арены
  | 'league_boost'   // -X Персональный буст лиги
  | 'daily_task_reroll' // -3 Замена дневного задания (1 раз в сутки)
  | 'custom_avatar'
  | 'avatar_aura'
  | 'custom_avatar_restyle'
  | 'profile_card_upgrade'
  | 'lesson_replay';     // legacy reason; lesson replay no longer spends shards

export type ShardSource =
  | 'lesson_first'          // +1 Первое прохождение урока
  | 'lesson_perfect'        // +2 Идеальный урок (0 ошибок)
  | 'lesson_quiz_passed'    // +1 Зачёт в уроке
  | 'lesson_completed'      // +1 Урок полностью завершён
  | 'streak_7'              // +3 Каждые 7 дней цепочки
  | 'streak_30'             // +5 Каждые 30 дней цепочки
  | 'arena_win'             // +1 Победа в Арене
  | 'arena_10_wins'         // +1 Каждые 10 побед в Арене
  | 'arena_rank_up_streak'  // +1 Повышение ранга при серии 3+ побед (только новый пик)
  | 'daily_tasks_all'       // +1 Все 3 дневных задания (кнопка «Забрать» на экране заданий)
  | 'topic_completed'       // +3 Все уроки темы (разово)
  | 'exam_excellent'        // +3 Экзамен 90%+ (единоразово)
  | 'diagnostic_test'       // +1 Диагностический тест (единоразово)
  | 'lessons_5_perfect'     // +3 5 уроков подряд без ошибок
  | 'level_gift'            // +1 из подарка за уровень (×3 = +3)
  | 'preposition_drill_perfect' // +1 Идеальный проход тренажёра предлогов (разово на урок)
  | 'plan_day_complete'     // +2 Завершён день персонального плана (разово на день плана)
  | 'trainer_perfect_session' // +1 Идеальная сессия умной тренировки (0 ошибок, кап в день)
  | 'survey_completed';     // Пройден опрос за осколки (сервер submitShardSurvey, идемпотентно).
                            // ВНИМАНИЕ: 3 ниже — лишь дефолт каталога для UI/справки;
                            // реальная награда берётся из конфига опроса (rewardShards 1..20).
  // Награда за баг-репорт начисляется админом вручную при подтверждении (admin/index.html,
  // reason 'bug_fixed', shards += 1) — отдельного ShardSource в каталоге для неё нет.

/**
 * Экономика «Монеты и Звёзды» (docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §7):
 * игровые начисления монет обнулены — учебная награда ушла в звёзды, монеты только
 * покупаются. Структура каталога и ShardSource сохранены: addShards() при amount <= 0
 * завершается no-op, вызывающие не меняются. Единственный оставшийся источник —
 * подтверждённый баг-репорт (+1 монета), начисляется админом вручную на сервере
 * (admin/index.html, reason 'bug_fixed') и в этом каталоге не представлен.
 * Серверный каталог functions/src/shard_reward_catalog.ts НЕ синхронизирован —
 * требуется отдельное серверное изменение.
 */
export const SHARD_REWARDS: Record<ShardSource, number> = {
  lesson_first: 0,
  lesson_perfect: 0,
  lesson_quiz_passed: 0,
  lesson_completed: 0,
  streak_7: 0,
  streak_30: 0,
  arena_win: 0,
  arena_10_wins: 0,
  arena_rank_up_streak: 0,
  daily_tasks_all: 0,
  topic_completed: 0,
  exam_excellent: 0,
  diagnostic_test: 0,
  lessons_5_perfect: 0,
  level_gift: 0,
  preposition_drill_perfect: 0,
  plan_day_complete: 0,
  trainer_perfect_session: 0,
  survey_completed: 0,
};

const STORAGE_KEY = 'shards_balance';
const BALANCE_META_KEY = 'shards_balance_meta_v1';
const STORE_PURCHASED_SHARDS_KEY = 'shards_store_purchased_total_v1';
const ONE_TIME_KEY = 'shards_one_time_events';
const ARENA_WINS_KEY = 'shards_arena_wins_total';
const ADMIN_OVERRIDE_APPLIED_KEY = 'shards_admin_override_applied_at';

type ShardBalanceMeta = {
  updatedAtMs: number;
  op: 'earn' | 'spend' | 'replace' | 'admin';
  reason: string;
};

type ReplaceShardBalanceOptions = {
  updatedAtMs?: number | null;
  op?: ShardBalanceMeta['op'];
  reason?: string;
};

/** In-memory кэш для мгновенного UI без мигания 0 до AsyncStorage. */
let shardsBalanceMemory: number | null = null;
const setShardsBalanceMemory = (n: number) => {
  if (!Number.isFinite(n) || n < 0) return;
  shardsBalanceMemory = Math.floor(n);
};

const parseShardBalance = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
};

const parseUpdatedAtMs = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const isStorePurchaseReason = (reason: string | null | undefined): boolean =>
  reason === 'shards_store_purchase';

const readStorePurchasedShardsTotal = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(STORE_PURCHASED_SHARDS_KEY);
    return parseShardBalance(raw) ?? 0;
  } catch {
    return 0;
  }
};

const bumpStorePurchasedShardsTotal = async (amount: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number(amount) || 0));
  if (safe <= 0) return readStorePurchasedShardsTotal();
  try {
    const current = await readStorePurchasedShardsTotal();
    const next = current + safe;
    await AsyncStorage.setItem(STORE_PURCHASED_SHARDS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
};

const consumeStorePurchasedShardsOnSpend = async (amount: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number(amount) || 0));
  if (safe <= 0) return readStorePurchasedShardsTotal();
  try {
    const current = await readStorePurchasedShardsTotal();
    const next = Math.max(0, current - safe);
    await AsyncStorage.setItem(STORE_PURCHASED_SHARDS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
};


/**
 * Фаза 2 бонусов карточки: +5% осколков (×1.05) со всех ЗАРАБОТАННЫХ начислений
 * для уровня карточки IV+. Значение зеркалит PROFILE_CARD_SHARD_BOOST, ключ —
 * PROFILE_CARD_LEVEL_KEY из app/profile_card_system.ts — модуль сюда НЕ
 * импортируем, чтобы не поймать цикл (тот же паттерн, что readProfileCardXpMultiplier
 * в xp_manager и ключи 'streak_count'/'comeback_active').
 */
const readProfileCardShardMultiplier = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem('profile_card_level');
    return parseInt(raw || '0') >= 4 ? 1.05 : 1;
  } catch {
    return 1;
  }
};

/** Бонусная часть Фазы 2: вверх до целого; при base > 0 и активном перке минимум +1. */
const profileCardShardBonus = (baseAmount: number, perkM: number): number =>
  perkM > 1 && baseAmount > 0 ? Math.ceil(baseAmount * (perkM - 1)) : 0;

/**
 * Причины addShardsRaw, которые НЕ являются заработком — бонус карточки на них
 * не действует: покупка за реальные деньги (RevenueCat), выплаты пари (возврат
 * ставки + выигрыш), возвраты и подарки/компенсации (обновление, админ-рассылка).
 */
const PROFILE_CARD_PERK_EXCLUDED_REASONS: ReadonlySet<string> = new Set([
  'shards_store_purchase',
  'streak_wager_win',
  'arena_match_wager_win',
  'club_boost_refund',
  'release_wave_bonus',
  'global_broadcast_modal',
]);

export const getShardAchievementEligibleBalance = async (balance?: number): Promise<number> => {
  const total = balance === undefined ? await getShardsBalance() : Math.max(0, Math.floor(Number(balance) || 0));
  const purchased = await readStorePurchasedShardsTotal();
  return Math.max(0, total - purchased);
};

const prepareShardsBalanceUpdatedPayload = async (balance: number, meta?: ShardBalanceMeta | null) => {
  const safeBalance = Math.max(0, Math.floor(Number(balance) || 0));
  return {
    balance: safeBalance,
    ...(meta ? { op: meta.op, reason: meta.reason } : {}),
    eligibleAchievementBalance: await getShardAchievementEligibleBalance(safeBalance),
  };
};

const emitShardsBalanceUpdated = async (balance: number, meta?: ShardBalanceMeta | null): Promise<void> => {
  emitAppEvent('shards_balance_updated', await prepareShardsBalanceUpdatedPayload(balance, meta));
};

const readBalanceMeta = async (): Promise<ShardBalanceMeta | null> => {
  try {
    const raw = await AsyncStorage.getItem(BALANCE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShardBalanceMeta>;
    const updatedAtMs = parseUpdatedAtMs(parsed.updatedAtMs);
    if (updatedAtMs === null) return null;
    const op = parsed.op === 'earn' || parsed.op === 'spend' || parsed.op === 'replace' || parsed.op === 'admin'
      ? parsed.op
      : 'replace';
    return {
      updatedAtMs,
      op,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'unknown',
    };
  } catch {
    return null;
  }
};

const localWriteStamp = (op: ShardBalanceMeta['op'], reason: string): ShardBalanceMeta => ({
  updatedAtMs: Date.now(),
  op,
  reason,
});

/**
 * Похоже ли локальное состояние баланса на «артефакт restore», а не на реальную
 * пользовательскую операцию? cloud_sync.ts при restoreFromCloud кладёт старое теневое
 * `progress.shards_balance` в локальный STORAGE_KEY, НЕ обновляя `shards_balance_meta_v1`.
 * Реальная свежая операция всегда помечена op:'earn'/'spend' — её ронять нельзя.
 * Артефакт restore/reconcile — это op:'replace'/'admin' либо полное отсутствие метки.
 * Используется в loadShardsFromCloud, чтобы отличить «локаль законно потрачена ниже
 * облака» (не трогаем) от «локаль занижена теневым restore» (авторитетное облако побеждает).
 */
const isLocalRestoreArtifact = (meta: ShardBalanceMeta | null): boolean => (
  meta === null || meta.op === 'replace' || meta.op === 'admin'
);

const normalizeShardBalanceOp = (value: unknown): ShardBalanceMeta['op'] => (
  value === 'earn' || value === 'spend' || value === 'admin' || value === 'replace'
    ? value
    : 'replace'
);

/** Последний известный баланс (после чтения/записи в этой сессии). null — ещё не читали с диска. */
export const peekLastKnownShardsBalance = (): number | null => shardsBalanceMemory;

// ── Получить баланс ────────────────────────────────────────────────────────
export const getShardsBalance = async (): Promise<number> => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val === null) {
      setShardsBalanceMemory(0);
      return 0;
    }
    const parsed = parseShardBalance(val);
    const n = parsed ?? 0;
    setShardsBalanceMemory(n);
    return n;
  } catch {
    return shardsBalanceMemory ?? 0;
  }
};

/** Локальный баланс = значение с сервера (после Cloud Function, без client-side spend). */
/**
 * Lock-free balance replacement for callers that already own the account-transition lock.
 * Never call this directly from an unscoped flow; use one of the exported wrappers below.
 */
const replaceShardsBalanceLocalUnlocked = async (
  next: number,
  options?: ReplaceShardBalanceOptions,
  accountToken?: AccountGenerationToken,
): Promise<boolean> => {
  const n = Math.max(0, Math.floor(Number(next)));
  if (!Number.isFinite(n) || (accountToken && !isCurrentAccountGeneration(accountToken))) return false;
  const serverUpdatedAtMs = parseUpdatedAtMs(options?.updatedAtMs);
  const meta: ShardBalanceMeta = {
    updatedAtMs: serverUpdatedAtMs ?? Date.now(),
    op: normalizeShardBalanceOp(options?.op),
    reason: typeof options?.reason === 'string' && options.reason.trim()
      ? options.reason.trim()
      : 'server_replace',
  };
  let wrote = false;
  try {
    await withStorageLock(async () => {
      if (serverUpdatedAtMs !== null) {
        const currentMeta = await readBalanceMeta();
        if (accountToken && !isCurrentAccountGeneration(accountToken)) return;
        if (currentMeta && currentMeta.updatedAtMs > serverUpdatedAtMs) return;
      }
      if (accountToken && !isCurrentAccountGeneration(accountToken)) return;
      await persistLocalBalance(n, meta);
      wrote = true;
    });
  } catch {
    return false;
  }
  if (!wrote || (accountToken && !isCurrentAccountGeneration(accountToken))) return false;
  setShardsBalanceMemory(n);
  await emitShardsBalanceUpdated(n, meta);
  return !accountToken || isCurrentAccountGeneration(accountToken);
};

export const replaceShardsBalanceLocal = async (
  next: number,
  options?: ReplaceShardBalanceOptions,
): Promise<void> => {
  await withAccountTransitionLock(async () => {
    await replaceShardsBalanceLocalUnlocked(next, options);
  });
};

/** Token-checked variant for code that already owns `withAccountTransitionLock`. */
export const replaceShardsBalanceLocalWhileAccountTransitionLocked = async (
  next: number,
  accountToken: AccountGenerationToken,
  options?: ReplaceShardBalanceOptions,
): Promise<boolean> => replaceShardsBalanceLocalUnlocked(next, options, accountToken);

/** Account-scoped server reconciliation that cannot leave a stale generation in the shared wallet. */
export type AccountGenerationShardBalanceOutcome = 'applied' | 'already-newer' | 'stale-generation' | 'failed';

export const replaceShardsBalanceForAccountGeneration = async (
  next: number,
  token: AccountGenerationToken,
  stableId: string,
  options?: ReplaceShardBalanceOptions,
): Promise<AccountGenerationShardBalanceOutcome> => withAccountTransitionLock(async () => {
  const n = Math.max(0, Math.floor(Number(next)));
  if (!Number.isFinite(n)) return 'failed';
  if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
  const serverUpdatedAtMs = parseUpdatedAtMs(options?.updatedAtMs);
  const meta: ShardBalanceMeta = {
    updatedAtMs: serverUpdatedAtMs ?? Date.now(),
    op: normalizeShardBalanceOp(options?.op),
    reason: typeof options?.reason === 'string' && options.reason.trim()
      ? options.reason.trim()
      : 'server_replace',
  };
  try {
    const preparedEvent = await prepareShardsBalanceUpdatedPayload(n, meta);
    if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
    const storageOutcome = await withStorageLock(async (): Promise<AccountGenerationShardBalanceOutcome> => {
      if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
      if (serverUpdatedAtMs !== null) {
        const currentMeta = await readBalanceMeta();
        if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
        if (currentMeta && currentMeta.updatedAtMs > serverUpdatedAtMs) return 'already-newer';
      }
      if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
      await persistLocalBalance(n, meta);
      return isCurrentAccountGeneration(token, stableId) ? 'applied' : 'stale-generation';
    });
    if (storageOutcome !== 'applied') return storageOutcome;
    if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
    // No await between the final generation check, shared memory commit, and event dispatch.
    setShardsBalanceMemory(n);
    emitAppEvent('shards_balance_updated', preparedEvent);
    return 'applied';
  } catch {
    return 'failed';
  }
});

const mirrorServerShardBalanceLocal = async (
  next: number,
  meta: ShardBalanceMeta,
  accountToken?: AccountGenerationToken,
  ownerStableId?: string,
): Promise<AccountGenerationShardBalanceOutcome> => {
  if (accountToken && ownerStableId) {
    return replaceShardsBalanceForAccountGeneration(next, accountToken, ownerStableId, {
      updatedAtMs: meta.updatedAtMs,
      op: meta.op,
      reason: meta.reason,
    });
  }
  await replaceShardsBalanceLocal(next, {
    updatedAtMs: meta.updatedAtMs,
    op: meta.op,
    reason: meta.reason,
  });
  return 'applied';
};

export const addShardsLocalOnlyForPendingServerClaim = async (
  amount: number,
  reason: string = 'pending_server_claim',
  accountToken: AccountGenerationToken,
  ownerStableId: string,
): Promise<number> => {
  const isCurrent = (): boolean =>
    isCurrentAccountGeneration(accountToken, ownerStableId);
  try {
    if (!isCurrent() || accountToken.stableId !== ownerStableId) return 0;
    const safe = Math.max(0, Math.floor(Number(amount) || 0));
    if (safe <= 0) return 0;
    const cleanReason = String(reason || '').trim() || 'pending_server_claim';
    let meta: ShardBalanceMeta = localWriteStamp('earn', cleanReason);
    const credited = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return null;
      const newBalance = await withStorageLock(async () => {
        if (!isCurrent()) return null;
        const currentMeta = await readBalanceMeta();
        if (!isCurrent()) return null;
        meta = {
          updatedAtMs: Math.max(Date.now(), (currentMeta?.updatedAtMs ?? 0) + 1),
          op: 'earn',
          reason: cleanReason,
        };
        const current = await getShardsBalance();
        if (!isCurrent()) return null;
        const next = current + safe;
        await persistLocalBalance(next, meta);
        return isCurrent() ? next : null;
      });
      if (newBalance === null || !isCurrent()) return null;
      setShardsBalanceMemory(newBalance);
      await bumpLifetimeShardsEarned(safe);
      if (!isCurrent()) return null;
      await emitShardsBalanceUpdated(newBalance, meta);
      return isCurrent() ? safe : null;
    });
    return credited ?? 0;
  } catch (error) {
    DebugLogger.error('shards_system.ts:addShardsLocalOnlyForPendingServerClaim', error, 'warning');
    return 0;
  }
};

export const keepShardsBalanceLocalAtLeast = async (
  minimumBalance: number,
  reason: string = 'local_merge',
  accountToken: AccountGenerationToken,
  ownerStableId: string,
): Promise<number> => {
  const isCurrent = (): boolean =>
    isCurrentAccountGeneration(accountToken, ownerStableId);
  try {
    if (!isCurrent() || accountToken.stableId !== ownerStableId) {
      return getShardsBalance().catch(() => 0);
    }
    const safeMinimum = Math.max(0, Math.floor(Number(minimumBalance) || 0));
    const cleanReason = String(reason || '').trim() || 'local_merge';
    let meta: ShardBalanceMeta = localWriteStamp('replace', cleanReason);
    const nextBalance = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return null;
      const committedBalance = await withStorageLock(async () => {
        if (!isCurrent()) return null;
        const currentMeta = await readBalanceMeta();
        if (!isCurrent()) return null;
        meta = {
          updatedAtMs: Math.max(Date.now(), (currentMeta?.updatedAtMs ?? 0) + 1),
          op: 'replace',
          reason: cleanReason,
        };
        const current = await getShardsBalance();
        if (!isCurrent()) return null;
        const next = Math.max(current, safeMinimum);
        await persistLocalBalance(next, meta);
        return isCurrent() ? next : null;
      });
      if (committedBalance === null || !isCurrent()) return null;
      setShardsBalanceMemory(committedBalance);
      await emitShardsBalanceUpdated(committedBalance, meta);
      return isCurrent() ? committedBalance : null;
    });
    if (nextBalance === null || !isCurrent()) return getShardsBalance().catch(() => 0);
    return nextBalance;
  } catch (error) {
    DebugLogger.error('shards_system.ts:keepShardsBalanceLocalAtLeast', error, 'warning');
    return getShardsBalance().catch(() => 0);
  }
};

// ── Лог транзакций в Firestore ────────────────────────────────────────────
const logShardTransaction = async (
  type: 'earn' | 'spend',
  amount: number,
  reason: string,
  balanceAfter: number,
  balanceBefore?: number,
): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    const db = firestore();
    await db.collection('users').doc(uid).collection('shard_log').add({
      type,
      amount,
      reason,
      ...(typeof balanceBefore === 'number' ? { balanceBefore } : {}),
      balanceAfter,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
};

export type AddShardOpts = { suppressEarnEvent?: boolean };

// Сколько ждём ответа Firestore при списании/начислении осколков, прежде чем
// считать облако недоступным. В регионах с заблокированным Firebase транзакция
// без таймаута висит бесконечно и держит покупку в состоянии «Подождите…».
// По истечении срока трактуем как 'unavailable' (НЕ 'insufficient') — вызывающий
// уходит в локальную ветку: списывает локально и до-синхронизирует в фоне.
const SHARD_CLOUD_TX_TIMEOUT_MS = 6000;

const SHARD_CLOUD_TIMEOUT_SIGNAL = Symbol('shard_cloud_timeout');

const runWithTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(SHARD_CLOUD_TIMEOUT_SIGNAL), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

type ShardsApplyDeltaResponse = {
  ok: boolean;
  alreadyApplied: boolean;
  insufficient: boolean;
  balance: number;
  shardsUpdatedAtMs?: number | null;
};

// K3: единственная точка серверной записи баланса — callable shardsApplyDelta
// (runTransaction под Admin SDK, обходит hasNoShardWrites; идемпотентность по
// opId). Заменяет прежний нетранзакционный read-modify-write, который терял
// дельту при гонке двух устройств (TOCTOU) и вдобавок писал `shards` напрямую —
// а это заблокировано firestore.rules, т.е. запись всегда падала латентно.
const callShardsApplyDelta = async (
  opId: string,
  delta: number,
  type: 'earn' | 'spend',
  reason: string,
  ownerStableId: string,
): Promise<ShardsApplyDeltaResponse> => {
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
    getFunctions: (...args: unknown[]) => unknown;
    httpsCallable: (
      fns: unknown,
      name: string,
    ) => (data: unknown) => Promise<{ data: ShardsApplyDeltaResponse }>;
  };
  const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
  const cfCall = httpsCallable(getFunctions(getApp(), 'us-central1'), 'shardsApplyDelta');
  const cfResult = await cfCall({ opId, delta, type, reason, ownerStableId });
  return cfResult.data;
};

/**
 * Атомарно применить дельту осколков на сервере (earn: delta>0, spend: delta<0).
 * opId делает вызов идемпотентным — повтор (ретрай/офлайн-очередь) с тем же opId
 * не удвоит дельту.
 *
 * Совместимо по форме результата с прежним applyShardDeltaToCloud, поэтому все
 * вызывающие (addShards / addShardsRaw / spendShards) не менялись: 'unavailable'
 * уводит в локальную оптимистичную ветку (+ enqueue для последующей сверки),
 * 'insufficient' сверяет локаль с облаком.
 */
const applyShardDeltaToCloud = async (
  delta: number,
  type: 'earn' | 'spend',
  reason: string,
  _localFallbackBase: number,
  _localBaseMeta?: ShardBalanceMeta | null,
  accountToken?: AccountGenerationToken,
  opIdOverride?: string,
  legacyRecoveryIdentity?: LegacyShardDeltaRecoveryIdentity,
): Promise<
  | { ok: true; balance: number; balanceBefore: number; updatedAtMs: number; opId: string; alreadyApplied: boolean }
  | { ok: false; reason: 'unavailable'; opId: string }
  | { ok: false; reason: 'stale-generation'; opId: string }
  | { ok: false; reason: 'insufficient'; cloudBalance: number; opId: string }
> => {
  const opId = opIdOverride ?? newShardOpId();
  const operationToken = accountToken ?? captureAccountGeneration();
  const ownerStableId = operationToken.stableId;
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'unavailable', opId };
    if (!ownerStableId || !isCurrentAccountGeneration(operationToken, ownerStableId)) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    const exactCustomizationRecovery = legacyRecoveryIdentity !== undefined
      && type === 'spend'
      && opIdOverride === opId
      && /^[A-Za-z0-9_:-]{8,80}$/.test(opId)
      && (
        reason === 'custom_avatar'
        || reason === 'custom_avatar_restyle'
        || reason === 'avatar_aura'
      );
    if (await hasQuarantinedShardDeltaQueue(ownerStableId)) {
      if (
        !exactCustomizationRecovery
        || !await hasExactLegacyQuarantinedShardDelta(
          ownerStableId,
          legacyRecoveryIdentity!,
        )
      ) return { ok: false, reason: 'unavailable', opId };
    }
    if (!isCurrentAccountGeneration(operationToken, ownerStableId)) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    const uid = await getCanonicalUserId();
    if (!isCurrentAccountGeneration(operationToken, ownerStableId) || uid !== ownerStableId) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    if (
      legacyRecoveryIdentity
      && !await hasExactLegacyQuarantinedShardDelta(
        ownerStableId,
        legacyRecoveryIdentity,
      )
    ) return { ok: false, reason: 'unavailable', opId };
    // delta приходит со знаком (spend отрицательна). Callable принимает величину +
    // type, знак ставит сервер сам.
    const magnitude = Math.abs(Math.trunc(delta));
    if (magnitude <= 0) return { ok: false, reason: 'unavailable', opId };
    const data = await runWithTimeout(
      callShardsApplyDelta(opId, magnitude, type, reason, ownerStableId),
      SHARD_CLOUD_TX_TIMEOUT_MS,
    );
    if (!isCurrentAccountGeneration(operationToken, ownerStableId)) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    if (data.insufficient) {
      return { ok: false, reason: 'insufficient', cloudBalance: Math.max(0, Math.floor(Number(data.balance) || 0)), opId };
    }
    if (!data.ok) return { ok: false, reason: 'unavailable', opId };
    const balance = Math.max(0, Math.floor(Number(data.balance) || 0));
    const updatedAtMs = parseUpdatedAtMs(data.shardsUpdatedAtMs) ?? Date.now();
    const balanceBefore = data.alreadyApplied ? balance : balance - delta;
    return { ok: true, balance, balanceBefore, updatedAtMs, opId, alreadyApplied: data.alreadyApplied };
  } catch {
    return { ok: false, reason: 'unavailable', opId };
  }
};

const persistLocalBalance = async (
  balance: number,
  meta: ShardBalanceMeta,
): Promise<void> => {
  await AsyncStorage.multiSet([
    [STORAGE_KEY, String(balance)],
    [BALANCE_META_KEY, JSON.stringify(meta)],
  ]);
};

const SHARD_SPEND_OP_LEDGER_LIMIT = 128;

const readShardSpendOpLedger = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SHARD_SPEND_OP_LEDGER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  } catch {
    return [];
  }
};

const appendShardSpendOp = (ledger: readonly string[], opId: string): string[] =>
  [...ledger.filter((value) => value !== opId), opId].slice(-SHARD_SPEND_OP_LEDGER_LIMIT);

// ── Добавить осколки ───────────────────────────────────────────────────────
export const addShards = async (source: ShardSource, opts?: AddShardOpts): Promise<number> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  const isCurrent = (): boolean => Boolean(
    ownerStableId && isCurrentAccountGeneration(accountToken, ownerStableId),
  );
  try {
    if (!isCurrent()) return 0;
    const amount = SHARD_REWARDS[source];
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    // Фаза 2: +5% осколков за карточку IV+ — единая точка каталожного заработка;
    // бонус едет в той же клиентской дельте на сервер, отдельной операции нет.
    const perkM = await readProfileCardShardMultiplier();
    const perkBonus = profileCardShardBonus(amount, perkM);
    const totalAmount = amount + perkBonus;
    const localBase = await getShardsBalance();
    if (!isCurrent()) return 0;
    const localBaseMeta = await readBalanceMeta();
    if (!isCurrent()) return 0;
    const cloudApplied = await applyShardDeltaToCloud(
      totalAmount,
      'earn',
      source,
      localBase,
      localBaseMeta,
      accountToken,
    );
    if (!isCurrent()) return 0;
    if (cloudApplied.ok) {
      const meta: ShardBalanceMeta = { updatedAtMs: cloudApplied.updatedAtMs, op: 'earn', reason: source };
      const mirrorOutcome = await mirrorServerShardBalanceLocal(
        cloudApplied.balance,
        meta,
        accountToken,
        ownerStableId!,
      );
      if (!isCurrent() || (mirrorOutcome !== 'applied' && mirrorOutcome !== 'already-newer')) return 0;
      void bumpLifetimeShardsEarned(totalAmount);
      logShardTransaction('earn', totalAmount, source, cloudApplied.balance, cloudApplied.balanceBefore);
      if (!opts?.suppressEarnEvent) {
        emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: source });
      }
      return totalAmount;
    }
    if (cloudApplied.reason === 'stale-generation') return 0;

    const meta = localWriteStamp('earn', source);
    const newBalance = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return null;
      const committed = await commitPendingShardDelta(
        cloudApplied.opId,
        totalAmount,
        'earn',
        source,
        accountToken,
        async () => {
          const current = await getShardsBalance();
          if (!isCurrent()) throw new Error('stale_shard_account_generation');
          const next = current + totalAmount;
          return {
            commit: true as const,
            value: next,
            walletPairs: [
              [STORAGE_KEY, String(next)],
              [BALANCE_META_KEY, JSON.stringify(meta)],
            ],
          };
        },
      );
      return isCurrent()
        && committed.ok
        && 'committed' in committed
        && committed.committed
        ? committed.value
        : null;
    });
    if (!isCurrent() || newBalance === null) return 0;
    setShardsBalanceMemory(newBalance);
    void bumpLifetimeShardsEarned(totalAmount);
    // K3: сервер недоступен — дельта применена локально, серверную сверку кладём
    // в идемпотентную очередь (тот же opId → без удвоения при ретрае).
    logShardTransaction('earn', totalAmount, source, newBalance, newBalance - totalAmount);
    await emitShardsBalanceUpdated(newBalance, meta);
    if (!isCurrent()) return 0;
    if (!opts?.suppressEarnEvent) {
      emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: source });
    }
    return totalAmount;
  } catch (error) {
    DebugLogger.error('shards_system.ts:addShards', error, 'warning');
    return 0;
  }
};

/** Best-effort постановка неотправленной дельты в очередь серверной сверки (K3). */
const commitPendingShardDelta = async <T>(
  opId: string,
  amount: number,
  type: 'earn' | 'spend',
  reason: string,
  accountToken: AccountGenerationToken,
  buildWalletUpdate: () => Promise<
    | {
      commit: true;
      value: T;
      walletPairs: readonly (readonly [string, string])[];
    }
    | { commit: false; value: T }
  >,
): Promise<
  | { ok: true; committed: boolean; value: T }
  | { ok: true; duplicateExact: true }
  | { ok: false }
> => {
  const ownerStableId = accountToken.stableId;
  if (!ownerStableId || !isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return { ok: false };
  }
  const magnitude = Math.abs(Math.trunc(amount));
  if (magnitude <= 0) return { ok: false };
  if (await hasQuarantinedShardDeltaQueue(ownerStableId)) return { ok: false };
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) return { ok: false };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    try {
      return await withStorageLock(async () => {
        if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
          throw new Error('stale_shard_account_generation');
        }
        const update = await buildWalletUpdate();
        if (!update.commit) {
          return { ok: true as const, committed: false, value: update.value };
        }
        if (update.walletPairs.length === 0) return { ok: false as const };
        await AsyncStorage.multiSet(update.walletPairs);
        return { ok: true as const, committed: true, value: update.value };
      });
    } catch {
      return { ok: false };
    }
  }
  const committed = await enqueueAppliedShardDeltaWithStorage({
    opId,
    ownerStableId,
    delta: magnitude,
    type,
    reason,
    createdAtMs: Date.now(),
    localApplied: true,
  }, buildWalletUpdate).catch(() => ({ ok: false as const }));
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) return { ok: false };
  return committed;
};

const REWARD_CLAIMS_COLLECTION = 'reward_claims';

/** Ключ AsyncStorage / маркер: награда «все дневные» за календарный день уже забрана. */
export const dailyTasksAllShardsRewardStorageKey = (dayKey: string) => `daily_tasks_all_shards_${dayKey}`;
const dailyTasksAllShardsRewardPendingStorageKey = (dayKey: string) => `daily_tasks_all_shards_pending_${dayKey}`;

type DailyTasksAllShardsClaimResponse = {
  alreadyClaimed: boolean;
  newBalance: number;
  shardsUpdatedAtMs?: number | null;
};

const callDailyTasksAllShardsClaim = async (
  dayKey: string,
  stableId: string,
): Promise<DailyTasksAllShardsClaimResponse> => {
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
    getFunctions: (...args: unknown[]) => unknown;
    httpsCallable: (
      fns: unknown,
      name: string,
    ) => (data: unknown) => Promise<{ data: DailyTasksAllShardsClaimResponse }>;
  };
  const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
  const cfCall = httpsCallable(getFunctions(getApp(), 'us-central1'), 'dailyTasksAllShardsClaim');
  const cfResult = await cfCall({ dayKey, stableId });
  return cfResult.data;
};

const syncDailyTasksAllShardsClaimToCloud = async (
  dayKey: string,
  stableId: string,
  rewardKey: string,
  force = false,
): Promise<void> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || !stableId) return;
  const pendingKey = dailyTasksAllShardsRewardPendingStorageKey(dayKey);
  try {
    const pending = force || (await AsyncStorage.getItem(pendingKey).catch(() => null)) === '1';
    if (!pending) return;
    await AsyncStorage.setItem(pendingKey, '1').catch(() => {});
    const updatedAtMs = Date.now();
    const data = await callDailyTasksAllShardsClaim(dayKey, stableId);
    const serverUpdatedAtMs = parseUpdatedAtMs(data.shardsUpdatedAtMs) ?? updatedAtMs;

    await AsyncStorage.setItem(rewardKey, '1').catch(() => {});
    if (Number.isFinite(data.newBalance) && data.newBalance >= 0) {
      await replaceShardsBalanceLocal(data.newBalance, {
        updatedAtMs: serverUpdatedAtMs,
        op: 'earn',
        reason: 'daily_tasks_all',
      }).catch(() => {});
    }
    await AsyncStorage.removeItem(pendingKey).catch(() => {});
  } catch (error) {
    DebugLogger.error('shards_system.ts:syncDailyTasksAllShardsClaimToCloud', error, 'warning');
  }
};

export const resumePendingDailyTasksAllShardsClaims = async (): Promise<{ resolved: number; pending: number }> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { resolved: 0, pending: 0 };
  const stableId = await getCanonicalUserId().catch(() => null);
  if (!stableId) return { resolved: 0, pending: 0 };
  const prefix = 'daily_tasks_all_shards_pending_';
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter((key) => key.startsWith(prefix));
    let resolved = 0;
    let pending = 0;
    for (const key of pendingKeys) {
      const dayKey = key.slice(prefix.length);
      if (!dayKey) continue;
      const rewardKey = dailyTasksAllShardsRewardStorageKey(dayKey);
      await syncDailyTasksAllShardsClaimToCloud(dayKey, stableId, rewardKey).catch(() => {});
      const stillPending = (await AsyncStorage.getItem(key).catch(() => null)) === '1';
      if (stillPending) pending += 1;
      else resolved += 1;
    }
    return { resolved, pending };
  } catch (error) {
    DebugLogger.error('shards_system.ts:resumePendingDailyTasksAllShardsClaims', error, 'warning');
    return { resolved: 0, pending: 0 };
  }
};

const grantDailyTasksAllShardsOptimistically = async (
  amount: number,
  rewardKey: string,
  pendingKey: string,
): Promise<boolean> => {
  const safe = Math.max(0, Math.floor(amount));
  if (safe <= 0) return false;
  let meta = localWriteStamp('earn', 'daily_tasks_all');
  try {
    const newBalance = await withStorageLock(async () => {
      const currentMeta = await readBalanceMeta();
      meta = {
        updatedAtMs: Math.max(Date.now(), (currentMeta?.updatedAtMs ?? 0) + 1),
        op: 'earn',
        reason: 'daily_tasks_all',
      };
      const current = await getShardsBalance();
      const next = current + safe;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(next)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [rewardKey, '1'],
        [pendingKey, '1'],
      ]);
      return next;
    });
    setShardsBalanceMemory(newBalance);
    void bumpLifetimeShardsEarned(safe);
    await emitShardsBalanceUpdated(newBalance, meta);
    emitAppEvent('shards_earned', { amount: safe, reasonKey: 'daily_tasks_all' });
    return true;
  } catch {
    return false;
  }
};

export const isDailyTasksAllShardsRewardClaimedForDay = async (dayKey: string): Promise<boolean> => {
  try {
    const v = await AsyncStorage.getItem(dailyTasksAllShardsRewardStorageKey(dayKey));
    return v === '1';
  } catch {
    return false;
  }
};

/**
 * Исход «забрать осколок за все дневные задания»:
 *  - 'granted' — локальный optimistic claim записан (+1), облачная сверка может идти в фоне;
 *  - 'already' — уже забрано ранее (этим устройством, другим устройством или
 *                прерванным прошлым вызовом). НЕ ошибка: кнопку надо погасить молча;
 *  - 'failed'  — реальный сбой (сеть/CF/auth). Можно показать «попробуй ещё раз».
 */
export type ClaimDailyTrioResult = 'granted' | 'already' | 'failed';

/**
 * +1 осколок за выполнение всех 3 ежедневных заданий за день (ручной «Забрать» на экране заданий).
 * При включённом облаке: локально гасим кнопку и прибавляем shards сразу, затем Cloud Function
 * идемпотентно подтверждает маркер + баланс в фоне, без дублей между устройствами.
 * Иначе: локальный ключ AsyncStorage + addShards (как раньше).
 *
 * Возвращает три исхода, чтобы экран НЕ показывал «Осколки не загрузились», когда
 * сервер уже выдал осколок (alreadyClaimed) — это была причина бесконечной ошибки
 * «не забрать осколки уже который день» в баг-репортах.
 */
export const claimDailyTasksAllShardsRewardDetailed = async (
  dayKey: string,
): Promise<ClaimDailyTrioResult> => {
  const rewardKey = dailyTasksAllShardsRewardStorageKey(dayKey);
  const pendingKey = dailyTasksAllShardsRewardPendingStorageKey(dayKey);
  const amount = SHARD_REWARDS.daily_tasks_all;
  if (!Number.isFinite(amount) || amount <= 0) return 'failed';

  try {
    const existing = await AsyncStorage.getItem(rewardKey);
    if (existing) {
      void getCanonicalUserId()
        .then((uid) => uid ? syncDailyTasksAllShardsClaimToCloud(dayKey, uid, rewardKey) : undefined)
        .catch(() => {});
      return 'already';
    }

    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
      const n = await addShards('daily_tasks_all');
      if (n <= 0) return 'failed';
      await AsyncStorage.setItem(rewardKey, '1');
      return 'granted';
    }

    const uid = await getCanonicalUserId();
    if (!uid) {
      const n = await addShards('daily_tasks_all');
      if (n <= 0) return 'failed';
      await AsyncStorage.setItem(rewardKey, '1');
      return 'granted';
    }

    const granted = await grantDailyTasksAllShardsOptimistically(amount, rewardKey, pendingKey);
    if (!granted) return 'failed';
    // Шлём ТОТ ЖЕ id, под которым клиент хранит осколки (getCanonicalUserId === stableId),
    // чтобы CF читал/писал users/{stableId}, а не db.doc(authUid). Без этого для юзеров
    // с релинком (анон→Google, мердж) маркер reward_claims оседал на чужом доке.
    void syncDailyTasksAllShardsClaimToCloud(dayKey, uid, rewardKey, true);
    return 'granted';
  } catch (error) {
    DebugLogger.error('shards_system.ts:claimDailyTasksAllShardsReward', error, 'warning');
    return 'failed';
  }
};

/**
 * Обратная совместимость: булевая обёртка над {@link claimDailyTasksAllShardsRewardDetailed}.
 * true при свежем локальном optimistic claim ('granted'). 'already'/'failed' → false.
 * Предпочитай детальную версию, чтобы отличать «уже забрано» от реального сбоя.
 */
export const claimDailyTasksAllShardsReward = async (dayKey: string): Promise<boolean> => {
  return (await claimDailyTasksAllShardsRewardDetailed(dayKey)) === 'granted';
};

export type SpendShardsOptions = {
  /**
   * Записать локально и сразу вернуть управление UI; синхронизация shards в Firestore — в фоне.
   * Нужно для покупки наборов без «Подождите…», если облако подвисает.
   */
  skipServerAwait?: boolean;
  /**
   * Recovery-only: a prepared customization intent whose opId is already in
   * the local spend ledger must obtain the exact idempotent server receipt
   * before ownership can be granted. It never permits generic queue replay.
   */
  requireCloudReceiptForLocalLedger?: boolean;
};

export type AddShardsRawOptions = {
  /**
   * Показать глобальную анимацию/модалку shards_earned.
   * По умолчанию false — витрина, рефанды и т.п. без всплывашки.
   */
  showEarnModal?: boolean;
  /** Подпись в shard_earn_ui, если showEarnModal */
  earnModalKey?: string;
  /**
   * DEV / магазин bypass: записать локально и обновить UI сразу, без ожидания Firestore.
   * Синхронизация уходит в фон (`void`).
   */
  skipServerAwait?: boolean;
};

// ── Добавить произвольное количество осколков ─────────────────────────────
// logReason → Firestore users/*/shard_log.reason; default 'raw' = не размечено / старые пути
export const addShardsRaw = async (
  amount: number,
  logReason: string = 'raw',
  options?: AddShardsRawOptions,
): Promise<number> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  const isCurrent = (): boolean => Boolean(
    ownerStableId && isCurrentAccountGeneration(accountToken, ownerStableId),
  );
  try {
    if (!isCurrent() || !Number.isFinite(amount) || amount <= 0) return 0;
    // Фаза 2: +5% осколков за карточку IV+ — для клиент-сформированного заработка;
    // покупки/пари/возвраты/компенсации исключены, серверные начисления сюда не проходят.
    const perkM = PROFILE_CARD_PERK_EXCLUDED_REASONS.has(logReason) ? 1 : await readProfileCardShardMultiplier();
    const perkBonus = profileCardShardBonus(amount, perkM);
    const totalAmount = amount + perkBonus;
    if (options?.skipServerAwait) {
      const opId = newShardOpId();
      const meta = localWriteStamp('earn', logReason);
      const newBalance = await withAccountTransitionLock(async () => {
        if (!isCurrent()) return null;
        const committed = await commitPendingShardDelta(
          opId,
          totalAmount,
          'earn',
          logReason,
          accountToken,
          async () => {
            const current = await getShardsBalance();
            if (!isCurrent()) throw new Error('stale_shard_account_generation');
            const next = current + totalAmount;
            return {
              commit: true as const,
              value: next,
              walletPairs: [
                [STORAGE_KEY, String(next)],
                [BALANCE_META_KEY, JSON.stringify(meta)],
              ],
            };
          },
        );
        return isCurrent()
          && committed.ok
          && 'committed' in committed
          && committed.committed
          ? committed.value
          : null;
      });
      if (!isCurrent() || newBalance === null) return 0;
      setShardsBalanceMemory(newBalance);
      if (isStorePurchaseReason(logReason)) {
        await bumpStorePurchasedShardsTotal(amount);
        if (!isCurrent()) return 0;
      }
      void bumpLifetimeShardsEarned(totalAmount);
      void resumePendingShardDeltas();
      void logShardTransaction('earn', totalAmount, logReason, newBalance, newBalance - totalAmount);
      await emitShardsBalanceUpdated(newBalance, meta);
      if (!isCurrent()) return 0;
      if (options.showEarnModal) {
        const k = options.earnModalKey ?? logReason ?? 'generic_raw';
        emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: k });
      }
      return totalAmount;
    }

    const localBase = await getShardsBalance();
    if (!isCurrent()) return 0;
    const localBaseMeta = await readBalanceMeta();
    if (!isCurrent()) return 0;
    const cloudApplied = await applyShardDeltaToCloud(
      totalAmount,
      'earn',
      logReason,
      localBase,
      localBaseMeta,
      accountToken,
    );
    if (!isCurrent()) return 0;
    if (cloudApplied.ok) {
      const meta: ShardBalanceMeta = { updatedAtMs: cloudApplied.updatedAtMs, op: 'earn', reason: logReason };
      const mirrorOutcome = await mirrorServerShardBalanceLocal(
        cloudApplied.balance,
        meta,
        accountToken,
        ownerStableId!,
      );
      if (!isCurrent() || (mirrorOutcome !== 'applied' && mirrorOutcome !== 'already-newer')) return 0;
      if (isStorePurchaseReason(logReason)) {
        await bumpStorePurchasedShardsTotal(amount);
        if (!isCurrent()) return 0;
      }
      void bumpLifetimeShardsEarned(totalAmount);
      logShardTransaction('earn', totalAmount, logReason, cloudApplied.balance, cloudApplied.balanceBefore);
      if (options?.showEarnModal) {
        const k = options.earnModalKey ?? logReason ?? 'generic_raw';
        emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: k });
      }
      return totalAmount;
    }
    if (cloudApplied.reason === 'stale-generation') return 0;

    const meta = localWriteStamp('earn', logReason);
    const newBalance = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return null;
      const committed = await commitPendingShardDelta(
        cloudApplied.opId,
        totalAmount,
        'earn',
        logReason,
        accountToken,
        async () => {
          const current = await getShardsBalance();
          if (!isCurrent()) throw new Error('stale_shard_account_generation');
          const next = current + totalAmount;
          return {
            commit: true as const,
            value: next,
            walletPairs: [
              [STORAGE_KEY, String(next)],
              [BALANCE_META_KEY, JSON.stringify(meta)],
            ],
          };
        },
      );
      return isCurrent()
        && committed.ok
        && 'committed' in committed
        && committed.committed
        ? committed.value
        : null;
    });
    if (!isCurrent() || newBalance === null) return 0;
    setShardsBalanceMemory(newBalance);
    if (isStorePurchaseReason(logReason)) {
      await bumpStorePurchasedShardsTotal(amount);
      if (!isCurrent()) return 0;
    }
    void bumpLifetimeShardsEarned(totalAmount);
    logShardTransaction('earn', totalAmount, logReason, newBalance, newBalance - totalAmount);
    await emitShardsBalanceUpdated(newBalance, meta);
    if (!isCurrent()) return 0;
    if (options?.showEarnModal) {
      const k = options.earnModalKey ?? logReason ?? 'generic_raw';
      emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: k });
    }
    return totalAmount;
  } catch (error) {
    DebugLogger.error('shards_system.ts:addShardsRaw', error, 'warning');
    return 0;
  }
};

const trackShardsSpentAchievement = (amount: number): void => {
  void import('./achievements')
    .then(({ checkAchievements }) => checkAchievements({ type: 'shards_spent', amount }))
    .catch(() => {});
};

export type IdempotentShardSpendResult =
  | 'applied'
  | 'already-applied'
  | 'insufficient'
  | 'failed';

export const spendShardsIdempotent = async (
  amount: number,
  reason: ShardSpendReason,
  opId: string,
  options?: SpendShardsOptions,
): Promise<IdempotentShardSpendResult> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  const isCurrent = (): boolean => Boolean(
    ownerStableId && isCurrentAccountGeneration(accountToken, ownerStableId),
  );
  try {
    if (!isCurrent() || !Number.isFinite(amount) || amount <= 0 || !opId.trim()) return 'failed';
    const spendAmount = Math.floor(amount);
    if (spendAmount <= 0) return 'failed';
    const localLedgerApplied = (await readShardSpendOpLedger()).includes(opId);
    if (localLedgerApplied && !options?.requireCloudReceiptForLocalLedger) {
      return isCurrent() ? 'already-applied' : 'failed';
    }
    const quarantinedLocalLedgerRecovery = localLedgerApplied
      && options?.requireCloudReceiptForLocalLedger === true
      && await hasQuarantinedShardDeltaQueue(ownerStableId!);
    const legacyRecoveryIdentity = {
      opId,
      delta: spendAmount,
      type: 'spend' as const,
      reason,
    };
    if (
      quarantinedLocalLedgerRecovery
      && !await hasExactLegacyQuarantinedShardDelta(
        ownerStableId!,
        legacyRecoveryIdentity,
      )
    ) return 'failed';
    if (
      localLedgerApplied
      && options?.requireCloudReceiptForLocalLedger
      && !quarantinedLocalLedgerRecovery
    ) return isCurrent() ? 'already-applied' : 'failed';
    if (
      quarantinedLocalLedgerRecovery
      && (IS_EXPO_GO || !CLOUD_SYNC_ENABLED)
    ) return 'failed';
    if (!isCurrent()) return 'failed';
    const localBase = await getShardsBalance();
    if (!isCurrent()) return 'failed';
    const localBaseMeta = await readBalanceMeta();
    if (!isCurrent()) return 'failed';
    const cloudApplied = await applyShardDeltaToCloud(
      -spendAmount,
      'spend',
      reason,
      localBase,
      localBaseMeta,
      accountToken,
      opId,
      quarantinedLocalLedgerRecovery ? legacyRecoveryIdentity : undefined,
    );
    if (!isCurrent()) return 'failed';
    if (cloudApplied.ok === true) {
      const meta: ShardBalanceMeta = { updatedAtMs: cloudApplied.updatedAtMs, op: 'spend', reason };
      const mirrorOutcome = await mirrorServerShardBalanceLocal(
        cloudApplied.balance,
        meta,
        accountToken,
        ownerStableId!,
      );
      if (!isCurrent() || (mirrorOutcome !== 'applied' && mirrorOutcome !== 'already-newer')) return 'failed';
      const ledgerStored = await withAccountTransitionLock(async () => {
        if (!isCurrent()) return false;
        return withStorageLock(async () => {
          if (!isCurrent()) return false;
          const ledger = await readShardSpendOpLedger();
          if (!isCurrent()) return false;
          await AsyncStorage.setItem(
            SHARD_SPEND_OP_LEDGER_KEY,
            JSON.stringify(appendShardSpendOp(ledger, opId)),
          );
          return isCurrent();
        });
      });
      if (!ledgerStored || !isCurrent()) return 'failed';
      if (quarantinedLocalLedgerRecovery) {
        const consumed = await withAccountTransitionLock(async () => {
          if (!isCurrent()) return false;
          return consumeExactLegacyQuarantinedShardDelta(
            ownerStableId!,
            legacyRecoveryIdentity,
          );
        });
        if (!consumed || !isCurrent()) return 'failed';
      }
      if (!cloudApplied.alreadyApplied && !localLedgerApplied) {
        await consumeStorePurchasedShardsOnSpend(spendAmount);
        if (!isCurrent()) return 'failed';
        void bumpLifetimeShardsSpent(spendAmount);
        logShardTransaction('spend', spendAmount, reason, cloudApplied.balance, cloudApplied.balanceBefore);
        trackShardsSpentAchievement(spendAmount);
      }
      return cloudApplied.alreadyApplied || localLedgerApplied ? 'already-applied' : 'applied';
    }
    if (cloudApplied.reason === 'stale-generation') return 'failed';
    if (cloudApplied.ok === false && cloudApplied.reason === 'insufficient') {
      // Облако авторитетно и его не хватает, хотя локально могло показываться больше
      // (рассинхрон: начисление не доехало до облака / облако перезаписано).
      // Чиним локальный баланс под облачный, иначе пользователь видит «фантомные»
      // осколки и каждая попытка покупки падает «Осколки не списались».
      const reconciled = Math.max(0, Math.floor(cloudApplied.cloudBalance));
      if (reconciled !== localBase) {
        const meta: ShardBalanceMeta = { updatedAtMs: Date.now(), op: 'replace', reason: 'cloud_reconcile' };
        const mirrorOutcome = await mirrorServerShardBalanceLocal(
          reconciled,
          meta,
          accountToken,
          ownerStableId!,
        );
        if (!isCurrent() || (mirrorOutcome !== 'applied' && mirrorOutcome !== 'already-newer')) {
          return 'failed';
        }
      }
      return 'insufficient';
    }
    if (quarantinedLocalLedgerRecovery) return 'failed';

    if (localBase < spendAmount) return 'insufficient';
    const meta = localWriteStamp('spend', reason);
    type LocalSpendCommitValue = {
      kind: 'applied' | 'already' | 'insufficient';
      balance: number;
    };
    const localResult = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return { kind: 'stale' as const, balance: 0 };
      const committed = await commitPendingShardDelta<LocalSpendCommitValue>(
        opId,
        spendAmount,
        'spend',
        reason,
        accountToken,
        async () => {
          const ledger = await readShardSpendOpLedger();
          if (!isCurrent()) throw new Error('stale_shard_account_generation');
          if (ledger.includes(opId)) {
            const balance = await getShardsBalance();
            if (!isCurrent()) throw new Error('stale_shard_account_generation');
            return {
              commit: false as const,
              value: { kind: 'already' as const, balance },
            };
          }
          const current = await getShardsBalance();
          if (!isCurrent()) throw new Error('stale_shard_account_generation');
          if (current < spendAmount) {
            return {
              commit: false as const,
              value: { kind: 'insufficient' as const, balance: current },
            };
          }
          const next = current - spendAmount;
          return {
            commit: true as const,
            value: { kind: 'applied' as const, balance: next },
            walletPairs: [
              [STORAGE_KEY, String(next)],
              [BALANCE_META_KEY, JSON.stringify(meta)],
              [SHARD_SPEND_OP_LEDGER_KEY, JSON.stringify(appendShardSpendOp(ledger, opId))],
            ],
          };
        },
      );
      if (!isCurrent()) return { kind: 'stale' as const, balance: 0 };
      if (!committed.ok) return { kind: 'queue-failed' as const, balance: 0 };
      if ('duplicateExact' in committed) {
        return { kind: 'already' as const, balance: await getShardsBalance() };
      }
      return committed.value;
    });
    if (
      localResult.kind === 'stale'
      || localResult.kind === 'queue-failed'
      || !isCurrent()
    ) return 'failed';
    if (localResult.kind === 'already') return 'already-applied';
    if (localResult.kind === 'insufficient') return 'insufficient';
    const newBalance = localResult.balance;
    setShardsBalanceMemory(newBalance);
    await consumeStorePurchasedShardsOnSpend(spendAmount);
    if (!isCurrent()) return 'failed';
    void bumpLifetimeShardsSpent(spendAmount);
    if (options?.skipServerAwait) {
      void resumePendingShardDeltas();
      void logShardTransaction('spend', spendAmount, reason, newBalance, newBalance + spendAmount);
    } else {
      logShardTransaction('spend', spendAmount, reason, newBalance, newBalance + spendAmount);
    }
    await emitShardsBalanceUpdated(newBalance, meta);
    if (!isCurrent()) return 'failed';
    trackShardsSpentAchievement(spendAmount);
    return 'applied';
  } catch {
    return 'failed';
  }
};

// ── Потратить осколки (обратно совместимая boolean-обёртка) ───────────────
export const spendShards = async (
  amount: number,
  reason: ShardSpendReason = 'buy_energy',
  options?: SpendShardsOptions,
): Promise<boolean> => {
  const result = await spendShardsIdempotent(amount, reason, newShardOpId(), options);
  return result === 'applied' || result === 'already-applied';
};

// ── Проверить и начислить единоразовые события ────────────────────────────
const getOneTimeEvents = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(ONE_TIME_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const markOneTimeClaimInCloud = async (
  uid: string,
  source: 'exam_excellent' | 'diagnostic_test',
  amount: number,
): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const db = firestore();
    const claimRef = db
      .collection('users')
      .doc(uid)
      .collection(REWARD_CLAIMS_COLLECTION)
      .doc(`one_time_${source}`);
    await db.runTransaction(async (transaction) => {
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.exists) return;
      transaction.set(claimRef, {
        source,
        amount,
        migratedFromLocal: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
};

export const awardOneTime = async (source: 'exam_excellent' | 'diagnostic_test'): Promise<number> => {
  const amount = SHARD_REWARDS[source];
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  // Фаза 2: +5% осколков за карточку IV+ — awardOneTime свой клиентский earn
  // (exam/diagnostic), бонус в той же транзакции/локальной записи.
  const perkM = await readProfileCardShardMultiplier();
  const perkBonus = profileCardShardBonus(amount, perkM);
  const totalAmount = amount + perkBonus;
  try {
    const existingEvents = await getOneTimeEvents();
    if (existingEvents.has(source)) {
      const uid = await getCanonicalUserId();
      if (uid) await markOneTimeClaimInCloud(uid, source, amount);
      return 0;
    }

    if (!IS_EXPO_GO && CLOUD_SYNC_ENABLED) {
      const uid = await getCanonicalUserId();
      if (uid) {
        const localBalance = await getShardsBalance();
        const db = firestore();
        const updatedAtMs = Date.now();
        const claimId = `one_time_${source}`;
        const newBalance = await db.runTransaction(async (transaction) => {
          const userRef = db.collection('users').doc(uid);
          const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(claimId);
          const claimSnap = await transaction.get(claimRef);
          if (claimSnap.exists) return null as number | null;

          const userSnap = await transaction.get(userRef);
          const cloudShards = userSnap.exists ? parseShardBalance(userSnap.data()?.shards) : null;
          const cloudVal = cloudShards ?? 0;
          const base = Math.max(localBalance, cloudVal);
          const next = base + totalAmount;

          transaction.set(claimRef, {
            source,
            amount: totalAmount,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
          transaction.set(userRef, {
            shards: next,
            shards_updated_at_ms: updatedAtMs,
            shards_updated_op: 'earn',
            shards_updated_reason: source,
          }, { merge: true });
          return next;
        });

        if (newBalance === null || newBalance === undefined) {
          await withStorageLock(async () => {
            const events = await getOneTimeEvents();
            events.add(source);
            await AsyncStorage.setItem(ONE_TIME_KEY, JSON.stringify([...events]));
          });
          return 0;
        }

        const meta: ShardBalanceMeta = { updatedAtMs, op: 'earn', reason: source };
        await mirrorServerShardBalanceLocal(newBalance, meta);
        await withStorageLock(async () => {
          const events = await getOneTimeEvents();
          events.add(source);
          await AsyncStorage.setItem(ONE_TIME_KEY, JSON.stringify([...events]));
        });

        const currentBalance = await getShardsBalance();
        void bumpLifetimeShardsEarned(totalAmount);
        logShardTransaction('earn', totalAmount, source, currentBalance, currentBalance - totalAmount);
        emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: source });
        return totalAmount;
      }
    }

    const result = await withStorageLock(async () => {
      const events = await getOneTimeEvents();
      if (events.has(source)) return { awarded: 0, balance: null as number | null, meta: null as ShardBalanceMeta | null };
      const current = await getShardsBalance();
      const next = current + totalAmount;
      events.add(source);
      const meta = localWriteStamp('earn', source);
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(next)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [ONE_TIME_KEY, JSON.stringify([...events])],
      ]);
      return { awarded: totalAmount, balance: next, meta };
    });
    if (result.awarded > 0 && result.balance !== null && result.meta) {
      setShardsBalanceMemory(result.balance);
      void bumpLifetimeShardsEarned(totalAmount);
      await syncShardsToCloud(result.balance, result.meta);
      logShardTransaction('earn', totalAmount, source, result.balance, result.balance - totalAmount);
      await emitShardsBalanceUpdated(result.balance, result.meta);
      emitAppEvent('shards_earned', { amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {}), reasonKey: source });
    }
    return result.awarded;
  } catch {
    return 0;
  }
};

export type OnArenaWinOpts = {
  /**
   * Вместо стандартного +1 за победу в арене — начислить это число (ставка на матч: выплата S×2).
   * Бонус «каждые 10 побед» и счётчик побед считаются как раньше.
   */
  baseWinShardsOverride?: number;
};

// ── Арена: каждые 10 побед (модалку показывает arena_results одним событием) ─
export const onArenaWin = async (opts?: OnArenaWinOpts): Promise<{ shards: number; milestoneBonus: number }> => {
  const override = opts?.baseWinShardsOverride;
  let winShards = 0;
  if (override != null && Number.isFinite(override) && override > 0) {
    winShards = await addShardsRaw(Math.floor(override), 'arena_match_wager_win');
  } else {
    winShards = await addShards('arena_win', { suppressEarnEvent: true });
  }
  try {
    const raw = await AsyncStorage.getItem(ARENA_WINS_KEY);
    const wins = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(ARENA_WINS_KEY, String(wins));
    // Бонус «каждые 10 побед» только без ставки на матч (при ставке — одна выплата по коэффициенту).
    if (override == null && wins % 10 === 0) {
      const bonus = await addShards('arena_10_wins', { suppressEarnEvent: true });
      return { shards: winShards, milestoneBonus: bonus };
    }
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
  return { shards: winShards, milestoneBonus: 0 };
};

// ── Цепочка: кратность 7 / 30 (модалку шлёт home после этого) ───────────────
export const onStreakUpdated = async (
  streak: number,
): Promise<{ amount: number; reasonKey: 'streak_7' | 'streak_30' | null }> => {
  if (streak > 0 && streak % 30 === 0) {
    const t = await addShards('streak_30', { suppressEarnEvent: true });
    return { amount: t, reasonKey: t > 0 ? 'streak_30' : null };
  }
  if (streak > 0 && streak % 7 === 0) {
    const t = await addShards('streak_7', { suppressEarnEvent: true });
    return { amount: t, reasonKey: t > 0 ? 'streak_7' : null };
  }
  return { amount: 0, reasonKey: null };
};

// ── Синхронизация с Firestore ─────────────────────────────────────────────
const syncShardsToCloud = async (balance: number, meta?: ShardBalanceMeta | null): Promise<void> => {
  try {
    const safeBalance = parseShardBalance(balance);
    if (safeBalance === null) return;
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    const db = firestore();
    const userRef = db.collection('users').doc(uid);
    const effectiveMeta = meta ?? await readBalanceMeta() ?? localWriteStamp('replace', 'sync');
    // Таймаут, чтобы фоновый синк не висел вечно на заблокированном Firebase и не
    // копил зависшие Firestore-запросы при каждой покупке. Best-effort: при таймауте просто
    // выходим, локальный баланс до-синхронизируется при следующем сетевом вызове.
    const snap = await runWithTimeout(userRef.get(), SHARD_CLOUD_TX_TIMEOUT_MS);
    const cloudUpdatedAt = snap.exists ? parseUpdatedAtMs(snap.data()?.shards_updated_at_ms) : null;
    if (cloudUpdatedAt !== null && cloudUpdatedAt > effectiveMeta.updatedAtMs) return;
    await runWithTimeout(
      userRef.set({
        shards: safeBalance,
        shards_updated_at_ms: effectiveMeta.updatedAtMs,
        shards_updated_op: effectiveMeta.op,
        shards_updated_reason: effectiveMeta.reason,
      }, { merge: true }),
      SHARD_CLOUD_TX_TIMEOUT_MS,
    );
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
};

/**
 * Привести облако и локал к согласованному состоянию перед серверо-авторитетной
 * операцией (например, Cloud Function profileCardUpgrade), чтобы сервер видел
 * актуальный баланс, а не отставший.
 *
 * Раньше эта функция СОЗНАТЕЛЬНО ставила свежий `Date.now()` и перетирала облачный
 * баланс локальным «гарантированно». Проблема: если CF (ежедневки/лига/подарки)
 * только что начислила осколки на сервер, локальный устаревший баланс их затирал —
 * пользователь терял реально начисленные монеты, а потом видел «недостаточно
 * осколков» при покупке (см. аудит 2026-06-27).
 *
 * Правильный путь — двухсторонняя сверка:
 *   1) `loadShardsFromCloud()` — корректно мержит (сервер новее → перезаписывает
 *      локал; локал новее → пушит в облако), уже умеет priority-merge.
 *   2) После merge запись с РЕАЛЬНОЙ меткой из `readBalanceMeta`: если облако и
 *      так свежее, guard `cloudUpdatedAt > effectiveMeta.updatedAtMs` корректно
 *      пропустит лишний write. Если локал новее — нормально перезапишет.
 *
 * Best-effort: ошибка не пробрасывается.
 */
export const forceSyncShardsToCloud = async (): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    // Шаг 1: подтянуть серверные начисления (если есть), мержит безопасно.
    await loadShardsFromCloud();
    // Шаг 2: записать актуальный локальный баланс с реальной меткой времени —
    // guard внутри syncShardsToCloud сам не пропустит запись, если облако новее.
    const balance = await getShardsBalance();
    const meta = (await readBalanceMeta()) ?? localWriteStamp('replace', 'pre_action_reconcile');
    await syncShardsToCloud(balance, meta);
  } catch (e) {
    if (__DEV__) console.warn('[shards_system] forceSyncShardsToCloud', e);
  }
};

// ── K3: проиграть офлайн-очередь дельт осколков ────────────────────────────
// Каждую неотправленную дельту повторяем через идемпотентный callable
// shardsApplyDelta (тот же opId → сервер не удвоит). Успешно подтверждённые
// (или уже применённые) убираем из очереди и зеркалим серверный баланс локально.
// Вызывается при старте (cloud_sync boot) и после skipServerAwait-операций.
const scopedShardReplayInFlight = new Map<
  string,
  Promise<{ resolved: number; pending: number }>
>();

export const resumePendingShardDeltas = async (): Promise<{ resolved: number; pending: number }> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  if (
    IS_EXPO_GO
    || !CLOUD_SYNC_ENABLED
    || !ownerStableId
    || !isCurrentAccountGeneration(accountToken, ownerStableId)
  ) {
    return { resolved: 0, pending: 0 };
  }
  const replayKey = `${accountToken.generation}:${ownerStableId}`;
  const existing = scopedShardReplayInFlight.get(replayKey);
  if (existing) return existing;
  const isCurrent = (): boolean => isCurrentAccountGeneration(accountToken, ownerStableId);

  const replay = (async (): Promise<{ resolved: number; pending: number }> => {
    let queueLength = 0;
    try {
      const quarantinedBeforeRead = await hasQuarantinedShardDeltaQueue(ownerStableId);
      if (!isCurrent()) return { resolved: 0, pending: 0 };
      const queue = await readShardDeltaQueue(ownerStableId);
      queueLength = queue.length;
      const quarantinedAfterRead = await hasQuarantinedShardDeltaQueue(ownerStableId);
      if (!isCurrent()) return { resolved: 0, pending: queue.length };
      if (quarantinedBeforeRead || quarantinedAfterRead) {
        return { resolved: 0, pending: queue.length };
      }
      if (!isCurrent() || queue.length === 0) {
        return { resolved: 0, pending: isCurrent() ? 0 : queue.length };
      }
      const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
      if (!isCurrent() || !appCheckReady) return { resolved: 0, pending: queue.length };
      const uid = await getCanonicalUserId().catch(() => null);
      if (!isCurrent() || uid !== ownerStableId) return { resolved: 0, pending: queue.length };
      const localSnapshot = await getShardsBalance();
      if (!isCurrent()) return { resolved: 0, pending: queue.length };

      const confirmed: string[] = [];
      let latestBalance: number | null = null;
      let pendingStartIndex = queue.length;
      for (let index = 0; index < queue.length; index += 1) {
        const entry = queue[index];
        if (!isCurrent()) return { resolved: 0, pending: queue.length };
        if (entry.localApplied !== true) {
          pendingStartIndex = index;
          break;
        }
        try {
          const data = await runWithTimeout(
            callShardsApplyDelta(
              entry.opId,
              entry.delta,
              entry.type,
              entry.reason,
              ownerStableId,
            ),
            SHARD_CLOUD_TX_TIMEOUT_MS,
          );
          if (!isCurrent()) return { resolved: 0, pending: queue.length };
          if (data.ok || data.insufficient) {
            confirmed.push(entry.opId);
            latestBalance = Math.max(0, Math.floor(Number(data.balance) || 0));
          } else {
            pendingStartIndex = index;
            break;
          }
        } catch {
          if (!isCurrent()) return { resolved: 0, pending: queue.length };
          pendingStartIndex = index;
          break;
        }
      }
      const pendingEntries = queue.slice(pendingStartIndex);

      if (!isCurrent()) return { resolved: 0, pending: queue.length };
      if (confirmed.length > 0) {
        const removed = await removeShardDeltas(ownerStableId, confirmed);
        if (!isCurrent()) return { resolved: 0, pending: queue.length };
        if (!removed) return { resolved: 0, pending: queue.length };
      }

      if (latestBalance !== null) {
        const pendingOptimisticDelta = pendingEntries.reduce(
          (sum, entry) => entry.localApplied === true
            ? sum + (entry.type === 'earn' ? entry.delta : -entry.delta)
            : sum,
          0,
        );
        const targetBalance = Math.max(0, latestBalance + pendingOptimisticDelta);
        const correction = targetBalance - localSnapshot;
        if (correction !== 0) {
          const meta: ShardBalanceMeta = {
            updatedAtMs: Date.now(),
            op: 'replace',
            reason: 'shard_delta_queue_reconcile',
          };
          const reconciled = await withAccountTransitionLock(async () => {
            if (!isCurrent()) return null;
            const current = await getShardsBalance();
            if (!isCurrent()) return null;
            const next = Math.max(0, current + correction);
            await persistLocalBalance(next, meta);
            if (!isCurrent()) return null;
            return next;
          }).catch(() => null);
          if (!isCurrent()) return { resolved: 0, pending: queue.length };
          if (reconciled !== null) {
            setShardsBalanceMemory(reconciled);
            await emitShardsBalanceUpdated(reconciled, meta);
            if (!isCurrent()) return { resolved: 0, pending: queue.length };
          }
        }
      }
      return { resolved: confirmed.length, pending: pendingEntries.length };
    } catch (error) {
      DebugLogger.error('shards_system.ts:resumePendingShardDeltas', error, 'warning');
      return { resolved: 0, pending: queueLength };
    } finally {
      scopedShardReplayInFlight.delete(replayKey);
    }
  })();
  scopedShardReplayInFlight.set(replayKey, replay);
  return replay;
};

export const preparePendingShardDeltasForAccountSwitch = async (): Promise<{
  resolved: number;
  pending: number;
  pendingEarn: number;
  pendingSpend: number;
  ownerStableId: string | null;
  stale: boolean;
}> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  if (!ownerStableId || !isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: 0,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  const replay = await resumePendingShardDeltas();
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: replay.pending,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  const remaining = await readShardDeltaQueue(ownerStableId);
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: remaining.length,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  return {
    resolved: replay.resolved,
    pending: remaining.length,
    pendingEarn: remaining.filter((entry) => entry.type === 'earn').length,
    pendingSpend: remaining.filter((entry) => entry.type === 'spend').length,
    ownerStableId,
    stale: false,
  };
};

// ── Загрузить осколки из облака (при первом входе / смене устройства) ─────
export const loadShardsFromCloud = async (isCurrent: () => boolean = () => true): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!isCurrent()) return;
    if (!uid) return;
    const db = firestore();
    const snap = await db.collection('users').doc(uid).get();
    if (!isCurrent()) return;
    const data = snap.data?.() ?? {};
    const cloudRaw = data.shards;
    const cloudShards = parseShardBalance(cloudRaw);
    if (cloudShards === null) return;
    const cloudUpdatedAt = parseUpdatedAtMs(data.shards_updated_at_ms);
    const cloudOverrideAt: string | null = data.shards_admin_override_at ?? null;
    const local = await getShardsBalance();
    if (!isCurrent()) return;
    const localMeta = await readBalanceMeta();
    if (!isCurrent()) return;
    const appliedOverrideAt = await AsyncStorage.getItem(ADMIN_OVERRIDE_APPLIED_KEY);
    if (!isCurrent()) return;
    let changed = false;
    let appliedMeta: ShardBalanceMeta | null = null;
    // Admin override has priority: force local balance to cloud value once per override marker.
    if (cloudOverrideAt && cloudOverrideAt !== appliedOverrideAt) {
      const meta = localWriteStamp('admin', 'admin_override');
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [ADMIN_OVERRIDE_APPLIED_KEY, cloudOverrideAt],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards);
      changed = true;
      appliedMeta = meta;
    } else if (
      cloudUpdatedAt !== null && (!localMeta || cloudUpdatedAt >= localMeta.updatedAtMs)
    ) {
      // Cloud wins only when it is newer than the local shard operation.
      const meta: ShardBalanceMeta = {
        updatedAtMs: cloudUpdatedAt ?? Date.now(),
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        if (!isCurrent()) return;
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (isLocalRestoreArtifact(localMeta) && cloudShards > local) {
      // Authoritative-cloud-wins (fix: пропажа осколков после restore/обновления).
      // `users/{uid}.shards` (канал A) — append-safe авторитет: каждый earn/spend идёт
      // через него с монотонной меткой. Второй, теневой канал — `progress.shards_balance`
      // из cloud_sync.ts — переносится БЕЗ метки и при restoreFromCloud слепо кладёт
      // СТАРОЕ число в локальный STORAGE_KEY ДО вызова loadShardsFromCloud, НЕ трогая
      // `shards_balance_meta_v1`. Локальная метка остаётся от прошлой операции и может
      // оказаться «новее» облачной → timestamp-guard выше не срабатывает, и заниженное
      // после-restore число закрепляется (660→498, 516→500, 540→501 — по shard_log).
      // Ключевой разделитель: настоящая свежая локальная трата помечена op:'spend'/'earn'
      // (её ронять нельзя — тест «older cloud over newer local spend»). Артефакт restore —
      // это op:'replace'/'admin' ЛИБО отсутствие метки. Только в этом случае, если
      // авторитетный облачный баланс СТРОГО БОЛЬШЕ, восстанавливаем его: терять
      // заработанные осколки при простом чтении из облака нельзя.
      const meta: ShardBalanceMeta = {
        updatedAtMs: Math.max(cloudUpdatedAt ?? 0, localMeta?.updatedAtMs ?? 0) + 1,
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        if (!isCurrent()) return;
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (
      cloudUpdatedAt === null && !localMeta && cloudShards > local
    ) {
      // Ни у облака, ни у локали нет метки, но облако выше — безопасно поднять локаль.
      const meta: ShardBalanceMeta = {
        updatedAtMs: Date.now(),
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        if (!isCurrent()) return;
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (
      localMeta
      && (cloudUpdatedAt === null || localMeta.updatedAtMs > cloudUpdatedAt)
      // Не проталкивать в облако локаль, которая НИЖЕ авторитетного облачного баланса,
      // когда локаль — артефакт restore (op:'replace'/'admin'). Именно эта ветка раньше
      // закрепляла просадку: restore обнулял локаль до старого теневого числа, метка
      // оставалась «свежей», и мы записывали заниженный баланс обратно в канал A.
      // Настоящую трату (op:'spend', local < cloud из-за отставшего облака) — пушим как прежде.
      && !(isLocalRestoreArtifact(localMeta) && local < cloudShards)
    ) {
      if (!isCurrent()) return;
      await syncShardsToCloud(local, localMeta);
    }
    if (changed) {
      if (!isCurrent()) return;
      const b = await getShardsBalance();
      if (!isCurrent()) return;
      await emitShardsBalanceUpdated(b, appliedMeta);
    }
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
