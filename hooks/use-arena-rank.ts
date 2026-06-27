import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RANK_EMOJIS, RANK_LEVELS, rankToIndex, type ArenaProfile, type RankLevel, type RankTier } from '../app/types/arena';
import { ensureArenaAuthUid } from '../app/user_id_policy';
import {
  ARENA_RATING_SCREEN_CACHE_KEY,
  getRememberedArenaLobbyProfile,
  rememberArenaLobbyProfile,
  sanitizeArenaProfileForRating,
} from '../app/arena_rating_cache';

function isRankLevel(level: string): level is RankLevel {
  return (RANK_LEVELS as readonly string[]).includes(level);
}

const RANK_NAMES: Record<RankTier, string> = {
  bronze: 'Бронза', silver: 'Серебро', gold: 'Золото',
  platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер',
  grandmaster: 'Грандмастер', legend: 'Легенда',
};

// Arena ranks have exactly three gameplay levels. The old "base" art variants
// are not bundled here because they are not a fourth rank level.
const RANK_IMAGES: Record<RankTier, Record<RankLevel, number>> = {
  bronze:      { I: require('../assets/images/arena_ranks/v2/arena-rank-bronze-i.webp'),      II: require('../assets/images/arena_ranks/v2/arena-rank-bronze-ii.webp'),      III: require('../assets/images/arena_ranks/v2/arena-rank-bronze-iii.webp') },
  silver:      { I: require('../assets/images/arena_ranks/v2/arena-rank-silver-i.webp'),      II: require('../assets/images/arena_ranks/v2/arena-rank-silver-ii.webp'),      III: require('../assets/images/arena_ranks/v2/arena-rank-silver-iii.webp') },
  gold:        { I: require('../assets/images/arena_ranks/v2/arena-rank-gold-i.webp'),        II: require('../assets/images/arena_ranks/v2/arena-rank-gold-ii.webp'),        III: require('../assets/images/arena_ranks/v2/arena-rank-gold-iii.webp') },
  platinum:    { I: require('../assets/images/arena_ranks/v2/arena-rank-platinum-i.webp'),    II: require('../assets/images/arena_ranks/v2/arena-rank-platinum-ii.webp'),    III: require('../assets/images/arena_ranks/v2/arena-rank-platinum-iii.webp') },
  diamond:     { I: require('../assets/images/arena_ranks/v2/arena-rank-diamond-i.webp'),     II: require('../assets/images/arena_ranks/v2/arena-rank-diamond-ii.webp'),     III: require('../assets/images/arena_ranks/v2/arena-rank-diamond-iii.webp') },
  master:      { I: require('../assets/images/arena_ranks/v2/arena-rank-master-i.webp'),      II: require('../assets/images/arena_ranks/v2/arena-rank-master-ii.webp'),      III: require('../assets/images/arena_ranks/v2/arena-rank-master-iii.webp') },
  grandmaster: { I: require('../assets/images/arena_ranks/v2/arena-rank-grandmaster-i.webp'), II: require('../assets/images/arena_ranks/v2/arena-rank-grandmaster-ii.webp'), III: require('../assets/images/arena_ranks/v2/arena-rank-grandmaster-iii.webp') },
  legend:      { I: require('../assets/images/arena_ranks/v2/arena-rank-legend-i.webp'),      II: require('../assets/images/arena_ranks/v2/arena-rank-legend-ii.webp'),      III: require('../assets/images/arena_ranks/v2/arena-rank-legend-iii.webp') },
};

const FALLBACK_RANK_IMAGE = RANK_IMAGES.bronze['I'];

export function getRankImage(tier: RankTier, level: string): number {
  const t = typeof tier === 'string' && tier in RANK_IMAGES ? tier : 'bronze';
  const lev = isRankLevel(level) ? level : 'I';
  const row = RANK_IMAGES[t as RankTier];
  return row?.[lev] ?? row?.I ?? FALLBACK_RANK_IMAGE;
}

export function getRankImageDisplayScale(_tier: RankTier, _level: string): number {
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
  image: require('../assets/images/arena_ranks/v2/arena-rank-bronze-i.webp'),
};

function duelRankInfoFromArenaProfile(data: ArenaProfile): DuelRankInfo {
  const tier = data.rank?.tier ?? 'bronze';
  const level = data.rank?.level ?? 'I';
  const stars = (data.rank?.stars ?? 0) as 0 | 1 | 2 | 3;
  return {
    tier, level, stars,
    xp: data.xp ?? 0,
    games: data.stats?.matchesPlayed ?? 0,
    rankIndex: rankToIndex(tier, level),
    label: `${RANK_NAMES[tier]} ${level}`,
    emoji: RANK_EMOJIS[tier],
    labelShort: `${TIER_LABELS_EN[tier]} ${level}`,
    image: getRankImage(tier, level),
  };
}

export type ArenaRankHookResult = DuelRankInfo & { isHydrated: boolean };

export function useArenaRank(options: { enabled?: boolean } = {}): ArenaRankHookResult {
  const enabled = options.enabled !== false;
  const [info, setInfo] = useState<DuelRankInfo | null>(() => {
    const mem = getRememberedArenaLobbyProfile();
    if (mem) return duelRankInfoFromArenaProfile(mem);
    return null;
  });

  useEffect(() => {
    if (!enabled) return undefined;
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
        unsub = db.collection('arena_profiles').doc(uid).onSnapshot(
          (snap: { exists: boolean; data: () => ArenaProfile }) => {
            if (!snap?.exists) {
              if (!cancelled) setInfo(DEFAULT);
              return;
            }
            const data = snap.data() as ArenaProfile;
            rememberArenaLobbyProfile(data);
            if (!cancelled) setInfo(duelRankInfoFromArenaProfile(data));
          },
          (error: unknown) => {
            if (__DEV__) console.warn('[use-arena-rank] onSnapshot error:', error);
          }
        );
      } catch {
        if (!cancelled) setInfo((prev) => prev ?? DEFAULT);
      }
    };
    void load();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [enabled]);

  const isHydrated = info != null;
  return { ...(info ?? DEFAULT), isHydrated };
}
