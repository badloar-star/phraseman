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

export type ShardSpendReason =
  | 'buy_energy'     // −N осколков, N = число слотов энергии (max 5–10)
  | 'streak_freeze'  // -X Заморозка стрика
  | 'wager_bet'      // -X Ставка в турнире
  | 'card_pack'      // -X Набор карточек за осколки
  | 'arena_plays_refill' // -5 Восстановление дневных слотов рейтинг-матчей арены
  | 'league_boost'; // -X Персональный буст лиги

export type ShardSource =
  | 'lesson_first'          // +1 Первое прохождение урока
  | 'lesson_perfect'        // +2 Идеальный урок (0 ошибок)
  | 'lesson_quiz_passed'    // +1 Зачёт в уроке
  | 'lesson_completed'      // +1 Урок полностью завершён
  | 'streak_7'              // +3 Каждые 7 дней стрика
  | 'streak_30'             // +5 Каждые 30 дней стрика
  | 'arena_win'             // +1 Победа в Арене
  | 'arena_10_wins'         // +1 Каждые 10 побед в Арене
  | 'arena_rank_up_streak'  // +1 Повышение ранга при серии 3+ побед (только новый пик)
  | 'daily_tasks_all'       // +1 Все 3 дневных задачи
  | 'topic_completed'       // +3 Все уроки темы (разово)
  | 'league_1st'            // +3 1-е место в лиге
  | 'league_2nd'            // +2 2-е место в лиге
  | 'league_3rd'            // +1 3-е место в лиге
  | 'exam_excellent'        // +3 Экзамен 90%+ (единоразово)
  | 'diagnostic_test'       // +1 Диагностический тест (единоразово)
  | 'lessons_5_perfect'     // +3 5 уроков подряд без ошибок
  | 'level_gift'            // +1 из подарка за уровень (×3 = +3)
  | 'preposition_drill_perfect' // +1 Идеальный проход тренажёра предлогов (разово на урок)
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
  league_1st: 3,
  league_2nd: 2,
  league_3rd: 1,
  exam_excellent: 3,
  diagnostic_test: 1,
  lessons_5_perfect: 3,
  level_gift: 1,
  preposition_drill_perfect: 1,
  bug_report: 1,
};

const STORAGE_KEY = 'shards_balance';
const ONE_TIME_KEY = 'shards_one_time_events';
const ARENA_WINS_KEY = 'shards_arena_wins_total';
const ADMIN_OVERRIDE_APPLIED_KEY = 'shards_admin_override_applied_at';

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
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    return;
  }
  setShardsBalanceMemory(n);
  emitAppEvent('shards_balance_updated', { balance: n });
};

// ── Лог транзакций в Firestore ────────────────────────────────────────────
const logShardTransaction = async (
  type: 'earn' | 'spend',
  amount: number,
  reason: string,
  balanceAfter: number,
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
      balanceAfter,
      ts: new Date().toISOString(),
    });
  } catch {}
};

export type AddShardOpts = { suppressEarnEvent?: boolean };

// ── Добавить осколки ───────────────────────────────────────────────────────
export const addShards = async (source: ShardSource, opts?: AddShardOpts): Promise<number> => {
  try {
    const amount = SHARD_REWARDS[source];
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const newBalance = await withStorageLock(async () => {
      const current = await getShardsBalance();
      const next = current + amount;
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    setShardsBalanceMemory(newBalance);
    await syncShardsToCloud(newBalance);
    logShardTransaction('earn', amount, source, newBalance);
    emitAppEvent('shards_balance_updated', { balance: newBalance });
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

/**
 * +1 осколок за выполнение всех 3 ежедневных заданий за день.
 * При включённом облаке: одна Firestore-транзакция (маркер + баланс) — без дублей между устройствами.
 * Иначе: локальный ключ AsyncStorage + addShards (как раньше).
 */
export const claimDailyTasksAllShardsReward = async (dayKey: string): Promise<boolean> => {
  const rewardKey = `daily_tasks_all_shards_${dayKey}`;
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

      transaction.set(userRef, { shards: next }, { merge: true });
      return next;
    });

    if (newBalance === null || newBalance === undefined) {
      return false;
    }

    await withStorageLock(async () => {
      if (await AsyncStorage.getItem(rewardKey)) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(newBalance)],
        [rewardKey, '1'],
      ]);
    });

    setShardsBalanceMemory(newBalance);
    logShardTransaction('earn', amount, 'daily_tasks_all', newBalance);
    emitAppEvent('shards_balance_updated', { balance: newBalance });
    emitAppEvent('shards_earned', { amount, reasonKey: 'daily_tasks_all' });
    return true;
  } catch (error) {
    DebugLogger.error('shards_system.ts:claimDailyTasksAllShardsReward', error, 'warning');
    return false;
  }
};

