import type { ThemeMode } from '../../constants/theme';
import { UGC_CARD_THEME_DEFAULT_ID, UGC_CARD_THEME_IDS } from '../community_packs/ugcCardThemePresets';
import type { FlashcardMarketPack, FlashcardPackCategory } from './marketplace';
import {
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
} from './bundles/packIds';

/**
 * Декор paywall прив’язаний до **глобальної теми** (`ThemeMode`):
 * - `dark` = Deep Forest (як DARK з theme.ts) — натуральний багряний/зелений, **не** неон
 * - `neon` = «перший ідеальний варіант» — C8FF00, темний текст CTA
 * - `gold` / `ocean` / `sakura` = палітри з constants/theme
 *
 * Категорія набору дає **легкий** зсув (ореол/рамка), офіційні паки — додатковий шар.
 * Текст у модалці лишається з ThemeContext.
 */
export type CardPackPaywallTheme = {
  backdropBase: string;
  outerGlow: readonly [string, string, string];
  borderAccent: string;
  handleColorLight: string;
  handleColorDark: string;
  iconBg: readonly [string, string];
  iconBorder: string;
  priceBorder: string;
  priceGradient: readonly [string, string];
  /** Якщо фон `priceGradient` темний (ocean), контрастний текст; інакше береться з ThemeContext у модалці */
  priceTextOnCard?: { label: string; value: string; unit: string };
  ctaColors: readonly [string, string];
  ctaForeground: string;
  ctaGlowTop: string;
  goShopCta: readonly [string, string];
  goShopForeground: string;
};

function m(a: CardPackPaywallTheme, p: Partial<CardPackPaywallTheme>): CardPackPaywallTheme {
  return { ...a, ...p };
}

/** Блок «Вартість / Стоимость» у темі ocean: темно-синій градієнт + світлий текст */
const OCEAN_DARK_PRICE_BLOCK: Pick<CardPackPaywallTheme, 'priceGradient' | 'priceBorder' | 'priceTextOnCard'> = {
  priceGradient: ['#0A3D6B', '#031528'],
  priceBorder: 'rgba(56, 189, 248, 0.4)',
  priceTextOnCard: {
    label: 'rgba(186, 230, 253, 0.92)',
    value: '#FFFFFF',
    unit: 'rgba(125, 211, 252, 0.88)',
  },
};

function fadeRgba(rgba: string, factor: number): string {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!m) return rgba;
  if (m[4] === undefined) return `rgba(${m[1]},${m[2]},${m[3]},${factor})`;
  const a0 = Math.min(1, Math.max(0, parseFloat(m[4]) * factor));
  return `rgba(${m[1]},${m[2]},${m[3]},${a0.toFixed(3)})`;
}

function fadeStop(pair: readonly [string, string], factor: number): [string, string] {
  return [fadeRgba(pair[0], factor), fadeRgba(pair[1], factor)] as [string, string];
}

/**
 * На світлих картках глобальний `factor` 0.4 вбивав ореол. Для ocean/sakura — м’якше
 * притінення, щоб **сяйво** лишалося помітним (електричні неон-краї).
 */
function forLightShell(t: CardPackPaywallTheme, themeMode: ThemeMode): CardPackPaywallTheme {
  const richLight = themeMode === 'ocean' || themeMode === 'sakura';
  const g = richLight ? 0.86 : 0.42;
  const edge = richLight ? 0.9 : 0.42;
  const b = richLight ? 0.86 : 0.55;
  const h = richLight ? 0.88 : 0.75;
  const ic = richLight ? 0.8 : 0.5;
  const pr = richLight ? 0.8 : 0.6;
  const pg = richLight ? 0.75 : 0.55;
  const cg = richLight ? 0.72 : 0.45;
  return m(t, {
    outerGlow: [fadeRgba(t.outerGlow[0], g), fadeRgba(t.outerGlow[1], g * 0.94), fadeRgba(t.outerGlow[2], edge)] as const,
    borderAccent: fadeRgba(t.borderAccent, b),
    handleColorLight: fadeRgba(t.handleColorLight, h),
    iconBg: fadeStop(t.iconBg, ic),
    iconBorder: fadeRgba(t.iconBorder, b),
    priceBorder: fadeRgba(t.priceBorder, pr),
    priceGradient: fadeStop(t.priceGradient, pg),
    ctaGlowTop: fadeRgba(t.ctaGlowTop, cg),
  });
}

