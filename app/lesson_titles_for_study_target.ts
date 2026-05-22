import type { Lang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { FRENCH_LESSON_CURRICULUM, frenchLessonCefrStage, frenchLessonTitle } from './french_lesson_curriculum';
import type { SourceLocale } from './study_target';
import type { StudyTargetLang } from './study_target_lang_dev';

function sourceLocaleFromLang(lang: Lang): SourceLocale | Lang | null {
  if (lang === 'ru' || lang === 'uk') return lang;
  if (lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl') return lang;
  return null;
}

function missingFrenchLessonTitle(lessonId: number, lang: SourceLocale | Lang): string {
  if (lang === 'ru') return `Французский урок ${lessonId}`;
  if (lang === 'uk') return `Французький урок ${lessonId}`;
  if (lang === 'pt-BR') return `Aula de francês ${lessonId}`;
  if (lang === 'vi') return `Bài học tiếng Pháp ${lessonId}`;
  if (lang === 'id') return `Pelajaran bahasa Prancis ${lessonId}`;
  if (lang === 'tr') return `Fransızca dersi ${lessonId}`;
  if (lang === 'pl') return `Lekcja francuskiego ${lessonId}`;
  return `French lesson ${lessonId}`;
}

export function lessonNamesForStudyTarget(lang: Lang, studyTarget: StudyTargetLang): readonly string[] {
  const sourceLocale = sourceLocaleFromLang(lang);
  if (studyTarget === 'fr' && sourceLocale) {
    return FRENCH_LESSON_CURRICULUM.map((entry) => frenchLessonTitle(entry.id, sourceLocale) ?? missingFrenchLessonTitle(entry.id, sourceLocale));
  }
  return lessonNamesForLang(lang);
}

export function lessonNameForStudyTarget(
  lang: Lang,
  studyTarget: StudyTargetLang,
  lessonId: number,
): string | undefined {
  const sourceLocale = sourceLocaleFromLang(lang);
  if (studyTarget === 'fr' && sourceLocale) {
    return frenchLessonTitle(lessonId, sourceLocale);
  }
  return lessonNamesForLang(lang)[lessonId - 1];
}

export function lessonCefrLabelForStudyTarget(lessonId: number, studyTarget: StudyTargetLang): string {
  if (studyTarget === 'fr') return frenchLessonCefrStage(lessonId) ?? 'A1';
  return lessonId <= 8 ? 'A1' : lessonId <= 18 ? 'A2' : lessonId <= 28 ? 'B1' : 'B2';
}

export default function __LessonTitlesForStudyTargetRouteShim() {
  return null;
}
