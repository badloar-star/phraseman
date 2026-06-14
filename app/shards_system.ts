// ════════════════════════════════════════════════════════════════════════════
// shards_system.ts — Валюта "Осколки знаний" 💎
// Хранение: AsyncStorage 'shards_balance' + Firestore /users/{uid}/shards
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';
import { getCanonicalUserId } from './user_id_policy';
import { emitAppEvent } from './events';
import { bumpLifetimeShardsEarned, bumpLifetimeShardsSpent } from './lifetime_profile_stats';

export type ShardSpendReason =
  | 'buy_energy'     // −N осколков, N = число слотов энергии (max 5–10)
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
  | 'bug_report';           // +1 Отправил репорт об ошибке

export const SHARD_REWARDS: Record<ShardSource, number> = {
  lesson_first: 1,
  lesson_perfect: 2,
  lesson_quiz_passed: 1,
  lesson_completed: 1,
  streak_7: 3,
  streak_30: 5,
  arena_win: 1,
  arena_10_wins: 1,
  arena_rank_up_streak: 1,
  daily_tasks_all: 1,
  topic_completed: 3,
  exam_excellent: 3,
  diagnostic_test: 1,
  lessons_5_perfect: 3,
  level_gift: 1,
  preposition_drill_perfect: 1,
  plan_day_complete: 2,
  trainer_perfect_session: 1,
  bug_report: 1,
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

export const getShardAchievementEligibleBalance = async (balance?: number): Promise<number> => {
  const total = balance === undefined ? await getShardsBalance() : Math.max(0, Math.floor(Number(balance) || 0));
  const purchased = await readStorePurchasedShardsTotal();
  return Math.max(0, total - purchased);
};

const emitShardsBalanceUpdated = async (balance: number, meta?: ShardBalanceMeta | null): Promise<void> => {
  const safeBalance = Math.max(0, Math.floor(Number(balance) || 0));
  emitAppEvent('shards_balance_updated', {
    balance: safeBalance,
    ...(meta ? { op: meta.op, reason: meta.reason } : {}),
    eligibleAchievementBalance: await getShardAchievementEligibleBalance(safeBalance),
  });
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
export const replaceShardsBalanceLocal = async (next: number): Promise<void> => {
  const n = Math.max(0, Math.floor(Number(next)));
  if (!Number.isFinite(n)) return;
  const meta = localWriteStamp('replace', 'server_replace');
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEY, String(n)],
      [BALANCE_META_KEY, JSON.stringify(meta)],
    ]);
  } catch {
    return;
  }
  setShardsBalanceMemory(n);
  await emitShardsBalanceUpdated(n, meta);
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

