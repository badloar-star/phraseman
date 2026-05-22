export type PracticeWarmupInput = {
  active7: number;
  totalStreak: number;
  xp7: number;
  minutes7: number;
};

export function shouldUsePracticeWarmup({
  active7,
  totalStreak,
  xp7,
  minutes7,
}: PracticeWarmupInput): boolean {
  const hasAnyPractice = xp7 > 0 || minutes7 > 0;
  return hasAnyPractice && active7 < 3 && totalStreak < 3;
}
