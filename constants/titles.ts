export interface TitleDef {
  minLevel:   number;
  maxLevel:   number;
  titleEN:    string;
  colorLight: string;
  colorDark:  string;
}

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
