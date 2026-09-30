// ═══ Стили визитки «Про» (D114, макет profile-card-pro.html) ═══════════════════
// зачем: единый список 6 стилей A–F. Его же проверяет сервер
// (functions/src/public_profile_projection.ts → PROFILE_CARD_PRO_STYLES): стиль вне
// списка не проецируется. Меняешь список — меняй ОБА места.
import type { Lang } from '../constants/i18n';

export const PROFILE_CARD_PRO_STYLE_IDS = ['holo', 'obs', 'aura', 'ice', 'space', 'neon'] as const;
export type ProfileCardProStyle = (typeof PROFILE_CARD_PRO_STYLE_IDS)[number];
/** 'normal' — обычная визитка; остальные — стили «Про». */
export type ProfileCardLook = 'normal' | ProfileCardProStyle;

/** Стиль, который подсвечен в покупке по умолчанию (как в макете VC-BUY). */
export const PROFILE_CARD_DEFAULT_PRO_STYLE: ProfileCardProStyle = 'obs';

export function isProfileCardProStyle(value: unknown): value is ProfileCardProStyle {
  return typeof value === 'string' && (PROFILE_CARD_PRO_STYLE_IDS as readonly string[]).includes(value);
}

type StyleName = Readonly<{ ru: string } & Partial<Record<string, string>>>;

const NAMES: Readonly<Record<ProfileCardLook, StyleName>> = {
  normal: { ru: 'Обычная', uk: 'Звичайна', en: 'Classic', es: 'Clásica', 'pt-BR': 'Clássico', vi: 'Cơ bản', id: 'Biasa', tr: 'Klasik', pl: 'Zwykła' },
  holo: { ru: 'Голограмма', uk: 'Голограма', en: 'Hologram', es: 'Holograma', 'pt-BR': 'Holograma', vi: 'Ảnh ba chiều', id: 'Hologram', tr: 'Hologram', pl: 'Hologram' },
  obs: { ru: 'Обсидиан', uk: 'Обсидіан', en: 'Obsidian', es: 'Obsidiana', 'pt-BR': 'Obsidiana', vi: 'Hắc diện thạch', id: 'Obsidian', tr: 'Obsidyen', pl: 'Obsydian' },
  aura: { ru: 'Аура', uk: 'Аура', en: 'Aura', es: 'Aura', 'pt-BR': 'Aura', vi: 'Hào quang', id: 'Aura', tr: 'Aura', pl: 'Aura' },
  ice: { ru: 'Хрусталь', uk: 'Кришталь', en: 'Crystal', es: 'Cristal', 'pt-BR': 'Cristal', vi: 'Pha lê', id: 'Kristal', tr: 'Kristal', pl: 'Kryształ' },
  space: { ru: 'Космос', uk: 'Космос', en: 'Space', es: 'Cosmos', 'pt-BR': 'Cosmos', vi: 'Vũ trụ', id: 'Angkasa', tr: 'Uzay', pl: 'Kosmos' },
  neon: { ru: 'Неон', uk: 'Неон', en: 'Neon', es: 'Neón', 'pt-BR': 'Neon', vi: 'Neon', id: 'Neon', tr: 'Neon', pl: 'Neon' },
};

export function profileCardLookName(look: ProfileCardLook, lang: Lang): string {
  return NAMES[look][lang] ?? NAMES[look].ru;
}

/** Что показать: «Про» со стилем → стиль; иначе обычная. Неизвестный стиль → обычная. */
export function resolveProfileCardLook(input: Readonly<{ pro: unknown; style: unknown }>): ProfileCardLook {
  return input.pro === true && isProfileCardProStyle(input.style) ? input.style : 'normal';
}
