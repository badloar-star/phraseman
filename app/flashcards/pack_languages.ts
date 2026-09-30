import type { Lang } from '../../constants/i18n';

/** Languages a pack can be studied in (and that the catalog can filter by). */
// зачем (D130, владелец 30.09): итальянский — язык набора в карточках.
export type StudyPackLanguage = 'en' | 'fr' | 'de' | 'es' | 'it';

/**
 * зачем (D127, владелец 2026-09-30): наборы «без языка» — столицы, формулы,
 * термины. У них нет изучаемого языка, поэтому их нельзя озвучивать и нельзя
 * прятать фильтром по языку. 'none' появляется ТОЛЬКО при явном выборе автора;
 * старые наборы без поля по-прежнему считаются английскими.
 */
export type PackLanguage = StudyPackLanguage | 'none';

export const NO_PACK_LANGUAGE = 'none' as const;

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

/** Study languages only — used by language filters and the saved-card contour. */
export const PACK_LANGUAGES: readonly StudyPackLanguage[] = ['en', 'fr', 'de', 'es', 'it'];

/** Everything an author may pick when creating a pack, including «Без языка». */
export const PACK_LANGUAGE_CHOICES: readonly PackLanguage[] = [...PACK_LANGUAGES, NO_PACK_LANGUAGE];

export const PACK_LANGUAGE_META: Readonly<Record<PackLanguage, PackLanguageMeta>> = {
  en: { code: 'en', nativeName: 'English', shortName: 'EN', flagGlyph: '🇬🇧' },
  fr: { code: 'fr', nativeName: 'Français', shortName: 'FR', flagGlyph: '🇫🇷' },
  de: { code: 'de', nativeName: 'Deutsch', shortName: 'DE', flagGlyph: '🇩🇪' },
  es: { code: 'es', nativeName: 'Español', shortName: 'ES', flagGlyph: '🇪🇸' },
  it: { code: 'it', nativeName: 'Italiano', shortName: 'IT', flagGlyph: '🇮🇹' },
  // Нейтральный значок вместо флага: у набора нет страны и языка.
  none: { code: 'none', nativeName: 'Без языка', shortName: '—', flagGlyph: '🌐' },
};

export function isPackLanguage(value: unknown): value is PackLanguage {
  return typeof value === 'string' && PACK_LANGUAGE_CHOICES.includes(value as PackLanguage);
}

export function isStudyPackLanguage(value: unknown): value is StudyPackLanguage {
  return typeof value === 'string' && PACK_LANGUAGES.includes(value as StudyPackLanguage);
}

/**
 * Legacy packs used studyTarget or no target at all; both are English by default.
 * 'none' survives only when it was stored explicitly — a StudyTarget is never 'none'.
 */
export function normalizePackLanguage(value: unknown): PackLanguage {
  return isPackLanguage(value) ? value : 'en';
}

/** The pack catalog may expose the four pack languages without widening StudyTarget. */
export function defaultPackLanguageForStudyTarget(value: unknown): StudyPackLanguage {
  return isStudyPackLanguage(value) ? value : 'en';
}

/** A «Без языка» pack is never voiced: no TTS, no audio prefetch, no speaking mode. */
export function packLanguageHasVoice(language: unknown): boolean {
  return normalizePackLanguage(language) !== NO_PACK_LANGUAGE;
}

/**
 * Catalog/collection language filter. A pack without a language is not tied to
 * any study language, so it stays visible whichever language is selected.
 */
export function packMatchesLanguageFilter(packLanguage: unknown, selected: PackLanguage): boolean {
  const language = normalizePackLanguage(packLanguage);
  return language === NO_PACK_LANGUAGE || language === normalizePackLanguage(selected);
}

/** «Без языка» in the 9 interface languages. */
export function noPackLanguageLabel(lang?: Lang): string {
  if (lang === 'uk') return 'Без мови';
  if (lang === 'en') return 'No language';
  if (lang === 'es') return 'Sin idioma';
  if (lang === 'pt-BR') return 'Sem idioma';
  if (lang === 'vi') return 'Không có ngôn ngữ';
  if (lang === 'id') return 'Tanpa bahasa';
  if (lang === 'tr') return 'Dilsiz';
  if (lang === 'pl') return 'Bez języka';
  return 'Без языка';
}

export function packLanguageLabel(language: PackLanguage, lang?: Lang): string {
  const normalized = normalizePackLanguage(language);
  if (normalized === NO_PACK_LANGUAGE) return noPackLanguageLabel(lang);
  return PACK_LANGUAGE_META[normalized].nativeName;
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
  return cards.filter((card) => packMatchesLanguageFilter(card.packLanguage, language));
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
