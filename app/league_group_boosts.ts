import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLink, getCurrentUid } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { clearClubGiftFreeBoostFromLevel } from './club_boosts';
import { replaceShardsBalanceLocal } from './shards_system';
import { sendFriendActivityLike, fetchTodayActivityLikeState } from './friend_activity_likes';

const FUNCTIONS_REGION = 'us-central1';

export const LEAGUE_GROUP_BOOST_COST_SHARDS = 50;
export const LEAGUE_GROUP_BOOST_MULTIPLIER = 2;
export const LEAGUE_GROUP_BOOST_DURATION_MS = 3 * 60 * 60 * 1000;

const LEAGUE_GROUP_BOOST_KEY = 'league_group_boost_v1';
const AUTH_READY_ATTEMPTS = 3;
const AUTH_READY_RETRY_MS = 450;

export type LeagueGroupBoostState = {
  groupId: string;
  weekId: string;
  leagueId: number;
  multiplier: number;
  startedAt: number;
  expiresAt: number;
  buyerUid: string;
  buyerName: string;
  buyerAvatar?: string | null;
  buyerFrame?: string | null;
  buyerAura?: string | null;
  buyerTotalXp?: number;
  buyerProfileCardLevel?: number;
  buyerProfileCardTheme?: string;
  buyerProfileCardMotion?: string;
  buyerProfileCardPublicFocus?: string;
  likeEventId: string;
  likeCount: number;
};

type ActivateLeagueGroupBoostResponse = {
  ok: boolean;
  groupId: string;
  boost: LeagueGroupBoostState;
  shardsBalance: number;
  shardsUpdatedAtMs?: number;
  /** true — сервер погасил подарочный ваучер «буст бесплатно» (club_boost_free). */
  usedGiftVoucher?: boolean;
};

type BuyLeagueGroupBoostResult =
  | { ok: true; boost: LeagueGroupBoostState; shardsBalance: number; usedGiftVoucher: boolean }
  | { ok: false; reason: 'unavailable' | 'auth_required' | 'not_deployed' | 'active' | 'not_enough_shards' | 'no_current_group' | 'unknown' };

const leagueGroupBoostBuyInFlight = new Map<string, Promise<BuyLeagueGroupBoostResult>>();

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureCallableAuthReady(): Promise<boolean> {
  for (let attempt = 0; attempt < AUTH_READY_ATTEMPTS; attempt += 1) {
    const firebaseUserReady = await ensureFirebaseUserSignedInForCallable();
    const linked = await ensureStableAuthLink().catch(() => false);
    if (firebaseUserReady && linked && getCurrentUid()) return true;
    if (attempt < AUTH_READY_ATTEMPTS - 1) await wait(AUTH_READY_RETRY_MS * (attempt + 1));
  }
  return false;
}

async function ensureFirebaseUserSignedInForCallable(): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    let user = auth()?.currentUser;
    if (!user) {
      const credential = await auth().signInAnonymously();
      user = credential?.user ?? auth()?.currentUser;
    }
    if (!user) return false;
    await user.getIdToken(true).catch(() => user.getIdToken?.());
    return !!auth()?.currentUser?.uid;
  } catch {
    return false;
  }
}

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

function normalizeBoost(raw: any, groupId = ''): LeagueGroupBoostState | null {
  if (!raw || typeof raw !== 'object') return null;
  const expiresAt = Math.floor(Number(raw.expiresAt) || 0);
  const startedAt = Math.floor(Number(raw.startedAt) || 0);
  const multiplier = Number(raw.multiplier) || 1;
  const buyerUid = String(raw.buyerUid || '');
  if (!buyerUid || multiplier <= 1 || expiresAt <= Date.now()) return null;
  const resolvedGroupId = String(raw.groupId || groupId || '');
  const weekId = String(raw.weekId || '');
  const likeEventId = String(raw.likeEventId || `league_group_boost_${weekId}_${resolvedGroupId}_${startedAt}`);
  return {
    groupId: resolvedGroupId,
    weekId,
    leagueId: Math.max(0, Math.floor(Number(raw.leagueId) || 0)),
    multiplier,
    startedAt,
    expiresAt,
    buyerUid,
    buyerName: String(raw.buyerName || 'Player').trim() || 'Player',
    buyerAvatar: typeof raw.buyerAvatar === 'string' ? raw.buyerAvatar : null,
    buyerFrame: typeof raw.buyerFrame === 'string' ? raw.buyerFrame : null,
    buyerAura: typeof raw.buyerAura === 'string' ? raw.buyerAura : null,
    buyerTotalXp: Math.max(0, Math.floor(Number(raw.buyerTotalXp) || 0)),
    buyerProfileCardLevel: Math.max(0, Math.floor(Number(raw.buyerProfileCardLevel) || 0)),
    buyerProfileCardTheme: typeof raw.buyerProfileCardTheme === 'string' ? raw.buyerProfileCardTheme : undefined,
    buyerProfileCardMotion: typeof raw.buyerProfileCardMotion === 'string' ? raw.buyerProfileCardMotion : undefined,
    buyerProfileCardPublicFocus: typeof raw.buyerProfileCardPublicFocus === 'string' ? raw.buyerProfileCardPublicFocus : undefined,
    likeEventId,
    likeCount: Math.max(0, Math.floor(Number(raw.likeCount) || 0)),
  };
}

