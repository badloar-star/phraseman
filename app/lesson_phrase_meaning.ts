import type { Lang } from '../constants/i18n';
import { spanishStudyActive } from './spanish_content_gate';
import type { LessonPhrase } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';

const CLASSIC_SOURCE_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function isPlannedLessonSourceLang(lang: Lang): lang is 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' {
  return lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl';
}

function legacyLessonPhraseMeaningForLang(
  phrase: Pick<LessonPhrase, 'russian' | 'ukrainian' | 'spanish' | 'english' | 'sourceLocales'>,
  lang: Lang,
  studyTarget: StudyTargetLang,
): string {
  if (isPlannedLessonSourceLang(lang)) {
    return phrase.sourceLocales?.[lang]?.trim() || phrase.russian || phrase.ukrainian || phrase.spanish || '';
  }
  if (lang === 'uk') return phrase.ukrainian || phrase.russian || '';
  if (spanishStudyActive(studyTarget)) {
    if (lang === 'es') return phrase.spanish ?? phrase.russian ?? '';
    return phrase.russian ?? '';
  }
  if (lang === 'es') return phrase.russian || phrase.ukrainian || phrase.english || '';
  return phrase.russian ?? '';
}

export function lessonPhraseMeaningForLang(
  phrase: Pick<LessonPhrase, 'russian' | 'ukrainian' | 'spanish' | 'english' | 'sourceLocales' | 'classic'>,
  lang: Lang,
  studyTarget: StudyTargetLang,
): string {
  const classicSourceLocales = phrase.classic?.sourceLocales as Record<string, unknown> | undefined;
  if (
    (CLASSIC_SOURCE_LANGS as readonly string[]).includes(lang)
    && classicSourceLocales
    && Object.prototype.hasOwnProperty.call(classicSourceLocales, lang)
  ) {
    const localized = classicSourceLocales[lang];
    if (typeof localized === 'string' && localized.trim()) return localized.trim();
  }
  return legacyLessonPhraseMeaningForLang(phrase, lang, studyTarget);
}

export default function __LessonPhraseMeaningRouteShim() {
  return null;
}
