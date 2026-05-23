import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { IS_EXPO_GO } from './config';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
const isDevRuntime = typeof __DEV__ !== 'undefined' && !!__DEV__;

const RC_TIMEOUT_MS = 8000;
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes — avoid hammering RevenueCat
const RC_STALE_GRACE_MS = 24 * 60 * 60 * 1000; // trust local premium for up to 24h after last RC confirmation
const RC_LAST_SEEN_KEY = 'premium_rc_last_seen_at';

let _cachedRealResult: boolean | null = null;
let _realCacheTime = 0;
let _cachedVipResult: boolean | null = null;
let _vipCacheTime = 0;
let _cachedAccessResult: boolean | null = null;
let _accessCacheTime = 0;

/** Invalidate the in-memory cache (call after purchase/restore). */
export function invalidatePremiumCache(): void {
  _cachedRealResult = null;
  _realCacheTime = 0;
  _cachedVipResult = null;
  _vipCacheTime = 0;
  _cachedAccessResult = null;
  _accessCacheTime = 0;
}

/**
 * StoreKit/Google has just confirmed a purchase or restore locally.
 * RevenueCat sandbox can lag for a few seconds, so this gives the local
 * premium flag the same bounded grace window as a fresh RC confirmation.
 */
export async function markPremiumStoreSeenNow(): Promise<void> {
  await AsyncStorage.setItem(RC_LAST_SEEN_KEY, String(Date.now()));
  invalidatePremiumCache();
}

/**
 * Verifies real store/trial Premium status.
 * Admin-issued grants are intentionally excluded: those are VIP access now.
 */
export async function getVerifiedRealPremiumStatus(): Promise<boolean> {
  const pairs = await AsyncStorage.multiGet([
    'tester_no_premium',
    'premium_active',
    'premium_plan',
    'premium_expiry',
    'premium_rc_expiry_ms',
    'admin_premium_override',
  ]);
  const noPremium = pairs.find(p => p[0] === 'tester_no_premium')?.[1];
  const active   = pairs.find(p => p[0] === 'premium_active')?.[1];
  const plan     = pairs.find(p => p[0] === 'premium_plan')?.[1];
  const expiry   = parseInt(pairs.find(p => p[0] === 'premium_expiry')?.[1] || '0');
  const rcExpiry = parseInt(pairs.find(p => p[0] === 'premium_rc_expiry_ms')?.[1] || '0');
  const adminOverride = pairs.find(p => p[0] === 'admin_premium_override')?.[1];
  const normalizedPlan = String(plan ?? '').trim().toLowerCase();
  const storePlan = normalizedPlan === 'monthly' || normalizedPlan === 'yearly' || normalizedPlan === 'annual';
  const legacyAdminGrant =
    adminOverride === 'true' ||
    normalizedPlan === 'admin_grant';
  const adminExplicitRevoked =
    adminOverride === 'false' && (!plan || plan === 'null' || plan === '');

  // Тестер «Снять премиум» должен срезать только dev-default premium,
  // но не VIP-доступ, который считается отдельно.
  if (noPremium === 'true') return cacheReal(false);
  // Dev builds are premium by default — вимикається лише прапорцем tester_no_premium вище
  if (isDevRuntime) return cacheReal(true);

  // Return cached result if still fresh
  if (_cachedRealResult !== null && Date.now() - _realCacheTime < CACHE_TTL_MS) {
    return _cachedRealResult;
  }

  const now = Date.now();
  const rcExpiryActive = rcExpiry > now;
  const rcExpiryExpired = rcExpiry > 0 && rcExpiry <= now;
  const paidProgressActive =
    storePlan &&
    !legacyAdminGrant &&
    !adminExplicitRevoked &&
    (expiry === 0 || expiry > now) &&
    !rcExpiryExpired;

  const restorePaidProgressLocally = async (): Promise<boolean> => {
    if (!paidProgressActive) return false;
    if (active !== 'true') {
      await AsyncStorage.setItem('premium_active', 'true');
    }
    return true;
  };

  if (!IS_EXPO_GO) {
    try {
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (info) {
        const activeSubscriptions = (info as any).activeSubscriptions;
        const rcActive =
          Object.keys((info as any).entitlements?.active ?? {}).length > 0 ||
          (Array.isArray(activeSubscriptions) && activeSubscriptions.length > 0);

        if (rcActive) {
          await AsyncStorage.multiSet([
            ['premium_active', 'true'],
            [RC_LAST_SEEN_KEY, String(now)],
          ]);
          return cacheReal(true);
        }

        // Cloud sync intentionally does not persist `premium_active`; real paid
        // state is represented by store plan + RC expiry metadata. If RevenueCat
        // has an identity/cache hiccup but our server-synced RC expiry is still
        // in the future, keep access instead of dropping the user to non-premium mode.
        if (rcExpiryActive && await restorePaidProgressLocally()) {
          return cacheReal(true);
        }

        // If local flag is true and RC transiently returns non-premium,
        // trust local state. RC can lag due to network issues, server-side
        // caching, or sandbox propagation delays. Users with normal subscriptions
        // never have expiry set (expiry === 0), so we protect both cases:
        // - expiry === 0: standard subscription, no expiry stored → trust local
        // - expiry > Date.now(): time-limited premium (referral/trial) still valid
        if (active === 'true' && paidProgressActive) {
          const lastSeenRaw = await AsyncStorage.getItem(RC_LAST_SEEN_KEY);
          const lastSeen = parseInt(lastSeenRaw || '0') || 0;
          // Never trust local premium forever when RC says inactive.
          // Keep a bounded grace window for sandbox/network delays.
          if (lastSeen > 0 && now - lastSeen <= RC_STALE_GRACE_MS) {
            return cacheReal(true);
          }
        }

        await AsyncStorage.setItem('premium_active', 'false');
        return cacheReal(false);
      }
    } catch {
      // RC unavailable — fall through to local check
    }
  }

  // Expo Go or RC unavailable: trust AsyncStorage with expiry validation
  if (adminExplicitRevoked) {
    await AsyncStorage.setItem('premium_active', 'false');
    return cacheReal(false);
  }
  if (legacyAdminGrant) return cacheReal(false);
  if (!storePlan) return cacheReal(false);
  if (rcExpiryExpired || (expiry > 0 && expiry < now)) {
    await AsyncStorage.setItem('premium_active', 'false');
    return cacheReal(false);
  }
  if (active !== 'true' && !await restorePaidProgressLocally()) return cacheReal(false);
  return cacheReal(true);
}

