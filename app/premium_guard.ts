import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { FORCE_PREMIUM, IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { isIntroFullAccessActive } from './intro_full_access';
import { readGiftAccessFromCloud } from './gift_access_cloud';
import { syncRevenueCatProjectionForAccount } from './revenuecat_projection_sync';
import { DebugLogger } from './debug-logger';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import {
  activeRevenueCatPremiumEntitlement,
  revenueCatCustomerInfoHasPremiumAccess,
} from './revenuecat_premium_access';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { readVipSnapshotForGeneration, writeVipSnapshotForAccount } from './premium_vip_storage';
import { resolveTesterNoPremiumOverride } from './tester_premium_override';
import { emitAppEvent } from './events';

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
const _realPremiumBackgroundRefreshes = new Map<number, Promise<void>>();
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
  return !resolveTesterNoPremiumOverride(noPremium);
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
  return !resolveTesterNoPremiumOverride(noPremiumRaw) && noLimitsRaw === 'true' && !IS_STORE_RELEASE;
}

/**
 * Пожизненный VIP-грант — это тоже Pro?
 *
 * зачем: владелец (2026-08-03) — получатель сертификата «Phraseman Pro — навсегда»
 * видел в настройках «Plus активирован», потому что Pro определялся ТОЛЬКО по
 * `premium_plan='lifetime'` (его пишет стор), а безденежные каналы пишут `vip_plan`.
 * Сертификат обещает Pro на самом бланке — расхождение читалось как обман.
 *
 * Признаки пожизненного гранта:
 *  • `promo_lifetime` — промокод/сертификат «навсегда» (promo_codes.ts пишет явно);
 *  • любой активный VIP без даты окончания (`vip_until <= 0`) — так админка выдаёт
 *    бессрочный доступ. Отдельного плана у неё нет: и месяц, и «бессрочно» пишут
 *    `admin_vip`, поэтому единственный доступный различитель — отсутствие срока.
 * Срочный VIP (месяц, рефералка, опрос) остаётся Plus.
 */
function isLifetimeVipValues(values: Readonly<Record<string, string>> | null): boolean {
  if (!values) return false;
  const state = getVipProgressState(values);
  if (!state?.active) return false;
  if (state.plan === 'promo_lifetime') return true;
  return state.untilMs <= 0;
}

/**
 * Локальный план — пожизненный доступ, который показывается как «Pro»?
 *
 * Видимое имя такого доступа — «Pro» (синяя палитра), в отличие от рекуррентного
 * Plus. Два равноправных источника: разовая покупка «Навсегда» в сторе
 * (`premium_plan='lifetime'`, пишет persistStorePremiumLocally) и пожизненный
 * VIP-грант (сертификат/промокод «навсегда», бессрочная выдача из админки).
 * Чистое чтение локального состояния, без сетевых запросов.
 */
export async function isLifetimePlanLocal(): Promise<boolean> {
  const plan = await AsyncStorage.getItem('premium_plan').catch(() => null);
  if (String(plan ?? '').trim().toLowerCase() === 'lifetime') return true;
  const generation = captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const vipValues = await readVipSnapshotForGeneration(generation).catch(() => null);
  if (!accountGenerationIsCurrent(generation)) return false;
  return isLifetimeVipValues(vipValues);
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
  inheritedLease?: AccountTransitionLockLease,
): Promise<boolean> {
  if (!accountGenerationIsCurrent(generation)) return false;
  return withAccountTransitionLock(async () => {
    if (!accountGenerationIsCurrent(generation)) return false;
    await write();
    return accountGenerationIsCurrent(generation);
  }, inheritedLease);
}

type RealPremiumRefreshSnapshot = Readonly<{
  active: boolean;
  plan: string;
  expiryMs: number;
  rcExpiryMs: number;
  lastSeenMs: number;
  legacyAdminGrant: boolean;
  adminExplicitRevoked: boolean;
}>;

