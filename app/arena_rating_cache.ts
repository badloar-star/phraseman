/**
 * Кэш экрана «Арена / рейтинг» (AsyncStorage) + прогрев при старте приложения.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO } from './config';
import { ensureArenaAuthUid } from './user_id_policy';
import {
  RANK_LEVELS,
  RANK_TIERS,
  type ArenaProfile,
  type ArenaStats,
  type Rank,
  type RankLevel,
  type RankTier,
} from './types/arena';

export const ARENA_RATING_SCREEN_CACHE_KEY = 'arena_rating_screen_cache_v1';

type MatchRecord = {
  id: string;
  createdAt: number;
  won: boolean;
  myScore: number;
  oppScore: number;
  oppName: string;
  xpGained: number;
  starsChange: number;
  rankBefore: Rank;
  rankAfter: Rank;
};

function isRankTier(x: unknown): x is RankTier {
  return typeof x === 'string' && (RANK_TIERS as readonly string[]).includes(x);
}

function isRankLevel(x: unknown): x is RankLevel {
  return typeof x === 'string' && (RANK_LEVELS as readonly string[]).includes(x);
}

function clampRankStars(n: unknown): 0 | 1 | 2 | 3 {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  const i = Math.max(0, Math.min(3, Math.round(v)));
  return i as 0 | 1 | 2 | 3;
}

function sanitizeRankSnapshot(raw: unknown): Rank {
  if (raw == null || typeof raw !== 'object') {
    return { tier: 'bronze', level: 'I', stars: 0 };
  }
  const o = raw as { tier?: unknown; level?: unknown; stars?: unknown };
  return {
    tier: isRankTier(o.tier) ? o.tier : 'bronze',
    level: isRankLevel(o.level) ? o.level : 'I',
    stars: clampRankStars(o.stars),
  };
}

/** Нормализация профиля из Firestore/кэша — без этого при «битом» rank падает экран рейтинга (.tier of undefined). */
export function sanitizeArenaProfileForRating(raw: unknown): ArenaProfile | null {
  if (raw == null || typeof raw !== 'object') return null;
  const p = raw as Partial<ArenaProfile>;
  const rank = sanitizeRankSnapshot(p.rank);
  const s = p.stats && typeof p.stats === 'object' ? (p.stats as Partial<ArenaStats>) : {};
  const stats: ArenaStats = {
    matchesPlayed: Math.max(0, Number(s.matchesPlayed) || 0),
    matchesWon: Math.max(0, Number(s.matchesWon) || 0),
    totalScore: Math.max(0, Number(s.totalScore) || 0),
    winStreak: Math.max(0, Number(s.winStreak) || 0),
    bestWinStreak: Math.max(0, Number(s.bestWinStreak) || 0),
  };
  return {
    userId: typeof p.userId === 'string' ? p.userId : '',
    displayName: typeof p.displayName === 'string' ? p.displayName : '—',
    avatarId: typeof p.avatarId === 'string' ? p.avatarId : '1',
    rank,
    xp: Math.max(0, Number(p.xp) || 0),
    stats,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
  };
}

export function sanitizeMatchRecordForRating(raw: unknown): MatchRecord | null {
  if (raw == null || typeof raw !== 'object') return null;
  const m = raw as Partial<MatchRecord>;
  if (typeof m.id !== 'string' || typeof m.createdAt !== 'number') return null;
  return {
    id: m.id,
    createdAt: m.createdAt,
    won: !!m.won,
    myScore: Number(m.myScore) || 0,
    oppScore: Number(m.oppScore) || 0,
    oppName: typeof m.oppName === 'string' ? m.oppName : '—',
    xpGained: Number(m.xpGained) || 0,
    starsChange: Number(m.starsChange) || 0,
    rankBefore: sanitizeRankSnapshot(m.rankBefore),
    rankAfter: sanitizeRankSnapshot(m.rankAfter),
  };
}

export function sanitizeArenaRatingHistory(raw: unknown): MatchRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeMatchRecordForRating).filter((x): x is MatchRecord => x != null);
}

/** Одна чтение Firestore: профиль + история, запись в AsyncStorage. */
export async function fetchAndCacheArenaRating(): Promise<{
  profile: ArenaProfile | null;
  history: MatchRecord[];
} | null> {
  if (IS_EXPO_GO) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@react-native-firebase/firestore').default();
  const uid = await ensureArenaAuthUid();
  if (!uid) return null;
  const mySnap = await db.collection('arena_profiles').doc(uid).get();
  let profile: ArenaProfile | null = null;
  if (mySnap?.exists) profile = sanitizeArenaProfileForRating(mySnap.data());
  const histSnap = await db
    .collection('arena_profiles')
    .doc(uid)
    .collection('match_history')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const history = sanitizeArenaRatingHistory(
    histSnap.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => ({
      id: doc.id,
      ...doc.data(),
    })),
  );
  try {
    await AsyncStorage.setItem(
      ARENA_RATING_SCREEN_CACHE_KEY,
      JSON.stringify({ profile, history, ts: Date.now() }),
    );
  } catch {}
  return { profile, history };
}

export function prefetchArenaRatingCache(): void {
  if (IS_EXPO_GO) return;
  void fetchAndCacheArenaRating().catch(() => {});
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
