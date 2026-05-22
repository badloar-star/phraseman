import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

const PENDING_KEY = 'vip_celebration_pending_v1';
const PENDING_MARKER_KEY = 'vip_celebration_pending_marker_v1';
const SEEN_KEY = 'vip_celebration_seen_v1';

function normalizeMarker(marker: string | null | undefined): string | null {
  const trimmed = String(marker ?? '').trim();
  return trimmed && trimmed !== '0' ? trimmed : null;
}

function markerMs(marker: string | null | undefined): number | null {
  const value = normalizeMarker(marker);
  if (!value || !/^\d{10,}$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function isVipCelebrationPending(): Promise<boolean> {
  try {
    return await AsyncStorage.getItem(PENDING_KEY) === '1';
  } catch (error) {
    DebugLogger.error('vip_celebration_state:isVipCelebrationPending', error, 'warning');
    return false;
  }
}

export async function getPendingVipCelebrationMarker(): Promise<string | null> {
  try {
    return normalizeMarker(await AsyncStorage.getItem(PENDING_MARKER_KEY));
  } catch (error) {
    DebugLogger.error('vip_celebration_state:getPendingVipCelebrationMarker', error, 'warning');
    return null;
  }
}

export async function markVipCelebrationPending(marker?: string | null): Promise<void> {
  try {
    const resolvedMarker = normalizeMarker(marker) ?? `vip_${Date.now()}`;
    await AsyncStorage.multiSet([
      [PENDING_KEY, '1'],
      [PENDING_MARKER_KEY, resolvedMarker],
    ]);
  } catch (error) {
    DebugLogger.error('vip_celebration_state:markVipCelebrationPending', error, 'warning');
  }
}

export async function consumeVipCelebration(seenMarker?: string | null): Promise<void> {
  try {
    const marker = normalizeMarker(seenMarker) ?? await getPendingVipCelebrationMarker() ?? String(Date.now());
    await AsyncStorage.multiSet([
      [PENDING_KEY, ''],
      [PENDING_MARKER_KEY, ''],
      [SEEN_KEY, marker],
    ]);
    await AsyncStorage.removeItem(PENDING_KEY);
    await AsyncStorage.removeItem(PENDING_MARKER_KEY);
  } catch (error) {
    DebugLogger.error('vip_celebration_state:consumeVipCelebration', error, 'warning');
  }
}

async function getLastSeenVipMarker(): Promise<string | null> {
  try {
    return normalizeMarker(await AsyncStorage.getItem(SEEN_KEY));
  } catch (error) {
    DebugLogger.error('vip_celebration_state:getLastSeenVipMarker', error, 'warning');
    return null;
  }
}

export async function processVipGrantForCelebration(grantAt: string | null | undefined): Promise<void> {
  const marker = normalizeMarker(grantAt);
  if (!marker) return;
  try {
    const seen = await getLastSeenVipMarker();
    if (seen === marker) return;
    const seenMs = markerMs(seen);
    const grantMs = markerMs(marker);
    if (seenMs !== null && grantMs !== null && seenMs >= grantMs) return;
    await markVipCelebrationPending(marker);
  } catch (error) {
    DebugLogger.error('vip_celebration_state:processVipGrantForCelebration', error, 'warning');
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
