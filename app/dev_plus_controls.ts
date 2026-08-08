import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { emitAppEvent } from './events';

export type DevLocalPlusOverride = 'granted' | 'removed' | 'inherit';

export type DevPlusEffectiveEntitlement = Readonly<{
  isPremium: boolean;
  isVip: boolean;
  isPro: boolean;
  hasPremiumAccess: boolean;
  isIntroFullAccess: boolean;
  introFullAccessEndsAt: number | null;
}>;

export function projectDevLocalPlusOverride(
  authoritative: DevPlusEffectiveEntitlement,
  override: DevLocalPlusOverride,
): DevPlusEffectiveEntitlement {
  if (override === 'inherit') return authoritative;
  const active = override === 'granted';
  return {
    ...authoritative,
    isPremium: active,
    isVip: false,
    isPro: false,
    hasPremiumAccess: active,
    isIntroFullAccess: false,
    introFullAccessEndsAt: null,
  };
}

export function resolveDevContentUnlock(
  devContentUnlock: boolean,
  override: DevLocalPlusOverride,
): boolean {
  return devContentUnlock && override !== 'removed';
}

export function projectDevLessonAccess(
  access: Readonly<{
    devContentUnlock: boolean;
    noLimits: boolean;
    legacyFreeLessonCap: number;
    freeLessonLimit: number;
  }>,
  override: DevLocalPlusOverride,
): Readonly<{
  devContentUnlock: boolean;
  noLimits: boolean;
  legacyFreeLessonCap: number;
}> {
  if (override !== 'removed') {
    return {
      devContentUnlock: access.devContentUnlock,
      noLimits: access.noLimits,
      legacyFreeLessonCap: access.legacyFreeLessonCap,
    };
  }
  return {
    devContentUnlock: false,
    noLimits: false,
    legacyFreeLessonCap: access.freeLessonLimit,
  };
}

const DEV_PLUS_STORAGE_PREFIX = 'dev_local_plus_override_v1:';

function assertDevPlusControlsAvailable(): void {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) {
    throw new Error('Dev Plus controls are unavailable in this build');
  }
}

function normalizeStableId(stableId: string): string {
  const normalized = stableId.trim();
  if (!normalized) throw new Error('A stable account id is required for DEV Plus controls');
  return normalized;
}

export function getDevLocalPlusStorageKey(stableId: string): string {
  return `${DEV_PLUS_STORAGE_PREFIX}${encodeURIComponent(normalizeStableId(stableId))}`;
}

export async function readDevLocalPlusOverride(stableId: string): Promise<DevLocalPlusOverride> {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return 'inherit';
  const stored = await AsyncStorage.getItem(getDevLocalPlusStorageKey(stableId));
  if (stored === 'granted' || stored === 'removed') return stored;
  return 'inherit';
}

export async function setDevLocalPlusOverride(
  stableId: string,
  mode: Exclude<DevLocalPlusOverride, 'inherit'>,
): Promise<void> {
  assertDevPlusControlsAvailable();
  const normalizedStableId = normalizeStableId(stableId);
  await AsyncStorage.setItem(getDevLocalPlusStorageKey(normalizedStableId), mode);
  emitAppEvent('dev_local_plus_override_changed', { stableId: normalizedStableId, mode });
}