/** RevenueCat may take seconds; entitlement gates must never wait for it. */
function refreshRealPremiumInBackground(
  generation: AccountGenerationToken,
  snapshot: RealPremiumRefreshSnapshot,
): void {
  if (IS_EXPO_GO || !accountGenerationIsCurrent(generation)) return;
  if (_realPremiumBackgroundRefreshes.has(generation.generation)) return;

  let refresh!: Promise<void>;
  refresh = (async () => {
    try {
      const rcAppUserIdBefore = await Purchases.getAppUserID().catch(() => '');
      if (!accountGenerationIsCurrent(generation) || rcAppUserIdBefore !== generation.stableId) return;
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (!info || !accountGenerationIsCurrent(generation)) return;
      const rcAppUserIdAfter = await Purchases.getAppUserID().catch(() => '');
      if (!accountGenerationIsCurrent(generation) || rcAppUserIdAfter !== generation.stableId) return;

      const rcActive = revenueCatCustomerInfoHasPremiumAccess(info as any);
      const now = Date.now();
      if (rcActive) {
        try {
          const projectionSynced = await syncRevenueCatProjectionForAccount(generation.stableId!);
          if (!accountGenerationIsCurrent(generation)) return;
          if (!projectionSynced) {
            DebugLogger.error(
              'premium_guard:revenuecat_projection_sync',
              new Error('revenuecat_projection_not_confirmed'),
              'warning',
            );
          }
        } catch (error) {
          if (!accountGenerationIsCurrent(generation)) return;
          DebugLogger.error('premium_guard:revenuecat_projection_sync', error, 'warning');
        }
        const entitlement = activeRevenueCatPremiumEntitlement(info as any) ?? {};
        const productId = String(entitlement.productIdentifier ?? (info as any)?.activeSubscriptions?.[0] ?? '').trim();
        const productKey = productId.toLowerCase();
        const inferredPlan = /lifetime|forever|one.?time|onetime|perpetual/.test(productKey)
          ? 'lifetime'
          : /year|yearly|annual|12.?month/.test(productKey)
            ? 'yearly'
            : /month|monthly|1.?month/.test(productKey)
              ? 'monthly'
              : (snapshot.plan === 'lifetime' || snapshot.plan === 'yearly' ? snapshot.plan : 'monthly');
        const expirationMs = Number(entitlement.expirationDateMillis) || 0;
        const persistencePairs: [string, string][] = [
            ['premium_active', 'true'],
            ['premium_plan', inferredPlan],
            [RC_LAST_SEEN_KEY, String(now)],
        ];
        if (productId) persistencePairs.push(['premium_rc_product_id', productId]);
        if (expirationMs > 0) persistencePairs.push(['premium_rc_expiry_ms', String(expirationMs)]);
        const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
          AsyncStorage.multiSet(persistencePairs)
        ));
        if (!persisted) return;
        cacheReal(true, generation);
        if (!snapshot.active) emitAppEvent('premium_activated');
        return;
      }

      // Lifetime is a non-consumable: an empty/offline RC response must never
      // revoke the last verified purchase. Refund/revoke arrives through the
      // server projection and replaces the local plan explicitly.
      if (snapshot.plan === 'lifetime' && !snapshot.legacyAdminGrant && !snapshot.adminExplicitRevoked) return;
      if (snapshot.rcExpiryMs > now || snapshot.expiryMs > now) return;

      const currentLastSeenRaw = await AsyncStorage.getItem(RC_LAST_SEEN_KEY).catch(() => null);
      if (!accountGenerationIsCurrent(generation)) return;
      const currentLastSeen = Math.max(snapshot.lastSeenMs, parseInt(currentLastSeenRaw || '0', 10) || 0);
      if (currentLastSeen > 0 && now - currentLastSeen <= RC_STALE_GRACE_MS) return;

      if (snapshot.active) {
        const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
          AsyncStorage.setItem('premium_active', 'false')
        ));
        if (!persisted) return;
        cacheReal(false, generation);
        emitAppEvent('premium_deactivated');
      }
    } catch {
      // Offline is expected: the bounded local decision remains authoritative.
    }
  })().finally(() => {
    if (_realPremiumBackgroundRefreshes.get(generation.generation) === refresh) {
      _realPremiumBackgroundRefreshes.delete(generation.generation);
    }
  });
  _realPremiumBackgroundRefreshes.set(generation.generation, refresh);
}

export async function __waitForPremiumBackgroundRefreshForTests(): Promise<void> {
  await Promise.all([..._realPremiumBackgroundRefreshes.values()]);
}

