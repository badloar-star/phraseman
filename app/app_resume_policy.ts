export const SHORT_BACKGROUND_CLOUD_REFRESH_MS = 5 * 60 * 1000;
export const LONG_BACKGROUND_CLOUD_REFRESH_MS = 30 * 60 * 1000;
export const FOREGROUND_LIGHT_REFRESH_DELAY_MS = 900;
export const FOREGROUND_CLOUD_REFRESH_DELAY_MS = 2_500;

export type ForegroundRefreshKind = 'none' | 'local' | 'cloud';

export function getForegroundRefreshKind(backgroundDurationMs: number): ForegroundRefreshKind {
  if (!Number.isFinite(backgroundDurationMs) || backgroundDurationMs <= 0) return 'local';
  if (backgroundDurationMs >= SHORT_BACKGROUND_CLOUD_REFRESH_MS) return 'cloud';
  return 'local';
}

