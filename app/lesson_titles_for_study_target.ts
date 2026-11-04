import { triLang, type Lang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { classicCourseActiveFor } from './classic_course_phrases';
import { FRENCH_LESSON_CURRICULUM, frenchLessonCefrStage, frenchLessonTitle } from './french_lesson_curriculum';
import type { SourceLocale } from './study_target';
import type { StudyTargetLang } from './study_target_lang_dev';
import { storageStudyTarget } from './target_storage_keys';

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

/**
 * зачем (ночной выпуск 05.11, ревью классики; решение координатора): в данных нового классического курса fr/es/de/it нет названий уроков, а старые названия
 * (английский курс: «Present Simple…», французская программа) не соответствуют новому содержимому — например, у испанского урока 12 стояло «Past Simple: Неправильные».
 * Пока нет заголовков нового курса, для этих четырёх языков показываем нейтральное «Урок N» (строки те же, что уже стоят на экране итога урока). Английский не меняется.
 */
const CLASSIC_FALLBACK_TITLE_LESSON_COUNT = 32;
export function classicLessonNumberTitle(lang: Lang, lessonId: number): string {
  const n = lessonId;
  return triLang(lang, {
    ru: `Урок\u00A0${n}`, en: `Lesson\u00A0${n}`, uk: `Урок\u00A0${n}`, es: `Lección\u00A0${n}`, 'pt-BR': `Lição\u00A0${n}`,
    vi: `Bài\u00A0${n}`, id: `Pelajaran\u00A0${n}`, tr: `Ders\u00A0${n}`, pl: `Lekcja\u00A0${n}`,
  });
}
/** true — для языка курса вместо старых названий показывается «Урок N» (fr/es/de/it при включённых классических курсах). */
export function classicCourseUsesNumberedTitles(studyTarget: StudyTargetLang): boolean {
  return classicCourseActiveFor(studyTarget) && storageStudyTarget(studyTarget) !== 'en';
}

export function lessonNamesForStudyTarget(lang: Lang, studyTarget: StudyTargetLang): readonly string[] {
  if (classicCourseUsesNumberedTitles(studyTarget)) {
    return Array.from({ length: CLASSIC_FALLBACK_TITLE_LESSON_COUNT }, (_, index) => classicLessonNumberTitle(lang, index + 1));
  }
  const sourceLocale = sourceLocaleFromLang(lang);
  if (storageStudyTarget(studyTarget) === 'fr' && sourceLocale) {
    return FRENCH_LESSON_CURRICULUM.map((entry) => frenchLessonTitle(entry.id, sourceLocale) ?? missingFrenchLessonTitle(entry.id, sourceLocale));
  }
  return lessonNamesForLang(lang);
}

export function lessonNameForStudyTarget(
  lang: Lang,
  studyTarget: StudyTargetLang,
  lessonId: number,
): string | undefined {
  if (classicCourseUsesNumberedTitles(studyTarget)) {
    return lessonId >= 1 && lessonId <= CLASSIC_FALLBACK_TITLE_LESSON_COUNT ? classicLessonNumberTitle(lang, lessonId) : undefined;
  }
  const sourceLocale = sourceLocaleFromLang(lang);
  if (storageStudyTarget(studyTarget) === 'fr' && sourceLocale) {
    return frenchLessonTitle(lessonId, sourceLocale);
  }
  return lessonNamesForLang(lang)[lessonId - 1];
}

export function lessonCefrLabelForStudyTarget(lessonId: number, studyTarget: StudyTargetLang): string {
  if (storageStudyTarget(studyTarget) === 'fr') return frenchLessonCefrStage(lessonId) ?? 'A1';
  return lessonId <= 8 ? 'A1' : lessonId <= 18 ? 'A2' : lessonId <= 28 ? 'B1' : 'B2';
}

export default function __LessonTitlesForStudyTargetRouteShim() {
  return null;
}