export async function getVerifiedVipStatus(): Promise<boolean> {
  if (_cachedVipResult !== null && Date.now() - _vipCacheTime < CACHE_TTL_MS) {
    return _cachedVipResult;
  }

  const pairs = await AsyncStorage.multiGet([
    'vip_active',
    'vip_plan',
    'vip_from',
    'vip_until',
    'vip_expiry',
    'vip_admin_override',
    'vip_admin_grant_at',
    'vip_grant_at',
    'premium_plan',
    'premium_expiry',
    'admin_premium_override',
    'premium_admin_grant_at',
  ]);
  const get = (key: string) => pairs.find(p => p[0] === key)?.[1];
  const progress = {
    vip_active: get('vip_active'),
    vip_plan: get('vip_plan'),
    vip_from: get('vip_from'),
    vip_until: get('vip_until') ?? get('vip_expiry'),
    vip_admin_override: get('vip_admin_override'),
    vip_admin_grant_at: get('vip_admin_grant_at') ?? get('vip_grant_at'),
    premium_plan: get('premium_plan'),
    premium_expiry: get('premium_expiry'),
    admin_premium_override: get('admin_premium_override'),
    premium_admin_grant_at: get('premium_admin_grant_at'),
  };

  const vipState = getVipProgressState(progress);
  if (!vipState) return cacheVip(false);

  const storagePairs: [string, string][] = [
    ['vip_active', vipState.active ? 'true' : 'false'],
    ['vip_plan', vipState.active ? vipState.plan : ''],
    ['vip_from', vipState.active ? vipState.fromValue : '0'],
    ['vip_until', vipState.active ? vipState.untilValue : '0'],
    ['vip_admin_override', vipState.active ? 'true' : 'false'],
  ];
  if (vipState.grantAt) {
    storagePairs.push(['vip_admin_grant_at', String(parsePremiumProgressMs(vipState.grantAt) || vipState.grantAt)]);
  }
  await AsyncStorage.multiSet(storagePairs).catch(() => {});
  return cacheVip(vipState.active);
}

export async function getVerifiedPremiumAccessStatus(): Promise<boolean> {
  if (_cachedAccessResult !== null && Date.now() - _accessCacheTime < CACHE_TTL_MS) {
    return _cachedAccessResult;
  }

  const noLimits = await AsyncStorage.getItem('tester_no_limits').catch(() => null);
  if (noLimits === 'true') return cacheAccess(true);

  const [realPremium, vip] = await Promise.all([
    getVerifiedRealPremiumStatus().catch(() => false),
    getVerifiedVipStatus().catch(() => false),
  ]);
  return cacheAccess(realPremium || vip);
}

/** Backwards-compatible name used by feature gates: means Premium-level access, including VIP. */
export async function getVerifiedPremiumStatus(): Promise<boolean> {
  return getVerifiedPremiumAccessStatus();
}

function cacheReal(result: boolean): boolean {
  _cachedRealResult = result;
  _realCacheTime = Date.now();
  return result;
}

function cacheVip(result: boolean): boolean {
  _cachedVipResult = result;
  _vipCacheTime = Date.now();
  return result;
}

function cacheAccess(result: boolean): boolean {
  _cachedAccessResult = result;
  _accessCacheTime = Date.now();
  return result;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
