/**
 * Клиентский сервис сезонной Арены.
 *
 * - fetchSeasonTop()       — топ-100 + моё место
 * - claimSeasonReward()    — забрать награду за завершённый сезон
 * - detectSeasonChange()   — вернуть seasonId если сезон сменился с прошлого визита
 * - markSeasonSeen()       — сохранить текущий seasonId как «уже показан»
 * - getMySeasonState()     — мой SR + место в текущем сезоне (из arena_profiles)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { CLOUD_SYNC_ENABLED } from '../config';
import { ensureAnonUser } from '../cloud_sync';
import { seasonIdForDate } from '../arena_season_math';

const FUNCTIONS_REGION = 'us-central1';
const LAST_SEASON_KEY = 'arena_season_last_seen_v1';

// ─── типы ───────────────────────────────────────────────────────────────────
export type SeasonTopEntry = {
  place: number;
  uid: string;
  name: string;
  sr: number;
  avatar?: string | null;
  frame?: string | null;
  aura?: string | null;
  isPremium?: boolean;
};

export type SeasonTopResult = {
  seasonId: string;
  startsAt: number;
  endsAtMs: number;
  myPlace: number | null;
  mySR: number;
  entries: SeasonTopEntry[];
};

export type SeasonRewardDrop = {
  id: string;
  kind: string;
  rarity: string;
  amount?: number;
  auraId?: string;
};

export type ClaimSeasonRewardResult = {
  alreadyClaimed: boolean;
  rewards: SeasonRewardDrop[];
};

export type MySeasonState = {
  sr: number;
  peakSR: number;
  seasonId: string | null;
  seasonPeakRankIndex: number;
};

// ─── helper CF ──────────────────────────────────────────────────────────────
function cf<TReq, TRes>(name: string) {
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const { getApp } = require('@react-native-firebase/app');
  return httpsCallable(
    getFunctions(getApp(), FUNCTIONS_REGION), name,
  ) as (data: TReq) => Promise<{ data: TRes }>;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export async function fetchSeasonTop(): Promise<SeasonTopResult | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  try {
    await ensureAnonUser();
    const res = await cf<Record<string, never>, SeasonTopResult>('arenaSeasonGetTop')({});
    return res.data;
  } catch {
    return null;
  }
}

export async function claimSeasonReward(seasonId: string): Promise<ClaimSeasonRewardResult | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  try {
    await ensureAnonUser();
    const res = await cf<{ seasonId: string }, ClaimSeasonRewardResult>(
      'arenaSeasonClaimReward',
    )({ seasonId });
    return res.data;
  } catch {
    return null;
  }
}

export async function getMySeasonState(): Promise<MySeasonState | null> {
  const uid = auth().currentUser?.uid;
  if (!uid || !CLOUD_SYNC_ENABLED) return null;
  try {
    const snap = await firestore().collection('arena_profiles').doc(uid).get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    return {
      sr: Math.max(0, Math.trunc(Number(d.sr ?? 0))),
      peakSR: Math.max(0, Math.trunc(Number(d.peakSR ?? 0))),
      seasonId: String(d.seasonId ?? '') || null,
      seasonPeakRankIndex: Math.max(0, Math.trunc(Number(d.seasonPeakRankIndex ?? 0))),
    };
  } catch {
    return null;
  }
}

/** Возвращает seasonId, если сезон сменился с прошлого вызова markSeasonSeen(). */
export async function detectSeasonChange(): Promise<string | null> {
  const current = seasonIdForDate(new Date());
  try {
    const last = await AsyncStorage.getItem(LAST_SEASON_KEY);
    if (last && last !== current) return current;
    return null;
  } catch {
    return null;
  }
}

export async function markSeasonSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SEASON_KEY, seasonIdForDate(new Date()));
  } catch {
    // best-effort
  }
}
