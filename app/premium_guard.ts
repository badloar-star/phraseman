import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { FORCE_PREMIUM, IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { isIntroFullAccessActive } from './intro_full_access';
import { readGiftAccessFromCloud, type GiftAccessCloudState } from './gift_access_cloud';
import { forgetVerifiedLoyaltyGift, readVerifiedLoyaltyGiftUntilMs, rememberVerifiedLoyaltyGift } from './gift_access_local_copy';
import { getCanonicalUserId } from './user_id_policy';
import { syncRevenueCatProjectionForAccount } from './revenuecat_projection_sync';
import { DebugLogger } from './debug-logger';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import { revenueCatCustomerInfoHasPremiumAccess } from './revenuecat_premium_access';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { readVipSnapshotForGeneration, writeVipSnapshotForAccount } from './premium_vip_storage';
import {
  readRealPremiumSnapshotForGeneration,
  realPremiumSnapshotWriteEpoch,
  updateRealPremiumSnapshotForGeneration,
  type RealPremiumSnapshotV1,
} from './premium_real_storage';
import { readTesterFlags, resolveTesterNoPremiumOverride } from './tester_premium_override';
import { emitAppEvent } from './events';
import { notePlusSource, type PlusSource } from './plus_source_diagnostics';
import { markPlusCloudConfirmed } from './plus_cloud_confirmed_marker';
import { noteSwallowedHandler, noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const isDevRuntime = typeof __DEV__ !== 'undefined' && !!__DEV__;

const RC_TIMEOUT_MS = 8000;
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes — avoid hammering RevenueCat
// зачем (смета Firebase п.10, 13.10; Ядро: «TTL 30 мин — доступ и так идёт слушателем access_projection»): охранный
// restoreFromCloud у человека без Plus — это полное чтение облака. Раньше он шёл каждые 5 мин (общий CACHE_TTL_MS RevenueCat),
// теперь не чаще раза в 30 мин. Кэши RevenueCat остаются на 5 мин — это не Firestore.
export const CLOUD_ACCESS_REFRESH_TTL_MS = 30 * 60 * 1000;
// зачем (аудит «пропала сеть» 13.10): addFlashcard ждёт проверку Plus внутри замка записи карточек — на плохой сети restoreFromCloud
// без потолка держал сохранение карточки. Ждём облако не дольше 5 с; дальше решаем по локальным данным, обновление доезжает фоном.
export const CLOUD_ACCESS_REFRESH_WAIT_CEILING_MS = 5_000;
/** Неудачный охранный restore (сеть/ошибка) повторяем через 2 мин, а не через весь срок 30 мин. */
export const CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS = 2 * 60 * 1000;
// Зеркало functions/src/premium_status.ts SERVER_RC_GRACE_MS (72ч): покрывает billing retry
// и сетевые лаги вебхука RC. Раньше клиент стоял на 24ч → между 24ч и 72ч клиент показывал
// «нет премиума» и открывал пейвол, в то время как сервер ещё пропускал ИИ-функции. Аудит 2026-06-27.
const RC_STALE_GRACE_MS = 72 * 60 * 60 * 1000;
const RC_LAST_SEEN_KEY = 'premium_rc_last_seen_at';

let _cachedRealResult: boolean | null = null;
let _realCacheTime = 0;
let _realCacheGeneration = -1;
// зачем (владелец 11.11 «да, правь»; замер release и трассировка [COLD-START-IO] suspect): кэш результата заполняется только после
// первого ответа, поэтому проверки, пришедшие на старте за ~270 мс до него, читали снимок каждая сама (5 вызовов = 15 обращений
// к хранилищу). Одновременные проверки одного поколения аккаунта делят одно вычисление. Присоединившийся получает ровно то, что
// через мгновение отдал бы кэш результата, — новой устарелости нет. Не делятся: bypassCache (просят свежее) и lease (идут внутри записи).
// writeEpoch: началась любая запись снимка — к чтению, начатому до неё, больше не присоединяются (ревью советника 11.11).
let _realStatusInFlight: { readonly generation: number; readonly writeEpoch: number; readonly promise: Promise<boolean> } | null = null;
let _premiumCacheEpoch = 0;
let _cachedVipResult: boolean | null = null;
let _vipCacheTime = 0;
let _vipCacheGeneration = -1;
let _cachedAccessResult: boolean | null = null;
let _accessCacheTime = 0;
let _accessCacheGeneration = -1;
let _lastCloudAccessRefreshTime = 0;
// зачем (R61b, Ревизор d0de15329 + ревью Opus): поколение аккаунта, для которого последнее восстановление ПРОЧИТАЛО облако.
// Без этой метки «нет» по потолку ожидания, после молча неудачного восстановления (restoreFromCloud отдаёт false без броска)
// или при пропуске по TTL после неудачи кэшировалось на 5 мин как будто облако проверено. -1 — не подтверждено.
let _cloudRefreshConfirmedGeneration = -1;
/** refreshed — облако прочитано сейчас; confirmed_skip — пропуск, но облако этого поколения уже прочитано; unconfirmed — нет. */
type CloudRefreshOutcome = 'refreshed' | 'confirmed_skip' | 'unconfirmed';

/** Статус попытки восстановления (cloud_sync CloudRestoreAttempt) или null, если формы нет. */
function restoreAttemptConfirmed(attempt: unknown): boolean | null {
  if (attempt && typeof attempt === 'object' && 'status' in attempt) return (attempt as { status: unknown }).status !== 'failed';
  return null;
}
let _cloudAccessRefreshInFlight: Promise<boolean> | null = null;
const _lateCloudRefreshSignals = new WeakSet<Promise<boolean>>();
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
  // Сброс кэша отцепляет и общее чтение «в полёте»: проверка, начатая после сброса, читает хранилище заново.
  _realStatusInFlight = null;
  // Вычисление, начатое до сброса, по этому счётчику узнаёт, что его ответ в кэш класть нельзя.
  _premiumCacheEpoch += 1;
}

/** True only when the current account has a cache entry produced by a conclusive access decision. */
export function isPremiumAccessDecisionConfirmedForCurrentAccount(): boolean {
  const generation = captureAccountGeneration();
  return accountGenerationIsCurrent(generation)
    && _cachedAccessResult !== null
    && _accessCacheGeneration === generation.generation;
}

/**
 * Starts a fail-closed entitlement boundary before the canonical account changes.
 * This is intentionally synchronous: mounted UI must stop rendering account A's
 * Premium/VIP state before any wipe, restore, or RevenueCat request for account B.
 */
export function beginPremiumAccountTransition(): number {
  invalidatePremiumCache();
  _lastCloudAccessRefreshTime = 0;
  _cloudRefreshConfirmedGeneration = -1;
  _lastForceCloudRestoreAt = 0;
  _cloudAccessRefreshInFlight = null;
  _premiumAccountDrainEpoch = _premiumAccountTransitionEpoch;
  _premiumAccountTransitionEpoch += 1;
  const epoch = _premiumAccountTransitionEpoch;
  for (const listener of _premiumAccountTransitionListeners) {
    try {
      listener(epoch);
    } catch (e) {
      // A broken UI subscriber must not interrupt an auth/account transition.
      DebugLogger.error('premium_guard:epoch', e instanceof Error ? e : new Error(String(e)), 'warning');
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
  const { noPremium } = await readTesterFlags(); // зачем: [COLD-START-IO] — одно чтение флагов на всех
  return !resolveTesterNoPremiumOverride(noPremium);
}

/**
 * Returns the effective dev-only "no limits" override.
 * The explicit no-premium kill switch always wins, and store builds ignore
 * local tester flags entirely.
 */
export async function isTesterNoLimitsActive(): Promise<boolean> {
  const { noPremium: noPremiumRaw, noLimits: noLimitsRaw } = await readTesterFlags();
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
  const generation = captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const [realSnapshot, vipValues] = await Promise.all([
    readRealPremiumSnapshotForGeneration(generation)
      .catch(noteSwallowedAs('premium_guard:real_lifetime', null)),
    readVipSnapshotForGeneration(generation)
      .catch(noteSwallowedAs('premium_guard:promise_4', null)),
  ]);
  if (!accountGenerationIsCurrent(generation)) return false;
  return (realSnapshot?.active === true && realSnapshot.plan === 'lifetime')
    || isLifetimeVipValues(vipValues);
}

/**
 * StoreKit/Google has just confirmed a purchase or restore locally.
 * RevenueCat sandbox can lag for a few seconds, so this gives the local
 * premium flag the same bounded grace window as a fresh RC confirmation.
 */
export async function markPremiumStoreSeenNow(options: Readonly<{
  generation: AccountGenerationToken;
  inheritedLease?: AccountTransitionLockLease;
}>): Promise<void> {
  const generation = options.generation;
  if (!accountGenerationIsCurrent(generation)) return;
  const now = Date.now();
  const updated = await updateRealPremiumSnapshotForGeneration(generation, (current) => ({
    ...current,
    rcLastSeenAtMs: now,
    rcUpdatedAtMs: Math.max(current.rcUpdatedAtMs, now),
  }), options.inheritedLease);
  if (!updated || !accountGenerationIsCurrent(generation)) return;
  await AsyncStorage.setItem(RC_LAST_SEEN_KEY, String(now));
  if (!accountGenerationIsCurrent(generation)) return;
  invalidatePremiumCache();
}

function accountGenerationIsCurrent(generation: AccountGenerationToken): boolean {
  return !!generation.stableId && isCurrentAccountGeneration(generation, generation.stableId);
}

/** Локальное решение «доступ по подписке есть» — одно правило и для проверки статуса, и для перепроверки перед отключением. */
function realSnapshotGrantsLocalAccess(snapshot: RealPremiumSnapshotV1, now: number): boolean {
  if (!snapshot.active || !snapshot.plan) return false;
  const premiumExpiryExpired = snapshot.premiumExpiryMs > 0 && snapshot.premiumExpiryMs <= now;
  const rcExpiryExpired = snapshot.rcExpiryMs > 0 && snapshot.rcExpiryMs <= now;
  const lastSeenFresh = snapshot.rcLastSeenAtMs > 0 && now - snapshot.rcLastSeenAtMs <= RC_STALE_GRACE_MS;
  return !premiumExpiryExpired && !rcExpiryExpired && (
    snapshot.plan === 'lifetime'
    || snapshot.premiumExpiryMs > now
    || snapshot.rcExpiryMs > now
    || lastSeenFresh
  );
}

/** deactivated — снимок выключен; kept — снимок на момент записи уже не подлежит отключению (продлён); failed — запись не прошла. */
type RealPremiumDeactivateOutcome = 'deactivated' | 'kept' | 'failed';

/**
 * зачем (владелец 11.11 «да, исправь»; ревью советника): раньше решение «истекла», принятое по СТАРОМУ чтению, слепо писало
 * active:false поверх того снимка, который лежит в хранилище в момент записи. Если между чтением и записью проходило продление,
 * оно затиралось, и заплативший человек до 5 минут выглядел бесплатным. Теперь условие отключения проверяется заново внутри
 * записи, по актуальному снимку: продлённый снимок не трогаем.
 */
async function deactivateRealPremiumIfStillRevocable(
  generation: AccountGenerationToken,
  stillRevocable: (current: RealPremiumSnapshotV1) => boolean,
  inheritedLease?: AccountTransitionLockLease,
): Promise<RealPremiumDeactivateOutcome> {
  const keptBox: { snapshot: RealPremiumSnapshotV1 | null } = { snapshot: null };
  const updated = await updateRealPremiumSnapshotForGeneration(generation, (current) => {
    if (!stillRevocable(current)) {
      keptBox.snapshot = current;
      return null;
    }
    return { ...current, active: false };
  }, inheritedLease);
  const kept = keptBox.snapshot;
  if (kept !== null) {
    // Ранний выход называет причину (без идентификаторов человека): план и источник снимка, который решили не трогать.
    console.warn('[PREMIUM-GUARD] deactivate:skipped_snapshot_changed', JSON.stringify({ generation: generation.generation, plan: kept.plan, active: kept.active, evidence: kept.evidenceSource })); // guard-ok: редкий выход, одна строка
    return 'kept';
  }
  if (!updated || !accountGenerationIsCurrent(generation)) return 'failed';
  await AsyncStorage.setItem('premium_active', 'false');
  return accountGenerationIsCurrent(generation) ? 'deactivated' : 'failed';
}

// зачем (координатор 11.10, прогон на эмуляторе без Play): RevenueCat не сконфигурирован → каждая проверка доступа
// звала getAppUserID и сыпала «no singleton instance» в журнал по кругу. Причину пишем ОДИН раз, дальше молча пропуск.
let _rcNotConfiguredLogged = false;

/** RevenueCat may take seconds; entitlement gates must never wait for it. */
function refreshRealPremiumInBackground(
  generation: AccountGenerationToken,
  snapshot: RealPremiumSnapshotV1 | null,
): void {
  if (IS_EXPO_GO || !accountGenerationIsCurrent(generation)) return;
  if (_realPremiumBackgroundRefreshes.has(generation.generation)) return;

  let refresh!: Promise<void>;
  refresh = (async () => {
    try {
      // Нет метода (старая версия SDK) → считаем настроенным: прежнее поведение.
      const configured = typeof Purchases.isConfigured !== 'function' ? true : await Purchases.isConfigured().catch((error: unknown) => {
        if (!_rcNotConfiguredLogged) console.warn('[PREMIUM-RC] isConfigured failed — пропускаю обновление', error instanceof Error ? error.message : String(error));
        return false;
      });
      if (!configured) {
        if (!_rcNotConfiguredLogged) {
          _rcNotConfiguredLogged = true;
          console.warn('[PREMIUM-RC] RevenueCat не настроен — фоновое обновление Plus пропускается (дальше без повторов)');
        }
        return;
      }
      const rcAppUserIdBefore = await Purchases.getAppUserID().catch(noteSwallowedAs('premium_guard:promise_5', ''));
      if (!accountGenerationIsCurrent(generation) || rcAppUserIdBefore !== generation.stableId) return;
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (!info || !accountGenerationIsCurrent(generation)) return;
      const rcAppUserIdAfter = await Purchases.getAppUserID().catch(noteSwallowedAs('premium_guard:promise_6', ''));
      if (!accountGenerationIsCurrent(generation) || rcAppUserIdAfter !== generation.stableId) return;

      const rcActive = revenueCatCustomerInfoHasPremiumAccess(info as any);
      const now = Date.now();
      if (rcActive) {
        // Reconcile server projection as a side effect, but never authorize from
        // passive SDK CustomerInfo: the helper may return an older cached success.
        // Explicit purchase/restore persists locally; account-scoped cloud
        // projection remains the authority for passive recovery.
        try {
          await syncRevenueCatProjectionForAccount(generation.stableId!);
          if (!accountGenerationIsCurrent(generation)) return;
        } catch (error) {
          if (!accountGenerationIsCurrent(generation)) return;
          DebugLogger.error('premium_guard:revenuecat_projection_sync', error, 'warning');
        }
        invalidatePremiumCache();
        return;
      }

      // Lifetime is a non-consumable: an empty/offline RC response must never
      // revoke the last verified purchase. Refund/revoke arrives through the
      // server projection and replaces the local plan explicitly.
      if (!snapshot) return;
      if (snapshot.plan === 'lifetime') return;
      if (snapshot.rcExpiryMs > now || snapshot.premiumExpiryMs > now) return;
      if (snapshot.rcLastSeenAtMs > 0 && now - snapshot.rcLastSeenAtMs <= RC_STALE_GRACE_MS) return;

      if (snapshot.active) {
        // То же условие, что выше по этому снимку, но по актуальному: продление, пришедшее за время запроса к магазину, не затираем.
        const outcome = await deactivateRealPremiumIfStillRevocable(generation, (current) => {
          const at = Date.now();
          if (current.plan === 'lifetime') return false;
          if (current.rcExpiryMs > at || current.premiumExpiryMs > at) return false;
          if (current.rcLastSeenAtMs > 0 && at - current.rcLastSeenAtMs <= RC_STALE_GRACE_MS) return false;
          return true;
        });
        if (outcome !== 'deactivated') return;
        cacheReal(false, generation);
        emitAppEvent('premium_deactivated');
      }
    } catch (e) {
      // Offline is expected: the bounded local decision remains authoritative.
      DebugLogger.error('premium_guard:persisted', e instanceof Error ? e : new Error(String(e)), 'warning');
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
  // Тестер «Снять премиум» в dev/preview должен срезать только dev-default premium,
  // но не VIP-доступ, который считается отдельно.
  // зачем: [COLD-START-IO] — флаг тестера общим readTesterFlags (store: без хранилища), кэш ДО multiGet:
  // при попадании значения хранилища и раньше не использовались, а 7 ключей читались на каждый вызов.
  const { noPremium } = await readTesterFlags();
  if (!accountGenerationIsCurrent(generation)) return false;
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

  const shareable = !options?.bypassCache && !options?.lease;
  if (
    shareable
    && _realStatusInFlight !== null
    && _realStatusInFlight.generation === generation.generation
    && _realStatusInFlight.writeEpoch === realPremiumSnapshotWriteEpoch()
  ) {
    // Свою проверку поколения присоединившийся делает сам: чужой ответ не выдаётся после смены аккаунта.
    return _realStatusInFlight.promise.then((result) => (accountGenerationIsCurrent(generation) ? result : false));
  }

  const compute = async (): Promise<boolean> => {
    // зачем (владелец 11.11, ревью советника): кэш сбросили, пока шло это вычисление (покупка, облако) — его ответ построен на
    // данных до сброса. Вызвавшему он отдаётся, но в кэш на 5 минут не кладётся: следующая проверка прочитает хранилище заново.
    const cacheEpochAtStart = _premiumCacheEpoch;
    const finishFresh = (result: boolean): boolean => {
      if (_premiumCacheEpoch === cacheEpochAtStart) return finish(result);
      return accountGenerationIsCurrent(generation) ? result : false;
    };
    const snapshot = await readRealPremiumSnapshotForGeneration(generation);
    if (!accountGenerationIsCurrent(generation)) return false;
    refreshRealPremiumInBackground(generation, snapshot);
    if (!snapshot?.active || !snapshot.plan) return finishFresh(false);

    const localAccess = realSnapshotGrantsLocalAccess(snapshot, Date.now());

    if (!localAccess) {
      const outcome = await deactivateRealPremiumIfStillRevocable(
        generation,
        (current) => !realSnapshotGrantsLocalAccess(current, Date.now()),
        options?.lease,
      );
      if (outcome === 'failed') return false;
      if (!accountGenerationIsCurrent(generation)) return false;
      // kept: в хранилище уже лежит снимок с доступом (продление пришло, пока мы решали) — отвечаем по нему.
      return finishFresh(outcome === 'kept');
    }
    if (!accountGenerationIsCurrent(generation)) return false;
    return finishFresh(true);
  };

  if (!shareable) return compute();
  // Эпоха записи берётся ДО старта чтения: запись, начавшаяся во время чтения, тоже закрывает присоединение.
  const writeEpoch = realPremiumSnapshotWriteEpoch();
  const promise = compute();
  const entry = { generation: generation.generation, writeEpoch, promise };
  _realStatusInFlight = entry;
  // Запись снимается и при ошибке: упавшее чтение не должно раздаваться следующим вызовам.
  const release = (): void => { if (_realStatusInFlight === entry) _realStatusInFlight = null; };
  promise.then(release, release);
  return promise;
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
  const { noPremium: noPremiumVip } = await readTesterFlags();
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
  await writeVipSnapshotForAccount(stableId, Object.fromEntries(storagePairs)).catch(noteSwallowedHandler('premium_guard:promise_9'));
  if (!isCurrentAccountGeneration(generation, stableId)) return false;
  return finish(vipState.active);
}

/**
 * зачем (Блиц 04.10, accessResolved ~94 с на эмуляторе — «сперва логи»): у бесплатного аккаунта эта
 * проверка идёт до облака (подарок loyalty, cloud refresh/restore) без потолка. Медленный вызов
 * (> 1,5 с) пишет одну строку с длительностью каждого шага — по ней видно, какой шаг держит.
 */
export async function getVerifiedPremiumAccessStatus(
  options?: PremiumLeaseReadOptions,
): Promise<boolean> {
  const startedAt = Date.now();
  const steps: Record<string, number> = {};
  let stepAt = startedAt;
  const mark = (name: string): void => {
    const now = Date.now();
    steps[name] = now - stepAt;
    stepAt = now;
  };
  let result = false;
  // зачем (жалоба №8, координатор 28.10): чей это Plus — магазин, VIP (оплата через Telegram-бот), пробный, подарок, облако.
  // null — ответ из кэша или аккаунт сменился: нового итога нет, журнал не пишем.
  // Объект, а не let: присваивание из колбэка компилятор не видит и сузил бы переменную до null.
  const decided: { source: PlusSource | null } = { source: null };
  const setSource = (value: PlusSource): void => { decided.source = value; };
  const generationAtStart = options?.generation ?? captureAccountGeneration();
  try {
    result = await getVerifiedPremiumAccessStatusTraced(options, mark, setSource);
    return result;
  } finally {
    if (decided.source !== null) {
      notePlusSource(decided.source, result);
      // зачем (координатор 29.10): ответ, которому можно верить (облако подтвердило или доступ найден на телефоне), — отметка
      // «облако знает статус на этом устройстве»; без неё окно покупки при снимке «free» сначала ждёт облако (Plus только в облаке).
      if (plusSourceConfirmsCloudStatus(decided.source) && accountGenerationIsCurrent(generationAtStart)) {
        markPlusCloudConfirmed(generationAtStart.stableId);
      }
    }
    const totalMs = Date.now() - startedAt;
    if (totalMs > 1500) {
      console.warn('[PREMIUM-GUARD-STEP] access_status:slow', JSON.stringify({ totalMs, result, steps }));
    }
  }
}

/** «Нет» без облака и тестерские выключатели статус аккаунта не подтверждают. */
function plusSourceConfirmsCloudStatus(source: PlusSource): boolean {
  return source !== 'none_fast' && source !== 'none_unconfirmed' && source !== 'tester_off' && source !== 'tester_on';
}

async function getVerifiedPremiumAccessStatusTraced(
  options: PremiumLeaseReadOptions | undefined,
  mark: (name: string) => void,
  setSource: (source: PlusSource) => void,
): Promise<boolean> {
  const generation = options?.generation ?? captureAccountGeneration();
  if (!accountGenerationIsCurrent(generation)) return false;
  const finish = (result: boolean) => cacheAccess(result, generation);
  // Тестер «Снять премиум» — dev/preview kill-switch на ВЕСЬ премиум-доступ:
  // real + VIP + intro-доступ + воскрешение из облака. Раньше флаг гасил только
  // real, а доступ оставался через VIP/intro (и cloud-refresh тянул его назад),
  // поэтому кнопка «Снять премиум» не снимала. Проверяем самым первым, до кэша
  // и до любого облачного обновления.
  const { noPremium: noPremiumAccess } = await readTesterFlags();
  mark('tester_flags');
  if (!accountGenerationIsCurrent(generation)) return false;
  if (resolveTesterNoPremiumOverride(noPremiumAccess)) { setSource('tester_off'); return finish(false); }

  if (
    !options?.bypassCache
    && _cachedAccessResult !== null
    && _accessCacheGeneration === generation.generation
    && Date.now() - _accessCacheTime < CACHE_TTL_MS
  ) {
    return _cachedAccessResult;
  }

  const testerNoLimits = await isTesterNoLimitsActive();
  mark('tester_no_limits');
  if (testerNoLimits) {
    setSource('tester_on');
    return accountGenerationIsCurrent(generation) ? finish(true) : false;
  }
  if (!accountGenerationIsCurrent(generation)) return false;

  const [realPremium, vip] = await Promise.all([
    getVerifiedRealPremiumStatus(options).catch(noteSwallowedAs('premium_guard:promise_11', false)),
    getVerifiedVipStatus(options).catch(noteSwallowedAs('premium_guard:promise_12', false)),
  ]);
  mark('verified_local');
  if (!accountGenerationIsCurrent(generation)) return false;
  if (realPremium || vip) { setSource(realPremium ? 'store' : 'vip'); return finish(true); }

  const introActive = await isIntroFullAccessActive().catch(noteSwallowedAs('premium_guard:promise_13', false));
  mark('intro');
  if (introActive) {
    setSource('intro');
    return accountGenerationIsCurrent(generation) ? finish(true) : false;
  }
  if (!accountGenerationIsCurrent(generation)) return false;

  // зачем (владелец 11.10, журнал 16; план §CORE-0165): подарок лояльности — сначала проверенная локальная копия
  // срока (доступ с первого кадра, облако сверяет фоном), затем облако с потолком. Без копии потолок был бы
  // небезопасен: «нет ответа» стало бы «нет доступа», и квоты бесплатного списались бы у держателя подарка.
  // Строгая проверка в момент изменения данных (bypassCache) обходит ВСЕ кэши — локальную копию тоже,
  // и ждёт облако без потолка, как раньше.
  const strictMutationRead = options?.bypassCache === true;
  const localGiftUntil = strictMutationRead
    ? null
    : await readVerifiedLoyaltyGiftUntilMs(Date.now(), generation.stableId).catch(noteSwallowedAs('premium_guard:loyalty_local', null));
  mark(`loyalty_gift_local:${strictMutationRead ? 'skipped_strict' : String(localGiftUntil !== null)}`);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (localGiftUntil !== null) {
    scheduleLoyaltyGiftCloudReverify(generation);
    setSource('gift_local');
    return finish(true);
  }

  const loyaltyGift = strictMutationRead
    ? await readGiftAccessFromCloud('loyalty').catch(noteSwallowedAs('premium_guard:promise_14', null))
    : await readLoyaltyGiftWithCeiling(generation);
  mark('loyalty_gift_cloud');
  if (!accountGenerationIsCurrent(generation)) return false;
  if (loyaltyGift?.endsAtMs && loyaltyGift.endsAtMs > Date.now()) {
    void rememberLoyaltyGiftForCurrentAccount(loyaltyGift.endsAtMs, generation);
    setSource('gift_cloud');
    return finish(true);
  }

  // зачем (ревью Opus 11.10, дефект): после потолка поздний «подарок есть» мог успеть сохранить копию, пока шло
  // облачное обновление; ответ «нет доступа» затёр бы его в кэше на 5 минут. Перед каждым «нет» копию перечитываем.
  const giftCopyStillActive = async (): Promise<boolean> => {
    if (strictMutationRead) return false;
    const until = await readVerifiedLoyaltyGiftUntilMs(Date.now(), generation.stableId)
      .catch(noteSwallowedAs('premium_guard:loyalty_local_recheck', null));
    if (until !== null) console.log('[GIFT-LOCAL] перед «нет доступа» нашлась копия — доступ есть');
    return until !== null;
  };

  if (options?.allowCloudRefresh === false) {
    const giftNow = await giftCopyStillActive();
    if (!accountGenerationIsCurrent(generation)) return false;
    if (giftNow) { setSource('gift_local'); return finish(true); }
    setSource('none_fast');
    // зачем (R61, координатор/Ревизор 15.10, 🔴 деньги): «нет», посчитанное БЕЗ облака, — не окончательный ответ. В общем кэше
    // на 5 мин оно отравляло полные проверки: Plus только в облаке (промокод, VIP, перенос) при пустой локальной копии →
    // PremiumContext видел Free, лимиты и пейвол. Кэшируем только «да»; лишней сети нет — копия подарка читается из
    // AsyncStorage, облачное чтение подарка держит свой кэш 30 мин, RevenueCat — свой.
    if (isDevRuntime) console.log('[PREMIUM-GUARD] fast_no_cloud: «нет» без облака не кэшируем — полная проверка сходит в облако');
    return false;
  }
  const cloudRefresh = await refreshPremiumAccessFromCloudIfNeeded(generation);
  const cloudRefreshed = cloudRefresh === 'refreshed';
  mark(`cloud_refresh:${cloudRefresh}`);
  if (!accountGenerationIsCurrent(generation)) return false;
  if (cloudRefreshed) {
    invalidatePremiumCache();
    const [realAfterCloud, vipAfterCloud, giftAfterCloud] = await Promise.all([
      getVerifiedRealPremiumStatus(options).catch(noteSwallowedAs('premium_guard:promise_15', false)),
      getVerifiedVipStatus(options).catch(noteSwallowedAs('premium_guard:promise_16', false)),
      giftCopyStillActive(),
    ]);
    setSource(realAfterCloud ? 'cloud_store' : vipAfterCloud ? 'cloud_vip' : giftAfterCloud ? 'cloud_gift' : 'none');
    return accountGenerationIsCurrent(generation) ? finish(realAfterCloud || vipAfterCloud || giftAfterCloud) : false;
  }

  const giftAtEnd = await giftCopyStillActive();
  if (!accountGenerationIsCurrent(generation)) return false;
  if (giftAtEnd) { setSource('gift_local'); return finish(true); }
  // зачем (R61b): «нет» по потолку ожидания, после неудачного восстановления или пропуска без подтверждения — не ответ облака.
  // Не кэшируем: следующая полная проверка увидит доехавшее восстановление (Plus только в облаке после переустановки).
  if (cloudRefresh === 'unconfirmed') {
    console.log('[PREMIUM-GUARD] full_unconfirmed: «нет» без подтверждения облака не кэшируем'); // guard-ok: ветка решения
    setSource('none_unconfirmed');
    return false;
  }
  setSource('none');
  return finish(false);
}

/** Не чаще раза в 2 мин на устройстве: каждое принудительное восстановление — полное чтение аккаунта (ревью Opus R61c). */
export const FORCE_CLOUD_RESTORE_MIN_INTERVAL_MS = 2 * 60 * 1000;
let _lastForceCloudRestoreAt = 0;

/**
 * Принудительно перечитать доступ из облака — мимо TTL 30 мин и пропуска recent_restore.
 * зачем (R61c, Ревизор 61374cf4e): промокод погашен на сервере, а локальной записи VIP нет (запись упала или ответ
 * первого погашения потерялся). Обычная полная проверка после загрузочного восстановления считает облако прочитанным
 * (confirmed_skip / recent_restore) и кэширует подтверждённое «нет» — человек до 30 мин видит Free после «Готово».
 * Только по действию человека (ввод кода); идущее восстановление не дублируем, чаще раза в 2 мин не запускаем.
 * Возвращает, прочитано ли облако. Доступ НЕ выдаёт — решает вызывающий через проверку доступа.
 */
export async function forcePremiumAccessCloudRestore(reason: string): Promise<boolean> {
  const generation = captureAccountGeneration();
  const startedAt = Date.now();
  invalidatePremiumCache();
  try {
    const cloudSync = await import('./cloud_sync');
    const inFlight = cloudSync.peekCloudRestoreInFlight();
    let confirmed: boolean;
    let via: string;
    if (inFlight) {
      // Идёт загрузочное/другое восстановление этого владельца — ждём его, второе не запускаем.
      const attempt = await inFlight;
      confirmed = restoreAttemptConfirmed(attempt) ?? cloudSync.lastCloudRestoreCompletedAt() >= startedAt;
      via = 'joined_in_flight';
    } else if (startedAt - _lastForceCloudRestoreAt < FORCE_CLOUD_RESTORE_MIN_INTERVAL_MS) {
      console.log(`[PREMIUM-CLOUD] force_restore skip reason=${reason} cause=throttled sinceMs=${startedAt - _lastForceCloudRestoreAt}`); // guard-ok: ранний выход
      return _cloudRefreshConfirmedGeneration === generation.generation;
    } else {
      _lastForceCloudRestoreAt = startedAt;
      _lastCloudAccessRefreshTime = 0;
      _cloudRefreshConfirmedGeneration = -1;
      const applied = await cloudSync.restoreFromCloud();
      confirmed = applied === true || cloudSync.lastCloudRestoreCompletedAt() >= startedAt;
      via = 'own_restore';
      // Неудача — повтор через 2 мин (как R61b), а не немедленное второе полное чтение из обычной проверки.
      if (!confirmed) _lastCloudAccessRefreshTime = Date.now() - CLOUD_ACCESS_REFRESH_TTL_MS + CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS;
    }
    if (!accountGenerationIsCurrent(generation)) {
      console.log(`[PREMIUM-CLOUD] force_restore skip reason=${reason} cause=account_changed`); // guard-ok: ранний выход
      return false;
    }
    invalidatePremiumCache();
    if (confirmed) {
      _cloudRefreshConfirmedGeneration = generation.generation;
      _lastCloudAccessRefreshTime = Date.now();
    }
    console.log(`[PREMIUM-CLOUD] force_restore done reason=${reason} via=${via} confirmed=${confirmed} ms=${Date.now() - startedAt}`); // guard-ok: итог сети
    return confirmed;
  } catch (error) {
    console.warn(`[PREMIUM-CLOUD] force_restore failed reason=${reason}`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return false;
  }
}

/** Потолок облачной проверки подарка (план §CORE-0165): держатель подарка с копией его не ждёт вовсе. */
export const LOYALTY_GIFT_CLOUD_CEILING_MS = 3_000;
let loyaltyGiftReverifiedGeneration = -1;

async function rememberLoyaltyGiftForCurrentAccount(untilMs: number, generation: AccountGenerationToken): Promise<void> {
  // зачем (ревью Opus): id из того же поколения, по которому копию потом читают — без второго источника id.
  const uid = generation.stableId ?? await getCanonicalUserId().catch(noteSwallowedAs('premium_guard:loyalty_uid', null));
  if (!uid || !accountGenerationIsCurrent(generation)) {
    console.log('[GIFT-LOCAL] remember: пропуск — нет id или сменился аккаунт');
    return;
  }
  await rememberVerifiedLoyaltyGift(uid, untilMs);
}

/**
 * Облачное чтение подарка с потолком. По потолку — null (как «нет ответа»), а поздний ответ «подарок есть»
 * сохраняет копию и ОДИН раз пересчитывает доступ (событие loyalty_gift_changed → PremiumContext.reload).
 */
async function readLoyaltyGiftWithCeiling(generation: AccountGenerationToken): Promise<GiftAccessCloudState | null> {
  const startedAt = Date.now();
  const read = readGiftAccessFromCloud('loyalty').catch(noteSwallowedAs('premium_guard:promise_14', null));
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const ceiling = new Promise<null>((resolve) => {
    timer = setTimeout(() => { timedOut = true; resolve(null); }, LOYALTY_GIFT_CLOUD_CEILING_MS);
  });
  const result = await Promise.race([read, ceiling]);
  if (timer) clearTimeout(timer);
  if (!timedOut) return result;
  console.warn('[GIFT-LOCAL] облако подарка не ответило за потолок — решаем без него', JSON.stringify({ ceilingMs: LOYALTY_GIFT_CLOUD_CEILING_MS }));
  void read.then((late) => {
    const active = !!late?.endsAtMs && late.endsAtMs > Date.now();
    console.log('[GIFT-LOCAL] поздний ответ облака', JSON.stringify({ ms: Date.now() - startedAt, active, current: accountGenerationIsCurrent(generation) }));
    if (!active || !accountGenerationIsCurrent(generation) || !late?.endsAtMs) return;
    void rememberLoyaltyGiftForCurrentAccount(late.endsAtMs, generation).then(() => {
      if (!accountGenerationIsCurrent(generation)) return;
      invalidatePremiumCache();
      emitAppEvent('loyalty_gift_changed');
    }).catch(noteSwallowedHandler('premium_guard:loyalty_late_chain'));
  }).catch(noteSwallowedHandler('premium_guard:loyalty_late_read'));
  return null;
}

/**
 * Фоновая сверка копии с облаком — один раз на поколение аккаунта. Отзывает только УСПЕШНЫЙ ответ без активного
 * срока; ошибка сети (null) копию не трогает. Отзыв → копия стёрта, один пересчёт доступа.
 */
function scheduleLoyaltyGiftCloudReverify(generation: AccountGenerationToken): void {
  if (loyaltyGiftReverifiedGeneration === generation.generation) return;
  loyaltyGiftReverifiedGeneration = generation.generation;
  void readGiftAccessFromCloud('loyalty')
    .catch(noteSwallowedAs('premium_guard:loyalty_reverify', null))
    .then(async (cloud) => {
      if (!accountGenerationIsCurrent(generation)) {
        console.log('[GIFT-LOCAL] сверка: аккаунт сменился — ответ отброшен');
        return;
      }
      if (cloud === null) {
        console.log('[GIFT-LOCAL] сверка: облако недоступно — копия остаётся');
        return;
      }
      if (cloud.endsAtMs && cloud.endsAtMs > Date.now()) {
        console.log('[GIFT-LOCAL] сверка: облако подтвердило подарок');
        await rememberLoyaltyGiftForCurrentAccount(cloud.endsAtMs, generation);
        return;
      }
      console.warn('[GIFT-LOCAL] сверка: облако говорит «подарка нет» — копия стирается, доступ пересчитывается');
      await forgetVerifiedLoyaltyGift('cloud_inactive');
      if (!accountGenerationIsCurrent(generation)) return;
      invalidatePremiumCache();
      emitAppEvent('loyalty_gift_changed');
    })
    .catch(noteSwallowedHandler('premium_guard:loyalty_reverify_chain'));
}

/** Только для тестов: сбросить «сверка уже была» между кейсами. */
export function resetLoyaltyGiftReverifyForTests(): void {
  loyaltyGiftReverifiedGeneration = -1;
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

async function refreshPremiumAccessFromCloudIfNeeded(generation: AccountGenerationToken): Promise<CloudRefreshOutcome> {
  if (!accountGenerationIsCurrent(generation)) return 'unconfirmed';
  const now = Date.now();
  if (_cloudAccessRefreshInFlight) return waitCloudAccessRefreshWithCeiling(_cloudAccessRefreshInFlight, 'joined_in_flight', generation);
  const sinceLastMs = now - _lastCloudAccessRefreshTime;
  if (sinceLastMs < CLOUD_ACCESS_REFRESH_TTL_MS) {
    const confirmedSkip = _cloudRefreshConfirmedGeneration === generation.generation;
    console.log(`[PREMIUM-CLOUD] skip reason=ttl ageMs=${sinceLastMs} ttlMs=${CLOUD_ACCESS_REFRESH_TTL_MS} confirmed=${confirmedSkip}`); // guard-ok: ранний выход
    return confirmedSkip ? 'confirmed_skip' : 'unconfirmed';
  }

  _lastCloudAccessRefreshTime = now;
  // Новая попытка: прошлое подтверждение не в счёт, пока эта не прочитает облако (иначе неудача прикрылась бы старым «да»).
  _cloudRefreshConfirmedGeneration = -1;
  _cloudAccessRefreshInFlight = (async () => {
    const startedAt = Date.now();
    try {
      const cloudSync = await import('./cloud_sync');
      if (!accountGenerationIsCurrent(generation)) return false;
      // зачем (FS-READS 15.10, журналы Сверки): проверка премиума запускала ВТОРОЕ полное восстановление поверх загрузочного —
      // users/{id} и страницы карточек читались дважды. Идёт восстановление — ждём его; было удачное недавно — не повторяем.
      const inFlight = cloudSync.peekCloudRestoreInFlight();
      const sinceRestoreMs = Date.now() - cloudSync.lastCloudRestoreCompletedAt();
      // зачем (R61b, ревью Opus): restoreFromCloud при сбое отдаёт false БЕЗ броска — «прочитано ли облако» решает метка
      // lastCloudRestoreCompletedAt (ставится только при status != failed для текущего владельца), а не сам факт возврата.
      let confirmed: boolean;
      let via: string;
      if (inFlight) {
        console.log('[PREMIUM-CLOUD] restore joined_in_flight_boot_restore — второе восстановление не запускаем'); // guard-ok: ветка решения
        const attempt = await inFlight;
        confirmed = restoreAttemptConfirmed(attempt) ?? cloudSync.lastCloudRestoreCompletedAt() >= startedAt;
        via = 'joined';
      } else if (cloudSync.lastCloudRestoreCompletedAt() > 0 && sinceRestoreMs < CLOUD_ACCESS_REFRESH_TTL_MS) {
        console.log(`[PREMIUM-CLOUD] restore skipped reason=recent_restore ageMs=${sinceRestoreMs}`); // guard-ok: ветка решения
        confirmed = true;
        via = 'recent_restore';
      } else {
        const applied = await cloudSync.restoreFromCloud();
        // true — облако прочитано и применено; false — «прочитано, менять нечего» (метка стоит) или сбой (метки нет).
        confirmed = applied === true || cloudSync.lastCloudRestoreCompletedAt() >= startedAt;
        via = 'own_restore';
      }
      console.log(`[PREMIUM-CLOUD] restore done ms=${Date.now() - startedAt} via=${via} confirmed=${confirmed}`); // guard-ok: итог сети
      if (!accountGenerationIsCurrent(generation)) return false;
      if (!confirmed) {
        // Молча неудачное восстановление — как ошибка: повтор через 2 мин, а не через 30.
        _lastCloudAccessRefreshTime = Date.now() - CLOUD_ACCESS_REFRESH_TTL_MS + CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS;
        console.warn(`[PREMIUM-CLOUD] retry_after_unconfirmed inMs=${CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS}`); // guard-ok: ветка повтора
        return false;
      }
      _cloudRefreshConfirmedGeneration = generation.generation;
      return true;
    } catch (error) {
      // Немой catch запрещён: облако не ответило — доступ остаётся по локальному решению, причина в журнале.
      console.warn('[PREMIUM-CLOUD] restoreFromCloud failed', error instanceof Error ? error.message : String(error));
      // зачем (ревью Ядра 88f20e7b7): метка ставится в начале попытки — неудача закрывала повтор на все 30 мин. Неудачу повторяем через 2 мин.
      if (accountGenerationIsCurrent(generation)) {
        _lastCloudAccessRefreshTime = Date.now() - CLOUD_ACCESS_REFRESH_TTL_MS + CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS;
        console.warn(`[PREMIUM-CLOUD] retry_after_failure inMs=${CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS}`); // guard-ok: ветка повтора
      }
      return false;
    } finally {
      _cloudAccessRefreshInFlight = null;
    }
  })();
  return waitCloudAccessRefreshWithCeiling(_cloudAccessRefreshInFlight, 'started', generation);
}

/** Ждать охранный restore не дольше потолка; по потолку — «облако не обновило» (fail-closed: доступ не выдаётся), restore идёт дальше фоном. */
function waitCloudAccessRefreshWithCeiling(
  inFlight: Promise<boolean>,
  origin: 'started' | 'joined_in_flight',
  generation: AccountGenerationToken,
): Promise<CloudRefreshOutcome> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const ceiling = new Promise<CloudRefreshOutcome>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[PREMIUM-CLOUD] ceiling reason=slow_cloud waitMs=${CLOUD_ACCESS_REFRESH_WAIT_CEILING_MS} origin=${origin} — решаем по локальным данным, restore доезжает фоном`); // guard-ok: потолок
      if (!_lateCloudRefreshSignals.has(inFlight)) {
        _lateCloudRefreshSignals.add(inFlight);
        void inFlight.then((confirmed) => {
          if (!confirmed || !accountGenerationIsCurrent(generation)) return;
          emitAppEvent('premium_cloud_refresh_completed', {
            accountGeneration: generation.generation,
          });
        }).catch(noteSwallowedHandler('premium_guard:late_cloud_refresh_signal'));
      }
      resolve('unconfirmed');
    }, CLOUD_ACCESS_REFRESH_WAIT_CEILING_MS);
  });
  const outcome = inFlight.then((ok): CloudRefreshOutcome => (ok ? 'refreshed' : 'unconfirmed'));
  return Promise.race([outcome, ceiling]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
