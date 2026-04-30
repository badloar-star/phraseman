// ════════════════════════════════════════════════════════════════════════════
// user_stats.ts — Счётчики поведения пользователя (хранятся в AsyncStorage,
// синхронизируются в Firestore через cloud_sync → видны в админке)
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncToCloud } from './cloud_sync';

const KEY = 'user_stats_v1';

interface UserStats {
  lessonsStarted: number;
  lessonsAbandoned: number;
  answersTotal: number;
  answersCorrect: number;
  energyHits: number;
  featuresOpened: Record<string, number>;
  quizLevels: { easy: number; medium: number; hard: number };
  /** Визиты экрана «Магазин осколков» (каждый фокус). */
  shardsShopOpens: number;
  /** Нажатия «Купить» у пакетов осколков за деньги (ключ — id пакета: starter, popular, …). */
  shardPackClicks: Record<string, number>;
  shardPackPurchases: Record<string, number>;
  /** Наборы карточек за осколки: клики по CTA и успешные покупки (ключ — id набора). */
  cardPackClicks: Record<string, number>;
  cardPackPurchases: Record<string, number>;
}

const DEFAULT: UserStats = {
  lessonsStarted: 0,
  lessonsAbandoned: 0,
  answersTotal: 0,
  answersCorrect: 0,
  energyHits: 0,
  featuresOpened: {},
  quizLevels: { easy: 0, medium: 0, hard: 0 },
  shardsShopOpens: 0,
  shardPackClicks: {},
  shardPackPurchases: {},
  cardPackClicks: {},
  cardPackPurchases: {},
};

function normalizeStats(parsed: Partial<UserStats> & Record<string, unknown>): UserStats {
  return {
    ...DEFAULT,
    ...parsed,
    featuresOpened: { ...DEFAULT.featuresOpened, ...(parsed.featuresOpened as Record<string, number> | undefined) },
    quizLevels: { ...DEFAULT.quizLevels, ...(parsed.quizLevels as UserStats['quizLevels'] | undefined) },
    shardPackClicks: { ...(parsed.shardPackClicks as Record<string, number> | undefined) },
    shardPackPurchases: { ...(parsed.shardPackPurchases as Record<string, number> | undefined) },
    cardPackClicks: { ...(parsed.cardPackClicks as Record<string, number> | undefined) },
    cardPackPurchases: { ...(parsed.cardPackPurchases as Record<string, number> | undefined) },
  };
}

async function load(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? normalizeStats(JSON.parse(raw)) : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

async function save(stats: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(stats));
  } catch {}
}

export async function trackLessonStart(): Promise<void> {
  const s = await load();
  s.lessonsStarted += 1;
  await save(s);
}

export async function trackLessonAbandoned(): Promise<void> {
  const s = await load();
  s.lessonsAbandoned += 1;
  await save(s);
}

export async function trackAnswer(isCorrect: boolean): Promise<void> {
  const s = await load();
  s.answersTotal += 1;
  if (isCorrect) s.answersCorrect += 1;
  await save(s);
}

export async function trackEnergyHit(): Promise<void> {
  const s = await load();
  s.energyHits += 1;
  await save(s);
}

export async function trackFeatureOpened(feature: string): Promise<void> {
  const s = await load();
  s.featuresOpened[feature] = (s.featuresOpened[feature] || 0) + 1;
  await save(s);
}

export async function trackQuizLevel(level: 'easy' | 'medium' | 'hard'): Promise<void> {
  const s = await load();
  s.quizLevels[level] += 1;
  await save(s);
}

function bumpKey(rec: Record<string, number>, id: string): void {
  rec[id] = (rec[id] || 0) + 1;
}

async function saveCommerce(s: UserStats): Promise<void> {
  await save(s);
  syncToCloud().catch(() => {});
}

export async function trackShardsShopOpen(): Promise<void> {
  const s = await load();
  s.shardsShopOpens += 1;
  await saveCommerce(s);
}

export async function trackShardPackClick(packId: string): Promise<void> {
  const s = await load();
  bumpKey(s.shardPackClicks, packId);
  await saveCommerce(s);
}

export async function trackShardPackPurchase(packId: string): Promise<void> {
  const s = await load();
  bumpKey(s.shardPackPurchases, packId);
  await saveCommerce(s);
}

export async function trackCardPackClick(packId: string): Promise<void> {
  const s = await load();
  bumpKey(s.cardPackClicks, packId);
  await saveCommerce(s);
}

export async function trackCardPackPurchase(packId: string): Promise<void> {
  const s = await load();
  bumpKey(s.cardPackPurchases, packId);
  await saveCommerce(s);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
