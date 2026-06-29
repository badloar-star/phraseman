import type { Lang } from '../constants/i18n';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';
import type { FlashcardContentLang } from './flashcards/types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { storageStudyTarget } from './target_storage_keys';

/**
 * Легаси-режим «учим испанский» (dev): оставлен только для старых веток данных.
 * Новый production-контракт целевых языков живет в study_target.ts.
 * French пока остается dev-only до source-gate approval.
 */
export function spanishStudyActive(studyTarget: StudyTargetLang): boolean {
  return ENABLE_DEV_STUDY_TARGET_LANG && studyTarget === 'es';
}

/** Режим «учим французский»: целевой контент, а не язык интерфейса. */
export function frenchStudyActive(studyTarget: StudyTargetLang): boolean {
  return ENABLE_DEV_STUDY_TARGET_LANG && storageStudyTarget(studyTarget) === 'fr';
}

/**
 * Spanish UI is a source/explanation language for learning English.
 * Dev Spanish-as-study-target may also unlock target-specific ES surfaces.
 */
export function spanishSurfacesEnabled(lang: Lang, studyTarget: StudyTargetLang): boolean {
  return lang === 'es' || spanishStudyActive(studyTarget);
}

/**
 * Spanish lesson UI/explanation strings are selected by interface language,
 * not by the studied target. With UI `es`, studyTarget should still remain `en`.
 */
export function spanishLessonUiStringsActive(lang: Lang, _studyTarget: StudyTargetLang): boolean {
  return lang === 'es';
}

/**
 * Card backs follow the interface/source language. The dev study target remains separate.
 */
export function flashcardContentLang(uiLang: Lang, _studyTarget: StudyTargetLang): FlashcardContentLang {
  if (uiLang === 'uk') return 'uk';
  if (uiLang === 'es') return 'es';
  return 'ru';
}

export default function __SpanishGateRouteShim() {
  return null;
}
