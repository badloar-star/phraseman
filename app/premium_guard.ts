import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { FORCE_PREMIUM, IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { isIntroFullAccessActive } from './intro_full_access';
import { readGiftAccessFromCloud } from './gift_access_cloud';
import { syncRevenueCatProjectionForAccount } from './revenuecat_projection_sync';
import { DebugLogger } from './debug-logger';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import { revenueCatCustomerInfoHasPremiumAccess } from './revenuecat_premium_access';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { readVipSnapshotForGeneration, writeVipSnapshotForAccount } from './premium_vip_storage';
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
let _realCacheGeneration = -1;
let _cachedVipResult: boolean | null = null;
let _vipCacheTime = 0;
let _vipCacheGeneration = -1;
let _cachedAccessResult: boolean | null = null;
let _accessCacheTime = 0;
let _accessCacheGeneration = -1;
let _lastCloudAccessRefreshTime = 0;
let _cloudAccessRefreshInFlight: Promise<boolean> | null = null;
let _premiumAccountTransitionEpoch = 0;
let _premiumAccountDrainEpoch = 0;
const _premiumAccountTransitionListeners = new Set<(epoch: number) => void>();
let _premiumAccountWorkCount = 0;
const _premiumAccountWorkIdleWaiters = new Set<() => void>();
const _premiumAccountWorkCountByEpoch = new Map<number, number>();
const _premiumAccountWorkIdleWaitersByEpoch = new Map<number, Set<() => void>>();

/** Invalidate the in-memory cache (call after purchase/restore). */
export function invalidatePremiumCache(): void {
  _cachedRealResult = null;
  _realCacheTime = 0;
  _realCacheGeneration = -1;
  _cachedVipResult = null;
  _vipCacheTime = 0;
  _vipCacheGeneration = -1;
  _cachedAccessResult = null;
  _accessCacheTime = 0;
  _accessCacheGeneration = -1;
}

/**
 * Starts a fail-closed entitlement boundary before the canonical account changes.
 * This is intentionally synchronous: mounted UI must stop rendering account A's
 * Premium/VIP state before any wipe, restore, or RevenueCat request for account B.
 */
export function beginPremiumAccountTransition(): number {
  invalidatePremiumCache();
  _lastCloudAccessRefreshTime = 0;
  _cloudAccessRefreshInFlight = null;
  _premiumAccountDrainEpoch = _premiumAccountTransitionEpoch;
  _premiumAccountTransitionEpoch += 1;
  const epoch = _premiumAccountTransitionEpoch;
  for (const listener of _premiumAccountTransitionListeners) {
    try {
      listener(epoch);
    } catch {
      // A broken UI subscriber must not interrupt an auth/account transition.
    }
  }
  return epoch;
}

export function onPremiumAccountTransition(
  listener: (epoch: number) => void,
): { remove: () => void } {
  _premiumAccountTransitionListeners.add(listener);
  return {
    remove: () => {
      _premiumAccountTransitionListeners.delete(listener);
    },
  };
}

export function getPremiumAccountTransitionEpoch(): number {
  return _premiumAccountTransitionEpoch;
}

/**
 * Registers delayed entitlement work against the current account epoch. Auth
 * transitions invalidate the epoch first, then drain registered native writes
 * before wiping account A, so an old VIP callback cannot finish into account B.
 */
export async function runPremiumAccountScopedWork<T>(
  epoch: number,
  work: (isCurrent: () => boolean) => Promise<T>,
): Promise<T | undefined> {
  if (epoch !== _premiumAccountTransitionEpoch) return undefined;
  _premiumAccountWorkCount += 1;
  _premiumAccountWorkCountByEpoch.set(
    epoch,
    (_premiumAccountWorkCountByEpoch.get(epoch) ?? 0) + 1,
  );
  const isCurrent = () => epoch === _premiumAccountTransitionEpoch;
  try {
    if (!isCurrent()) return undefined;
    return await work(isCurrent);
  } finally {
    _premiumAccountWorkCount = Math.max(0, _premiumAccountWorkCount - 1);
    const epochWorkCount = Math.max(0, (_premiumAccountWorkCountByEpoch.get(epoch) ?? 0) - 1);
    if (epochWorkCount === 0) {
      _premiumAccountWorkCountByEpoch.delete(epoch);
      const epochWaiters = _premiumAccountWorkIdleWaitersByEpoch.get(epoch);
      if (epochWaiters) {
        for (const resolve of epochWaiters) resolve();
        _premiumAccountWorkIdleWaitersByEpoch.delete(epoch);
      }
    } else {
      _premiumAccountWorkCountByEpoch.set(epoch, epochWorkCount);
    }
    if (_premiumAccountWorkCount === 0) {
      for (const resolve of _premiumAccountWorkIdleWaiters) resolve();
      _premiumAccountWorkIdleWaiters.clear();
    }
  }
}

export function waitForPremiumAccountWorkIdle(): Promise<void> {
  if (_premiumAccountWorkCount === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    _premiumAccountWorkIdleWaiters.add(resolve);
  });
}

