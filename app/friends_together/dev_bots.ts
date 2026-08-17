/**
 * «Вместе» — DEV-боты для сквозной ручной проверки всей фичи без реальных друзей
 * и без единого чтения/записи в Firestore.
 *
 * зачем: владелец попросил кнопку в __DEV__, которая позволяет проверить все
 * сценарии «Вместе» (рост дружбы, сундук на каждом пороге, входящий зов, готовый
 * подарок) руками, за секунды, не гоняя два реальных аккаунта. Полностью
 * изолировано от прод-пути: боты живут только в AsyncStorage под своим ключом,
 * не пишутся в friend_pairs/friends, не проходят через friendsGetProfiles —
 * это чистая витрина UI, а не тест реальных callables (те уже покрыты
 * functions/src/friends_together.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOT_NAMES } from '../constants/bot_names';
import { LEVEL_THRESHOLDS, levelForDays } from './together_days';
import { FRIENDS_CHEST_TIERS, FRIENDS_CHEST_CAP_PER_FRIEND } from './together_config';

const STORAGE_KEY = 'friends_together_dev_bots_v1';
const DEV_BOT_UID_PREFIX = 'devbot_';

export interface DevBotFriend {
  uid: string;
  name: string;
  /** Индекс палитры аватара (0..5) — только для отличимого цвета в списке. */
  colorIdx: number;
  totalXp: number;
  weeklyXp: number;
  streak: number;
  /** «Дней вместе» — та же величина, что сервер считает через daysTogether. */
  days: number;
  /** Уровень дружбы, который бот уже подтверждает сегодня (todayCommon). */
  learnedToday: boolean;
  /** Готовый подарок от бота ждёт в инбоксе (сценарий «подарок готов»). */
  giftReady: boolean;
  /** Бот только что позвал меня (сценарий «входящий зов»). */
  incomingNudge: boolean;
  createdAtMs: number;
}

export interface DevBotsState {
  bots: DevBotFriend[];
  /** Порог сундука, который последним выставил сценарий (0 = не взводили руками). */
  chestScenarioTier: number;
}

const EMPTY_STATE: DevBotsState = { bots: [], chestScenarioTier: 0 };

let memory: DevBotsState | null = null;

function isDev(): boolean {
  // зачем: двойной гейт — модуль физически не должен ничего делать в проде,
  // даже если по ошибке импортирован (defense in depth поверх __DEV__ в UI).
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

async function persist(state: DevBotsState): Promise<void> {
  memory = state;
  if (!isDev()) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* dev-only best-effort */ }
}

export async function loadDevBots(): Promise<DevBotsState> {
  if (!isDev()) return EMPTY_STATE;
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DevBotsState>) : null;
    memory = {
      bots: Array.isArray(parsed?.bots) ? parsed!.bots.filter(isValidBot) : [],
      chestScenarioTier: Number.isFinite(parsed?.chestScenarioTier) ? Math.max(0, Math.floor(Number(parsed!.chestScenarioTier))) : 0,
    };
  } catch {
    memory = { ...EMPTY_STATE };
  }
  return memory;
}

function isValidBot(v: unknown): v is DevBotFriend {
  const b = v as Partial<DevBotFriend>;
  return !!b && typeof b.uid === 'string' && b.uid.startsWith(DEV_BOT_UID_PREFIX) && typeof b.name === 'string';
}

/** Синхронный геттер для рендера — actions ниже всегда идут через load→mutate→persist. */
export function getDevBotsSnapshot(): DevBotsState {
  return memory ?? EMPTY_STATE;
}

function randomBotName(taken: Set<string>): string {
  const pool = BOT_NAMES.length > 0 ? BOT_NAMES : ['Bot'];
  for (let i = 0; i < 20; i++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)] ?? 'Bot';
    if (!taken.has(candidate)) return candidate;
  }
  return `${pool[0] ?? 'Bot'} ${taken.size + 1}`;
}

