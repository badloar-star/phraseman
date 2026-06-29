export const LEVEL_GIFT_IMAGE_THEMES = [
  'coral',
  'dark',
  'gold',
  'minimalDark',
  'business',
] as const;

export const LEVEL_GIFT_IMAGE_VARIANTS = [
  'common',
  'rare',
  'epic',
  'premium',
] as const;

export type LevelGiftImageTheme = typeof LEVEL_GIFT_IMAGE_THEMES[number];
export type LevelGiftImageVariant = typeof LEVEL_GIFT_IMAGE_VARIANTS[number];

export type LevelGiftGradient = {
  colors: [string, string, string];
  accent: string;
  ink: string;
};

const DEFAULT_THEME: LevelGiftImageTheme = 'minimalDark';
const DEFAULT_VARIANT: LevelGiftImageVariant = 'common';

const THEME_BASE: Record<LevelGiftImageTheme, [string, string]> = {
  coral: ['#3B161B', '#130609'],
  dark: ['#12301C', '#041008'],
  gold: ['#3A260C', '#100904'],
  minimalDark: ['#152033', '#04070C'],
  business: ['#12314A', '#060A10'],
};

const VARIANT_ACCENT: Record<LevelGiftImageVariant, string> = {
  common: '#D8DEE9',
  rare: '#60A5FA',
  epic: '#F5C542',
  premium: '#D6B85C',
};

const isLevelGiftImageTheme = (theme: string | null | undefined): theme is LevelGiftImageTheme =>
  LEVEL_GIFT_IMAGE_THEMES.includes(theme as LevelGiftImageTheme);

const isLevelGiftImageVariant = (variant: string | null | undefined): variant is LevelGiftImageVariant =>
  LEVEL_GIFT_IMAGE_VARIANTS.includes(variant as LevelGiftImageVariant);

export function getLevelGiftGradient(
  theme: string | null | undefined,
  variant: string | null | undefined,
): LevelGiftGradient {
  const safeTheme = isLevelGiftImageTheme(theme) ? theme : DEFAULT_THEME;
  const safeVariant = isLevelGiftImageVariant(variant) ? variant : DEFAULT_VARIANT;
  const [top, bottom] = THEME_BASE[safeTheme];
  const accent = VARIANT_ACCENT[safeVariant];

  return {
    colors: [top, withAlpha(accent, '42'), bottom],
    accent,
    ink: safeVariant === 'common' ? '#0F172A' : '#090A0C',
  };
}

export const LEVEL_GIFT_IMAGE_SOURCES: readonly never[] = [];

function withAlpha(hex: string, alpha: string): string {
  if (hex.startsWith('#') && hex.length === 7) return `${hex}${alpha}`;
  return hex;
}
