export type PracticeWarmupInput = {
  active7: number;
  totalStreak: number;
  minutes7: number;
};

export function shouldUsePracticeWarmup({
  active7,
  totalStreak,
  minutes7,
}: PracticeWarmupInput): boolean {
  const hasAnyPractice = minutes7 > 0;
  return hasAnyPractice && active7 < 3 && totalStreak < 3;
}