/**
 * Bounds account-transition drains without retaining a waiter forever when a
 * native RevenueCat operation never settles. A timeout does not cancel native
 * work; the account epoch still prevents its late callback from committing.
 */
export function waitForPremiumAccountWorkIdleWithDeadline(timeoutMs: number): Promise<boolean> {
  const targetEpoch = _premiumAccountDrainEpoch;
  if ((_premiumAccountWorkCountByEpoch.get(targetEpoch) ?? 0) === 0) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (idle: boolean) => {
      if (settled) return;
      settled = true;
      const epochWaiters = _premiumAccountWorkIdleWaitersByEpoch.get(targetEpoch);
      epochWaiters?.delete(resolveIdle);
      if (epochWaiters?.size === 0) _premiumAccountWorkIdleWaitersByEpoch.delete(targetEpoch);
      if (timer) clearTimeout(timer);
      resolve(idle);
    };
    const resolveIdle = () => finish(true);
    const epochWaiters = _premiumAccountWorkIdleWaitersByEpoch.get(targetEpoch) ?? new Set<() => void>();
    epochWaiters.add(resolveIdle);
    _premiumAccountWorkIdleWaitersByEpoch.set(targetEpoch, epochWaiters);
    timer = setTimeout(() => {
      finish((_premiumAccountWorkCountByEpoch.get(targetEpoch) ?? 0) === 0);
    }, Math.max(0, timeoutMs));
  });
}

export function __getPremiumAccountWorkIdleWaiterCountForTests(): number {
  let count = _premiumAccountWorkIdleWaiters.size;
  for (const waiters of _premiumAccountWorkIdleWaitersByEpoch.values()) count += waiters.size;
  return count;
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
 * Returns the effective dev-only "no limits" override.
 * The explicit no-premium kill switch always wins, and store builds ignore
 * local tester flags entirely.
 */
export async function isTesterNoLimitsActive(): Promise<boolean> {
  const pairs = await AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])
    .catch(() => [] as [string, string | null][]);
  const noPremiumRaw = pairs.find(([key]) => key === 'tester_no_premium')?.[1];
  const noLimitsRaw = pairs.find(([key]) => key === 'tester_no_limits')?.[1];
  return noPremiumRaw !== 'true' && noLimitsRaw === 'true' && !IS_STORE_RELEASE;
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
export async function markPremiumStoreSeenNow(options?: Readonly<{
  alreadyTransitionLocked?: boolean;
  isCurrent?: () => boolean;
}>): Promise<void> {
  if (options?.alreadyTransitionLocked) {
    if (options.isCurrent && !options.isCurrent()) return;
    await AsyncStorage.setItem(RC_LAST_SEEN_KEY, String(Date.now()));
    if (options.isCurrent && !options.isCurrent()) return;
    invalidatePremiumCache();
    return;
  }
  const generation = captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return;
  await writeRealPremiumStorageForGeneration(generation, () => (
    AsyncStorage.setItem(RC_LAST_SEEN_KEY, String(Date.now()))
  ));
  if (!accountGenerationIsCurrent(generation)) return;
  invalidatePremiumCache();
}

function accountGenerationIsCurrent(generation: AccountGenerationToken): boolean {
  return !!generation.stableId && isCurrentAccountGeneration(generation, generation.stableId);
}

async function writeRealPremiumStorageForGeneration(
  generation: AccountGenerationToken,
  write: () => Promise<void>,
): Promise<boolean> {
  if (!accountGenerationIsCurrent(generation)) return false;
  return withAccountTransitionLock(async () => {
    if (!accountGenerationIsCurrent(generation)) return false;
    await write();
    return accountGenerationIsCurrent(generation);
  });
}

/**
 * Verifies real store/trial Premium status.
 * Admin-issued grants are intentionally excluded: those are VIP access now.
 */