export async function cacheLeagueGroupBoost(boost: LeagueGroupBoostState | null): Promise<void> {
  try {
    if (boost && boost.expiresAt > Date.now()) {
      await AsyncStorage.setItem(LEAGUE_GROUP_BOOST_KEY, JSON.stringify(boost));
    } else {
      await AsyncStorage.removeItem(LEAGUE_GROUP_BOOST_KEY);
    }
  } catch {}
}

export async function loadActiveLeagueGroupBoost(): Promise<LeagueGroupBoostState | null> {
  try {
    const raw = await AsyncStorage.getItem(LEAGUE_GROUP_BOOST_KEY);
    const boost = raw ? normalizeBoost(JSON.parse(raw)) : null;
    if (!boost) {
      await AsyncStorage.removeItem(LEAGUE_GROUP_BOOST_KEY);
      return null;
    }
    return boost;
  } catch {
    return null;
  }
}

async function fetchActiveLeagueGroupBoostFromCloud(): Promise<LeagueGroupBoostState | null> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;
  const db = getDb();
  if (!db) return null;
  const uid = await ensureAnonUser();
  if (!uid) return null;
  try {
    const lbSnap = await db.collection('leaderboard').doc(uid).get();
    const groupId = lbSnap?.exists ? String(lbSnap.data?.()?.groupId || '') : '';
    if (!groupId) return null;
    const groupSnap = await db.collection('league_groups').doc(groupId).get();
    const boost = groupSnap?.exists ? normalizeBoost(groupSnap.data?.()?.groupBoost, groupId) : null;
    const resolvedBoost = await withEventLikeCount(db, boost);
    await cacheLeagueGroupBoost(resolvedBoost);
    return resolvedBoost;
  } catch {
    return null;
  }
}

