import { LEARNING_V2_OWNER_LAYOUT } from './learningV2OwnerLayout';

const { nodeSize, mapStep } = LEARNING_V2_OWNER_LAYOUT.map;

/**
 * Место под подпись занятия ПОД кружком (владелец 20.09: «тексты обрезаются
 * экраном, делай их под кнопками»).
 *
 * Сбоку подпись не помещалась: змейка уводит кружок на ±71px от центра, и
 * текст упирался в край экрана. Под кружком ширина не ограничена, но нужна
 * вертикаль: кружок 101 + отступ 8 + две строки по 16 = 141, а базовый шаг
 * 128 оставлял на подпись 27px, и соседние подписи налезали друг на друга.
 *
 * Базовую раскладку (learningV2OwnerLayout) не трогаем: mapStep там общий.
 */
const SESSION_LABEL_BLOCK = 40;
const MAP_STEP_WITH_LABEL = Math.max(mapStep, nodeSize + SESSION_LABEL_BLOCK + 12);
/**
 * Запас сверху для ПЕРВОГО занятия курса.
 *
 * зачем: владелец 21.09 — «при открытии ничего не должно обрезаться на карте,
 * но анимация первого кружка обрезается верхним краем». Кружок 101px, но его
 * гало раздувается до scale 1.14 (LearningV2MapNode, haloStyle) — это ещё
 * ~7px сверху за габаритом строки. Вдобавок вступление карты сдвигает её на
 * 24px вверх (mapEntryStyle, translateY). При отступе 56 верх свечения
 * уходил под край экрана.
 * 56 + 7 (гало) + 24 (вступление) = 87, округляем до 88.
 */
const FIRST_SESSION_TOP_PADDING = 88;

/** Session 1 starts near the top; later current sessions remain centered. */
export function pulseMapGeometry(viewportHeight: number, sessionOrdinal: number): Readonly<{
  padding: number; offset: number; step: number; nodeSize: number;
}> {
  const height = Math.max(0, viewportHeight);
  const ordinal = Math.max(1, Math.min(56, sessionOrdinal));
  const centeredPadding = Math.max(0, (height - MAP_STEP_WITH_LABEL) / 2);
  return {
    padding: ordinal === 1 ? Math.min(centeredPadding, FIRST_SESSION_TOP_PADDING) : centeredPadding,
    offset: (ordinal - 1) * MAP_STEP_WITH_LABEL,
    step: MAP_STEP_WITH_LABEL,
    nodeSize,
  };
}

export function pulseMapOffsetX(index: number, width: number): number {
  const amplitude = Math.max(0, Math.min(82, (width - nodeSize - 48) / 2));
  return Math.sin(index * Math.PI / 3) * amplitude;
}

export interface PulseCourseSection {
  readonly label: string;
  readonly first: number;
  readonly last: number;
}

// Add future B2/C1 sections here; the horizontal rail and lesson filter are data-driven.
export const PULSE_COURSE_SECTIONS: readonly PulseCourseSection[] = Object.freeze([
  { label: 'A1', first: 1, last: 8 },
  { label: 'A2', first: 9, last: 16 },
  { label: 'B1', first: 17, last: 32 },
]);

/** Only the two owner-confirmed, fully written lessons are learner content today. */
export function isPulseLessonAuthored(lessonOrdinal: number): boolean {
  return lessonOrdinal === 1 || lessonOrdinal === 2;
}

/** Every canonical lesson map is inspectable in the early-access release. */
export function isPulseLessonMapAvailable(lessonOrdinal: number): boolean {
  return Number.isInteger(lessonOrdinal) && lessonOrdinal >= 1 && lessonOrdinal <= 32;
}

/** A lesson stays visibly under construction until all 56 runtime sessions exist. */
export function isPulseLessonWorkInProgress(
  lessonOrdinal: number,
  availableSessionIds: ReadonlySet<string>,
): boolean {
  if (!isPulseLessonMapAvailable(lessonOrdinal)) return true;
  const lesson = String(lessonOrdinal).padStart(2, '0');
  for (let sessionOrdinal = 1; sessionOrdinal <= 56; sessionOrdinal += 1) {
    const session = String(sessionOrdinal).padStart(2, '0');
    if (!availableSessionIds.has(`lesson-${lesson}:session:${session}`)) return true;
  }
  return false;
}

/**
 * Learner access is sequential: lesson 1 starts open, and each authored lesson
 * opens only after all 56 sessions of the previous lesson are complete. DEV's
 * explicit unlock control is a presentation override for every draft lesson.
 */
export function isPulseLessonAvailable(
  lessonOrdinal: number,
  completedSessionIds: ReadonlySet<string> = new Set<string>(),
  devUnlockAll = false,
): boolean {
  if (devUnlockAll) return lessonOrdinal >= 1 && lessonOrdinal <= 32;
  if (!isPulseLessonAuthored(lessonOrdinal)) return false;
  if (lessonOrdinal === 1) return true;
  for (let sessionOrdinal = 1; sessionOrdinal <= 56; sessionOrdinal += 1) {
    const lesson = String(lessonOrdinal - 1).padStart(2, '0');
    const session = String(sessionOrdinal).padStart(2, '0');
    if (!completedSessionIds.has(`lesson-${lesson}:session:${session}`)) return false;
  }
  return true;
}

export function pulseCourseSectionForLesson(
  lessonOrdinal: number,
  sections: readonly PulseCourseSection[] = PULSE_COURSE_SECTIONS,
): PulseCourseSection {
  const fallback = sections[0] ?? { label: 'A1', first: 1, last: Number.MAX_SAFE_INTEGER };
  return sections.find(section => lessonOrdinal >= section.first && lessonOrdinal <= section.last) ?? fallback;
}
