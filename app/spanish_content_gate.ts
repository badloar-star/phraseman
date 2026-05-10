import type { Lang } from '../constants/i18n';
import { ENABLE_DEV_STUDY_TARGET_LANG, ENABLE_SPANISH_LOCALE } from './config';
import type { FlashcardContentLang } from './flashcards/types';
import type { StudyTargetLang } from './study_target_lang_dev';

/**
 * Режим «учим испанский» (dev): включено в настройках обучения.
 */
export function spanishStudyActive(studyTarget: StudyTargetLang): boolean {
  return ENABLE_DEV_STUDY_TARGET_LANG && studyTarget === 'es';
}

/**
 * Испанский в данных фраз / SRS / репортах — только когда в настройках вкл. изучение ES (dev).
 * Локаль интерфейса (lang === 'es') сама по себе не открывает испанский контент.
 */
export function spanishSurfacesEnabled(_lang: Lang, studyTarget: StudyTargetLang): boolean {
  return spanishStudyActive(studyTarget);
}

/**
 * Испанские строки теории урока (titleES, textEs, грамм.hint textEs…) — только при изучении ES
 * и испанском UI (и разрешённой локали). Сейчас при UI «es» цель в хранилище сбрасывается на EN,
 * ветка на будущее / согласованность.
 */
export function spanishLessonUiStringsActive(lang: Lang, studyTarget: StudyTargetLang): boolean {
  return spanishStudyActive(studyTarget) && ENABLE_SPANISH_LOCALE && lang === 'es';
}

/**
 * Мова перекладу / пояснень на флешках: узгоджена з режимом «що вчимо».
 * При вивченні англійського не підставляємо ES-колонку лише через es-інтерфейс
 * (інакше іспанські глоси «лізуть» у EN-режим).
 */
export function flashcardContentLang(uiLang: Lang, studyTarget: StudyTargetLang): FlashcardContentLang {
  if (spanishStudyActive(studyTarget)) {
    if (uiLang === 'uk') return 'uk';
    if (uiLang === 'es') return 'es';
    return 'ru';
  }
  if (uiLang === 'uk') return 'uk';
  return 'ru';
}

export default function __SpanishGateRouteShim() {
  return null;
}