const applyShardDeltaToCloud = async (
  delta: number,
  type: 'earn' | 'spend',
  reason: string,
  localFallbackBase: number,
): Promise<{ ok: true; balance: number; balanceBefore: number; updatedAtMs: number } | { ok: false; reason: 'unavailable' | 'insufficient' }> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'unavailable' };
    const uid = await getCanonicalUserId();
    if (!uid) return { ok: false, reason: 'unavailable' };
    const db = firestore();
    const userRef = db.collection('users').doc(uid);
    const updatedAtMs = Date.now();
    const nextBalance = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);
      const cloudShards = snap.exists ? parseShardBalance(snap.data()?.shards) : null;
      const base = cloudShards ?? Math.max(0, Math.floor(localFallbackBase));
      const next = base + delta;
      if (next < 0) return null as number | null;
      transaction.set(userRef, {
        shards: next,
        shards_updated_at_ms: updatedAtMs,
        shards_updated_op: type,
        shards_updated_reason: reason,
      }, { merge: true });
      return next;
    });
    if (nextBalance === null || nextBalance === undefined) {
      return { ok: false, reason: 'insufficient' };
    }
    const balanceBefore = nextBalance - delta;
    return { ok: true, balance: nextBalance, balanceBefore, updatedAtMs };
  } catch {
    return { ok: false, reason: 'unavailable' };
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

// ── Добавить осколки ───────────────────────────────────────────────────────
export const addShards = async (source: ShardSource, opts?: AddShardOpts): Promise<number> => {
  try {
    const amount = SHARD_REWARDS[source];
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const localBase = await getShardsBalance();
    const cloudApplied = await applyShardDeltaToCloud(amount, 'earn', source, localBase);
    if (cloudApplied.ok) {
      const meta: ShardBalanceMeta = { updatedAtMs: cloudApplied.updatedAtMs, op: 'earn', reason: source };
      await persistLocalBalance(cloudApplied.balance, meta);
      setShardsBalanceMemory(cloudApplied.balance);
      void bumpLifetimeShardsEarned(amount);
      logShardTransaction('earn', amount, source, cloudApplied.balance, cloudApplied.balanceBefore);
      await emitShardsBalanceUpdated(cloudApplied.balance, meta);
      if (!opts?.suppressEarnEvent) {
        emitAppEvent('shards_earned', { amount, reasonKey: source });
      }
      return amount;
    }

    const meta = localWriteStamp('earn', source);
    const newBalance = await withStorageLock(async () => {
      const current = await getShardsBalance();
      const next = current + amount;
      await persistLocalBalance(next, meta);
      return next;
    });
    setShardsBalanceMemory(newBalance);
    void bumpLifetimeShardsEarned(amount);
    await syncShardsToCloud(newBalance, meta);
    logShardTransaction('earn', amount, source, newBalance, newBalance - amount);
    await emitShardsBalanceUpdated(newBalance, meta);
    if (!opts?.suppressEarnEvent) {
      emitAppEvent('shards_earned', { amount, reasonKey: source });
    }
    return amount;
  } catch (error) {
    DebugLogger.error('shards_system.ts:addShards', error, 'warning');
    return 0;
  }
};

const REWARD_CLAIMS_COLLECTION = 'reward_claims';

/** Ключ AsyncStorage / маркер: награда «все дневные» за календарный день уже забрана. */
export const dailyTasksAllShardsRewardStorageKey = (dayKey: string) => `daily_tasks_all_shards_${dayKey}`;

export const isDailyTasksAllShardsRewardClaimedForDay = async (dayKey: string): Promise<boolean> => {
  try {
    const v = await AsyncStorage.getItem(dailyTasksAllShardsRewardStorageKey(dayKey));
    return v === '1';
  } catch {
    return false;
  }
};

/**
 * +1 осколок за выполнение всех 3 ежедневных заданий за день (ручной «Забрать» на экране заданий).
 * При включённом облаке: одна Firestore-транзакция (маркер + баланс) — без дублей между устройствами.
 * Иначе: локальный ключ AsyncStorage + addShards (как раньше).
 */
export const claimDailyTasksAllShardsReward = async (dayKey: string): Promise<boolean> => {
  const rewardKey = dailyTasksAllShardsRewardStorageKey(dayKey);
  const amount = SHARD_REWARDS.daily_tasks_all;
  if (!Number.isFinite(amount) || amount <= 0) return false;

  try {
    const existing = await AsyncStorage.getItem(rewardKey);
    if (existing) return false;

    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
      const n = await addShards('daily_tasks_all');
      if (n <= 0) return false;
      await AsyncStorage.setItem(rewardKey, '1');
      return true;
    }

    const uid = await getCanonicalUserId();
    if (!uid) {
      const n = await addShards('daily_tasks_all');
      if (n <= 0) return false;
      await AsyncStorage.setItem(rewardKey, '1');
      return true;
    }

    const localBalance = await getShardsBalance();
    const db = firestore();

    const updatedAtMs = Date.now();
    const newBalance = await db.runTransaction(async (transaction) => {
      const claimRef = db
        .collection('users')
        .doc(uid)
        .collection(REWARD_CLAIMS_COLLECTION)
        .doc(`daily_tasks_all_${dayKey}`);
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.exists) {
        return null as number | null;
      }

      const userRef = db.collection('users').doc(uid);
      const userSnap = await transaction.get(userRef);
      const cloudShards = userSnap.exists ? parseShardBalance(userSnap.data()?.shards) : null;
      const cloudVal = cloudShards ?? 0;
      const base = Math.max(localBalance, cloudVal);
      const next = base + amount;

      transaction.set(claimRef, {
        source: 'daily_tasks_all',
        dayKey,
        amount,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(userRef, {
        shards: next,
        shards_updated_at_ms: updatedAtMs,
        shards_updated_op: 'earn',
        shards_updated_reason: 'daily_tasks_all',
      }, { merge: true });
      return next;
    });

    if (newBalance === null || newBalance === undefined) {
      return false;
    }

    // После успешной Firestore-транзакции обязаны записать локально: ранний return внутри lock
    // (если ключ уже есть) оставлял облако с новым балансом, а модалка всё равно шла по emit ниже.
    await withStorageLock(async () => {
      const meta: ShardBalanceMeta = { updatedAtMs, op: 'earn', reason: 'daily_tasks_all' };
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(newBalance)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [rewardKey, '1'],
      ]);
    });

    setShardsBalanceMemory(newBalance);
    void bumpLifetimeShardsEarned(amount);
    logShardTransaction('earn', amount, 'daily_tasks_all', newBalance, newBalance - amount);
    await emitShardsBalanceUpdated(newBalance, { updatedAtMs, op: 'earn', reason: 'daily_tasks_all' });
    emitAppEvent('shards_earned', { amount, reasonKey: 'daily_tasks_all' });
    return true;
  } catch (error) {
    DebugLogger.error('shards_system.ts:claimDailyTasksAllShardsReward', error, 'warning');
    return false;
  }
};

