/**
 * Learning V2 — какие занятия показываем игроку.
 *
 * зачем (владелец 11.10, дословно: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): курс входит в стор-сборку, а часть
 * занятий из бандла не собирается (нет озвучки, ошибка фабрики) — тап по такому вёл в «Сессия недоступна». Игрок видит
 * только занятия, которые реально открываются.
 *
 * Почему НЕПРЕРЫВНЫЙ префикс, а не «все, что собираются»: прогресс курса — строгая цепочка (засчитанное = префикс порядка
 * курса, course_local_progress_v1.ts), каталог фабрики привязан к позиции. Внутри префикса дыр нет, поэтому «следующее»
 * никогда не упирается в скрытое и схема прогресса не меняется.
 *
 * Число берётся из сгенерированного артефакта; его пишет tests/learning_v2_bundle_availability.test.ts тем же проходом, что
 * проверяет сборку занятий. Починил Codex занятия — перегенерация, правка кода не нужна.
 * Логи: префикс [V2-AVAILABILITY].
 */
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../modules/learning-v2/content/course_topology_v1';
import { LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 } from './learning_v2_bundle_availability_v1.generated';

/** Позиция занятия в курсе с нуля (урок 1 занятие 1 → 0). Некорректные координаты → -1. */
export function learningV2SessionCourseIndexV1(lessonOrdinal: number, sessionOrdinal: number): number {
  if (!Number.isInteger(lessonOrdinal) || !Number.isInteger(sessionOrdinal)) return -1;
  if (lessonOrdinal < 1 || sessionOrdinal < 1 || sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1) return -1;
  return (lessonOrdinal - 1) * LEARNING_V2_LESSON_SESSION_COUNT_V1 + (sessionOrdinal - 1);
}

/** Выпущено ли занятие: его позиция внутри непрерывного префикса собирающихся занятий. */
export function isLearningV2SessionReleasedV1(
  lessonOrdinal: number,
  sessionOrdinal: number,
  ceiling: number = LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1,
): boolean {
  const index = learningV2SessionCourseIndexV1(lessonOrdinal, sessionOrdinal);
  return index >= 0 && index < ceiling;
}

/** Сколько занятий выпущено (длина префикса). */
export const LEARNING_V2_RELEASED_SESSION_COUNT_V1: number = LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1;

/** Есть ли что показать вообще. Нет — вход в курс не показываем (без пустых экранов). */
export const LEARNING_V2_HAS_RELEASED_SESSIONS_V1: boolean = LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 > 0;

/** Последний урок, в котором есть выпущенные занятия (0 — нет ни одного). */
export function lastLearningV2ReleasedLessonOrdinalV1(ceiling: number = LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1): number {
  if (ceiling <= 0) return 0;
  return Math.floor((ceiling - 1) / LEARNING_V2_LESSON_SESSION_COUNT_V1) + 1;
}