/** Добавляет N ботов с разным стартовым уровнем дружбы (0/3/10/30 дней — по одному на каждый порог). */
export async function addDevBots(count: number): Promise<DevBotsState> {
  const state = await loadDevBots();
  const taken = new Set(state.bots.map((b) => b.name));
  const seedDays = [0, LEVEL_THRESHOLDS[1] ?? 3, LEVEL_THRESHOLDS[2] ?? 10, LEVEL_THRESHOLDS[3] ?? 30];
  const now = Date.now();
  const next: DevBotFriend[] = [...state.bots];
  for (let i = 0; i < count; i++) { // guard-ok: чисто локальный массив в памяти, ни одного вызова Firestore в этом модуле
    const name = randomBotName(taken);
    taken.add(name);
    const days = seedDays[next.length % seedDays.length] ?? 0;
    next.push({
      uid: `${DEV_BOT_UID_PREFIX}${now}_${next.length}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      colorIdx: next.length % 6,
      totalXp: 500 + Math.floor(Math.random() * 4000),
      weeklyXp: Math.floor(Math.random() * 1800),
      streak: Math.floor(Math.random() * 40),
      days,
      learnedToday: false,
      giftReady: false,
      incomingNudge: false,
      createdAtMs: now,
    });
  }
  const nextState: DevBotsState = { ...state, bots: next };
  await persist(nextState);
  return nextState;
}

/** Бот «проходит урок» сегодня: +1 день вместе, +weeklyXp, todayCommon включается. */
export async function advanceBotDay(uid: string, days = 1): Promise<DevBotsState> {
  const state = await loadDevBots();
  const bots = state.bots.map((b) => b.uid === uid
    ? { ...b, days: b.days + days, learnedToday: true, weeklyXp: b.weeklyXp + 120 * days, totalXp: b.totalXp + 120 * days }
    : b);
  const nextState = { ...state, bots };
  await persist(nextState);
  return nextState;
}

/** Все боты сразу «проходят урок» сегодня — один вызов вместо цикла из UI. */
export async function advanceAllBots(days = 1): Promise<DevBotsState> {
  const state = await loadDevBots();
  const bots = state.bots.map((b) => ({
    ...b,
    days: b.days + days,
    learnedToday: true,
    weeklyXp: b.weeklyXp + 120 * days,
    totalXp: b.totalXp + 120 * days,
  }));
  const nextState = { ...state, bots };
  await persist(nextState);
  return nextState;
}

/** Прыгает боту на конкретный уровень дружбы (для проверки конкретного порога). */
export async function setBotLevel(uid: string, level: number): Promise<DevBotsState> {
  const state = await loadDevBots();
  const threshold = LEVEL_THRESHOLDS[Math.max(0, Math.min(LEVEL_THRESHOLDS.length - 1, level - 1))] ?? 0;
  const bots = state.bots.map((b) => b.uid === uid ? { ...b, days: threshold } : b);
  const nextState = { ...state, bots };
  await persist(nextState);
  return nextState;
}

/** Взводит сундук недели: догоняет weeklyXp ботов до суммы, нужной для порога tier (1..3). */
export async function setChestScenario(tier: number): Promise<DevBotsState> {
  const state = await loadDevBots();
  const goal = FRIENDS_CHEST_TIERS[Math.max(0, Math.min(FRIENDS_CHEST_TIERS.length - 1, tier - 1))] ?? 0;
  const eligible = state.bots.filter((b) => levelForDays(b.days) >= 2);
  const pool = eligible.length > 0 ? eligible : state.bots;
  if (pool.length === 0) {
    await persist({ ...state, chestScenarioTier: tier });
    return state;
  }
  const perBot = Math.min(FRIENDS_CHEST_CAP_PER_FRIEND, Math.ceil(goal / pool.length) + 50);
  const poolUids = new Set(pool.map((b) => b.uid));
  const bots = state.bots.map((b) => poolUids.has(b.uid) ? { ...b, weeklyXp: perBot } : b);
  const nextState: DevBotsState = { bots, chestScenarioTier: tier };
  await persist(nextState);
  return nextState;
}

export async function simulateIncomingNudge(uid: string): Promise<DevBotsState> {
  const state = await loadDevBots();
  const bots = state.bots.map((b) => b.uid === uid ? { ...b, incomingNudge: true, learnedToday: false } : b);
  const nextState = { ...state, bots };
  await persist(nextState);
  return nextState;
}

export async function clearIncomingNudge(uid: string): Promise<DevBotsState> {
  const state = await loadDevBots();
  const bots = state.bots.map((b) => b.uid === uid ? { ...b, incomingNudge: false } : b);
  const nextState = { ...state, bots };
  await persist(nextState);
  return nextState;
}

export async function markGiftReady(uid: string): Promise<DevBotsState> {
  const state = await loadDevBots();
  const bots = state.bots.map((b) => b.uid === uid ? { ...b, giftReady: true } : b);
  const nextState = { ...state, bots };
  await persist(nextState);
  return nextState;
}

export async function resetDevBots(): Promise<DevBotsState> {
  await persist({ ...EMPTY_STATE });
  return EMPTY_STATE;
}

export function isDevBotUid(uid: string): boolean {
  return uid.startsWith(DEV_BOT_UID_PREFIX);
}
