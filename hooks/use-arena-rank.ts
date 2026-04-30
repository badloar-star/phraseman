import { useState, useEffect } from 'react';
import { ArenaProfile, RANK_EMOJIS, RankTier } from '../app/types/arena';

const RANK_TIER_ORDER: RankTier[] = [
  'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend',
];

const rankIndexFromTierLevel = (tier: RankTier, level: string): number => {
  const ti = RANK_TIER_ORDER.indexOf(tier);
  const li = ['I', 'II', 'III'].indexOf(level);
  return Math.max(0, ti) * 3 + Math.max(0, li);
};
import { ensureArenaAuthUid } from '../app/user_id_policy';

const RANK_NAMES: Record<RankTier, string> = {
  bronze: 'Бронза', silver: 'Серебро', gold: 'Золото',
  platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер',
  grandmaster: 'Грандмастер', legend: 'Легенда',
};

const RANK_IMAGES: Record<RankTier, Record<string, number>> = {
  bronze:      { I: require('../assets/images/levels/ARENA BRONZ 1.png'),  II: require('../assets/images/levels/ARENA BRONZ 2.png'),  III: require('../assets/images/levels/ARENA BRONZ 3.png') },
  silver:      { I: require('../assets/images/levels/ARENA SILVER 1.png'), II: require('../assets/images/levels/ARENA SILVER 2.png'), III: require('../assets/images/levels/ARENA SILVER 3.png') },
  gold:        { I: require('../assets/images/levels/ARENA GOLD 1.png'),   II: require('../assets/images/levels/ARENA GOLD 2.png'),   III: require('../assets/images/levels/ARENA GOLD 3.png') },
  platinum:    { I: require('../assets/images/levels/ARENA PLATINUM 1.png'),II: require('../assets/images/levels/ARENA PLATINUM 2.png'),III: require('../assets/images/levels/ARENA PLATINUM 3.png') },
  diamond:     { I: require('../assets/images/levels/ARENA ALMAZ 1.png'),  II: require('../assets/images/levels/ARENA ALMAZ 2.png'),  III: require('../assets/images/levels/ARENA ALMAZ 3.png') },
  master:      { I: require('../assets/images/levels/ARENA MASTER 1.png'), II: require('../assets/images/levels/ARENA MASTER 2.png'), III: require('../assets/images/levels/ARENA MASTER 3.png') },
  grandmaster: { I: require('../assets/images/levels/ARENA GRAND 1.png'),  II: require('../assets/images/levels/ARENA GRAN 2.png'),   III: require('../assets/images/levels/ARENA GRAND 3.png') },
  legend:      { I: require('../assets/images/levels/ARENA LEGEND 1.png'), II: require('../assets/images/levels/ARENA LEGEND 2.png'), III: require('../assets/images/levels/ARENA LEGEND 3.png') },
};

const FALLBACK_RANK_IMAGE = RANK_IMAGES.bronze['I'];

export function getRankImage(tier: RankTier, level: string): number {
  const t = typeof tier === 'string' && tier in RANK_IMAGES ? tier : 'bronze';
  const lev = level === 'I' || level === 'II' || level === 'III' ? level : 'I';
  const row = RANK_IMAGES[t as RankTier];
  return row?.[lev] ?? row?.['I'] ?? FALLBACK_RANK_IMAGE;
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

const DEFAULT: DuelRankInfo = {
  tier: 'bronze', level: 'I', stars: 0, xp: 0, games: 0, rankIndex: 0,
  label: 'Бронза I', emoji: '🥉', labelShort: 'Bronze I',
  image: require('../assets/images/levels/ARENA BRONZ 1.png'),
};

const TIER_LABELS_EN: Record<RankTier, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold',
  platinum: 'Platinum', diamond: 'Diamond', master: 'Master',
  grandmaster: 'Grandmaster', legend: 'Legend',
};

export function useArenaRank(): DuelRankInfo {
  const [info, setInfo] = useState<DuelRankInfo>(DEFAULT);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const load = async () => {
      try {
        const uid = await ensureArenaAuthUid();
        if (!uid) return;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const db = require('@react-native-firebase/firestore').default();
        // Single source of truth for arena rank is arena_profiles.
        unsub = db.collection('arena_profiles').doc(uid).onSnapshot((snap: { exists: boolean; data: () => ArenaProfile }) => {
          if (!snap?.exists) return;
          const data = snap.data() as ArenaProfile;
          const tier = data.rank?.tier ?? 'bronze';
          const level = data.rank?.level ?? 'I';
          const stars = (data.rank?.stars ?? 0) as 0 | 1 | 2 | 3;
          setInfo({
            tier, level, stars, xp: data.xp ?? 0,
            games: data.stats?.matchesPlayed ?? 0,
            rankIndex: rankIndexFromTierLevel(tier, level),
            label: `${RANK_NAMES[tier]} ${level}`,
            emoji: RANK_EMOJIS[tier],
            labelShort: `${TIER_LABELS_EN[tier]} ${level}`,
            image: getRankImage(tier, level),
          });
        });
      } catch {}
    };
    load();
    return () => {
      unsub?.();
    };
  }, []);

  return info;
}
