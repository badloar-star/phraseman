import type { Theme, ThemeMode } from './theme';

export type WeekDotTheme = {
  completeBg: string;
  completeBorder: string;
  emptyBg: string;
  todayBg: string;
  emptyBorder: string;
  todayBorder: string;
  checkColor: string;
  freezeBg: string;
  freezeBorder: string;
};

const WEEK_DOTS: Record<ThemeMode, Omit<WeekDotTheme, 'freezeBg' | 'freezeBorder'>> = {
  dark: {
    completeBg: '#47C870',
    completeBorder: 'rgba(118,255,158,0.72)',
    emptyBg: 'rgba(71,200,112,0.08)',
    todayBg: 'rgba(71,200,112,0.18)',
    emptyBorder: 'rgba(71,200,112,0.22)',
    todayBorder: 'rgba(71,200,112,0.56)',
    checkColor: '#042010',
  },
  gold: {
    completeBg: '#F4D37A',
    completeBorder: 'rgba(255,232,166,0.82)',
    emptyBg: 'rgba(246,227,161,0.055)',
    todayBg: 'rgba(246,227,161,0.13)',
    emptyBorder: 'rgba(246,227,161,0.20)',
    todayBorder: 'rgba(246,227,161,0.62)',
    checkColor: '#0A0702',
  },
  coral: {
    completeBg: '#FF7F50',
    completeBorder: 'rgba(255,180,150,0.76)',
    emptyBg: 'rgba(255,127,80,0.08)',
    todayBg: 'rgba(255,127,80,0.18)',
    emptyBorder: 'rgba(255,127,80,0.24)',
    todayBorder: 'rgba(255,127,80,0.58)',
    checkColor: '#FFFFFF',
  },
  minimalDark: {
    completeBg: '#6EA8FF',
    completeBorder: 'rgba(167,199,255,0.72)',
    emptyBg: 'rgba(110,168,255,0.08)',
    todayBg: 'rgba(110,168,255,0.17)',
    emptyBorder: 'rgba(110,168,255,0.24)',
    todayBorder: 'rgba(110,168,255,0.56)',
    checkColor: '#07101F',
  },
  business: {
    completeBg: '#0095F6',
    completeBorder: 'rgba(255,255,255,0.72)',
    emptyBg: 'rgba(0,149,246,0.08)',
    todayBg: 'rgba(0,149,246,0.17)',
    emptyBorder: 'rgba(0,149,246,0.24)',
    todayBorder: 'rgba(0,149,246,0.56)',
    checkColor: '#FFFFFF',
  },
  businessLight: {
    completeBg: '#0095F6',
    completeBorder: 'rgba(0,149,246,0.72)',
    emptyBg: 'rgba(0,149,246,0.08)',
    todayBg: 'rgba(0,149,246,0.17)',
    emptyBorder: 'rgba(0,149,246,0.26)',
    todayBorder: 'rgba(0,149,246,0.56)',
    checkColor: '#FFFFFF',
  },
  midnight: {
    completeBg: '#8FA0FF',
    completeBorder: 'rgba(201,210,255,0.74)',
    emptyBg: 'rgba(143,160,255,0.08)',
    todayBg: 'rgba(143,160,255,0.17)',
    emptyBorder: 'rgba(143,160,255,0.24)',
    todayBorder: 'rgba(143,160,255,0.56)',
    checkColor: '#0D1030',
  },
  ember: {
    completeBg: '#FFCC55',
    completeBorder: 'rgba(255,233,184,0.74)',
    emptyBg: 'rgba(255,204,85,0.08)',
    todayBg: 'rgba(255,204,85,0.17)',
    emptyBorder: 'rgba(255,204,85,0.24)',
    todayBorder: 'rgba(255,204,85,0.56)',
    checkColor: '#2A1A02',
  },
  aurora: {
    completeBg: '#3DE8A6',
    completeBorder: 'rgba(159,242,207,0.74)',
    emptyBg: 'rgba(61,232,166,0.08)',
    todayBg: 'rgba(61,232,166,0.17)',
    emptyBorder: 'rgba(61,232,166,0.24)',
    todayBorder: 'rgba(61,232,166,0.56)',
    checkColor: '#052A1C',
  },
  volt: {
    completeBg: '#C6FF34',
    completeBorder: 'rgba(232,255,150,0.74)',
    emptyBg: 'rgba(198,255,52,0.08)',
    todayBg: 'rgba(198,255,52,0.16)',
    emptyBorder: 'rgba(198,255,52,0.22)',
    todayBorder: 'rgba(198,255,52,0.54)',
    checkColor: '#182002',
  },
  candyBlue: {
    completeBg: '#B2D5E5',
    completeBorder: 'rgba(217,237,245,0.74)',
    emptyBg: 'rgba(178,213,229,0.08)',
    todayBg: 'rgba(178,213,229,0.17)',
    emptyBorder: 'rgba(178,213,229,0.24)',
    todayBorder: 'rgba(178,213,229,0.56)',
    checkColor: '#07110A',
  },
  indigo: {
    completeBg: '#C8C3FF',
    completeBorder: 'rgba(228,225,255,0.74)',
    emptyBg: 'rgba(200,195,255,0.08)',
    todayBg: 'rgba(200,195,255,0.17)',
    emptyBorder: 'rgba(200,195,255,0.24)',
    todayBorder: 'rgba(200,195,255,0.56)',
    checkColor: '#17162B',
  },
  // зачем: «Горизонт» — бесплатная тема-витрина (2026-07-27), закатный персик/роза на сливовом сумраке.
  horizon: {
    completeBg: '#FFAD7A',
    completeBorder: 'rgba(255,212,176,0.74)',
    emptyBg: 'rgba(255,173,122,0.08)',
    todayBg: 'rgba(255,173,122,0.17)',
    emptyBorder: 'rgba(255,173,122,0.24)',
    todayBorder: 'rgba(255,173,122,0.56)',
    checkColor: '#2A1408',
  },
};

export function themedWeekDot(themeMode: ThemeMode, theme: Theme): WeekDotTheme {
  const base = WEEK_DOTS[themeMode] ?? WEEK_DOTS.minimalDark;
  return {
    ...base,
    freezeBg: themeMode === 'gold' ? 'rgba(218,244,255,0.18)' : 'rgba(196,239,255,0.24)',
    freezeBorder: themeMode === 'gold' ? 'rgba(218,244,255,0.72)' : 'rgba(190,240,255,0.78)',
  };
}
