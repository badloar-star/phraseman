export type DailyTaskCardPressIntent = 'navigate';

export function getDailyTaskCardPressIntent(
  readyToNavigateTaskId: string | null,
  pressedTaskId: string,
): DailyTaskCardPressIntent {
  void readyToNavigateTaskId;
  void pressedTaskId;
  return 'navigate';
}
