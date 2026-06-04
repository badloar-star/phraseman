export interface TitleDef {
  minLevel:   number;
  maxLevel:   number;
  titleEN:    string;
  colorLight: string;
  colorDark:  string;
}

export type SpecialTitleId =
  | 'grammar_police'
  | 'iron_habit'
  | 'no_excuses'
  | 'xp_machine'
  | 'full_clear'
  | 'public_legend';

export interface SpecialTitleDef {
  id:         SpecialTitleId;
  titleEN:    string;
  unlockText: string;
  colorLight: string;
  colorDark:  string;
}

export interface SpecialTitleStats {
  level: number;
  totalXP: number;
  streak: number;
  helpfulReportsConfirmed?: number;
  dailyAllDoneStreak?: number;
  earnedAchievementIds?: ReadonlySet<string>;
}

export const HELPFUL_REPORTS_CONFIRMED_KEY = 'helpful_error_reports_confirmed_v1';

export const TITLES: TitleDef[] = [
  { minLevel:  1, maxLevel:  4, titleEN: 'Beginner',   colorLight: '#6B7280', colorDark: '#9CA3AF' },
  { minLevel:  5, maxLevel:  9, titleEN: 'Explorer',   colorLight: '#059669', colorDark: '#34D399' },
  { minLevel: 10, maxLevel: 14, titleEN: 'Learner',    colorLight: '#2563EB', colorDark: '#60A5FA' },
  { minLevel: 15, maxLevel: 19, titleEN: 'Speaker',    colorLight: '#7C3AED', colorDark: '#A78BFA' },
  { minLevel: 20, maxLevel: 24, titleEN: 'Conversant', colorLight: '#0891B2', colorDark: '#22D3EE' },
  { minLevel: 25, maxLevel: 29, titleEN: 'Fluent',     colorLight: '#CA8A04', colorDark: '#FCD34D' },
  { minLevel: 30, maxLevel: 34, titleEN: 'Advanced',   colorLight: '#DC2626', colorDark: '#F87171' },
  { minLevel: 35, maxLevel: 39, titleEN: 'Expert',     colorLight: '#9333EA', colorDark: '#C084FC' },
  { minLevel: 40, maxLevel: 44, titleEN: 'Scholar',    colorLight: '#0D9488', colorDark: '#2DD4BF' },
  { minLevel: 45, maxLevel: 49, titleEN: 'Master',     colorLight: '#B45309', colorDark: '#F59E0B' },
  { minLevel: 50, maxLevel: 50, titleEN: 'Legend',     colorLight: '#1D4ED8', colorDark: '#818CF8' },
  { minLevel: 51, maxLevel: 51, titleEN: 'Flamekeeper', colorLight: '#DC2626', colorDark: '#F97316' },
  { minLevel: 52, maxLevel: 52, titleEN: 'Stormlord',   colorLight: '#2563EB', colorDark: '#38BDF8' },
  { minLevel: 53, maxLevel: 53, titleEN: 'Frost Archon', colorLight: '#0891B2', colorDark: '#67E8F9' },
  { minLevel: 54, maxLevel: 54, titleEN: 'Volcanic Heart', colorLight: '#B91C1C', colorDark: '#FB923C' },
  { minLevel: 55, maxLevel: 55, titleEN: 'Typhoon Spirit', colorLight: '#0F766E', colorDark: '#2DD4BF' },
  { minLevel: 56, maxLevel: 56, titleEN: 'Gravity Lord', colorLight: '#6D28D9', colorDark: '#C084FC' },
  { minLevel: 57, maxLevel: 57, titleEN: 'Star Forger', colorLight: '#CA8A04', colorDark: '#FDE68A' },
  { minLevel: 58, maxLevel: 58, titleEN: 'Plasma Bearer', colorLight: '#C026D3', colorDark: '#F0ABFC' },
  { minLevel: 59, maxLevel: 59, titleEN: 'Ether Master', colorLight: '#4F46E5', colorDark: '#A5B4FC' },
  { minLevel: 60, maxLevel: 60, titleEN: 'Elemental Absolute', colorLight: '#7C2D12', colorDark: '#FACC15' },
];

export const SPECIAL_TITLES: SpecialTitleDef[] = [
  { id: 'grammar_police', titleEN: 'Grammar Police', unlockText: '100 полезных репортов', colorLight: '#7C2D12', colorDark: '#FACC15' },
  { id: 'iron_habit', titleEN: 'Iron Habit', unlockText: '365 дней серии', colorLight: '#0F766E', colorDark: '#5EEAD4' },
  { id: 'no_excuses', titleEN: 'No Excuses', unlockText: '365 дней серии без восстановления или заморозки', colorLight: '#1D4ED8', colorDark: '#93C5FD' },
  { id: 'xp_machine', titleEN: 'XP Machine', unlockText: '250 000 XP', colorLight: '#B45309', colorDark: '#FBBF24' },
  { id: 'full_clear', titleEN: 'Full Clear', unlockText: '100 дней закрывать все daily tasks', colorLight: '#047857', colorDark: '#34D399' },
  { id: 'public_legend', titleEN: 'Public Legend', unlockText: '100 лайков на достижениях', colorLight: '#BE123C', colorDark: '#FDA4AF' },
];

export const getTitleForLevel = (level: number): TitleDef =>
  TITLES.find(t => level >= t.minLevel && level <= t.maxLevel)
  ?? (level < TITLES[0].minLevel ? TITLES[0] : TITLES[TITLES.length - 1]);

export const getTitleColor = (level: number, isDark: boolean): string => {
  const t = getTitleForLevel(level);
  return isDark ? t.colorDark : t.colorLight;
};

/** Возвращает английское название титула */
export const getTitleString = (level: number, _lang: string): string =>
  getTitleForLevel(level).titleEN;

export const getEarnedSpecialTitles = (stats: SpecialTitleStats): SpecialTitleDef[] => {
  const earnedIds = stats.earnedAchievementIds ?? new Set<string>();
  return SPECIAL_TITLES.filter((title) => {
    switch (title.id) {
      case 'grammar_police':
        return (stats.helpfulReportsConfirmed ?? 0) >= 100;
      case 'iron_habit':
        return stats.streak >= 365 || earnedIds.has('streak_365');
      case 'no_excuses':
        return earnedIds.has('streak_clean_365');
      case 'xp_machine':
        return stats.totalXP >= 250_000;
      case 'full_clear':
        return (stats.dailyAllDoneStreak ?? 0) >= 100;
      case 'public_legend':
        return earnedIds.has('social_likes_100');
      default:
        return false;
    }
  });
};