export type AddShardsRawOptions = {
  /**
   * Показать глобальную анимацию/модалку shards_earned.
   * По умолчанию false — витрина, рефанды и т.п. без всплывашки.
   */
  showEarnModal?: boolean;
  /** Подпись в shard_earn_ui, если showEarnModal */
  earnModalKey?: string;
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
    const newBalance = await withStorageLock(async () => {
      const current = await getShardsBalance();
      const next = current + amount;
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    setShardsBalanceMemory(newBalance);
    await syncShardsToCloud(newBalance);
    logShardTransaction('earn', amount, logReason, newBalance);
    emitAppEvent('shards_balance_updated', { balance: newBalance });
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

// ── Потратить осколки (возвращает true если успешно) ──────────────────────
export const spendShards = async (amount: number, reason: ShardSpendReason = 'buy_energy'): Promise<boolean> => {
  try {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const newBalance = await withStorageLock(async () => {
      const current = await getShardsBalance();
      if (current < amount) return -1;
      const next = current - amount;
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    if (newBalance < 0) return false;
    setShardsBalanceMemory(newBalance);
    await syncShardsToCloud(newBalance);
    logShardTransaction('spend', amount, reason, newBalance);
    emitAppEvent('shards_balance_updated', { balance: newBalance });
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

export const awardOneTime = async (source: 'exam_excellent' | 'diagnostic_test'): Promise<number> => {
  const amount = SHARD_REWARDS[source];
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  try {
    const result = await withStorageLock(async () => {
      const events = await getOneTimeEvents();
      if (events.has(source)) return { awarded: 0, balance: null as number | null };
      const current = await getShardsBalance();
      const next = current + amount;
      events.add(source);
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(next)],
        [ONE_TIME_KEY, JSON.stringify([...events])],
      ]);
      return { awarded: amount, balance: next };
    });
    if (result.awarded > 0 && result.balance !== null) {
      setShardsBalanceMemory(result.balance);
      await syncShardsToCloud(result.balance);
      logShardTransaction('earn', amount, source, result.balance);
      emitAppEvent('shards_balance_updated', { balance: result.balance });
      emitAppEvent('shards_earned', { amount, reasonKey: source });
    }
    return result.awarded;
  } catch {
    return 0;
  }
};

// ── Арена: каждые 10 побед (модалку показывает arena_results одним событием) ─
export const onArenaWin = async (): Promise<{ shards: number; milestoneBonus: number }> => {
  const winShards = await addShards('arena_win', { suppressEarnEvent: true });
  try {
    const raw = await AsyncStorage.getItem(ARENA_WINS_KEY);
    const wins = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(ARENA_WINS_KEY, String(wins));
    if (wins % 10 === 0) {
      const bonus = await addShards('arena_10_wins', { suppressEarnEvent: true });
      return { shards: winShards, milestoneBonus: bonus };
    }
  } catch {}
  return { shards: winShards, milestoneBonus: 0 };
};

// ── Стрик: кратность 7 / 30 (модалку шлёт home после этого) ───────────────
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
const syncShardsToCloud = async (balance: number): Promise<void> => {
  try {
    const safeBalance = parseShardBalance(balance);
    if (safeBalance === null) return;
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    const db = firestore();
    await db.collection('users').doc(uid).set({ shards: safeBalance }, { merge: true });
  } catch {}
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
    const cloudOverrideAt: string | null = data.shards_admin_override_at ?? null;
    const local = await getShardsBalance();
    const appliedOverrideAt = await AsyncStorage.getItem(ADMIN_OVERRIDE_APPLIED_KEY);
    let changed = false;
    // Admin override has priority: force local balance to cloud value once per override marker.
    if (cloudOverrideAt && cloudOverrideAt !== appliedOverrideAt) {
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [ADMIN_OVERRIDE_APPLIED_KEY, cloudOverrideAt],
      ]);
      setShardsBalanceMemory(cloudShards);
      changed = true;
    } else if (cloudShards > local) {
      // Берём максимум — защита от потери осколков; серверные +награды (дуэль, возврат ставки)
      await AsyncStorage.setItem(STORAGE_KEY, String(cloudShards));
      setShardsBalanceMemory(cloudShards);
      changed = true;
    }
    if (changed) {
      const b = await getShardsBalance();
      emitAppEvent('shards_balance_updated', { balance: b });
    }
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
