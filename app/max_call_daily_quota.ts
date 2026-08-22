export type MaxDailyQuotaTone = 'normal' | 'amber' | 'red';

export interface MaxDailyQuotaStart {
  startRemainingSec: number;
  maxSec: number;
}

function finite(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/** Server quota after mint reserves the call; the UI starts from pre-call fuel. */
export function dailyQuotaFromLimits(
  limits: Record<string, unknown> | undefined,
): MaxDailyQuotaStart | null {
  if (!limits) return null;
  const remaining = finite(limits, 'dayRemainingSec', 'day_remaining_sec');
  const maximum = finite(limits, 'dailyVoiceSecMax', 'day_max_sec');
  if (remaining === null || maximum === null || maximum <= 0) return null;
  const reserved = Math.max(0, finite(limits, 'reservedSec', 'reserved_sec') ?? 0);
  return {
    startRemainingSec: Math.max(0, Math.min(maximum, remaining + reserved)),
    maxSec: maximum,
  };
}

export function dailyQuotaRemainingAt(
  startRemainingSec: number,
  startedAtMs: number,
  nowMs: number,
): number {
  const elapsedSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1_000));
  return Math.max(0, startRemainingSec - elapsedSec);
}

export function dailyQuotaView(remainingSec: number, maxSec: number): {
  minutes: number;
  fraction: number;
  tone: MaxDailyQuotaTone;
} {
  const safeMax = Math.max(1, maxSec);
  const safeRemaining = Math.max(0, Math.min(safeMax, remainingSec));
  const fraction = safeRemaining / safeMax;
  const tone: MaxDailyQuotaTone = safeRemaining <= 60 ? 'red' : fraction <= 0.15 ? 'amber' : 'normal';
  return { minutes: Math.floor(safeRemaining / 60), fraction, tone };
}

// Expo Router treats every file in app/ as a route; the pure helpers stay named.
export default function MaxCallDailyQuotaRouteShim() { return null; }
