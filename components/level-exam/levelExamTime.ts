export type LevelExamTimerUrgency = 'normal' | 'warning' | 'critical';

export function formatLevelExamRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function getLevelExamTimerUrgency(remainingMs: number): LevelExamTimerUrgency {
  if (remainingMs <= 10_000) return 'critical';
  if (remainingMs <= 60_000) return 'warning';
  return 'normal';
}
