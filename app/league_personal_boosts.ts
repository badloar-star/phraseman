import AsyncStorage from '@react-native-async-storage/async-storage';
import { spendShards } from './shards_system';

export type LeaguePersonalBoostId = 'x2_30m' | 'x2_1h' | 'x2_2h' | 'x3_15m';

export interface LeaguePersonalBoostDef {
  id: LeaguePersonalBoostId;
  multiplier: number;
  durationMs: number;
  costShards: number;
}

export interface LeaguePersonalBoostState {
  id: LeaguePersonalBoostId;
  multiplier: number;
  startedAt: number;
  expiresAt: number;
}

const LEAGUE_PERSONAL_BOOST_KEY = 'league_personal_boost_v1';

export const LEAGUE_PERSONAL_BOOSTS: LeaguePersonalBoostDef[] = [
  { id: 'x2_30m', multiplier: 2, durationMs: 30 * 60 * 1000, costShards: 20 },
  { id: 'x2_1h', multiplier: 2, durationMs: 60 * 60 * 1000, costShards: 30 },
  { id: 'x2_2h', multiplier: 2, durationMs: 2 * 60 * 60 * 1000, costShards: 45 },
  { id: 'x3_15m', multiplier: 3, durationMs: 15 * 60 * 1000, costShards: 40 },
];

export const getLeagueBoostDef = (id: LeaguePersonalBoostId): LeaguePersonalBoostDef | undefined =>
  LEAGUE_PERSONAL_BOOSTS.find((b) => b.id === id);

export const loadActiveLeagueBoost = async (): Promise<LeaguePersonalBoostState | null> => {
  try {
    const raw = await AsyncStorage.getItem(LEAGUE_PERSONAL_BOOST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeaguePersonalBoostState;
    if (!parsed || !parsed.expiresAt || Date.now() >= parsed.expiresAt) {
      await AsyncStorage.removeItem(LEAGUE_PERSONAL_BOOST_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const activateLeagueBoost = async (id: LeaguePersonalBoostId): Promise<LeaguePersonalBoostState | null> => {
  const def = getLeagueBoostDef(id);
  if (!def) return null;
  const now = Date.now();
  const state: LeaguePersonalBoostState = {
    id: def.id,
    multiplier: def.multiplier,
    startedAt: now,
    expiresAt: now + def.durationMs,
  };
  try {
    await AsyncStorage.setItem(LEAGUE_PERSONAL_BOOST_KEY, JSON.stringify(state));
    return state;
  } catch {
    return null;
  }
};

export const buyAndActivateLeagueBoost = async (
  id: LeaguePersonalBoostId,
): Promise<{ ok: boolean; reason?: 'not_found' | 'already_active' | 'not_enough_shards' | 'storage_error' }> => {
  const def = getLeagueBoostDef(id);
  if (!def) return { ok: false, reason: 'not_found' };

  const active = await loadActiveLeagueBoost();
  if (active) return { ok: false, reason: 'already_active' };

  const spent = await spendShards(def.costShards, 'league_boost');
  if (!spent) return { ok: false, reason: 'not_enough_shards' };

  const created = await activateLeagueBoost(id);
  if (!created) return { ok: false, reason: 'storage_error' };
  return { ok: true };
};

export const getLeagueBoostMultiplier = async (): Promise<number> => {
  const active = await loadActiveLeagueBoost();
  return active?.multiplier ?? 1;
};

export const formatLeagueBoostTimeLeft = (expiresAt: number): string => {
  const leftMs = Math.max(0, expiresAt - Date.now());
  const total = Math.floor(leftMs / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