export async function getVerifiedRealPremiumStatus(): Promise<boolean> {
  const generation = captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const finish = (result: boolean) => cacheReal(result, generation);
  const pairs = await AsyncStorage.multiGet([
    'tester_no_premium',
    'premium_active',
    'premium_plan',
    'premium_expiry',
    'premium_rc_expiry_ms',
    'admin_premium_override',
  ]);
  if (!accountGenerationIsCurrent(generation)) return false;
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
  if (noPremium === 'true') return finish(false);
  // Return cached result if still fresh
  if (
    _cachedRealResult !== null
    && _realCacheGeneration === generation.generation
    && Date.now() - _realCacheTime < CACHE_TTL_MS
  ) {
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
      const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
        AsyncStorage.setItem('premium_active', 'true')
      ));
      if (!persisted) return false;
    }
    return accountGenerationIsCurrent(generation);
  };

  if (!IS_EXPO_GO) {
    try {
      const rcAppUserIdBefore = await Purchases.getAppUserID().catch(() => '');
      if (!accountGenerationIsCurrent(generation) || rcAppUserIdBefore !== generation.stableId) return false;
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (!accountGenerationIsCurrent(generation)) return false;
      if (info) {
        const rcAppUserIdAfter = await Purchases.getAppUserID().catch(() => '');
        if (!accountGenerationIsCurrent(generation) || rcAppUserIdAfter !== generation.stableId) return false;
        const rcActive = revenueCatCustomerInfoHasPremiumAccess(info as any);

        if (rcActive) {
          try {
            const projectionSynced = await syncRevenueCatProjectionForAccount(generation.stableId!);
            if (!accountGenerationIsCurrent(generation)) return false;
            if (!projectionSynced) {
              DebugLogger.error(
                'premium_guard:revenuecat_projection_sync',
                new Error('revenuecat_projection_not_confirmed'),
                'warning',
              );
            }
          } catch (error) {
            if (!accountGenerationIsCurrent(generation)) return false;
            DebugLogger.error('premium_guard:revenuecat_projection_sync', error, 'warning');
          }
          const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
            AsyncStorage.multiSet([
              ['premium_active', 'true'],
              [RC_LAST_SEEN_KEY, String(now)],
            ])
          ));
          return persisted ? finish(true) : false;
        }

        // Cloud sync intentionally does not persist `premium_active`; real paid
        // state is represented by store plan + RC expiry metadata. If RevenueCat
        // has an identity/cache hiccup but our server-synced RC expiry is still
        // in the future, keep access instead of dropping the user to non-premium mode.
        if (rcExpiryActive && await restorePaidProgressLocally()) {
          return finish(true);
        }
        if (!accountGenerationIsCurrent(generation)) return false;

        // If local flag is true and RC transiently returns non-premium,
        // trust local state. RC can lag due to network issues, server-side
        // caching, or sandbox propagation delays. Users with normal subscriptions
        // never have expiry set (expiry === 0), so we protect both cases:
        // - expiry === 0: standard subscription, no expiry stored → trust local
        // - expiry > Date.now(): time-limited premium (referral/trial) still valid
        if (active === 'true' && paidProgressActive) {
          const lastSeenRaw = await AsyncStorage.getItem(RC_LAST_SEEN_KEY);
          if (!accountGenerationIsCurrent(generation)) return false;
          const lastSeen = parseInt(lastSeenRaw || '0') || 0;
          // Never trust local premium forever when RC says inactive.
          // Keep a bounded grace window for sandbox/network delays.
          if (lastSeen > 0 && now - lastSeen <= RC_STALE_GRACE_MS) {
            return finish(true);
          }
        }

        const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
          AsyncStorage.setItem('premium_active', 'false')
        ));
        return persisted ? finish(false) : false;
      }
    } catch {
      if (!accountGenerationIsCurrent(generation)) return false;
      // RC unavailable — fall through to local check
    }
  }

  // Expo Go or RC unavailable: trust AsyncStorage with expiry validation
  if (adminExplicitRevoked) {
    const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
      AsyncStorage.setItem('premium_active', 'false')
    ));
    return persisted ? finish(false) : false;
  }
  if (legacyAdminGrant) return finish(false);
  if (!storePlan) {
    // Старые dev-сборки безусловно писали premium_active=true. Без очистки этот
    // флаг снова попадал в синхронный startup snapshot на каждом холодном запуске
    // и на короткое время расходился с серверным entitlement.
    if (isDevRuntime && active === 'true') {
      const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
        AsyncStorage.setItem('premium_active', 'false')
      ));
      if (!persisted) return false;
    }
    return finish(false);
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
      if (!accountGenerationIsCurrent(generation)) return false;
      const lastSeen = parseInt(lastSeenRaw || '0') || 0;
      if (lastSeen > 0 && now - lastSeen <= RC_STALE_GRACE_MS) {
        return finish(true);
      }
    }
    const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
      AsyncStorage.setItem('premium_active', 'false')
    ));
    return persisted ? finish(false) : false;
  }
  if (active !== 'true' && !await restorePaidProgressLocally()) {
    return accountGenerationIsCurrent(generation) ? finish(false) : false;
  }
  return accountGenerationIsCurrent(generation) ? finish(true) : false;
}

