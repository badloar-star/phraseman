export const COURSE_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_LEVEL_RANGES: Record<CourseLevel, [number, number]> = {
  A1: [1, 8],
  A2: [9, 18],
  B1: [19, 28],
  B2: [29, 32],
};

export function normalizeCourseLevel(raw: unknown): CourseLevel | null {
  const value = String(raw ?? '').trim().toUpperCase();
  return COURSE_LEVELS.includes(value as CourseLevel) ? (value as CourseLevel) : null;
}

export function getCourseLevelIndex(level: CourseLevel): number {
  return COURSE_LEVELS.indexOf(level);
}

export function getCourseLevelForLesson(lessonId: number): CourseLevel {
  for (const level of COURSE_LEVELS) {
    const [from, to] = COURSE_LEVEL_RANGES[level];
    if (lessonId >= from && lessonId <= to) return level;
  }
  return lessonId < 1 ? 'A1' : 'B2';
}

export function getFirstLessonForLevel(level: CourseLevel): number {
  const range = COURSE_LEVEL_RANGES[level];
  return range[0];
}

export function getLastLessonForLevel(level: CourseLevel): number {
  const range = COURSE_LEVEL_RANGES[level];
  return range[1];
}

export function getPreviousCourseLevel(level: CourseLevel): CourseLevel | null {
  const idx = getCourseLevelIndex(level);
  return idx > 0 ? COURSE_LEVELS[idx - 1] : null;
}

export function getNextCourseLevel(level: CourseLevel): CourseLevel | null {
  const idx = getCourseLevelIndex(level);
  return idx >= 0 && idx < COURSE_LEVELS.length - 1 ? COURSE_LEVELS[idx + 1] : null;
}

export function isLastLessonInLevel(lessonId: number): boolean {
  return getLastLessonForLevel(getCourseLevelForLesson(lessonId)) === lessonId;
}

export function isLessonWithinReachedLevel(lessonId: number, reachedLevel: CourseLevel): boolean {
  return getCourseLevelIndex(getCourseLevelForLesson(lessonId)) <= getCourseLevelIndex(reachedLevel);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
