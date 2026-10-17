// learningV2Icons.ts — выбор иконки и узора урока/главы карты V2 по номерам.
//
// зачем (владелец 17.10): у каждого урока и каждой главы своя иконка, у плашки главы — свой узор. Данные — из макета
// (learningV2IconData.generated.ts). Урок без рисунков (9+) → null: экран оставляет прежний значок (фолбэк), ничего не падает.
import {
  LEARNING_V2_ICON_LESSONS,
  LEARNING_V2_LESSON1_PATTERNS,
  type LearningV2IconPattern,
  type LearningV2IconShape,
} from './learningV2IconData.generated';
import { LEARNING_V2_CHAPTER_HUE_SHIFT, LEARNING_V2_LESSON_HUE_SHIFT } from './learningV2IconHue';

const byLesson = new Map(LEARNING_V2_ICON_LESSONS.map((lesson) => [lesson.n, lesson]));

export function learningV2LessonIcon(lessonOrdinal: number): readonly LearningV2IconShape[] | null {
  return byLesson.get(lessonOrdinal)?.icon ?? null;
}

export function learningV2ChapterIcon(lessonOrdinal: number, chapterOrdinal: number): readonly LearningV2IconShape[] | null {
  return byLesson.get(lessonOrdinal)?.chapters[chapterOrdinal - 1]?.icon ?? null;
}

/** Сдвиг тона главы: по номеру главы (одинаков во всех уроках — «глава 3» узнаётся по цвету). */
export function learningV2ChapterHueShift(chapterOrdinal: number): number {
  const shifts = LEARNING_V2_CHAPTER_HUE_SHIFT;
  return shifts[(Math.max(1, chapterOrdinal) - 1) % shifts.length];
}

/** Сдвиг тона урока: у каждого урока свой. */
export function learningV2LessonHueShift(lessonOrdinal: number): number {
  const shifts = LEARNING_V2_LESSON_HUE_SHIFT;
  return shifts[(Math.max(1, lessonOrdinal) - 1) % shifts.length];
}

/**
 * Узор плашки главы. Урок 1 — нарисованный отдельно; уроки 2–8 — иконка самой главы, масштаб 0,5, шахматный повтор 30×30
 * (как в макете: translate(1.5 1.5) и translate(16.5 16.5), линия 2,4 в масштабе = 1,2).
 */
export type LearningV2ChapterPatternSpec = Readonly<{ w: number; h: number; tiles: readonly Readonly<{ dx: number; dy: number; scale: number; strokeWidth: number; shapes: readonly LearningV2IconShape[] }>[] }>;

const patternCache = new Map<string, LearningV2ChapterPatternSpec | null>();

export function learningV2ChapterPattern(lessonOrdinal: number, chapterOrdinal: number): LearningV2ChapterPatternSpec | null {
  const key = `${lessonOrdinal}:${chapterOrdinal}`;
  if (patternCache.has(key)) return patternCache.get(key) ?? null;
  let spec: LearningV2ChapterPatternSpec | null = null;
  if (lessonOrdinal === 1) {
    const drawn: LearningV2IconPattern | undefined = LEARNING_V2_LESSON1_PATTERNS[chapterOrdinal - 1];
    if (drawn) spec = { w: drawn.w, h: drawn.h, tiles: [{ dx: 0, dy: 0, scale: 1, strokeWidth: 1.2, shapes: drawn.shapes }] };
  } else {
    const icon = learningV2ChapterIcon(lessonOrdinal, chapterOrdinal);
    if (icon) spec = { w: 30, h: 30, tiles: [{ dx: 1.5, dy: 1.5, scale: 0.5, strokeWidth: 2.4, shapes: icon }, { dx: 16.5, dy: 16.5, scale: 0.5, strokeWidth: 2.4, shapes: icon }] };
  }
  patternCache.set(key, spec);
  return spec;
}