export type SpendShardsOptions = {
  /**
   * Записать локально и сразу вернуть управление UI; синхронизация shards в Firestore — в фоне.
   * Нужно для покупки наборов без «Подождите…», если облако подвисает.
   */
  skipServerAwait?: boolean;
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
  try {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (options?.skipServerAwait) {
      const meta = localWriteStamp('earn', logReason);
      const newBalance = await withStorageLock(async () => {
        const current = await getShardsBalance();
        const next = current + amount;
        await persistLocalBalance(next, meta);
        return next;
      });
      setShardsBalanceMemory(newBalance);
      if (isStorePurchaseReason(logReason)) {
        await bumpStorePurchasedShardsTotal(amount);
      }
      void bumpLifetimeShardsEarned(amount);
      void syncShardsToCloud(newBalance, meta);
      void logShardTransaction('earn', amount, logReason, newBalance, newBalance - amount);
      await emitShardsBalanceUpdated(newBalance, meta);
      if (options.showEarnModal) {
        const k = options.earnModalKey ?? logReason ?? 'generic_raw';
        emitAppEvent('shards_earned', { amount, reasonKey: k });
      }
      return amount;
    }

    const localBase = await getShardsBalance();
    const cloudApplied = await applyShardDeltaToCloud(amount, 'earn', logReason, localBase);
    if (cloudApplied.ok) {
      const meta: ShardBalanceMeta = { updatedAtMs: cloudApplied.updatedAtMs, op: 'earn', reason: logReason };
      await persistLocalBalance(cloudApplied.balance, meta);
      setShardsBalanceMemory(cloudApplied.balance);
      if (isStorePurchaseReason(logReason)) {
        await bumpStorePurchasedShardsTotal(amount);
      }
      void bumpLifetimeShardsEarned(amount);
      logShardTransaction('earn', amount, logReason, cloudApplied.balance, cloudApplied.balanceBefore);
      await emitShardsBalanceUpdated(cloudApplied.balance, meta);
      if (options?.showEarnModal) {
        const k = options.earnModalKey ?? logReason ?? 'generic_raw';
        emitAppEvent('shards_earned', { amount, reasonKey: k });
      }
      return amount;
    }

    const meta = localWriteStamp('earn', logReason);
    const newBalance = await withStorageLock(async () => {
      const current = await getShardsBalance();
      const next = current + amount;
      await persistLocalBalance(next, meta);
      return next;
    });
    setShardsBalanceMemory(newBalance);
    if (isStorePurchaseReason(logReason)) {
      await bumpStorePurchasedShardsTotal(amount);
    }
    void bumpLifetimeShardsEarned(amount);
    const runServerWrites = (): void => {
      void syncShardsToCloud(newBalance, meta);
      void logShardTransaction('earn', amount, logReason, newBalance, newBalance - amount);
    };
    if (options?.skipServerAwait) {
      runServerWrites();
    } else {
      await syncShardsToCloud(newBalance, meta);
      logShardTransaction('earn', amount, logReason, newBalance, newBalance - amount);
    }
    await emitShardsBalanceUpdated(newBalance, meta);
    if (options?.showEarnModal) {
      const k = options.earnModalKey ?? logReason ?? 'generic_raw';
      emitAppEvent('shards_earned', { amount, reasonKey: k });
    }
    return amount;
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

// ── Потратить осколки (возвращает true если успешно) ──────────────────────
export const spendShards = async (
  amount: number,
  reason: ShardSpendReason = 'buy_energy',
  options?: SpendShardsOptions,
): Promise<boolean> => {
  try {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const spendAmount = Math.floor(amount);
    if (spendAmount <= 0) return false;
    const localBase = await getShardsBalance();
    const cloudApplied = await applyShardDeltaToCloud(-spendAmount, 'spend', reason, localBase);
    if (cloudApplied.ok) {
      const meta: ShardBalanceMeta = { updatedAtMs: cloudApplied.updatedAtMs, op: 'spend', reason };
      await persistLocalBalance(cloudApplied.balance, meta);
      setShardsBalanceMemory(cloudApplied.balance);
      await consumeStorePurchasedShardsOnSpend(spendAmount);
      void bumpLifetimeShardsSpent(spendAmount);
      logShardTransaction('spend', spendAmount, reason, cloudApplied.balance, cloudApplied.balanceBefore);
      await emitShardsBalanceUpdated(cloudApplied.balance, meta);
      trackShardsSpentAchievement(spendAmount);
      return true;
    }
    if (cloudApplied.reason === 'insufficient') return false;

    const meta = localWriteStamp('spend', reason);
    const newBalance = await withStorageLock(async () => {
      const current = await getShardsBalance();
      if (current < spendAmount) return -1;
      const next = current - spendAmount;
      await persistLocalBalance(next, meta);
      return next;
    });
    if (newBalance < 0) return false;
    setShardsBalanceMemory(newBalance);
    await consumeStorePurchasedShardsOnSpend(spendAmount);
    void bumpLifetimeShardsSpent(spendAmount);
    const runServerWrites = (): void => {
      void syncShardsToCloud(newBalance, meta);
      void logShardTransaction('spend', spendAmount, reason, newBalance, newBalance + spendAmount);
    };
    if (options?.skipServerAwait) {
      runServerWrites();
    } else {
      await syncShardsToCloud(newBalance, meta);
      logShardTransaction('spend', spendAmount, reason, newBalance, newBalance + spendAmount);
    }
    await emitShardsBalanceUpdated(newBalance, meta);
    trackShardsSpentAchievement(spendAmount);
    return true;
  } catch {
    return false;
  }
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
          const next = base + amount;

          transaction.set(claimRef, {
            source,
            amount,
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

        await withStorageLock(async () => {
          const events = await getOneTimeEvents();
          events.add(source);
          const meta: ShardBalanceMeta = { updatedAtMs, op: 'earn', reason: source };
          await AsyncStorage.multiSet([
            [STORAGE_KEY, String(newBalance)],
            [BALANCE_META_KEY, JSON.stringify(meta)],
            [ONE_TIME_KEY, JSON.stringify([...events])],
          ]);
        });

        setShardsBalanceMemory(newBalance);
        void bumpLifetimeShardsEarned(amount);
        logShardTransaction('earn', amount, source, newBalance, newBalance - amount);
        await emitShardsBalanceUpdated(newBalance, { updatedAtMs, op: 'earn', reason: source });
        emitAppEvent('shards_earned', { amount, reasonKey: source });
        return amount;
      }
    }

    const result = await withStorageLock(async () => {
      const events = await getOneTimeEvents();
      if (events.has(source)) return { awarded: 0, balance: null as number | null, meta: null as ShardBalanceMeta | null };
      const current = await getShardsBalance();
      const next = current + amount;
      events.add(source);
      const meta = localWriteStamp('earn', source);
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(next)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [ONE_TIME_KEY, JSON.stringify([...events])],
      ]);
      return { awarded: amount, balance: next, meta };
    });
    if (result.awarded > 0 && result.balance !== null && result.meta) {
      setShardsBalanceMemory(result.balance);
      void bumpLifetimeShardsEarned(amount);
      await syncShardsToCloud(result.balance, result.meta);
      logShardTransaction('earn', amount, source, result.balance, result.balance - amount);
      await emitShardsBalanceUpdated(result.balance, result.meta);
      emitAppEvent('shards_earned', { amount, reasonKey: source });
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
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);
      const cloudUpdatedAt = snap.exists ? parseUpdatedAtMs(snap.data()?.shards_updated_at_ms) : null;
      if (cloudUpdatedAt !== null && cloudUpdatedAt > effectiveMeta.updatedAtMs) return;
      transaction.set(userRef, {
        shards: safeBalance,
        shards_updated_at_ms: effectiveMeta.updatedAtMs,
        shards_updated_op: effectiveMeta.op,
        shards_updated_reason: effectiveMeta.reason,
      }, { merge: true });
    });
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
};

