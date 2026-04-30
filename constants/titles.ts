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
];

export const getTitleForLevel = (level: number): TitleDef =>
  TITLES.find(t => level >= t.minLevel && level <= t.maxLevel) ?? TITLES[0];

export const getTitleColor = (level: number, isDark: boolean): string => {
  const t = getTitleForLevel(level);
  return isDark ? t.colorDark : t.colorLight;
};

/** Возвращает английское название титула */
export const getTitleString = (level: number, _lang: string): string =>
  getTitleForLevel(level).titleEN;
