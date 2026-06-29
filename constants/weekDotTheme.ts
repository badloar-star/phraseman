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
    completeBg: '#FF6464',
    completeBorder: 'rgba(255,160,150,0.76)',
    emptyBg: 'rgba(255,100,100,0.08)',
    todayBg: 'rgba(255,100,100,0.18)',
    emptyBorder: 'rgba(255,100,100,0.24)',
    todayBorder: 'rgba(255,100,100,0.58)',
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
    completeBg: '#FFFFFF',
    completeBorder: 'rgba(255,255,255,0.72)',
    emptyBg: 'rgba(255,255,255,0.08)',
    todayBg: 'rgba(255,255,255,0.17)',
    emptyBorder: 'rgba(255,255,255,0.24)',
    todayBorder: 'rgba(255,255,255,0.56)',
    checkColor: '#0A0A0A',
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
    completeBg: '#FFA245',
    completeBorder: 'rgba(255,217,168,0.74)',
    emptyBg: 'rgba(255,162,69,0.08)',
    todayBg: 'rgba(255,162,69,0.17)',
    emptyBorder: 'rgba(255,162,69,0.24)',
    todayBorder: 'rgba(255,162,69,0.56)',
    checkColor: '#2A1502',
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
    completeBg: '#D6FF3D',
    completeBorder: 'rgba(239,255,158,0.74)',
    emptyBg: 'rgba(214,255,61,0.08)',
    todayBg: 'rgba(214,255,61,0.16)',
    emptyBorder: 'rgba(214,255,61,0.22)',
    todayBorder: 'rgba(214,255,61,0.54)',
    checkColor: '#1A2002',
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
