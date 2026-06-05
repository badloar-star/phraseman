export type DailyTaskCardPressIntent = 'expand' | 'navigate';

export function getDailyTaskCardPressIntent(
  readyToNavigateTaskId: string | null,
  pressedTaskId: string,
): DailyTaskCardPressIntent {
  return readyToNavigateTaskId === pressedTaskId ? 'navigate' : 'expand';
}
