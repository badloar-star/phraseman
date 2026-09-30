export type SpecialTitleId =
  | 'grammar_police'
  | 'iron_habit'
  | 'no_excuses'
  | 'public_legend';

export interface SpecialTitleDef {
  id:         SpecialTitleId;
  titleEN:    string;
  unlockText: string;
  colorLight: string;
  colorDark:  string;
}

export interface SpecialTitleStats {
  streak: number;
  helpfulReportsConfirmed?: number;
  earnedAchievementIds?: ReadonlySet<string>;
}

export const HELPFUL_REPORTS_CONFIRMED_KEY = 'helpful_error_reports_confirmed_v1';

export const SPECIAL_TITLES: SpecialTitleDef[] = [
  { id: 'grammar_police', titleEN: 'Grammar Police', unlockText: '100 полезных репортов', colorLight: '#7C2D12', colorDark: '#FACC15' },
  { id: 'iron_habit', titleEN: 'Iron Habit', unlockText: '365 дней серии', colorLight: '#0F766E', colorDark: '#5EEAD4' },
  { id: 'no_excuses', titleEN: 'No Excuses', unlockText: '365 дней серии без восстановления или заморозки', colorLight: '#1D4ED8', colorDark: '#93C5FD' },
  { id: 'public_legend', titleEN: 'Public Legend', unlockText: '100 лайков на достижениях', colorLight: '#BE123C', colorDark: '#FDA4AF' },
];

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
      case 'public_legend':
        return earnedIds.has('social_likes_100');
      default:
        return false;
    }
  });
};