// ── Загрузить осколки из облака (при первом входе / смене устройства) ─────
export const loadShardsFromCloud = async (): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    const db = firestore();
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.data?.() ?? {};
    const cloudRaw = data.shards;
    const cloudShards = parseShardBalance(cloudRaw);
    if (cloudShards === null) return;
    const cloudUpdatedAt = parseUpdatedAtMs(data.shards_updated_at_ms);
    const cloudOverrideAt: string | null = data.shards_admin_override_at ?? null;
    const local = await getShardsBalance();
    const localMeta = await readBalanceMeta();
    const appliedOverrideAt = await AsyncStorage.getItem(ADMIN_OVERRIDE_APPLIED_KEY);
    let changed = false;
    let appliedMeta: ShardBalanceMeta | null = null;
    // Admin override has priority: force local balance to cloud value once per override marker.
    if (cloudOverrideAt && cloudOverrideAt !== appliedOverrideAt) {
      const meta = localWriteStamp('admin', 'admin_override');
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [ADMIN_OVERRIDE_APPLIED_KEY, cloudOverrideAt],
      ]);
      setShardsBalanceMemory(cloudShards);
      changed = true;
      appliedMeta = meta;
    } else if (
      (cloudUpdatedAt !== null && (!localMeta || cloudUpdatedAt >= localMeta.updatedAtMs))
      || (cloudUpdatedAt === null && !localMeta && cloudShards > local)
    ) {
      // Cloud wins only when it is newer than the local shard operation.
      const meta: ShardBalanceMeta = {
        updatedAtMs: cloudUpdatedAt ?? Date.now(),
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      setShardsBalanceMemory(cloudShards);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (localMeta && (cloudUpdatedAt === null || localMeta.updatedAtMs > cloudUpdatedAt)) {
      await syncShardsToCloud(local, localMeta);
    }
    if (changed) {
      const b = await getShardsBalance();
      await emitShardsBalanceUpdated(b, appliedMeta);
    }
  } catch (e) {
    if (__DEV__) console.warn('[shards_system]', e);
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
