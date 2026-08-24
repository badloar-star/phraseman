export type PersonalProgressProjection = Readonly<{
  totalXp: number;
  level: number;
  weeklyXp: number;
  activityDates: readonly string[];
  streakCount: number;
  completedLessons: readonly string[];
  passedExams: readonly string[];
  unlockedLessons: readonly string[];
  bestResults: Readonly<Record<string, number>>;
}>;

export type PersonalProgressState = Readonly<{
  projection: PersonalProgressProjection;
  appliedEventIds: readonly string[];
}>;

export type PersonalProgressCommand =
  | Readonly<{
    kind: 'opening_import';
    eventId: string;
    projection: PersonalProgressProjection;
  }>
  | Readonly<{
    kind: 'grant_xp';
    eventId: string;
    amount: number;
    source: string;
    activityDate: string;
    exactResult: unknown;
  }>
  | Readonly<{
    kind: 'complete_lesson';
    eventId: string;
    lessonId: string;
    bestPct?: number;
  }>
  | Readonly<{
    kind: 'complete_exam';
    eventId: string;
    examId: string;
    bestPct: number;
  }>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function previousDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function streakCount(dates: readonly string[]): number {
  if (dates.length === 0) return 0;
  const known = new Set(dates);
  let cursor = dates[dates.length - 1];
  let count = 0;
  while (known.has(cursor)) {
    count += 1;
    cursor = previousDate(cursor);
  }
  return count;
}

function sortedBestResults(value: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

function freezeProjection(value: PersonalProgressProjection): PersonalProgressProjection {
  return Object.freeze({
    ...value,
    activityDates: Object.freeze([...value.activityDates]),
    completedLessons: Object.freeze([...value.completedLessons]),
    passedExams: Object.freeze([...value.passedExams]),
    unlockedLessons: Object.freeze([...value.unlockedLessons]),
    bestResults: sortedBestResults(value.bestResults),
  });
}

export function emptyPersonalProgressState(): PersonalProgressState {
  return Object.freeze({
    projection: freezeProjection({
      totalXp: 0,
      level: 1,
      weeklyXp: 0,
      activityDates: [],
      streakCount: 0,
      completedLessons: [],
      passedExams: [],
      unlockedLessons: [],
      bestResults: {},
    }),
    appliedEventIds: Object.freeze([]),
  });
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
}

function validPct(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function applyPersonalProgressCommand(
  state: PersonalProgressState,
  command: PersonalProgressCommand,
  levelForXp: (totalXp: number) => number,
): Readonly<{ state: PersonalProgressState; duplicate: boolean }> {
  if (!validId(command.eventId)) throw new Error('phone_state_progress_input_invalid');
  if (state.appliedEventIds.includes(command.eventId)) {
    return Object.freeze({ state, duplicate: true });
  }
  const previous = state.projection;
  let next: PersonalProgressProjection;
  if (command.kind === 'opening_import') {
    const imported = command.projection;
    if (
      !Number.isSafeInteger(imported.totalXp)
      || imported.totalXp < 0
      || !Number.isSafeInteger(imported.weeklyXp)
      || imported.weeklyXp < 0
      || !Array.isArray(imported.activityDates)
      || !Array.isArray(imported.completedLessons)
      || !Array.isArray(imported.passedExams)
      || !Array.isArray(imported.unlockedLessons)
    ) {
      throw new Error('phone_state_progress_input_invalid');
    }
    const totalXp = Math.max(previous.totalXp, imported.totalXp);
    const activityDates = sortedUnique([...previous.activityDates, ...imported.activityDates]);
    next = freezeProjection({
      totalXp,
      level: levelForXp(totalXp),
      weeklyXp: Math.max(previous.weeklyXp, imported.weeklyXp),
      activityDates,
      streakCount: Math.max(previous.streakCount, imported.streakCount, streakCount(activityDates)),
      completedLessons: sortedUnique([...previous.completedLessons, ...imported.completedLessons]),
      passedExams: sortedUnique([...previous.passedExams, ...imported.passedExams]),
      unlockedLessons: sortedUnique([...previous.unlockedLessons, ...imported.unlockedLessons]),
      bestResults: sortedBestResults({ ...previous.bestResults, ...imported.bestResults }),
    });
  } else if (command.kind === 'grant_xp') {
    if (
      !Number.isSafeInteger(command.amount)
      || command.amount <= 0
      || command.amount > 1_000_000
      || !validId(command.source)
      || !DATE.test(command.activityDate)
    ) {
      throw new Error('phone_state_progress_input_invalid');
    }
    const totalXp = previous.totalXp + command.amount;
    const weeklyXp = previous.weeklyXp + command.amount;
    if (!Number.isSafeInteger(totalXp) || !Number.isSafeInteger(weeklyXp)) {
      throw new Error('phone_state_progress_input_invalid');
    }
    const activityDates = sortedUnique([...previous.activityDates, command.activityDate]);
    const level = levelForXp(totalXp);
    if (!Number.isSafeInteger(level) || level < 1) throw new Error('phone_state_progress_input_invalid');
    next = freezeProjection({
      ...previous,
      totalXp,
      weeklyXp,
      level,
      activityDates,
      streakCount: streakCount(activityDates),
    });
  } else if (command.kind === 'complete_lesson') {
    if (!validId(command.lessonId) || (command.bestPct !== undefined && !validPct(command.bestPct))) {
      throw new Error('phone_state_progress_input_invalid');
    }
    const bestResults = { ...previous.bestResults };
    if (command.bestPct !== undefined) {
      const key = `lesson:${command.lessonId}`;
      bestResults[key] = Math.max(bestResults[key] ?? 0, command.bestPct);
    }
    next = freezeProjection({
      ...previous,
      completedLessons: sortedUnique([...previous.completedLessons, command.lessonId]),
      unlockedLessons: sortedUnique([...previous.unlockedLessons, command.lessonId]),
      bestResults,
    });
  } else {
    if (!validId(command.examId) || !validPct(command.bestPct)) {
      throw new Error('phone_state_progress_input_invalid');
    }
    const key = `exam:${command.examId}`;
    next = freezeProjection({
      ...previous,
      passedExams: sortedUnique([...previous.passedExams, command.examId]),
      bestResults: {
        ...previous.bestResults,
        [key]: Math.max(previous.bestResults[key] ?? 0, command.bestPct),
      },
    });
  }
  return Object.freeze({
    state: Object.freeze({
      projection: next,
      appliedEventIds: sortedUnique([...state.appliedEventIds, command.eventId]),
    }),
    duplicate: false,
  });
}
