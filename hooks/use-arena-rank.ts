import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArenaProfile, RANK_EMOJIS, RankTier } from '../app/types/arena';
import { ensureArenaAuthUid } from '../app/user_id_policy';
import {
  ARENA_RATING_SCREEN_CACHE_KEY,
  getRememberedArenaLobbyProfile,
  rememberArenaLobbyProfile,
  sanitizeArenaProfileForRating,
} from '../app/arena_rating_cache';

const RANK_TIER_ORDER: RankTier[] = [
  'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend',
];

const rankIndexFromTierLevel = (tier: RankTier, level: string): number => {
  const ti = RANK_TIER_ORDER.indexOf(tier);
  const li = ['I', 'II', 'III'].indexOf(level);
  return Math.max(0, ti) * 3 + Math.max(0, li);
};

const RANK_NAMES: Record<RankTier, string> = {
  bronze: 'Бронза', silver: 'Серебро', gold: 'Золото',
  platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер',
  grandmaster: 'Грандмастер', legend: 'Легенда',
};

const RANK_IMAGES: Record<RankTier, Record<string, number>> = {
  bronze:      { I: require('../assets/images/levels/ARENA BRONZ 1.webp'),  II: require('../assets/images/levels/ARENA BRONZ 2.webp'),  III: require('../assets/images/levels/ARENA BRONZ 3.webp') },
  silver:      { I: require('../assets/images/levels/ARENA SILVER 1.webp'), II: require('../assets/images/levels/ARENA SILVER 2.webp'), III: require('../assets/images/levels/ARENA SILVER 3.webp') },
  gold:        { I: require('../assets/images/levels/ARENA GOLD 1.webp'),   II: require('../assets/images/levels/ARENA GOLD 2.webp'),   III: require('../assets/images/levels/ARENA GOLD 3.webp') },
  platinum:    { I: require('../assets/images/levels/ARENA PLATINUM 1.webp'),II: require('../assets/images/levels/ARENA PLATINUM 2.webp'),III: require('../assets/images/levels/ARENA PLATINUM 3.webp') },
  diamond:     { I: require('../assets/images/levels/ARENA ALMAZ 1.webp'),  II: require('../assets/images/levels/ARENA ALMAZ 2.webp'),  III: require('../assets/images/levels/ARENA ALMAZ 3.webp') },
  master:      { I: require('../assets/images/levels/ARENA MASTER 1.webp'), II: require('../assets/images/levels/ARENA MASTER 2.webp'), III: require('../assets/images/levels/ARENA MASTER 3.webp') },
  grandmaster: { I: require('../assets/images/levels/ARENA GRAND 1.webp'),  II: require('../assets/images/levels/ARENA GRAN 2.webp'),   III: require('../assets/images/levels/ARENA GRAND 3.webp') },
  legend:      { I: require('../assets/images/levels/ARENA LEGEND 1.webp'), II: require('../assets/images/levels/ARENA LEGEND 2.webp'), III: require('../assets/images/levels/ARENA LEGEND 3.webp') },
};

const FALLBACK_RANK_IMAGE = RANK_IMAGES.bronze['I'];

export function getRankImage(tier: RankTier, level: string): number {
  const t = typeof tier === 'string' && tier in RANK_IMAGES ? tier : 'bronze';
  const lev = level === 'I' || level === 'II' || level === 'III' ? level : 'I';
  const row = RANK_IMAGES[t as RankTier];
  return row?.[lev] ?? row?.['I'] ?? FALLBACK_RANK_IMAGE;
}

/**
 * ARENA GOLD 3.webp — узкий высокий холст (309×414); при contain в квадрате значок получается
 * заметно меньше соседних рангов. Остальные ассеты ≈ 35–40 px по «короткой» стороне в боксе 40.
 */
export function getRankImageDisplayScale(tier: RankTier, level: string): number {
  const lev = level === 'I' || level === 'II' || level === 'III' ? level : 'I';
  if (tier === 'gold' && lev === 'III') return 1.28;
  return 1;
}

export interface DuelRankInfo {
  tier: RankTier;
  level: string;
  stars: 0 | 1 | 2 | 3;
  xp: number;
  games: number;
  /** Стабильный 0-based индекс для аналитики (tier × уровень I–III) */
  rankIndex: number;
  label: string;
  emoji: string;
  labelShort: string;
  image: number;
}

const TIER_LABELS_EN: Record<RankTier, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold',
  platinum: 'Platinum', diamond: 'Diamond', master: 'Master',
  grandmaster: 'Grandmaster', legend: 'Legend',
};

const DEFAULT: DuelRankInfo = {
  tier: 'bronze', level: 'I', stars: 0, xp: 0, games: 0, rankIndex: 0,
  label: 'Бронза I', emoji: '🥉', labelShort: 'Bronze I',
  image: require('../assets/images/levels/ARENA BRONZ 1.webp'),
};

function duelRankInfoFromArenaProfile(data: ArenaProfile): DuelRankInfo {
  const tier = data.rank?.tier ?? 'bronze';
  const level = data.rank?.level ?? 'I';
  const stars = (data.rank?.stars ?? 0) as 0 | 1 | 2 | 3;
  return {
    tier, level, stars,
    xp: data.xp ?? 0,
    games: data.stats?.matchesPlayed ?? 0,
    rankIndex: rankIndexFromTierLevel(tier, level),
    label: `${RANK_NAMES[tier]} ${level}`,
    emoji: RANK_EMOJIS[tier],
    labelShort: `${TIER_LABELS_EN[tier]} ${level}`,
    image: getRankImage(tier, level),
  };
}

export type ArenaRankHookResult = DuelRankInfo & { isHydrated: boolean };

export function useArenaRank(): ArenaRankHookResult {
  const [info, setInfo] = useState<DuelRankInfo | null>(() => {
    const mem = getRememberedArenaLobbyProfile();
    if (mem) return duelRankInfoFromArenaProfile(mem);
    return null;
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    const load = async () => {
      try {
        const [uid, rawCache] = await Promise.all([
          ensureArenaAuthUid(),
          AsyncStorage.getItem(ARENA_RATING_SCREEN_CACHE_KEY),
        ]);

        if (rawCache) {
          try {
            const parsed = JSON.parse(rawCache) as { profile?: unknown };
            const profile = sanitizeArenaProfileForRating(parsed.profile ?? null);
            if (profile) {
              const cacheOk = !uid || !profile.userId || profile.userId === uid;
              if (cacheOk) {
                rememberArenaLobbyProfile(profile);
                if (!cancelled) setInfo(duelRankInfoFromArenaProfile(profile));
              }
            }
          } catch { /* ignore */ }
        }

        if (!uid) {
          if (!cancelled) setInfo((prev) => prev ?? DEFAULT);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const db = require('@react-native-firebase/firestore').default();
        unsub = db.collection('arena_profiles').doc(uid).onSnapshot((snap: { exists: boolean; data: () => ArenaProfile }) => {
          if (!snap?.exists) {
            if (!cancelled) setInfo(DEFAULT);
            return;
          }
          const data = snap.data() as ArenaProfile;
          rememberArenaLobbyProfile(data);
          if (!cancelled) setInfo(duelRankInfoFromArenaProfile(data));
        });
      } catch {
        if (!cancelled) setInfo((prev) => prev ?? DEFAULT);
      }
    };
    void load();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const isHydrated = info != null;
  return { ...(info ?? DEFAULT), isHydrated };
}
