import type { ThemeMode } from '../constants/theme';

type ThemeSlice = {
  accent: string;
  accentBg?: string;
  bgCard: string;
  bgSurface: string;
  border: string;
  correct?: string;
  gold?: string;
  textPrimary: string;
  textSecond: string;
  textMuted: string;
};

export type LingmanYoutubeChrome = {
  accent: string;
  accentSoft: string;
  accentFaint: string;
  actionText: string;
  cardBg: string;
  cardBorder: string;
  chipBg: string;
  iconOnAccent: string;
  quietButtonBg: string;
  quietButtonBorder: string;
  noticeBg: string;
  noticeBorder: string;
  playerBg: string;
};

function alpha(hex: string, value: string): string {
  return `${hex}${value}`;
}

export function getLingmanYoutubeChrome(theme: ThemeSlice, isDark: boolean, themeMode: ThemeMode): LingmanYoutubeChrome {
  if (themeMode === 'compass') {
    return {
      accent: '#F2C48D',
      accentSoft: 'rgba(242,196,141,0.14)',
      accentFaint: 'rgba(242,196,141,0.08)',
      actionText: '#151008',
      cardBg: 'rgba(23,20,16,0.90)',
      cardBorder: 'rgba(242,196,141,0.18)',
      chipBg: 'rgba(242,196,141,0.12)',
      iconOnAccent: '#151008',
      quietButtonBg: 'rgba(242,196,141,0.08)',
      quietButtonBorder: 'rgba(242,196,141,0.18)',
      noticeBg: 'rgba(242,196,141,0.10)',
      noticeBorder: 'rgba(242,196,141,0.24)',
      playerBg: '#000000',
    };
  }

  const accent = themeMode === 'gold'
    ? theme.gold ?? theme.accent
    : themeMode === 'minimalLight'
      ? theme.textSecond
      : theme.accent;

  const softAlpha = isDark ? '24' : '18';
  const faintAlpha = isDark ? '12' : '0F';

  return {
    accent,
    accentSoft: theme.accentBg ?? alpha(accent, softAlpha),
    accentFaint: alpha(accent, faintAlpha),
    actionText: isDark ? theme.bgCard : theme.bgSurface,
    cardBg: isDark ? 'rgba(15,18,25,0.88)' : 'rgba(255,255,255,0.94)',
    cardBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
    chipBg: alpha(accent, softAlpha),
    iconOnAccent: isDark ? theme.bgCard : theme.bgSurface,
    quietButtonBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
    quietButtonBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
    noticeBg: isDark ? alpha(accent, '14') : alpha(accent, '10'),
    noticeBorder: alpha(accent, '3D'),
    playerBg: '#000000',
  };
}