// ─── Оболонки: 1:1 з відчуттям `constants/theme` ─────────────────────────────

/** DARK: Deep Forest (Duolingo-style) */
function shellDark(): CardPackPaywallTheme {
  return {
    backdropBase: 'rgba(3,8,4,0.9)',
    outerGlow: [
      'rgba(71,200,112,0.38)',
      'rgba(25,40,32,0.48)',
      'rgba(6,14,9,0.55)',
    ],
    borderAccent: 'rgba(88,204,137,0.2)',
    handleColorLight: 'rgba(30,50,40,0.35)',
    handleColorDark: 'rgba(88,204,137,0.45)',
    iconBg: ['#1D2D23', '#152019'],
    iconBorder: 'rgba(88,204,137,0.25)',
    priceBorder: 'rgba(71,200,112,0.2)',
    priceGradient: ['rgba(71,200,112,0.1)', 'rgba(0,0,0,0)'],
    ctaColors: ['#47C870', '#164422'],
    ctaForeground: '#042010',
    ctaGlowTop: 'rgba(71,200,112,0.32)',
    goShopCta: ['#58CC89', '#1B4D2E'],
    goShopForeground: '#042010',
  };
}

/** NEON: той самий «ідеальний» лайм, темний текст на CTA (як correctText у NEON) */
function shellNeon(): CardPackPaywallTheme {
  return {
    backdropBase: 'rgba(0,0,0,0.88)',
    outerGlow: [
      'rgba(200,255,0,0.5)',
      'rgba(200,255,0,0.1)',
      'rgba(35,50,0,0.55)',
    ],
    borderAccent: 'rgba(200,255,0,0.2)',
    handleColorLight: 'rgba(80,90,0,0.35)',
    handleColorDark: 'rgba(200,255,0,0.48)',
    iconBg: ['#343434', '#202020'],
    iconBorder: 'rgba(200,255,0,0.24)',
    priceBorder: 'rgba(200,255,0,0.16)',
    priceGradient: ['rgba(200,255,0,0.08)', 'rgba(0,0,0,0)'],
    ctaColors: ['#C8FF00', '#4A5C00'],
    ctaForeground: '#1A2400',
    ctaGlowTop: 'rgba(200,255,0,0.3)',
    goShopCta: ['#A3D900', '#3D4F00'],
    goShopForeground: '#1A2400',
  };
}

/** GOLD: navy + coral + синій correct, світлий текст на CTA (як у темі) */
function shellGold(): CardPackPaywallTheme {
  return {
    backdropBase: 'rgba(8,5,30,0.9)',
    outerGlow: [
      'rgba(255,100,100,0.3)',
      'rgba(74,144,255,0.2)',
      'rgba(20,18,50,0.5)',
    ],
    borderAccent: 'rgba(255,100,100,0.2)',
    handleColorLight: 'rgba(80,40,40,0.3)',
    handleColorDark: 'rgba(255,100,100,0.4)',
    iconBg: ['#2E2E58', '#1E1E3C'],
    iconBorder: 'rgba(255,100,100,0.2)',
    priceBorder: 'rgba(255,100,100,0.15)',
    priceGradient: ['rgba(74,144,255,0.1)', 'rgba(0,0,0,0)'],
    ctaColors: ['#FF6464', '#4A0A1A'],
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(255,100,100,0.3)',
    goShopCta: ['#4A90FF', '#15204A'],
    goShopForeground: '#FFFFFF',
  };
}