export async function getVerifiedVipStatus(): Promise<boolean> {
  const generation = captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const stableId = generation.stableId!;
  const finish = (result: boolean) => cacheVip(result, generation);
  // Тестер «Снять премиум» (tester_no_premium) — жёсткий kill-switch: должен
  // гасить и VIP, а не только real-премиум. Иначе админ-VIP-грант (или его
  // воскрешение из облака) возвращал доступ, и кнопка «Снять премиум» «не
  // работала». Проверяем ПЕРЕД кэшем, чтобы снятие срабатывало мгновенно.
  const noPremiumVip = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (noPremiumVip === 'true') return finish(false);

  if (
    _cachedVipResult !== null
    && _vipCacheGeneration === generation.generation
    && Date.now() - _vipCacheTime < CACHE_TTL_MS
  ) {
    return _cachedVipResult;
  }

  const progress = await readVipSnapshotForGeneration(generation);
  if (!isCurrentAccountGeneration(generation, stableId)) return false;
  if (!progress) return finish(false);

  const vipState = getVipProgressState(progress);
  if (!vipState) return finish(false);

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
  await writeVipSnapshotForAccount(stableId, Object.fromEntries(storagePairs)).catch(() => {});
  if (!isCurrentAccountGeneration(generation, stableId)) return false;
  return finish(vipState.active);
}

export async function getVerifiedPremiumAccessStatus(): Promise<boolean> {
  const generation = captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const finish = (result: boolean) => cacheAccess(result, generation);
  // Тестер «Снять премиум» — единый kill-switch на ВЕСЬ премиум-доступ:
  // real + VIP + intro-доступ + воскрешение из облака. Раньше флаг гасил только
  // real, а доступ оставался через VIP/intro (и cloud-refresh тянул его назад),
  // поэтому кнопка «Снять премиум» не снимала. Проверяем самым первым, до кэша
  // и до любого облачного обновления.
  const noPremiumAccess = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (noPremiumAccess === 'true') return finish(false);

  if (
    _cachedAccessResult !== null
    && _accessCacheGeneration === generation.generation
    && Date.now() - _accessCacheTime < CACHE_TTL_MS
  ) {
    return _cachedAccessResult;
  }

  if (await isTesterNoLimitsActive()) {
    return accountGenerationIsCurrent(generation) ? finish(true) : false;
  }
  if (!accountGenerationIsCurrent(generation)) return false;

  const [realPremium, vip] = await Promise.all([
    getVerifiedRealPremiumStatus().catch(() => false),
    getVerifiedVipStatus().catch(() => false),
  ]);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (realPremium || vip) return finish(true);

  if (await isIntroFullAccessActive().catch(() => false)) {
    return accountGenerationIsCurrent(generation) ? finish(true) : false;
  }
  if (!accountGenerationIsCurrent(generation)) return false;

  const loyaltyGift = await readGiftAccessFromCloud('loyalty').catch(() => null);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (loyaltyGift?.endsAtMs && loyaltyGift.endsAtMs > Date.now()) {
    return finish(true);
  }

  const cloudRefreshed = await refreshPremiumAccessFromCloudIfNeeded(generation);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (cloudRefreshed) {
    invalidatePremiumCache();
    const [realAfterCloud, vipAfterCloud] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    return accountGenerationIsCurrent(generation) ? finish(realAfterCloud || vipAfterCloud) : false;
  }

  return finish(false);
}

/** Backwards-compatible name used by feature gates: means Premium-level access, including VIP. */
export async function getVerifiedPremiumStatus(): Promise<boolean> {
  return getVerifiedPremiumAccessStatus();
}

function cacheReal(result: boolean, generation: AccountGenerationToken): boolean {
  if (!accountGenerationIsCurrent(generation)) return false;
  _cachedRealResult = result;
  _realCacheTime = Date.now();
  _realCacheGeneration = generation.generation;
  return result;
}

function cacheVip(result: boolean, generation: AccountGenerationToken): boolean {
  if (!accountGenerationIsCurrent(generation)) return false;
  _cachedVipResult = result;
  _vipCacheTime = Date.now();
  _vipCacheGeneration = generation.generation;
  return result;
}

function cacheAccess(result: boolean, generation: AccountGenerationToken): boolean {
  if (!accountGenerationIsCurrent(generation)) return false;
  _cachedAccessResult = result;
  _accessCacheTime = Date.now();
  _accessCacheGeneration = generation.generation;
  return result;
}

async function refreshPremiumAccessFromCloudIfNeeded(generation: AccountGenerationToken): Promise<boolean> {
  if (!accountGenerationIsCurrent(generation)) return false;
  const now = Date.now();
  if (now - _lastCloudAccessRefreshTime < CACHE_TTL_MS) return false;
  if (_cloudAccessRefreshInFlight) return _cloudAccessRefreshInFlight;

  _lastCloudAccessRefreshTime = now;
  _cloudAccessRefreshInFlight = (async () => {
    try {
      const cloudSync = await import('./cloud_sync');
      if (!accountGenerationIsCurrent(generation)) return false;
      await cloudSync.restoreFromCloud();
      return accountGenerationIsCurrent(generation);
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
