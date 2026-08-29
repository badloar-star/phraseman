/** Presets for UGC pack card chrome (`community_packs.cardThemeKey`). Labels for editor stepper. */

import { triLang, type Lang } from '../../constants/i18n';

export const UGC_CARD_THEME_DEFAULT_ID = 'neon_lime';

export const UGC_CARD_THEME_IDS = [
  'neon_lime',
  'aqua_pulse',
  'magenta_pop',
  'solar_gold',
  'violet_nebula',
  'ember_coal',
] as const;

export type UgcCardThemeId = (typeof UGC_CARD_THEME_IDS)[number];

export const UGC_CARD_THEME_LABELS: Record<UgcCardThemeId, {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}> = {
  neon_lime: {
    ru: 'Лайм неон',
    uk: 'Лайм неон',
    es: 'Lima neón',
    'pt-BR': 'Lima neon',
    vi: 'Xanh chanh neon',
    id: 'Lime neon',
    tr: 'Neon lime',
    pl: 'Neonowa limonka',
  },
  aqua_pulse: {
    ru: 'Циан / вода',
    uk: 'Бірюза / вода',
    es: 'Cian / agua',
    'pt-BR': 'Ciano / água',
    vi: 'Xanh cyan / nước',
    id: 'Sian / air',
    tr: 'Camgöbeği / su',
    pl: 'Cyjan / woda',
  },
  magenta_pop: {
    ru: 'Маджента',
    uk: 'Маджента',
    es: 'Magenta',
    'pt-BR': 'Magenta',
    vi: 'Đỏ tím',
    id: 'Magenta',
    tr: 'Macenta',
    pl: 'Magenta',
  },
  solar_gold: {
    ru: 'Золото',
    uk: 'Золото',
    es: 'Oro',
    'pt-BR': 'Ouro',
    vi: 'Vàng',
    id: 'Emas',
    tr: 'Altın',
    pl: 'Złoto',
  },
  violet_nebula: {
    ru: 'Фиолет',
    uk: 'Фіолет',
    es: 'Violeta',
    'pt-BR': 'Violeta',
    vi: 'Tím',
    id: 'Ungu',
    tr: 'Mor',
    pl: 'Fiolet',
  },
  ember_coal: {
    ru: 'Уголь / янтарь',
    uk: 'Вугіль / бурштин',
    es: 'Carbón / ámbar',
    'pt-BR': 'Carvão / âmbar',
    vi: 'Than / hổ phách',
    id: 'Arang / amber',
    tr: 'Kömür / kehribar',
    pl: 'Węgiel / bursztyn',
  },
};

export function isUgcCardThemeId(s: string): s is UgcCardThemeId {
  return (UGC_CARD_THEME_IDS as readonly string[]).includes(s);
}

export function ugcCardThemeLabel(id: string, lang: Lang): string {
  if (isUgcCardThemeId(id)) {
    const label = UGC_CARD_THEME_LABELS[id];
    return triLang(lang, {
      ru: label.ru,
      uk: label.uk,
      en: label.ru,
      es: label.es,
      'pt-BR': label['pt-BR'],
      vi: label.vi,
      id: label.id,
      tr: label.tr,
      pl: label.pl,
    });
  }
  return id;
}

/**
 * Акцент выбранной палитры набора — ОТДЕЛЬНО от декора paywall-модалки.
 *
 * зачем 2026-08-13 (владелец: «цвет карточек не работает, проверял на светлой теме»):
 * раньше цвет карточек брался из `getCommunityUgcPackPaywallTheme`, а тот в светлой
 * теме `sagePorcelain` возвращает спокойную фарфоровую оболочку ДО применения палитры —
 * выбор пользователя не влиял ни на превью, ни на карточки набора. Здесь палитра живёт
 * сама по себе и работает во всех темах; у светлых тем — затемнённый вариант акцента,
 * чтобы он читался на белой поверхности.
 */
const UGC_CARD_ACCENT: Record<UgcCardThemeId, { dark: string; light: string }> = {
  neon_lime: { dark: '#C8FF00', light: '#6F8C00' },
  aqua_pulse: { dark: '#00D0FF', light: '#0E7490' },
  magenta_pop: { dark: '#FF006E', light: '#C01360' },
  solar_gold: { dark: '#FBB040', light: '#B4720F' },
  violet_nebula: { dark: '#A78BFA', light: '#6D46D6' },
  ember_coal: { dark: '#E85D3A', light: '#B8431F' },
};

export function ugcCardThemeAccent(id: string, opts?: { isLight?: boolean }): string {
  const key: UgcCardThemeId = isUgcCardThemeId(id) ? id : UGC_CARD_THEME_DEFAULT_ID;
  const pair = UGC_CARD_ACCENT[key];
  return opts?.isLight ? pair.light : pair.dark;
}

export type UgcCardChrome = {
  accent: string;
  borderAccent: string;
  frontGradient: [string, string];
  backGradient: [string, string];
};

/**
 * Хром карточки набора: лицевая/оборотная заливка и рамка от выбранной палитры.
 * Один источник правды для превью в редакторе и для карточек набора в коллекции.
 */
export function ugcCardChrome(
  id: string | undefined,
  opts: { isLight?: boolean; bgCard: string; bgSurface: string },
): UgcCardChrome {
  const accent = ugcCardThemeAccent(id ?? UGC_CARD_THEME_DEFAULT_ID, { isLight: opts.isLight });
  /** Светлая тема требует более плотной заливки — иначе оттенок теряется на белом. */
  const frontAlpha = opts.isLight ? '2E' : '3E';
  const backAlpha = opts.isLight ? '24' : '32';
  return {
    accent,
    borderAccent: `${accent}${opts.isLight ? '99' : '66'}`,
    frontGradient: [`${accent}${frontAlpha}`, opts.bgCard],
    backGradient: [`${accent}${backAlpha}`, opts.bgSurface],
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
