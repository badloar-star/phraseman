import type { Lang } from '../../constants/i18n';

export type PackLanguage = 'en' | 'fr' | 'de' | 'es';

export type PackLanguageMeta = {
  code: PackLanguage;
  nativeName: string;
  shortName: string;
  flagGlyph: string;
};

export type PackCardTextInput = {
  targetText?: unknown;
  translationText?: unknown;
  en?: unknown;
  ru?: unknown;
  uk?: unknown;
  es?: unknown;
  sourceLocales?: Record<string, unknown> | null;
};

export type NormalizedPackCardText = {
  targetText: string;
  translationText: string;
};

export const PACK_LANGUAGES: readonly PackLanguage[] = ['en', 'fr', 'de', 'es'];

export const PACK_LANGUAGE_META: Readonly<Record<PackLanguage, PackLanguageMeta>> = {
  en: { code: 'en', nativeName: 'English', shortName: 'EN', flagGlyph: '🇬🇧' },
  fr: { code: 'fr', nativeName: 'Français', shortName: 'FR', flagGlyph: '🇫🇷' },
  de: { code: 'de', nativeName: 'Deutsch', shortName: 'DE', flagGlyph: '🇩🇪' },
  es: { code: 'es', nativeName: 'Español', shortName: 'ES', flagGlyph: '🇪🇸' },
};

export function isPackLanguage(value: unknown): value is PackLanguage {
  return typeof value === 'string' && PACK_LANGUAGES.includes(value as PackLanguage);
}

/** Legacy packs used studyTarget or no target at all; both are English by default. */
export function normalizePackLanguage(value: unknown): PackLanguage {
  return isPackLanguage(value) ? value : 'en';
}

/** The pack catalog may expose the four pack languages without widening StudyTarget. */
export function defaultPackLanguageForStudyTarget(value: unknown): PackLanguage {
  return isPackLanguage(value) ? value : 'en';
}

export function packLanguageLabel(language: PackLanguage): string {
  return PACK_LANGUAGE_META[normalizePackLanguage(language)].nativeName;
}

export function packLanguageMeta(language: unknown): PackLanguageMeta {
  return PACK_LANGUAGE_META[normalizePackLanguage(language)];
}

export function normalizePackLanguageRecord(record: unknown): PackLanguage {
  if (!record || typeof record !== 'object') return 'en';
  const value = record as { packLanguage?: unknown; studyTarget?: unknown };
  return normalizePackLanguage(value.packLanguage ?? value.studyTarget);
}

/** Keep saved cards in the selected language contour; legacy cards are English. */
export function filterCardsByPackLanguage<T extends { packLanguage?: unknown }>(
  cards: readonly T[],
  language: PackLanguage,
): T[] {
  return cards.filter((card) => normalizePackLanguage(card.packLanguage) === language);
}

function nonEmptyText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

export function normalizePackCardTexts(
  input: PackCardTextInput,
  _packLanguage: PackLanguage,
): NormalizedPackCardText {
  const targetText = nonEmptyText(input.targetText) ?? nonEmptyText(input.en) ?? '';
  const sourceLocales = input.sourceLocales ?? {};
  const translationText = nonEmptyText(input.translationText)
    ?? nonEmptyText(input.ru)
    ?? nonEmptyText(input.uk)
    ?? nonEmptyText(input.es)
    ?? nonEmptyText(sourceLocales['pt-BR'])
    ?? nonEmptyText(sourceLocales.vi)
    ?? nonEmptyText(sourceLocales.id)
    ?? nonEmptyText(sourceLocales.tr)
    ?? nonEmptyText(sourceLocales.pl)
    ?? '';
  return { targetText, translationText };
}

/** UI copy stays in the user's interface language; the language name stays native. */
export function packLanguagePickerHint(lang: Lang): string {
  if (lang === 'uk') return 'Мова наборів';
  if (lang === 'en') return 'Pack language';
  if (lang === 'es') return 'Idioma de los sets';
  if (lang === 'pt-BR') return 'Idioma dos conjuntos';
  if (lang === 'vi') return 'Ngôn ngữ bộ thẻ';
  if (lang === 'id') return 'Bahasa set';
  if (lang === 'tr') return 'Set dili';
  if (lang === 'pl') return 'Język zestawu';
  return 'Язык наборов';
}

/* expo-router route shim: keeps the pure module out of the route tree. */
export default function __RouteShim() { return null; }
