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
import { ENABLE_DEV_TOOLS } from '../config';
import { LEVEL_THRESHOLDS, levelForDays, nextThreshold } from './together_days';
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
  /** Я уже нажал «Позвать» для этого DEV-бота. Реальный callable не вызывается. */
  nudgedByMe: boolean;
  createdAtMs: number;
}

export interface DevBotsState {
  bots: DevBotFriend[];
  /** Порог сундука, который последним выставил сценарий (0 = не взводили руками). */
  chestScenarioTier: number;
  /** Открытый DEV-сундук. Не является наградой и никогда не уходит в Firestore. */
  chestOpenedTier: number;
}

const EMPTY_STATE: DevBotsState = { bots: [], chestScenarioTier: 0, chestOpenedTier: 0 };

let memory: DevBotsState | null = null;

function isDev(): boolean {
  // зачем: тот же production-safe гейт, что у UI. В локальном browser/QA-preview
  // Metro может подставить __DEV__=false, но ENABLE_DEV_TOOLS остаётся включён;
  // store-сборка всё равно жёстко выключает его через IS_STORE_RELEASE.
  return ENABLE_DEV_TOOLS;
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
      bots: Array.isArray(parsed?.bots) ? parsed!.bots.filter(isValidBot).map(normalizeBot) : [],
      chestScenarioTier: Number.isFinite(parsed?.chestScenarioTier) ? Math.max(0, Math.floor(Number(parsed!.chestScenarioTier))) : 0,
      chestOpenedTier: Number.isFinite(parsed?.chestOpenedTier) ? Math.max(0, Math.floor(Number(parsed!.chestOpenedTier))) : 0,
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

function normalizeBot(bot: DevBotFriend): DevBotFriend {
  return {
    ...bot,
    colorIdx: Math.max(0, Math.floor(Number(bot.colorIdx) || 0)) % 6,
    totalXp: Math.max(0, Math.floor(Number(bot.totalXp) || 0)),
    weeklyXp: Math.max(0, Math.floor(Number(bot.weeklyXp) || 0)),
    streak: Math.max(0, Math.floor(Number(bot.streak) || 0)),
    days: Math.max(0, Math.floor(Number(bot.days) || 0)),
    learnedToday: bot.learnedToday === true,
    giftReady: bot.giftReady === true,
    incomingNudge: bot.incomingNudge === true,
    nudgedByMe: bot.nudgedByMe === true,
    createdAtMs: Math.max(0, Math.floor(Number(bot.createdAtMs) || 0)),
  };
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

function createDevBot(index: number, taken: Set<string>, now: number): DevBotFriend {
  const seedDays = [0, LEVEL_THRESHOLDS[1] ?? 3, LEVEL_THRESHOLDS[2] ?? 10, LEVEL_THRESHOLDS[3] ?? 30];
  const name = randomBotName(taken);
  taken.add(name);
  return {
    uid: `${DEV_BOT_UID_PREFIX}${now}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    colorIdx: index % 6,
    totalXp: 500 + Math.floor(Math.random() * 4000),
    weeklyXp: Math.floor(Math.random() * 1800),
    streak: Math.floor(Math.random() * 40),
    days: seedDays[index % seedDays.length] ?? 0,
    learnedToday: false,
    giftReady: false,
    incomingNudge: false,
    nudgedByMe: false,
    createdAtMs: now,
  };
}

/** Добавляет N ботов с разным стартовым уровнем дружбы (0/3/10/30 дней — по одному на каждый порог). */
export async function addDevBots(count: number): Promise<DevBotsState> {
  const state = await loadDevBots();
  const taken = new Set(state.bots.map((b) => b.name));
  const now = Date.now();
  const next: DevBotFriend[] = [...state.bots];
  const safeCount = Math.max(0, Math.min(20, Math.floor(Number(count) || 0)));
  for (let i = 0; i < safeCount; i++) { // guard-ok: чисто локальный массив в памяти, ни одного вызова Firestore в этом модуле
    next.push(createDevBot(next.length, taken, now));
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
  const normalizedTier = Math.max(0, Math.min(FRIENDS_CHEST_TIERS.length, Math.floor(Number(tier) || 0)));
  if (normalizedTier === 0) {
    const nextState: DevBotsState = {
      bots: state.bots.map((bot) => ({ ...bot, weeklyXp: 0 })),
      chestScenarioTier: 0,
      chestOpenedTier: 0,
    };
    await persist(nextState);
    return nextState;
  }

  const goal = FRIENDS_CHEST_TIERS[normalizedTier - 1] ?? 0;
  const requiredBots = Math.ceil(goal / FRIENDS_CHEST_CAP_PER_FRIEND);
  const taken = new Set(state.bots.map((bot) => bot.name));
  const bots = [...state.bots];
  const now = Date.now();
  while (bots.length < requiredBots) { // guard-ok: максимум 10 локальных DEV-ботов для порога III
    bots.push(createDevBot(bots.length, taken, now));
  }

  let remaining = goal;
  const eligibleDays = LEVEL_THRESHOLDS[1] ?? 3;
  const scenarioBots = bots.map((bot, index) => {
    if (index >= requiredBots) return { ...bot, weeklyXp: 0 };
    const weeklyXp = Math.min(FRIENDS_CHEST_CAP_PER_FRIEND, remaining);
    remaining -= weeklyXp;
    return { ...bot, days: Math.max(bot.days, eligibleDays), weeklyXp };
  });
  const nextState: DevBotsState = {
    bots: scenarioBots,
    chestScenarioTier: normalizedTier,
    chestOpenedTier: state.chestOpenedTier,
  };
  await persist(nextState);
  return nextState;
}

/**
 * Открывает локальную витрину один раз. Здесь намеренно нет claimWeeklyChest,
 * economy receipt или записи в Firestore: DEV-сценарий проверяет UI, а не выдаёт награду.
 */
export async function openDevChestScenario(): Promise<{ opened: boolean; state: DevBotsState }> {
  const state = await loadDevBots();
  if (state.chestScenarioTier <= 0 || state.chestOpenedTier > 0) {
    return { opened: false, state };
  }
  const nextState: DevBotsState = { ...state, chestOpenedTier: state.chestScenarioTier };
  await persist(nextState);
  return { opened: true, state: nextState };
}

/** Явно разрешает повторную проверку текущего DEV-сундука, не меняя прогресс. */
export async function resetDevChestScenario(): Promise<DevBotsState> {
  const state = await loadDevBots();
  const nextState: DevBotsState = { ...state, chestOpenedTier: 0 };
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

export async function nudgeDevBot(uid: string): Promise<DevBotsState> {
  const state = await loadDevBots();
  const bots = state.bots.map((bot) => bot.uid === uid ? { ...bot, nudgedByMe: true } : bot);
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

export interface DevBotFriendProfile {
  uid: string;
  name: string;
  totalXp: number;
  weeklyXp: number;
  streak: number;
  isPremium: false;
  isVip: false;
  isLifetime: false;
  avatar: string;
  frame: string;
  aura: undefined;
}

export function devBotToFriendProfile(bot: DevBotFriend, avatar: string, frame: string): DevBotFriendProfile {
  return {
    uid: bot.uid,
    name: bot.name,
    totalXp: bot.totalXp,
    weeklyXp: bot.weeklyXp,
    streak: bot.streak,
    isPremium: false,
    isVip: false,
    isLifetime: false,
    avatar,
    frame,
    aura: undefined,
  };
}

export interface DevBotTogetherMetrics {
  level: number;
  progressPercent: number;
  learnedToday: boolean;
  nudged: boolean;
  incomingNudge: boolean;
  giftReady: boolean;
}

export function devBotTogetherMetrics(bot: DevBotFriend): DevBotTogetherMetrics {
  const level = levelForDays(bot.days);
  const next = nextThreshold(level);
  const previous = level <= 1 ? 0 : (nextThreshold(level - 1) ?? 0);
  const progressPercent = next === null
    ? 100
    : Math.max(0, Math.min(100, Math.round(((bot.days - previous) / Math.max(1, next - previous)) * 100)));
  return {
    level,
    progressPercent,
    learnedToday: bot.learnedToday,
    nudged: bot.nudgedByMe,
    incomingNudge: bot.incomingNudge,
    giftReady: bot.giftReady,
  };
}
