import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { IS_EXPO_GO } from './config';
const isDevRuntime = typeof __DEV__ !== 'undefined' && !!__DEV__;

const RC_TIMEOUT_MS = 8000;
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes — avoid hammering RevenueCat
const RC_STALE_GRACE_MS = 24 * 60 * 60 * 1000; // trust local premium for up to 24h after last RC confirmation
const RC_LAST_SEEN_KEY = 'premium_rc_last_seen_at';

let _cachedResult: boolean | null = null;
let _cacheTime = 0;

/** Invalidate the in-memory cache (call after purchase/restore). */
export function invalidatePremiumCache(): void {
  _cachedResult = null;
  _cacheTime = 0;
}

/**
 * Verifies premium status: tries RevenueCat first, falls back to
 * local AsyncStorage with expiry check. Updates AsyncStorage to reflect
 * the verified status so other code stays in sync.
 * Result is cached in memory for 5 minutes to avoid rate-limiting RC.
 */
export async function getVerifiedPremiumStatus(): Promise<boolean> {
  const [testerNoLimitsRaw, testerNoPremiumRaw] = await AsyncStorage.multiGet([
    'tester_no_limits',
    'tester_no_premium',
  ]);
  const noLimits = testerNoLimitsRaw[1];
  const noPremium = testerNoPremiumRaw[1];
  // "No Limits" tester mode implies full premium access
  if (noLimits === 'true') return cache(true);
  // Тестер «Снять премиум» — має перемагати дефолтний преміум у __DEV__ (і не дзвонити в RC)
  if (noPremium === 'true') return cache(false);
  // Dev builds are premium by default — вимикається лише прапорцем tester_no_premium вище
  if (isDevRuntime) return cache(true);

  // Return cached result if still fresh
  if (_cachedResult !== null && Date.now() - _cacheTime < CACHE_TTL_MS) {
    return _cachedResult;
  }
  const pairs = await AsyncStorage.multiGet(['premium_active', 'premium_plan', 'premium_expiry', 'admin_premium_override']);
  const active   = pairs.find(p => p[0] === 'premium_active')?.[1];
  const plan     = pairs.find(p => p[0] === 'premium_plan')?.[1];
  const expiry   = parseInt(pairs.find(p => p[0] === 'premium_expiry')?.[1] || '0');
  const adminOverride = pairs.find(p => p[0] === 'admin_premium_override')?.[1];

  // Admin-granted premium: skip RevenueCat entirely (time-limited via premium_expiry)
  if (adminOverride === 'true' && plan && plan !== 'null' && plan !== '') {
    if (expiry > 0 && expiry < Date.now()) {
      await AsyncStorage.multiSet([
        ['premium_active', 'false'],
        ['premium_plan', ''],
        ['admin_premium_override', 'false'],
        ['premium_expiry', '0'],
      ]).catch(() => {});
      invalidatePremiumCache();
      return cache(false);
    }
    return cache(true);
  }

  if (!IS_EXPO_GO) {
    try {
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (info) {
        const rcActive =
          Object.keys((info as any).entitlements.active).length > 0 ||
          (info as any).activeSubscriptions.length > 0;

        if (rcActive) {
          await AsyncStorage.multiSet([
            ['premium_active', 'true'],
            [RC_LAST_SEEN_KEY, String(Date.now())],
          ]);
          return cache(true);
        }

        // If local flag is true and RC transiently returns non-premium,
        // trust local state. RC can lag due to network issues, server-side
        // caching, or sandbox propagation delays. Users with normal subscriptions
        // never have expiry set (expiry === 0), so we protect both cases:
        // - expiry === 0: standard subscription, no expiry stored → trust local
        // - expiry > Date.now(): time-limited premium (referral/trial) still valid
        if (active === 'true' && (expiry === 0 || expiry > Date.now())) {
          const lastSeenRaw = await AsyncStorage.getItem(RC_LAST_SEEN_KEY);
          const lastSeen = parseInt(lastSeenRaw || '0') || 0;
          // Never trust local premium forever when RC says inactive.
          // Keep a bounded grace window for sandbox/network delays.
          if (lastSeen > 0 && Date.now() - lastSeen <= RC_STALE_GRACE_MS) {
            return cache(true);
          }
        }

        await AsyncStorage.setItem('premium_active', 'false');
        return cache(false);
      }
    } catch {
      // RC unavailable — fall through to local check
    }
  }

  // Expo Go or RC unavailable: trust AsyncStorage with expiry validation
  if (active !== 'true') return cache(false);
  if (expiry > 0 && expiry < Date.now()) {
    await AsyncStorage.setItem('premium_active', 'false');
    return cache(false);
  }
  return cache(true);
}

function cache(result: boolean): boolean {
  _cachedResult = result;
  _cacheTime = Date.now();
  return result;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