/**
 * Verifies real store/trial Premium status.
 * Admin-issued grants are intentionally excluded: those are VIP access now.
 */
type PremiumLeaseReadOptions = Readonly<{
  generation?: AccountGenerationToken;
  lease?: AccountTransitionLockLease;
  bypassCache?: boolean;
  allowCloudRefresh?: boolean;
}>;

export async function getVerifiedRealPremiumStatus(
  options?: PremiumLeaseReadOptions,
): Promise<boolean> {
  const generation = options?.generation ?? captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const finish = (result: boolean) => cacheReal(result, generation);
  const pairs = await AsyncStorage.multiGet([
    'tester_no_premium',
    'premium_active',
    'premium_plan',
    'premium_expiry',
    'premium_rc_expiry_ms',
    RC_LAST_SEEN_KEY,
    'admin_premium_override',
  ]);
  if (!accountGenerationIsCurrent(generation)) return false;
  const noPremium = pairs.find(p => p[0] === 'tester_no_premium')?.[1];
  const active   = pairs.find(p => p[0] === 'premium_active')?.[1];
  const plan     = pairs.find(p => p[0] === 'premium_plan')?.[1];
  const expiry   = parseInt(pairs.find(p => p[0] === 'premium_expiry')?.[1] || '0');
  const rcExpiry = parseInt(pairs.find(p => p[0] === 'premium_rc_expiry_ms')?.[1] || '0');
  let lastSeen = parseInt(pairs.find(p => p[0] === RC_LAST_SEEN_KEY)?.[1] || '0') || 0;
  const adminOverride = pairs.find(p => p[0] === 'admin_premium_override')?.[1];
  const normalizedPlan = String(plan ?? '').trim().toLowerCase();
  const storePlan = normalizedPlan === 'monthly' || normalizedPlan === 'yearly'
    || normalizedPlan === 'annual' || normalizedPlan === 'lifetime';
  const hasVerifiedStoreEvidence = active === 'true' && storePlan && (
    normalizedPlan === 'lifetime' || lastSeen > 0 || rcExpiry > 0 || expiry > 0
  );
  const legacyAdminGrant =
    (adminOverride === 'true' && !hasVerifiedStoreEvidence) ||
    normalizedPlan === 'admin_grant';
  const adminExplicitRevoked =
    adminOverride === 'false' && (!plan || plan === 'null' || plan === '');

  // Тестер «Снять премиум» в dev/preview должен срезать только dev-default premium,
  // но не VIP-доступ, который считается отдельно.
  if (resolveTesterNoPremiumOverride(noPremium)) return finish(false);
  // Return cached result if still fresh
  if (
    !options?.bypassCache
    && _cachedRealResult !== null
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
      ), options?.lease);
      if (!persisted) return false;
    }
    return accountGenerationIsCurrent(generation);
  };

  refreshRealPremiumInBackground(generation, {
    active: active === 'true',
    plan: normalizedPlan,
    expiryMs: expiry,
    rcExpiryMs: rcExpiry,
    lastSeenMs: lastSeen,
    legacyAdminGrant,
    adminExplicitRevoked,
  });

  // Local-first entitlement: RevenueCat is intentionally detached below.
  if (adminExplicitRevoked) {
    const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
      AsyncStorage.setItem('premium_active', 'false')
    ), options?.lease);
    return persisted ? finish(false) : false;
  }
  if (legacyAdminGrant) return finish(false);
  if (!storePlan) {
    // premium_active без store-плана не является проверяемым свидетельством.
    // Фоновый RevenueCat-refresh вернёт доступ событием, если покупка реальна.
    if (active === 'true') {
      const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
        AsyncStorage.setItem('premium_active', 'false')
      ), options?.lease);
      if (!persisted) return false;
    }
    return finish(false);
  }

  const lifetime = normalizedPlan === 'lifetime';
  const localExpiryExpired = rcExpiryExpired || (expiry > 0 && expiry <= now);
  const lastSeenFresh = lastSeen > 0 && now - lastSeen <= RC_STALE_GRACE_MS;
  let localAccess = lifetime || rcExpiryActive || lastSeenFresh;

  // One-time migration for genuine older installs that predate RC_LAST_SEEN_KEY:
  // store plan metadata was written only after purchase/restore/cloud projection.
  // Seed a bounded 72h window instead of either revoking instantly or trusting it forever.
  if (!localAccess && active !== 'false' && lastSeen <= 0 && paidProgressActive && !localExpiryExpired) {
    const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
      AsyncStorage.multiSet([
        ['premium_active', 'true'],
        [RC_LAST_SEEN_KEY, String(now)],
      ])
    ), options?.lease);
    if (persisted) {
      lastSeen = now;
      localAccess = true;
    }
  } else if (localAccess && active !== 'true') {
    localAccess = await restorePaidProgressLocally();
  }

  if (!localAccess && active === 'true') {
    const persisted = await writeRealPremiumStorageForGeneration(generation, () => (
      AsyncStorage.setItem('premium_active', 'false')
    ), options?.lease);
    if (!persisted) return false;
  }
  return accountGenerationIsCurrent(generation) ? finish(localAccess) : false;
}

