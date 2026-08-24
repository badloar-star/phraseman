import type { Theme } from '../../constants/theme';

export type AchievementShelfTheme = Pick<
  Theme,
  | 'bgPrimary'
  | 'bgCard'
  | 'bgSurface'
  | 'bgSurface2'
  | 'textPrimary'
  | 'border'
  | 'borderHighlight'
  | 'cardShadow'
  | 'shadowDark'
>;

export type AchievementShelfMaterials = {
  stageGradient: [string, string, string];
  shelfTopStart: string;
  shelfTopEnd: string;
  shelfFaceStart: string;
  shelfFaceEnd: string;
  shelfEdge: string;
  reflection: string;
  border: string;
  shadow: string;
  shadowDark: string;
};

function colorWithAlpha(color: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hex = color.startsWith('#') ? color.slice(1) : '';
  const normalized = hex.length === 3
    ? hex.split('').map((character) => character + character).join('')
    : hex.length === 8
      ? hex.slice(0, 6)
      : hex;

  if (/^[0-9a-f]{6}$/iu.test(normalized)) {
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${safeAlpha})`;
  }

  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/iu);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${safeAlpha})`;
  return color;
}

export function achievementShelfMaterials(
  theme: AchievementShelfTheme,
  isDark: boolean,
): AchievementShelfMaterials {
  return {
    stageGradient: [theme.bgSurface2, theme.bgCard, theme.bgSurface],
    shelfTopStart: colorWithAlpha(theme.textPrimary, isDark ? 0.2 : 0.32),
    shelfTopEnd: theme.bgSurface2,
    shelfFaceStart: theme.bgSurface2,
    shelfFaceEnd: theme.bgCard,
    shelfEdge: theme.borderHighlight,
    reflection: colorWithAlpha(theme.textPrimary, isDark ? 0.72 : 0.46),
    border: theme.border,
    shadow: theme.cardShadow,
    shadowDark: theme.shadowDark,
  };
}
