export const PERSONAL_PLAN_GRANDFATHER_CUTOFF_AT_MS = Date.parse(
  '2026-08-20T23:59:59.999Z',
);

export const PERSONAL_PLAN_SUNSET_AT_MS = Date.parse(
  '2026-10-20T00:00:00.000Z',
);

export const PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE = '/lessons_list';

export type SavedPersonalPlanForSunset = {
  status?: unknown;
  createdAt?: unknown;
} | null;

export type PersonalPlanSunsetAccessStatus =
  | 'allowed'
  | 'needs_original_access'
  | 'not_grandfathered'
  | 'expired';

export type PersonalPlanSunsetAccess = {
  status: PersonalPlanSunsetAccessStatus;
  grandfathered: boolean;
};

function validGrandfatheredCreatedAt(savedState: SavedPersonalPlanForSunset): boolean {
  if (
    !savedState
    || !['active', 'paused', 'completed'].includes(String(savedState.status))
    || typeof savedState.createdAt !== 'string'
  ) return false;
  const createdAtMs = Date.parse(savedState.createdAt);
  return Number.isFinite(createdAtMs) && createdAtMs <= PERSONAL_PLAN_GRANDFATHER_CUTOFF_AT_MS;
}

export function resolvePersonalPlanSunsetAccess(input: {
  hasOriginalFeatureAccess: boolean;
  savedState: SavedPersonalPlanForSunset;
  nowMs: number;
}): PersonalPlanSunsetAccess {
  if (input.nowMs >= PERSONAL_PLAN_SUNSET_AT_MS) {
    return { status: 'expired', grandfathered: false };
  }
  if (!Number.isFinite(input.nowMs) || !validGrandfatheredCreatedAt(input.savedState)) {
    return { status: 'not_grandfathered', grandfathered: false };
  }
  if (!input.hasOriginalFeatureAccess) {
    return { status: 'needs_original_access', grandfathered: true };
  }
  return { status: 'allowed', grandfathered: true };
}

export function assertPersonalPlanActivationAllowed(
  savedState: SavedPersonalPlanForSunset,
  nowMs: number,
): asserts savedState is NonNullable<SavedPersonalPlanForSunset> & {
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
} {
  const access = resolvePersonalPlanSunsetAccess({
    hasOriginalFeatureAccess: true,
    savedState,
    nowMs,
  });
  if (access.status !== 'allowed') {
    throw new Error(`personal_plan_sunset_${access.status}`);
  }
}

export type PersonalPlanPremiumProbe = 'allowed' | 'verify';

export function resolvePersonalPlanPremiumProbe(input: {
  mode: 'premium-required' | 'grandfathered-only';
  accessResolved: boolean;
  featureRequiresPremium: boolean;
  featureAccess: boolean;
}): PersonalPlanPremiumProbe {
  if (input.mode === 'grandfathered-only' || !input.featureRequiresPremium) return 'allowed';
  return input.accessResolved && input.featureAccess ? 'allowed' : 'verify';
}

export function isPersonalPlanSunsetDenial(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === 'personal_plan_sunset_not_grandfathered'
    || error.message === 'personal_plan_sunset_expired';
}

export type PersonalPlanSunsetCountdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function splitPersonalPlanSunsetCountdown(nowMs: number): PersonalPlanSunsetCountdown {
  const remainingMs = Math.max(0, PERSONAL_PLAN_SUNSET_AT_MS - nowMs);
  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    expired: remainingMs === 0,
  };
}

export function formatPersonalPlanSunsetCountdown(nowMs: number): string {
  const countdown = splitPersonalPlanSunsetCountdown(nowMs);
  return [countdown.days, countdown.hours, countdown.minutes, countdown.seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function hasPersonalPlanRouteMarker(
  params: Readonly<Record<string, string | string[] | undefined>>,
  markerNames: readonly string[],
): boolean {
  return markerNames.some((markerName) => {
    const raw = params[markerName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value === '1';
  });
}
