// irregular_verbs_for_target.ts — какой список неправильных глаголов показывать для выбранного курса.
// зачем (владелец 05.11: глаголы es/fr/de/it — в 150, по образцу английского): меню урока и экран глаголов раньше брали английский список
// напрямую; теперь английский курс получает прежний IRREGULAR_VERBS_BY_LESSON, курсы fr/es/de/it — свой список из modules/classic-courses,
// любой другой курс — пусто (раздел скрыт, английские глаголы под чужим курсом не показываются никогда).
import { IRREGULAR_VERBS_BY_LESSON, type IrregularVerb } from './irregular_verbs_data';
import { classicIrregularVerbsByLesson, classicVerbsActiveFor } from './classic_irregular_verbs';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

const EMPTY: Readonly<Record<number, IrregularVerb[]>> = Object.freeze({});

export function irregularVerbsByLessonFor(studyTarget?: RuntimeStudyTarget): Readonly<Record<number, IrregularVerb[]>> {
  const target = storageStudyTarget(studyTarget);
  if (target === 'en') return IRREGULAR_VERBS_BY_LESSON;
  if (classicVerbsActiveFor(target)) return classicIrregularVerbsByLesson(target);
  return EMPTY;
}

export function irregularVerbsForLesson(studyTarget: RuntimeStudyTarget, lessonId: number): IrregularVerb[] {
  return irregularVerbsByLessonFor(studyTarget)[lessonId] ?? [];
}

/** Есть ли в уроке хоть один новый неправильный глагол (иначе пункт меню скрыт). */
export function lessonHasIrregularVerbs(studyTarget: RuntimeStudyTarget, lessonId: number): boolean {
  return irregularVerbsForLesson(studyTarget, lessonId).length > 0;
}

/** Все глаголы курса подряд — пул правдоподобных неверных вариантов для тренажёра. */
export function allIrregularVerbsFor(studyTarget?: RuntimeStudyTarget): IrregularVerb[] {
  return Object.values(irregularVerbsByLessonFor(studyTarget)).flat();
}

/* expo-router route shim */
export default function __IrregularVerbsForTargetRouteShim() { return null; }
