import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY = 'personal_plan_sunset_high_water_v1';

let sunsetClockQueue: Promise<void> = Promise.resolve();
let lastEffectiveNowMs = 0;

function parseHighWater(raw: string | null): number {
  if (raw === null) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Account-independent monotonic local clock for the Personal Plan retirement.
 * Every observation is serialized and durably advances the high-water before it
 * is returned to an access decision. This intentionally never resets on account
 * switches and never deletes plan data.
 *
 * A device first opened after the deadline with its clock already backdated has
 * no prior high-water to compare against; trusted server time is out of scope.
 */
export function readPersonalPlanSunsetEffectiveNow(
  observedNowMs: number = Date.now(),
): Promise<number> {
  const operation = sunsetClockQueue.then(async () => {
    const raw = await AsyncStorage.getItem(PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY);
    const persistedHighWater = parseHighWater(raw);
    const safeObservedNow = Number.isFinite(observedNowMs) && observedNowMs >= 0
      ? observedNowMs
      : Number.MAX_SAFE_INTEGER;
    const effectiveNow = Math.max(
      safeObservedNow,
      persistedHighWater,
      lastEffectiveNowMs,
    );
    if (effectiveNow > persistedHighWater) {
      await AsyncStorage.setItem(PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY, String(effectiveNow));
    }
    lastEffectiveNowMs = Math.max(lastEffectiveNowMs, effectiveNow);
    return effectiveNow;
  });
  sunsetClockQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

/** Display-only synchronous projection after an async access boundary has loaded the clock. */
export function peekPersonalPlanSunsetEffectiveNow(observedNowMs: number = Date.now()): number {
  return Math.max(lastEffectiveNowMs, observedNowMs);
}

export default function __RouteShim() { return null; }
