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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