/** OCEAN: електричний циан + глибока вода, не «сіро-блакитна смуга» */
function shellOcean(): CardPackPaywallTheme {
  return {
    backdropBase: 'rgba(1, 14, 32, 0.58)',
    outerGlow: [
      'rgba(0, 210, 255, 0.5)',
      'rgba(0, 140, 255, 0.28)',
      'rgba(0, 25, 70, 0.42)',
    ],
    borderAccent: 'rgba(0, 180, 255, 0.42)',
    handleColorLight: 'rgba(0, 100, 180, 0.55)',
    handleColorDark: 'rgba(0, 200, 255, 0.55)',
    iconBg: ['#D6F0FF', '#7EC8FF'],
    iconBorder: 'rgba(0, 130, 230, 0.45)',
    ...OCEAN_DARK_PRICE_BLOCK,
    ctaColors: ['#0090E0', '#003A6E'],
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(0, 200, 255, 0.5)',
    goShopCta: ['#00A8FF', '#0060A8'],
    goShopForeground: '#FFFFFF',
  };
}

/** SAKURA: неонова вишня + закат, не «рожеве ніщо» */
function shellSakura(): CardPackPaywallTheme {
  return {
    backdropBase: 'rgba(50, 2, 28, 0.52)',
    outerGlow: [
      'rgba(255, 40, 130, 0.48)',
      'rgba(255, 100, 200, 0.3)',
      'rgba(150, 0, 80, 0.4)',
    ],
    borderAccent: 'rgba(255, 50, 150, 0.42)',
    handleColorLight: 'rgba(200, 0, 100, 0.45)',
    handleColorDark: 'rgba(255, 150, 210, 0.55)',
    iconBg: ['#FFE0F0', '#FF9EC8'],
    iconBorder: 'rgba(255, 40, 120, 0.45)',
    priceBorder: 'rgba(200, 0, 100, 0.32)',
    priceGradient: ['rgba(255, 80, 160, 0.22)', 'rgba(120, 0, 50, 0.08)'],
    ctaColors: ['#E01070', '#7A0038'],
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(255, 60, 160, 0.48)',
    goShopCta: ['#FF2088', '#9A0A4A'],
    goShopForeground: '#FFFFFF',
  };
}

const SHELL: Record<ThemeMode, CardPackPaywallTheme> = {
  dark: shellDark(),
  neon: shellNeon(),
  gold: shellGold(),
  ocean: shellOcean(),
  sakura: shellSakura(),
  minimalLight: shellGold(),
  minimalDark: shellDark(),
};

// ─── Легкі «смаки» категорії (набір) поверх оболонки теми ────────────────────

function categoryTweak(
  base: CardPackPaywallTheme,
  cat: FlashcardPackCategory,
): CardPackPaywallTheme {
  const g = [...base.outerGlow] as [string, string, string];
  switch (cat) {
    case 'daily':
      return base;
    case 'business': {
      g[0] = fadeRgba('rgba(59,130,246,0.22)', 1);
      g[2] = fadeRgba('rgba(15,30,50,0.4)', 1);
      return m(base, {
        outerGlow: g as [string, string, string],
        priceBorder: fadeRgba('rgba(59,130,246,0.2)', 1),
        iconBorder: fadeRgba('rgba(59,130,246,0.2)', 1),
      });
    }
    case 'travel': {
      g[1] = fadeRgba('rgba(200,150,50,0.12)', 1);
      return m(base, { outerGlow: g as [string, string, string] });
    }
    case 'exam': {
      g[0] = fadeRgba('rgba(109,40,217,0.2)', 1);
      return m(base, { outerGlow: g as [string, string, string], priceBorder: fadeRgba('rgba(109,40,217,0.12)', 1) });
    }
    case 'slang': {
      g[0] = fadeRgba('rgba(225,29,72,0.18)', 1);
      return m(base, { outerGlow: g as [string, string, string] });
    }
    case 'verbs': {
      g[0] = fadeRgba('rgba(45,90,50,0.3)', 1);
      g[2] = fadeRgba('rgba(50,40,20,0.35)', 1);
      return m(base, {
        outerGlow: g as [string, string, string],
        priceGradient: [fadeRgba('rgba(40,100,50,0.08)', 1), 'rgba(0,0,0,0)'] as [string, string],
      });
    }
    default:
      return base;
  }
}

