import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { FORCE_PREMIUM, IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { isIntroFullAccessActive } from './intro_full_access';
import { isLoyaltyGiftActive } from './loyalty_gift';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import { revenueCatCustomerInfoHasPremiumAccess } from './revenuecat_premium_access';
const isDevRuntime = typeof __DEV__ !== 'undefined' && !!__DEV__;

const RC_TIMEOUT_MS = 8000;
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes — avoid hammering RevenueCat
// Зеркало functions/src/premium_status.ts SERVER_RC_GRACE_MS (72ч): покрывает billing retry
// и сетевые лаги вебхука RC. Раньше клиент стоял на 24ч → между 24ч и 72ч клиент показывал
// «нет премиума» и открывал пейвол, в то время как сервер ещё пропускал ИИ-функции. Аудит 2026-06-27.
const RC_STALE_GRACE_MS = 72 * 60 * 60 * 1000;
const RC_LAST_SEEN_KEY = 'premium_rc_last_seen_at';

let _cachedRealResult: boolean | null = null;
let _realCacheTime = 0;
let _cachedVipResult: boolean | null = null;
let _vipCacheTime = 0;
let _cachedAccessResult: boolean | null = null;
let _accessCacheTime = 0;
let _lastCloudAccessRefreshTime = 0;
let _cloudAccessRefreshInFlight: Promise<boolean> | null = null;

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
 * Должен ли dev-сборочный FORCE_PREMIUM сейчас раздавать Premium.
 *
 * FORCE_PREMIUM открывает весь Premium в dev-рантайме (и гасится в проде через
 * IS_STORE_RELEASE — см. config.ts). Но тестерский флаг «Снять премиум»
 * (tester_no_premium) должен побеждать его, иначе QA не может проверить
 * не-премиум состояние (пейвол, плашки «Premium» на уроках). Это тот же
 * приоритет, что уже зашит в getVerifiedRealPremiumStatus (tester_no_premium
 * срезает dev-default), вынесенный для шортката FORCE_PREMIUM в PremiumContext.
 */
export async function forcePremiumActive(): Promise<boolean> {
  if (!FORCE_PREMIUM) return false;
  const noPremium = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  return noPremium !== 'true';
}

/**
 * Локальный план — это разовая покупка «Навсегда» (non-consumable)?
 *
 * Видимое имя такого доступа — «Pro» (синяя палитра), в отличие от рекуррентного
 * Plus. Источник правды — ключ `premium_plan` в AsyncStorage: его пишет
 * persistStorePremiumLocally при подтверждении покупки/восстановления. VIP-гранты
 * (опрос/рефералка/админка/промо) пишут `vip_plan`, а НЕ `premium_plan='lifetime'`,
 * поэтому такой юзер остаётся Plus. Чистое чтение флага, без сетевых запросов.
 */
export async function isLifetimePlanLocal(): Promise<boolean> {
  const plan = await AsyncStorage.getItem('premium_plan').catch(() => null);
  return String(plan ?? '').trim().toLowerCase() === 'lifetime';
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
  const storePlan = normalizedPlan === 'monthly' || normalizedPlan === 'yearly' || normalizedPlan === 'annual' || normalizedPlan === 'lifetime';
  const legacyAdminGrant =
    adminOverride === 'true' ||
    normalizedPlan === 'admin_grant';
  const adminExplicitRevoked =
    adminOverride === 'false' && (!plan || plan === 'null' || plan === '');

  // Тестер «Снять премиум» должен срезать только dev-default premium,
  // но не VIP-доступ, который считается отдельно.
  if (noPremium === 'true') return cacheReal(false);
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
        const rcActive = revenueCatCustomerInfoHasPremiumAccess(info as any);

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
  if (!storePlan) {
    // Старые dev-сборки безусловно писали premium_active=true. Без очистки этот
    // флаг снова попадал в синхронный startup snapshot на каждом холодном запуске
    // и на короткое время расходился с серверным entitlement.
    if (isDevRuntime && active === 'true') {
      await AsyncStorage.setItem('premium_active', 'false');
    }
    return cacheReal(false);
  }
  // КРИТИЧНО (защита от ложной потери оплаченного премиума): сюда мы попадаем, когда
  // RevenueCat НЕ ОТВЕТИЛ (таймаут 8с или исключение) — в Expo Go или при сбое сети.
  // Это НЕ то же самое, что «RC сказал: не премиум» (та ветка выше, строки ~149-160).
  // Если RENEWAL уже прошёл, но облако ещё не обновило premium_rc_expiry_ms (webhook
  // опоздал), локальный expiry/rcExpiry может выглядеть «истёкшим», хотя подписка
  // активна. Снять премиум здесь = отобрать оплаченный доступ у платящего из-за обрыва
  // связи. Поэтому: пока был недавний реальный премиум (premium_active='true' + свежий
  // RC_LAST_SEEN в пределах RC_STALE_GRACE_MS), держим доступ, а не снимаем.
  if (rcExpiryExpired || (expiry > 0 && expiry < now)) {
    if (active === 'true') {
      const lastSeenRaw = await AsyncStorage.getItem(RC_LAST_SEEN_KEY);
      const lastSeen = parseInt(lastSeenRaw || '0') || 0;
      if (lastSeen > 0 && now - lastSeen <= RC_STALE_GRACE_MS) {
        return cacheReal(true);
      }
    }
    await AsyncStorage.setItem('premium_active', 'false');
    return cacheReal(false);
  }
  if (active !== 'true' && !await restorePaidProgressLocally()) return cacheReal(false);
  return cacheReal(true);
}

export async function getVerifiedVipStatus(): Promise<boolean> {
  // Тестер «Снять премиум» (tester_no_premium) — жёсткий kill-switch: должен
  // гасить и VIP, а не только real-премиум. Иначе админ-VIP-грант (или его
  // воскрешение из облака) возвращал доступ, и кнопка «Снять премиум» «не
  // работала». Проверяем ПЕРЕД кэшем, чтобы снятие срабатывало мгновенно.
  const noPremiumVip = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  if (noPremiumVip === 'true') return cacheVip(false);

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
  // Тестер «Снять премиум» — единый kill-switch на ВЕСЬ премиум-доступ:
  // real + VIP + intro-доступ + воскрешение из облака. Раньше флаг гасил только
  // real, а доступ оставался через VIP/intro (и cloud-refresh тянул его назад),
  // поэтому кнопка «Снять премиум» не снимала. Проверяем самым первым, до кэша
  // и до любого облачного обновления.
  const noPremiumAccess = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  if (noPremiumAccess === 'true') return cacheAccess(false);

  if (_cachedAccessResult !== null && Date.now() - _accessCacheTime < CACHE_TTL_MS) {
    return _cachedAccessResult;
  }

  const noLimits = await AsyncStorage.getItem('tester_no_limits').catch(() => null);
  if (noLimits === 'true' && !IS_STORE_RELEASE) return cacheAccess(true);

  const [realPremium, vip] = await Promise.all([
    getVerifiedRealPremiumStatus().catch(() => false),
    getVerifiedVipStatus().catch(() => false),
  ]);
  if (realPremium || vip) return cacheAccess(true);

  if (await isIntroFullAccessActive().catch(() => false)) {
    return cacheAccess(true);
  }

  // Подарок лояльности (72ч для существующих free-юзеров). Производный доступ,
  // как и intro: удаление ключей подарка мгновенно убирает доступ. Kill-switch
  // tester_no_premium выше уже гасит и его. Платных/VIP не касается (им подарок не выдаётся).
  if (await isLoyaltyGiftActive().catch(() => false)) {
    return cacheAccess(true);
  }

  const cloudRefreshed = await refreshPremiumAccessFromCloudIfNeeded();
  if (cloudRefreshed) {
    invalidatePremiumCache();
    const [realAfterCloud, vipAfterCloud] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    return cacheAccess(realAfterCloud || vipAfterCloud);
  }

  return cacheAccess(false);
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

async function refreshPremiumAccessFromCloudIfNeeded(): Promise<boolean> {
  const now = Date.now();
  if (now - _lastCloudAccessRefreshTime < CACHE_TTL_MS) return false;
  if (_cloudAccessRefreshInFlight) return _cloudAccessRefreshInFlight;

  _lastCloudAccessRefreshTime = now;
  _cloudAccessRefreshInFlight = (async () => {
    try {
      const cloudSync = await import('./cloud_sync');
      await cloudSync.restoreFromCloud();
      return true;
    } catch {
      return false;
    } finally {
      _cloudAccessRefreshInFlight = null;
    }
  })();
  return _cloudAccessRefreshInFlight;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
