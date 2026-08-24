import { DEV_CONTENT_UNLOCK } from './config';

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

/**
 * Dev-обход действует только на устройстве в dev-сборке. Под тестовым
 * рантаймом он выключен: контрактные сторожа обязаны продолжать проверять
 * НАСТОЯЩЕЕ правило заката («fails closed» без grandfather-права), иначе обход
 * тихо снял бы защиту. Тот же приём определения тестового рантайма, что в
 * cloud_sync.ts / firestore_leaderboard.ts.
 */
function devSunsetBypassActive(): boolean {
  const underTestRuntime = typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
  return DEV_CONTENT_UNLOCK && !underTestRuntime;
}

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
  // зачем (владелец 2026-08-24): в dev-сборке у разработчика нет «старого» плана,
  // созданного до 20.08.2026, поэтому раздел «Планы» не показывался вообще и его
  // нельзя было проверить. DEV_CONTENT_UNLOCK открывает раздел независимо от
  // grandfather-права — но НЕ отключает сам закат: дата 20.10.2026 и видимый
  // таймер работают ровно как у старых юзеров (ветка 'expired' стоит выше).
  // Флаг гаснет в стор-сборке (EXPO_PUBLIC_STORE_RELEASE=1), поэтому в прод это
  // не уедет — тот же щит, что у dev-разблокировки уроков.
  if (input.nowMs >= PERSONAL_PLAN_SUNSET_AT_MS) {
    return { status: 'expired', grandfathered: false };
  }
  if (devSunsetBypassActive()) {
    return { status: 'allowed', grandfathered: true };
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
  // зачем (владелец 2026-08-24): вкладка «Планы» открылась dev-обходом, но при
  // тапе гейт экрана уводил на пейвол — планы платная фича, а dev-премиума нет
  // (FORCE_PREMIUM_DEV_INTENT=false). В dev-сборке снимаем и это требование,
  // иначе раздел физически невозможно проверить. Прод не затронут: тот же
  // DEV_CONTENT_UNLOCK, гаснущий при EXPO_PUBLIC_STORE_RELEASE=1.
  if (devSunsetBypassActive()) return 'allowed';
  return input.accessResolved && input.featureAccess ? 'allowed' : 'verify';
}

/** True, когда dev-обход планов активен (см. devSunsetBypassActive). */
export function isPersonalPlanDevBypassActive(): boolean {
  return devSunsetBypassActive();
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
