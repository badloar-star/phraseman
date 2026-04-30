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

export const UGC_CARD_THEME_LABELS: Record<UgcCardThemeId, { ru: string; uk: string; es: string }> = {
  neon_lime: { ru: 'Лайм неон', uk: 'Лайм неон', es: 'Lima neón' },
  aqua_pulse: { ru: 'Циан / вода', uk: 'Бірюза / вода', es: 'Cian / agua' },
  magenta_pop: { ru: 'Маджента', uk: 'Маджента', es: 'Magenta' },
  solar_gold: { ru: 'Золото', uk: 'Золото', es: 'Oro' },
  violet_nebula: { ru: 'Фиолет', uk: 'Фіолет', es: 'Violeta' },
  ember_coal: { ru: 'Уголь / янтарь', uk: 'Вугіль / бурштин', es: 'Carbón / ámbar' },
};

export function isUgcCardThemeId(s: string): s is UgcCardThemeId {
  return (UGC_CARD_THEME_IDS as readonly string[]).includes(s);
}

export function ugcCardThemeLabel(id: string, lang: Lang): string {
  if (isUgcCardThemeId(id)) {
    return triLang(lang, UGC_CARD_THEME_LABELS[id]);
  }
  return id;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
