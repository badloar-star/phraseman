export type LearningGoal = 'tourism' | 'work' | 'emigration' | 'hobby';
export type MinutesPerDay = 5 | 15 | 30 | 60;
export type CurrentLevel = 'a1' | 'a2' | 'b1' | 'b2';
export type TargetLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1';

export interface UserProfile {
  name: string;
  learningGoal: LearningGoal;
  minutesPerDay: MinutesPerDay;
  currentLevel: CurrentLevel;
  targetLevel: TargetLevel;
  preferredNotificationTime: string; // "08:00"
  onboardingCompleted: boolean;
  createdAt: string; // ISO date
  estimatedDaysToTarget?: number;
  estimatedTargetDate?: string; // ISO date
}

export const LEVEL_LABELS: Record<CurrentLevel, { short: string; full: string }> = {
  a1: { short: 'A1', full: 'Beginner' },
  a2: { short: 'A2', full: 'Elementary' },
  b1: { short: 'B1', full: 'Intermediate' },
  b2: { short: 'B2', full: 'Upper-Intermediate' },
};

export const TARGET_LEVEL_LABELS: Record<TargetLevel, { short: string; full: string }> = {
  a1: { short: 'A1', full: 'Beginner' },
  a2: { short: 'A2', full: 'Elementary' },
  b1: { short: 'B1', full: 'Intermediate' },
  b2: { short: 'B2', full: 'Upper-Intermediate' },
  c1: { short: 'C1', full: 'Advanced' },
};

/**
 * Рассчитывает ориентировочное время достижения целевого уровня
 * на основе текущего уровня, интенсивности занятий и предполагаемой траектории
 */
export function estimateDaysToTarget(
  fromLevel: CurrentLevel,
  toLevel: TargetLevel,
  minutesPerDay: MinutesPerDay
): number {
  const LEVEL_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;
  const fromIndex = LEVEL_ORDER.indexOf(fromLevel);
  const toIndex = LEVEL_ORDER.indexOf(toLevel);

  if (fromIndex >= toIndex) return 0;

  const levelsDiff = toIndex - fromIndex;

  // Базовые дни для скачка на один уровень (при 15 мин/день)
  const baseDaysPerLevel = 45; // примерно 6-8 недель на уровень

  // Коэффициент интенсивности
  const intensityMultiplier: Record<MinutesPerDay, number> = {
    5: 3.0, // в 3 раза дольше
    15: 1.0, // базовая скорость
    30: 0.6, // в 1.67 раза быстрее
    60: 0.4, // в 2.5 раза быстрее
  };

  const multiplier = intensityMultiplier[minutesPerDay];
  return Math.round(baseDaysPerLevel * levelsDiff * multiplier);
}

/**
 * Добавляет дни к текущей дате
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