export async function getVerifiedVipStatus(options?: PremiumLeaseReadOptions): Promise<boolean> {
  const generation = options?.generation ?? captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const stableId = generation.stableId!;
  const finish = (result: boolean) => cacheVip(result, generation);
  // Тестер «Снять премиум» (tester_no_premium) — dev/preview kill-switch: должен
  // гасить и VIP, а не только real-премиум. Иначе админ-VIP-грант (или его
  // воскрешение из облака) возвращал доступ, и кнопка «Снять премиум» «не
  // работала». Проверяем ПЕРЕД кэшем, чтобы снятие срабатывало мгновенно.
  const noPremiumVip = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (resolveTesterNoPremiumOverride(noPremiumVip)) return finish(false);

  if (
    !options?.bypassCache
    && _cachedVipResult !== null
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

export async function getVerifiedPremiumAccessStatus(
  options?: PremiumLeaseReadOptions,
): Promise<boolean> {
  const generation = options?.generation ?? captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const finish = (result: boolean) => cacheAccess(result, generation);
  // Тестер «Снять премиум» — dev/preview kill-switch на ВЕСЬ премиум-доступ:
  // real + VIP + intro-доступ + воскрешение из облака. Раньше флаг гасил только
  // real, а доступ оставался через VIP/intro (и cloud-refresh тянул его назад),
  // поэтому кнопка «Снять премиум» не снимала. Проверяем самым первым, до кэша
  // и до любого облачного обновления.
  const noPremiumAccess = await AsyncStorage.getItem('tester_no_premium').catch(() => null);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (resolveTesterNoPremiumOverride(noPremiumAccess)) return finish(false);

  if (
    !options?.bypassCache
    && _cachedAccessResult !== null
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
    getVerifiedRealPremiumStatus(options).catch(() => false),
    getVerifiedVipStatus(options).catch(() => false),
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

  if (options?.allowCloudRefresh === false) return finish(false);
  const cloudRefreshed = await refreshPremiumAccessFromCloudIfNeeded(generation);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (cloudRefreshed) {
    invalidatePremiumCache();
    const [realAfterCloud, vipAfterCloud] = await Promise.all([
      getVerifiedRealPremiumStatus(options).catch(() => false),
      getVerifiedVipStatus(options).catch(() => false),
    ]);
    return accountGenerationIsCurrent(generation) ? finish(realAfterCloud || vipAfterCloud) : false;
  }

  return finish(false);
}

/**
 * Mutation-time Premium/Plus authorization. It deliberately bypasses all
 * entitlement caches and reuses the caller's active account-transition lease,
 * so expiry/revocation is read after lease acquisition without a nested-lock
 * deadlock. Cloud restore is excluded from this fail-closed mutation gate;
 * ordinary premium hydration can refresh it before a later retry.
 */
export async function getVerifiedPremiumAccessStatusForAccountLease(
  generation: AccountGenerationToken,
  lease: AccountTransitionLockLease,
): Promise<boolean> {
  if (!accountGenerationIsCurrent(generation)) return false;
  return getVerifiedPremiumAccessStatus({
    generation,
    lease,
    bypassCache: true,
    allowCloudRefresh: false,
  });
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
