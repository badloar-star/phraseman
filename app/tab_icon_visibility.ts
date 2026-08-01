export const TAB_ICON_FADE_OUT_END = 0.34;

export function tabIconOpacity(focused: boolean, progress: number): number {
  'worklet';
  if (focused) return 1;
  return Math.max(0, Math.min(1, 1 - progress / TAB_ICON_FADE_OUT_END));
}