/** Вбудовані Victoria-паки: легкий акцент поверх категорії. */
function packOverride(base: CardPackPaywallTheme, packId: string, _mode: ThemeMode): CardPackPaywallTheme {
  const g = [...base.outerGlow] as [string, string, string];
  switch (packId) {
    case OFFICIAL_PEAKY_BLINDERS_EN_ID:
      g[0] = fadeRgba('rgba(80,50,40,0.5)', 1);
      g[1] = fadeRgba('rgba(30,24,20,0.45)', 1);
      g[2] = fadeRgba('rgba(20,12,8,0.55)', 1);
      return m(base, {
        outerGlow: g,
        borderAccent: fadeRgba('rgba(200,60,50,0.32)', 1),
        priceBorder: fadeRgba('rgba(160,50,40,0.28)', 1),
      });
    case OFFICIAL_ROYAL_TEA_EN_ID:
      g[0] = fadeRgba('rgba(120,90,55,0.45)', 1);
      g[1] = fadeRgba('rgba(70,55,40,0.4)', 1);
      g[2] = fadeRgba('rgba(40,32,24,0.5)', 1);
      return m(base, {
        outerGlow: g,
        borderAccent: fadeRgba('rgba(210,170,90,0.35)', 1),
        priceBorder: fadeRgba('rgba(180,140,70,0.3)', 1),
      });
    case OFFICIAL_WILD_WEST_EN_ID:
      g[0] = fadeRgba('rgba(180,120,60,0.42)', 1);
      g[1] = fadeRgba('rgba(90,65,40,0.4)', 1);
      g[2] = fadeRgba('rgba(45,35,22,0.52)', 1);
      return m(base, {
        outerGlow: g,
        borderAccent: fadeRgba('rgba(200,150,80,0.32)', 1),
        priceBorder: fadeRgba('rgba(160,110,55,0.28)', 1),
      });
    case OFFICIAL_DARK_LOGIC_EN_ID:
      g[0] = fadeRgba('rgba(100,50,120,0.4)', 1);
      g[1] = fadeRgba('rgba(40,20,50,0.45)', 1);
      g[2] = fadeRgba('rgba(15,8,20,0.55)', 1);
      return m(base, {
        outerGlow: g,
        borderAccent: fadeRgba('rgba(180,90,200,0.3)', 1),
        priceBorder: fadeRgba('rgba(140,70,160,0.26)', 1),
      });
    case OFFICIAL_NEGOTIATOR_EN_ID:
      g[0] = fadeRgba('rgba(55,75,95,0.45)', 1);
      g[1] = fadeRgba('rgba(35,45,58,0.42)', 1);
      g[2] = fadeRgba('rgba(20,28,40,0.52)', 1);
      return m(base, {
        outerGlow: g,
        borderAccent: fadeRgba('rgba(100,140,180,0.32)', 1),
        priceBorder: fadeRgba('rgba(80,120,160,0.28)', 1),
      });
    default:
      return base;
  }
}

/**
 * @param isLight — ocean / sakura: послабити сяйво на світлому фоні картки
 */
export function getCardPackPaywallTheme(
  pack: FlashcardMarketPack,
  opts: { themeMode: ThemeMode; isLight?: boolean },
): CardPackPaywallTheme {
  const shell = SHELL[opts.themeMode] ?? SHELL.dark;
  let t = categoryTweak(shell, pack.category);
  t = packOverride(t, pack.id, opts.themeMode);
  if (opts.isLight) return forLightShell(t, opts.themeMode);
  return t;
}

