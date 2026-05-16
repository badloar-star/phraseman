import {
  getDailyArenaCount,
  getDailyArenaPlaysLeft,
  incrementDailyArenaPlay,
} from './arena_daily_limit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from './firebase';

export type ArenaAccessMode = 'ranked' | 'hill' | 'friend';
export type ArenaGameEntrySource =
  | 'ranked'
  | 'hill'
  | 'friend_host'
  | 'friend_guest'
  | 'room'
  | 'rematch'
  | 'notification'
  | 'match_toast';

export const ARENA_GAME_ENTRY_KEY = 'arena_game_entry_v1';
const GAME_ENTRY_TTL_MS = 5 * 60 * 1000;

export type ArenaAccessCheckResult =
  | { ok: true }
  | { ok: false; reason: 'daily_limit' | 'no_energy' };

export type ArenaChargeResult =
  | { ok: true; charged: boolean; dailyCount?: number }
  | { ok: false; reason: 'no_energy' };

export async function canStartArenaMatch(params: {
  isUnlimited: boolean;
  availableEnergy: number;
  countDaily: boolean;
}): Promise<ArenaAccessCheckResult> {
  const { isUnlimited, availableEnergy, countDaily } = params;
  if (!isUnlimited && countDaily) {
    const left = await getDailyArenaPlaysLeft();
    if (left <= 0) return { ok: false, reason: 'daily_limit' };
  }
  if (!isUnlimited && availableEnergy <= 0) {
    return { ok: false, reason: 'no_energy' };
  }
  return { ok: true };
}

export async function chargeArenaEntry(params: {
  isUnlimited: boolean;
  spendOne: () => Promise<boolean>;
  countDaily: boolean;
  mode: ArenaAccessMode;
  extraLogParams?: Record<string, unknown>;
}): Promise<ArenaChargeResult> {
  const { isUnlimited, spendOne, countDaily, mode, extraLogParams } = params;
  if (isUnlimited) return { ok: true, charged: false };

  const charged = await spendOne();
  if (!charged) return { ok: false, reason: 'no_energy' };

  let dailyCount: number | undefined;
  if (countDaily) {
    await incrementDailyArenaPlay();
    dailyCount = await getDailyArenaCount();
  }

  logEvent('arena_match_charged', {
    mode,
    ...(dailyCount !== undefined ? { daily_count: dailyCount } : {}),
    ...(extraLogParams ?? {}),
  });

  return { ok: true, charged: true, dailyCount };
}

export async function reserveArenaGameEntry(
  sessionId: string,
  source: ArenaGameEntrySource,
): Promise<void> {
  try {
    const sid = String(sessionId || '').trim();
    if (!sid) return;
    await AsyncStorage.setItem(ARENA_GAME_ENTRY_KEY, JSON.stringify({
      sessionId: sid,
      source,
      expiresAt: Date.now() + GAME_ENTRY_TTL_MS,
      nonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }));
  } catch {}
}

export async function consumeArenaGameEntry(sessionId: string): Promise<boolean> {
  try {
    const sid = String(sessionId || '').trim();
    if (!sid) return false;
    const raw = await AsyncStorage.getItem(ARENA_GAME_ENTRY_KEY);
    if (!raw) return false;
    await AsyncStorage.removeItem(ARENA_GAME_ENTRY_KEY);
    const entry = JSON.parse(raw) as { sessionId?: string; expiresAt?: number };
    return (
      entry.sessionId === sid &&
      typeof entry.expiresAt === 'number' &&
      entry.expiresAt >= Date.now()
    );
  } catch {
    await AsyncStorage.removeItem(ARENA_GAME_ENTRY_KEY).catch(() => {});
    return false;
  }
}

export default function __RouteShim() { return null; }