async function fetchBoostEventLikeCount(db: any, boost: LeagueGroupBoostState | null): Promise<number> {
  if (!db || !boost?.buyerUid || !boost.likeEventId) return 0;
  try {
    const snap = await db
      .collection('users')
      .doc(boost.buyerUid)
      .collection('my_events')
      .doc(boost.likeEventId)
      .get();
    const n = Number(snap?.exists ? snap.data?.()?.activityLikeCount : 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

async function withEventLikeCount(db: any, boost: LeagueGroupBoostState | null): Promise<LeagueGroupBoostState | null> {
  if (!boost) return null;
  const eventCount = await fetchBoostEventLikeCount(db, boost);
  return eventCount > boost.likeCount ? { ...boost, likeCount: eventCount } : boost;
}

export async function getLeagueGroupBoostMultiplier(): Promise<number> {
  const boost = (await loadActiveLeagueGroupBoost()) ?? (await fetchActiveLeagueGroupBoostFromCloud());
  return boost?.multiplier ?? 1;
}

export async function getActiveLeagueGroupBoost(): Promise<LeagueGroupBoostState | null> {
  const cached = await loadActiveLeagueGroupBoost();
  const cloud = await fetchActiveLeagueGroupBoostFromCloud();
  return cloud ?? cached;
}

export function formatLeagueGroupBoostTimeLeft(expiresAt: number): string {
  const leftMs = Math.max(0, expiresAt - Date.now());
  const total = Math.ceil(leftMs / 1000);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return hh > 0
    ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function subscribeToActiveLeagueGroupBoost(
  onUpdate: (boost: LeagueGroupBoostState | null) => void,
): () => void {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return () => {};
  const db = getDb();
  if (!db) return () => {};
  const r: { lb: (() => void) | null; group: (() => void) | null } = { lb: null, group: null };
  let cancelled = false;
  void (async () => {
    const uid = await ensureAnonUser();
    if (cancelled || !uid) return;
    r.lb = db.collection('leaderboard').doc(uid).onSnapshot((lbSnap: any) => {
      r.group?.();
      r.group = null;
      const data = lbSnap?.exists ? lbSnap.data?.() : null;
      const groupId = String(data?.groupId || '');
      if (!groupId) {
        void cacheLeagueGroupBoost(null);
        onUpdate(null);
        return;
      }
      r.group = db.collection('league_groups').doc(groupId).onSnapshot((groupSnap: any) => {
        const raw = groupSnap?.exists ? groupSnap.data?.()?.groupBoost : null;
        const boost = normalizeBoost(raw, groupId);
        void cacheLeagueGroupBoost(boost);
        onUpdate(boost);
        if (boost) {
          void withEventLikeCount(db, boost).then((resolvedBoost) => {
            if (cancelled || !resolvedBoost || resolvedBoost.likeCount <= boost.likeCount) return;
            void cacheLeagueGroupBoost(resolvedBoost);
            onUpdate(resolvedBoost);
          });
        }
      });
    });
  })();
  return () => {
    cancelled = true;
    r.group?.();
    r.lb?.();
  };
}

export async function fetchLeagueGroupBoostLikedToday(boost: LeagueGroupBoostState | null): Promise<boolean> {
  if (!boost) return false;
  const state = await fetchTodayActivityLikeState();
  return state?.targetUid === boost.buyerUid && state?.eventId === boost.likeEventId;
}

export async function buyLeagueGroupBoost(): Promise<BuyLeagueGroupBoostResult> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { ok: false, reason: 'unavailable' };
  const stableId = await ensureAnonUser();
  if (!stableId) return { ok: false, reason: 'unavailable' };
  const existing = leagueGroupBoostBuyInFlight.get(stableId);
  if (existing) return existing;

  const request: Promise<BuyLeagueGroupBoostResult> = (async () => {
    await ensureCallableAuthReady().catch(() => false);
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    try {
      const fn = callable<{ stableId?: string }, ActivateLeagueGroupBoostResponse>('leagueActivateGroupBoost');
      const res = await fn({ stableId });
      const boost = normalizeBoost(res.data?.boost, res.data?.groupId);
      if (!boost) return { ok: false, reason: 'unknown' };
      await cacheLeagueGroupBoost(boost);
      const balance = Math.max(0, Math.floor(Number(res.data?.shardsBalance) || 0));
      const usedGiftVoucher = res.data?.usedGiftVoucher === true;
      await replaceShardsBalanceLocal(balance, {
        updatedAtMs: res.data?.shardsUpdatedAtMs,
        op: 'spend',
        reason: usedGiftVoucher ? 'league_group_boost_gift' : 'league_group_boost',
      });
      if (usedGiftVoucher) {
      // Сервер погасил ваучер — убираем локальный флаг, чтобы cloud_sync не вернул его обратно.
        await clearClubGiftFreeBoostFromLevel().catch(() => {});
      }
      return { ok: true, boost, shardsBalance: balance, usedGiftVoucher };
    } catch (e: any) {
      const code = String(e?.code || '');
      const message = String(e?.message || '');
      const details = String(e?.details || '');
      const errorText = `${code} ${message} ${details}`.toLowerCase();
      console.warn('[league_group_boosts] buy failed', {
        code,
        message: message.slice(0, 240),
        details: details.slice(0, 240),
      });
      if (errorText.includes('not-found')) return { ok: false, reason: 'not_deployed' };
      if (errorText.includes('already-active')) return { ok: false, reason: 'active' };
      if (errorText.includes('insufficient-shards')) return { ok: false, reason: 'not_enough_shards' };
      if (errorText.includes('no-current-group')) return { ok: false, reason: 'no_current_group' };
      return { ok: false, reason: 'unknown' };
    }
  })().finally(() => {
    leagueGroupBoostBuyInFlight.delete(stableId);
  });

  leagueGroupBoostBuyInFlight.set(stableId, request);
  return request;
}

export async function likeLeagueGroupBoostBuyer(boost: LeagueGroupBoostState, senderDisplayName?: string): Promise<number> {
  const res = await sendFriendActivityLike({
    targetUid: boost.buyerUid,
    eventId: boost.likeEventId,
    senderDisplayName,
  });
  const next = res.idempotentReplay
    ? Math.max(0, Math.floor(Number(res.activityLikeCount) || 0))
    : Math.max(res.activityLikeCount, boost.likeCount + 1);
  await cacheLeagueGroupBoost({ ...boost, likeCount: next });
  return next;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