/** Пресеты оболочки карточек для UGC community_packs.cardThemeKey */
const UGC_SHELL_PATCH: Record<
  string,
  Pick<CardPackPaywallTheme, 'outerGlow' | 'borderAccent' | 'ctaColors' | 'ctaForeground' | 'ctaGlowTop' | 'priceBorder'>
> = {
  neon_lime: {
    outerGlow: ['rgba(200,255,0,0.52)', 'rgba(200,255,0,0.14)', 'rgba(35,50,0,0.55)'] as const,
    borderAccent: 'rgba(200,255,0,0.34)',
    priceBorder: 'rgba(200,255,0,0.2)',
    ctaColors: ['#C8FF00', '#2a4000'] as const,
    ctaForeground: '#0a1200',
    ctaGlowTop: 'rgba(200,255,0,0.34)',
  },
  aqua_pulse: {
    outerGlow: ['rgba(0,220,255,0.45)', 'rgba(0,120,200,0.22)', 'rgba(0,30,60,0.5)'] as const,
    borderAccent: 'rgba(0,200,255,0.38)',
    priceBorder: 'rgba(0,180,240,0.22)',
    ctaColors: ['#00D0FF', '#003858'] as const,
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(0,210,255,0.4)',
  },
  magenta_pop: {
    outerGlow: ['rgba(255,0,110,0.48)', 'rgba(255,0,110,0.12)', 'rgba(40,0,24,0.52)'] as const,
    borderAccent: 'rgba(255,0,110,0.36)',
    priceBorder: 'rgba(255,0,110,0.22)',
    ctaColors: ['#FF006E', '#3a0020'] as const,
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(255,0,110,0.38)',
  },
  solar_gold: {
    outerGlow: ['rgba(255,190,60,0.42)', 'rgba(255,140,40,0.2)', 'rgba(50,30,0,0.5)'] as const,
    borderAccent: 'rgba(255,180,70,0.34)',
    priceBorder: 'rgba(255,160,50,0.2)',
    ctaColors: ['#FBB040', '#4a2800'] as const,
    ctaForeground: '#1a0e00',
    ctaGlowTop: 'rgba(255,180,60,0.36)',
  },
  violet_nebula: {
    outerGlow: ['rgba(167,139,250,0.45)', 'rgba(120,80,200,0.22)', 'rgba(20,10,40,0.52)'] as const,
    borderAccent: 'rgba(167,139,250,0.38)',
    priceBorder: 'rgba(140,100,220,0.22)',
    ctaColors: ['#A78BFA', '#2e1065'] as const,
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(180,150,255,0.36)',
  },
  ember_coal: {
    outerGlow: ['rgba(255,120,60,0.4)', 'rgba(60,30,20,0.45)', 'rgba(10,6,4,0.55)'] as const,
    borderAccent: 'rgba(255,130,80,0.32)',
    priceBorder: 'rgba(200,90,50,0.2)',
    ctaColors: ['#E85D3A', '#2a1010'] as const,
    ctaForeground: '#FFFFFF',
    ctaGlowTop: 'rgba(255,110,70,0.32)',
  },
};

/**
 * Декор карточек для UGC-наборов: ключ из Firestore `cardThemeKey`.
 */
export function getCommunityUgcPackPaywallTheme(
  themeKey: string | undefined,
  opts: { themeMode: ThemeMode; isLight?: boolean },
): CardPackPaywallTheme {
  const shell = SHELL[opts.themeMode] ?? SHELL.dark;
  const ids = UGC_CARD_THEME_IDS as readonly string[];
  const k = themeKey && ids.includes(String(themeKey)) ? String(themeKey) : UGC_CARD_THEME_DEFAULT_ID;
  const patch = UGC_SHELL_PATCH[k] ?? UGC_SHELL_PATCH[UGC_CARD_THEME_DEFAULT_ID];
  let t = m(shell, patch);
  t = categoryTweak(t, 'slang');
  if (opts.isLight) return forLightShell(t, opts.themeMode);
  return t;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
