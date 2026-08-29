import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager } from 'react-native';
import Purchases from 'react-native-purchases';
import {
  forcePremiumActive,
  getVerifiedPremiumAccessStatus,
  getVerifiedRealPremiumStatus,
  getVerifiedVipStatus,
  isLifetimePlanLocal,
  beginPremiumAccountTransition,
  getPremiumAccountTransitionEpoch,
  invalidatePremiumCache,
  onPremiumAccountTransition,
  runPremiumAccountScopedWork,
} from '../app/premium_guard';
import { CLOUD_SYNC_ENABLED, DEV_IAP_BYPASS, FORCE_PREMIUM, IS_EXPO_GO, IS_STORE_RELEASE } from '../app/config';
import { emitAppEvent, onAppEvent } from '../app/events';
import { syncPublicProfileSnapshot } from '../app/public_profile_snapshot';
import {
  createCoalescedAsyncRunner,
  FOREGROUND_CLOUD_REFRESH_DELAY_MS,
  FOREGROUND_LIGHT_REFRESH_DELAY_MS,
  getForegroundRefreshKind,
  LONG_BACKGROUND_CLOUD_REFRESH_MS,
} from '../app/app_resume_policy';
import { getTrialReofferBlockedByCooldown } from '../app/premium_trial_eligibility';
import { anyPackageHasTrialIntro } from '../app/premium_trial_signal';
import { resolvePremiumPackages, syncRevenueCatIdentity } from '../app/revenuecat_init';
import { markVipGrantSeenWithoutCelebration, processVipGrantForCelebration } from '../app/vip_celebration_state';
import { getVipProgressState } from '../app/premium_progress';
import { ensureAnonUser, ensureStableAuthLinkForStableIdDetailed, restoreFromCloud } from '../app/cloud_sync';
import { getIntroFullAccessState } from '../app/intro_full_access';
import { isFeatureFreeForEveryone, type FeatureGate } from '../app/feature_gates';
import { isFeatureGrantedByWeeklyBoon } from '../app/boons/boon_feature_grants';
import { getAppSnapshot } from '../app/app_snapshot_store';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../app/account_generation';
import {
  applyPremiumHydrationSignal,
  subscribePremiumHydrationSignals,
} from '../app/premium_hydration_signals';
import { resolveTesterNoPremiumOverride } from '../app/tester_premium_override';
import {
  projectDevLocalPlusOverride,
  readDevLocalPlusOverride,
  type DevLocalPlusOverride,
} from '../app/dev_plus_controls';
import { readVipSnapshotForAccount, writeVipSnapshotForAccount } from '../app/premium_vip_storage';
import {
  capturePremiumActivationEventGuard,
  readPremiumActivationDisposition,
} from '../app/premium_activation_event_guard';
import { DebugLogger } from '../app/debug-logger';

interface PremiumContextValue {
  isPremium: boolean;
  isVip: boolean;
  /** True only for the verified lifetime (Phraseman Pro) store plan. */
  isPro: boolean;
  hasPremiumAccess: boolean;
  devLocalPlusOverride: DevLocalPlusOverride;
  /** True after the first local/cloud entitlement check has completed. */
  accessResolved: boolean;
  isIntroFullAccess: boolean;
  introFullAccessEndsAt: number | null;
  /**
   * `true`, если магазин реально отдаёт intro free phase:
   *  - локальный кулдаун 90 д. не активен И
   *  - хотя бы один пакет (monthly/yearly) от магазина имеет intro free phase.
   * В Expo Go / DEV_IAP_BYPASS — всегда `false` (нет реального магазина, не врём пользователю).
   */
  trialEligible: boolean;
  reload: () => Promise<void>;
}

// зачем: аудит нагрева 2026-07-25 — ретрай VIP-слушателя был фиксированные 2.5с БЕЗ
// предохранителя: при битом auth-линке долбил сеть бесконечно (грелка/батарея).
// Экспоненциальный отступ по образцу app/net_status.ts (OFFLINE_BACKOFF_MS);
// счётчик сбрасывается живым снапшотом — рабочий слушатель отступ не чувствует.
const PREMIUM_LISTENER_RETRY_BACKOFF_MS = [2_500, 10_000, 30_000, 60_000, 120_000, 300_000] as const;

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isVip: false,
  isPro: false,
  hasPremiumAccess: false,
  devLocalPlusOverride: 'inherit',
  accessResolved: false,
  isIntroFullAccess: false,
  introFullAccessEndsAt: null,
  trialEligible: false,
  reload: async () => {},
});

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}

/**
 * Эффективный доступ к КОНКРЕТНОЙ фиче с учётом «Пульта». Возвращает true, если
 * у пользователя есть премиум-доступ ИЛИ админ перевёл фичу в «Фри»
 * (gate_<feature>_premium=false). Гейт-сайты должны спрашивать именно это вместо
 * сырого hasPremiumAccess, чтобы перевод фичи в «Фри» снимал пейвол живьём.
 *
 * Пересчитывается на событие 'remote_config_changed'. Клиент применяет кэш при
 * запуске/возврате и foreground-обновление не позднее примерно пяти минут.
 */
export function useFeatureAccess(feature: FeatureGate): boolean {
  const { hasPremiumAccess } = usePremium();
  // freeForAll = админ перевёл в «Фри»; grantedByBoon = бонус дня открыл фичу
  // (напр. «День голоса» открывает speaking). Оба пересчитываются на смену
  // remote-config; boon ещё зависит от дня, поэтому пересчитываем и при ремаунте.
  const [access, setAccess] = useState(() => ({
    freeForAll: isFeatureFreeForEveryone(feature),
    grantedByBoon: isFeatureGrantedByWeeklyBoon(feature),
  }));
  useEffect(() => {
    const recompute = () =>
      setAccess({
        freeForAll: isFeatureFreeForEveryone(feature),
        grantedByBoon: isFeatureGrantedByWeeklyBoon(feature),
      });
    recompute();
    const sub = onAppEvent('remote_config_changed', recompute);
    return () => sub.remove();
  }, [feature]);
  return hasPremiumAccess || access.freeForAll || access.grantedByBoon;
}

function getFirestoreForPremiumListener(): unknown | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

async function computeTrialEligible(): Promise<boolean> {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !IS_STORE_RELEASE) return false;
  if (IS_EXPO_GO || DEV_IAP_BYPASS) return false;
  try {
    const blocked = await getTrialReofferBlockedByCooldown();
    if (blocked) return false;
    const offerings = await Purchases.getOfferings();
    const pkgs = resolvePremiumPackages(offerings.current?.availablePackages ?? []);
    return anyPackageHasTrialIntro(pkgs);
  } catch {
    return false;
  }
}

// B1 (PERF_MASTER_PLAN, снапшот-прогрев): снапшот (app_snapshot_store) может уже
// содержать premiumActive/vipActive с прошлой сессии (записано в
// app_snapshot_bootstrap.ts до первого кадра). Читаем его синхронно в
// инициализаторах useState вместо жёсткого `false`, чтобы не мигать
// premium/VIP-бейджами в ~50 местах, пока reload() не подтвердит статус живым
// источником (RevenueCat/AsyncStorage/Firestore). Если снапшота ещё нет
// (первый запуск/холодный старт быстрее прайма) — остаёмся на false, как раньше.
// FORCE_PREMIUM (dev) продолжает побеждать: снапшот только повышает false→true,
// никогда не понижает true→false относительно текущего поведения.
function snapshotPremiumActive(): boolean {
  return getAppSnapshot().profile?.premiumActive === true;
}
function snapshotVipActive(): boolean {
  return getAppSnapshot().profile?.vipActive === true;
}
function snapshotProActive(): boolean {
  const profile = getAppSnapshot().profile;
  if (profile?.premiumActive === true && profile?.premiumPlan === 'lifetime') return true;
  // зачем: без этой ветки безденежный Pro (сертификат/промокод «навсегда»,
  // бессрочная выдача) моргал бы «Plus» на первом кадре и переключался на «Pro»
  // только после reload() — снапшот обязан знать тот же тир, что и runReload.
  return profile?.vipActive === true && profile?.vipLifetime === true;
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(() => FORCE_PREMIUM || snapshotPremiumActive());
  const [isVip, setIsVip] = useState(() => snapshotVipActive());
  const [isPro, setIsPro] = useState(snapshotProActive);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(
    () => FORCE_PREMIUM || snapshotPremiumActive() || snapshotVipActive(),
  );
  const [devLocalPlusOverride, setDevLocalPlusOverrideState] = useState<DevLocalPlusOverride>('inherit');
  const [accessResolved, setAccessResolved] = useState(false);
  const [isIntroFullAccess, setIsIntroFullAccess] = useState(false);
  const [introFullAccessEndsAt, setIntroFullAccessEndsAt] = useState<number | null>(null);
  const [trialEligible, setTrialEligible] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const vipSnapshotStateRef = useRef<boolean | null>(null);
  // H-VIPCHURN: зеркало isPremium в ref, чтобы onSnapshot-эффект мог читать актуальное
  // значение БЕЗ isPremium в своём dep-массиве. Иначе эффект пересоздавал Firestore-
  // подписку (отписка+переподписка) на каждый переход premium/VIP.
  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;
  const premiumReloadEpochRef = useRef(0);
  const premiumIdentityRequiredRef = useRef(false);
  const premiumAccountTransitionActiveRef = useRef(false);
  const resolvedReloadEpochRef = useRef<number | null>(null);
  const reloadRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const cloudRefreshRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const [premiumListenerRevision, setPremiumListenerRevision] = useState(0);

  const resetPremiumUiForAccountTransition = useCallback(() => {
    premiumReloadEpochRef.current += 1;
    premiumIdentityRequiredRef.current = true;
    resolvedReloadEpochRef.current = null;
    reloadRunnerRef.current = null;
    cloudRefreshRunnerRef.current = null;
    invalidatePremiumCache();
    vipSnapshotStateRef.current = false;
    setIsPremium(false);
    setIsVip(false);
    setIsPro(false);
    setHasPremiumAccess(false);
    setDevLocalPlusOverrideState('inherit');
    setAccessResolved(false);
    setIsIntroFullAccess(false);
    setIntroFullAccessEndsAt(null);
    setTrialEligible(false);
  }, []);

  const reloadTrialEligible = useCallback(async (isCurrent: () => boolean = () => true) => {
    const v = await computeTrialEligible();
    if (!isCurrent()) return;
    setTrialEligible(prev => (prev === v ? prev : v));
  }, []);

  const runReload = useCallback(async () => {
    const reloadEpoch = premiumReloadEpochRef.current;
    const isReloadCurrent = () => premiumReloadEpochRef.current === reloadEpoch;
    if (premiumIdentityRequiredRef.current) {
      // зачем (2026-08-25, «карточка виснет на скелетоне»): раньше неудачный
      // identity sync (сеть/сторовые причуды на TestFlight) обрывал ВЕСЬ
      // reload через return — accessResolved никогда не становился true, и
      // любой экран, ждущий резолва подписки, висел на скелетоне навсегда.
      // getVerifiedRealPremiumStatus/getVerifiedVipStatus ниже читают
      // локальный кэш/Firestore и в свежем identity sync не нуждаются —
      // поэтому при неудаче просто продолжаем расчёт как обычно; флаг
      // остаётся true и sync попробуется снова на следующем reload().
      if (!isReloadCurrent()) return;
      const identityReady = await syncRevenueCatIdentity(isReloadCurrent).catch(() => false);
      if (!isReloadCurrent()) return;
      if (identityReady) premiumIdentityRequiredRef.current = false;
    }
    const devAccountGeneration = captureAccountGeneration();
    const devStableId = devAccountGeneration.phase === 'active'
      ? devAccountGeneration.stableId
      : null;
    const devOverride = devStableId
      ? await readDevLocalPlusOverride(devStableId).catch(() => 'inherit' as const)
      : 'inherit';
    if (
      !isReloadCurrent()
      || (devStableId && !isCurrentAccountGeneration(devAccountGeneration, devStableId))
    ) return;
    setDevLocalPlusOverrideState(devOverride);
    // FORCE_PREMIUM раздаёт Premium в dev, НО тестерский «Снять премиум»
    // (tester_no_premium) должен побеждать — иначе не проверить не-премиум UI.
    if (await forcePremiumActive()) {
      if (!isReloadCurrent()) return;
      const projectedEntitlement = projectDevLocalPlusOverride({
        isPremium: true,
        isVip: false,
        isPro: false,
        hasPremiumAccess: true,
        isIntroFullAccess: false,
        introFullAccessEndsAt: null,
      }, devOverride);
      setIsPremium(projectedEntitlement.isPremium);
      setIsVip(projectedEntitlement.isVip);
      setIsPro(projectedEntitlement.isPro);
      setHasPremiumAccess(projectedEntitlement.hasPremiumAccess);
      setIsIntroFullAccess(projectedEntitlement.isIntroFullAccess);
      setIntroFullAccessEndsAt(projectedEntitlement.introFullAccessEndsAt);
      // Активный премиум — копия про триал нерелевантна
      setTrialEligible(false);
      resolvedReloadEpochRef.current = reloadEpoch;
      return;
    }
    let [realPremium, vip, lifetimePlan] = await Promise.all([
      getVerifiedRealPremiumStatus(),
      getVerifiedVipStatus(),
      isLifetimePlanLocal(),
    ]);
    let verifiedAccess = realPremium || vip;
    if (!isReloadCurrent()) return;
    if (!realPremium && !vip) {
      const accessAfterCloud = await getVerifiedPremiumAccessStatus().catch(() => false);
      verifiedAccess = accessAfterCloud;
      if (!isReloadCurrent()) return;
      if (accessAfterCloud) {
        [realPremium, vip, lifetimePlan] = await Promise.all([
          getVerifiedRealPremiumStatus().catch(() => false),
          getVerifiedVipStatus().catch(() => false),
          isLifetimePlanLocal().catch(() => false),
        ]);
        if (!isReloadCurrent()) return;
      }
    }
    // Тестер «Снять премиум» гасит и intro-доступ (3 дня) — иначе он
    // переживал бы снятие и hasPremiumAccess оставался true.
    const testerEntries = await AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])
      .catch(() => [] as [string, string | null][]);
    if (!isReloadCurrent()) return;
    const testerValues = Object.fromEntries(testerEntries);
    const noPremiumTester = resolveTesterNoPremiumOverride(testerValues.tester_no_premium);
    const noLimitsRaw = testerValues.tester_no_limits;
    const testerNoLimits = !noPremiumTester && noLimitsRaw === 'true' && !IS_STORE_RELEASE;
    const introState = noPremiumTester
      ? { active: false, endsAt: null }
      : await getIntroFullAccessState();
    if (!isReloadCurrent()) return;
    const effectivePremium = !noPremiumTester && (realPremium || testerNoLimits);
    const effectiveVip = !noPremiumTester && vip;
    // зачем: владелец (2026-08-03) — Pro даёт и безденежный пожизненный доступ
    // (сертификат «Pro — навсегда», промокод, бессрочная выдача из админки), а не
    // только покупка. Раньше здесь стояло realPremium && lifetimePlan, поэтому у
    // владельца сертификата не было ни надписи Pro, ни про-ауры у других игроков.
    // isLifetimePlanLocal уже требует активный источник (стор ИЛИ активный VIP).
    const effectivePro = !noPremiumTester && (realPremium || effectiveVip) && lifetimePlan;
    const effectiveVerifiedAccess = !noPremiumTester && verifiedAccess;
    const hasAuthoritativeAccess = effectivePremium || effectiveVip || introState.active || effectiveVerifiedAccess;
    const hasDevGrant = devOverride === 'granted';
    const projectedEntitlement = projectDevLocalPlusOverride({
      isPremium: effectivePremium,
      isVip: effectiveVip,
      isPro: effectivePro,
      hasPremiumAccess: hasAuthoritativeAccess,
      isIntroFullAccess: introState.active,
      introFullAccessEndsAt: introState.endsAt,
    }, devOverride);
    setIsPremium(projectedEntitlement.isPremium);
    setIsVip(projectedEntitlement.isVip);
    setIsPro(projectedEntitlement.isPro);
    setIsIntroFullAccess(projectedEntitlement.isIntroFullAccess);
    setIntroFullAccessEndsAt(projectedEntitlement.introFullAccessEndsAt);
    setHasPremiumAccess(projectedEntitlement.hasPremiumAccess);
    if (effectivePremium || hasDevGrant) {
      setTrialEligible(false);
    } else {
      void reloadTrialEligible(isReloadCurrent);
    }
    resolvedReloadEpochRef.current = reloadEpoch;
  }, [reloadTrialEligible]);
  const reload = useCallback(async () => {
    const requestedEpoch = premiumReloadEpochRef.current;
    reloadRunnerRef.current ??= createCoalescedAsyncRunner(runReload);
    await reloadRunnerRef.current();
    if (
      premiumReloadEpochRef.current === requestedEpoch
      && resolvedReloadEpochRef.current === requestedEpoch
    ) {
      // A false entitlement is actionable only after we have checked both the
      // local cache and the cloud-backed fallback at least once. Direct-entry
      // premium screens use this to avoid a first-frame paywall redirect.
      setAccessResolved(true);
    }
  }, [runReload]);

  useEffect(() => {
    const subscription = subscribePremiumHydrationSignals((signal) => {
      applyPremiumHydrationSignal(signal, {
        invalidateStartup: () => {
          invalidatePremiumCache();
          resolvedReloadEpochRef.current = null;
          reloadRunnerRef.current = null;
          cloudRefreshRunnerRef.current = null;
          setAccessResolved(false);
        },
        resetForAccountTransition: () => {
          premiumAccountTransitionActiveRef.current = false;
          resetPremiumUiForAccountTransition();
        },
        invalidateForSnapshot: () => {
          // Storage hydration can arrive after an early false reload. A new
          // epoch prevents that stale result from resolving access afterward.
          premiumReloadEpochRef.current += 1;
          resolvedReloadEpochRef.current = null;
          reloadRunnerRef.current = null;
          cloudRefreshRunnerRef.current = null;
          invalidatePremiumCache();
          setAccessResolved(false);
        },
        restartListener: () => setPremiumListenerRevision((revision) => revision + 1),
        reload: () => {
          void (async () => {
            if (signal.initial && await forcePremiumActive()) {
              await AsyncStorage.setItem('premium_active', 'true').catch(() => {});
            }
            await reload();
          })();
        },
      });
    });
    return () => subscription.remove();
  }, [reload, resetPremiumUiForAccountTransition]);

  useEffect(() => {
    const sub = onAppEvent('dev_local_plus_override_changed', ({ stableId, mode }) => {
      const account = captureAccountGeneration();
      if (
        account.phase !== 'active'
        || account.stableId !== stableId
        || !isCurrentAccountGeneration(account, stableId)
      ) return;

      // A local DEV toggle must win over an in-flight authoritative reload. Bump
      // the epoch first so the old result cannot restore paid access afterward.
      premiumReloadEpochRef.current += 1;
      resolvedReloadEpochRef.current = null;
      reloadRunnerRef.current = null;
      cloudRefreshRunnerRef.current = null;
      invalidatePremiumCache();

      const active = mode === 'granted';
      setDevLocalPlusOverrideState(mode);
      setIsPremium(active);
      setIsVip(false);
      setIsPro(false);
      setHasPremiumAccess(active);
      setIsIntroFullAccess(false);
      setIntroFullAccessEndsAt(null);
      setTrialEligible(false);
      emitAppEvent('premium_access_changed', {
        active,
        source: active ? 'premium' : 'none',
      });
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  const runReloadAfterCloudRefresh = useCallback(async () => {
    const refreshEpoch = premiumReloadEpochRef.current;
    if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
      await reload();
      return;
    }
    try {
      await restoreFromCloud();
    } catch (e) {
      // premium state can still fall back to local/RevenueCat
      DebugLogger.error('PremiumContext:refreshEpoch', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    if (premiumReloadEpochRef.current !== refreshEpoch) return;
    invalidatePremiumCache();
    await reload();
  }, [reload]);
  const reloadAfterCloudRefresh = useCallback(async () => {
    cloudRefreshRunnerRef.current ??= createCoalescedAsyncRunner(runReloadAfterCloudRefresh);
    await cloudRefreshRunnerRef.current();
  }, [runReloadAfterCloudRefresh]);

  useEffect(() => {
    const sub = onPremiumAccountTransition(() => {
      premiumAccountTransitionActiveRef.current = true;
      resetPremiumUiForAccountTransition();
      setPremiumListenerRevision((v) => v + 1);
    });
    return () => sub.remove();
  }, [resetPremiumUiForAccountTransition]);

  // Login/merge can swap the canonical stable_id; restart the admin-grant listener on the new users/{stable_id}.
  useEffect(() => {
    const sub = onAppEvent('auth_provider_linked', () => {
      resetPremiumUiForAccountTransition();
      premiumAccountTransitionActiveRef.current = false;
      vipSnapshotStateRef.current = null;
      setPremiumListenerRevision((v) => v + 1);
      void reloadAfterCloudRefresh();
    });
    return () => sub.remove();
  }, [reloadAfterCloudRefresh, resetPremiumUiForAccountTransition]);

  // Live VIP grants/revokes from admin/index.html write users/{uid}.progress.
  // Without this, a user who keeps the app open can stay locked until a later cloud restore.
  useEffect(() => {
    if (
      FORCE_PREMIUM
      || !CLOUD_SYNC_ENABLED
      || IS_EXPO_GO
      || premiumAccountTransitionActiveRef.current
    ) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;
    const listenerEpoch = getPremiumAccountTransitionEpoch();
    const listenerGeneration = captureAccountGeneration();
    const listenerStableId = listenerGeneration.stableId ?? '';
    const isListenerCurrent = () => (
      !cancelled
      && !premiumAccountTransitionActiveRef.current
      && getPremiumAccountTransitionEpoch() === listenerEpoch
      && !!listenerStableId
      && isCurrentAccountGeneration(listenerGeneration, listenerStableId)
    );

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    // зачем (аудит нагрева 2026-08-26): при недоступном Firestore этот бэкофф
    // повторял попытки и в СВЁРНУТОМ приложении — сеть в фоне без пользы.
    // В фоне не планируем новую попытку, а взводим одноразовый слушатель: доступ
    // (Plus/VIP) не может «залипнуть» выключенным — возврат на передний план
    // немедленно перезапускает start(), причём быстрее обычного бэкоффа.
    let backgroundResumeSub: { remove: () => void } | null = null;
    const clearBackgroundResume = () => {
      backgroundResumeSub?.remove();
      backgroundResumeSub = null;
    };

    const scheduleRetry = () => {
      if (!isListenerCurrent() || retryTimer) return;
      if (AppState.currentState !== 'active') {
        if (backgroundResumeSub) return;
        backgroundResumeSub = AppState.addEventListener('change', (state) => {
          if (state !== 'active') return;
          clearBackgroundResume();
          if (!isListenerCurrent()) return;
          void start();
        });
        return;
      }
      const delay = PREMIUM_LISTENER_RETRY_BACKOFF_MS[
        Math.min(retryAttempt, PREMIUM_LISTENER_RETRY_BACKOFF_MS.length - 1)
      ]!;
      retryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void start();
      }, delay);
    };

    const start = async () => {
      clearRetry();
      if (!isListenerCurrent()) return;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      const db = getFirestoreForPremiumListener() as {
        collection?: (name: string) => {
          doc: (id: string) => {
            collection: (childName: string) => {
              doc: (childId: string) => {
                onSnapshot: (
                  onNext: (snap: { exists?: boolean; data?: () => Record<string, unknown> | undefined }) => void,
                  onError?: () => void,
                ) => () => void;
              };
            };
          };
        };
      } | null;
      if (!db?.collection) return;
      try {
        const uid = await ensureAnonUser();
        if (!isListenerCurrent() || !uid) return;
        const stableLink = await ensureStableAuthLinkForStableIdDetailed(uid).catch(() => null);
        if (!isListenerCurrent()) return;
        // A stable-owner mismatch cannot heal through repeated anonymous retries.
        // Wait for the startup provider-recovery flow to emit auth_provider_linked,
        // which increments premiumListenerRevision and restarts this effect.
        if (stableLink?.failure === 'stable_id_mismatch') return;
        if (!stableLink?.ok || stableLink.stableUid !== uid) {
          scheduleRetry();
          return;
        }

        unsubscribe = db.collection('users').doc(uid).collection('access_projection').doc('current').onSnapshot(
          (snap) => {
            retryAttempt = 0; // живой снапшот — канал работает, отступ обнуляем
            if (!snap.exists || !isListenerCurrent()) return;
            const data = snap.data ? snap.data() : undefined;
            const projectedVipActive = data?.vipActive === true;
            const projectedPremiumPlan = typeof data?.premiumPlan === 'string' ? data.premiumPlan : '';
            const projectedPremiumExpiry = Number(data?.premiumExpiresAtMs);
            const projectedStorePlan = ['monthly', 'yearly', 'annual', 'lifetime'].includes(projectedPremiumPlan);
            const progress = {
              premium_active: data?.premiumActive === true ? 'true' : 'false',
              premium_plan: projectedPremiumPlan,
              premium_expiry: Number.isFinite(projectedPremiumExpiry) ? String(projectedPremiumExpiry) : '0',
              ...(!projectedStorePlan ? {
                admin_premium_override: data?.premiumActive === true ? 'true' : 'false',
              } : {}),
              ...(projectedVipActive ? {
                vip_active: 'true',
                vip_admin_override: 'true',
                vip_plan: 'server_vip',
                // The tiny projection deliberately carries no grant history. A finite
                // compatibility window avoids incorrectly promoting generic VIP to Pro;
                // locally cached VIP details remain the richer startup seed.
                vip_until: String(Number.MAX_SAFE_INTEGER),
              } : {}),
            } satisfies Record<string, unknown>;
            const vipState = getVipProgressState(progress);
            if (!vipState) return;

            void runPremiumAccountScopedWork(listenerEpoch, async (isEpochCurrent) => {
              const isSnapshotCurrent = () => isListenerCurrent() && isEpochCurrent();
              if (!isSnapshotCurrent()) return;
              // зачем: владелец (2026-07-26, баг «Plus активирован при КАЖДОМ входе») —
              // на первом снапшоте запуска vipSnapshotStateRef ещё null, а RevenueCat
              // не гидрирован, поэтому «доступа не было» выглядело ложно и свежий
              // grantAt (вчерашний спин) взводил модалку каждый запуск. Празднуем
              // только переход ФРИ → доступ: прошлое состояние читаем из
              // ПЕРСИСТЕНТНЫХ свидетельств СТРОГО ДО перезаписи снапшота ниже.
              let hadAccessBeforeGrant = vipSnapshotStateRef.current === true || isPremiumRef.current;
              if (!hadAccessBeforeGrant && vipSnapshotStateRef.current === null && vipState.active) {
                const [persistedVip, persistedPremiumActive, persistedPlan] = await Promise.all([
                  readVipSnapshotForAccount(listenerStableId).catch(() => null),
                  AsyncStorage.getItem('premium_active').catch(() => null),
                  AsyncStorage.getItem('premium_plan').catch(() => null),
                ]);
                hadAccessBeforeGrant = persistedVip?.vip_active === 'true'
                  || persistedPremiumActive === 'true'
                  || persistedPlan === 'lifetime';
              }
              if (!isSnapshotCurrent()) return;
              await writeVipSnapshotForAccount(listenerStableId, {
                vip_active: vipState.active ? 'true' : 'false',
                vip_plan: vipState.active ? vipState.plan : '',
                vip_from: vipState.active ? vipState.fromValue : '0',
                vip_until: vipState.active ? vipState.untilValue : '0',
                vip_admin_override: vipState.active ? 'true' : 'false',
                vip_admin_grant_at: vipState.grantAt ?? '',
              }).catch(() => {});
              if (!isSnapshotCurrent()) return;
              if (vipState.active) {
                // Празднуем только переход «не было доступа → появился»
                // (hadAccessBeforeGrant вычислен ВЫШЕ из персистентных свидетельств,
                // до перезаписи снапшота). Продление при активном Plus/Pro/VIP
                // гасит маркер без модалки — и на этом запуске, и для restore.
                if (hadAccessBeforeGrant) {
                  await markVipGrantSeenWithoutCelebration(vipState.grantAt).catch(() => {});
                } else {
                  await processVipGrantForCelebration(vipState.grantAt).catch(() => {});
                }
                if (!isSnapshotCurrent()) return;
              }
              invalidatePremiumCache();

              const previous = vipSnapshotStateRef.current;
              vipSnapshotStateRef.current = vipState.active;
              if (previous === vipState.active) return;

              if (vipState.active) {
                setIsVip(true);
                setHasPremiumAccess(true);
                emitAppEvent('vip_activated');
                emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
                await syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true }).catch(() => {});
              } else {
                const premiumNow = isPremiumRef.current;
                setIsVip(false);
                setHasPremiumAccess(premiumNow);
                void reloadTrialEligible(isSnapshotCurrent);
                emitAppEvent('vip_deactivated');
                emitAppEvent('premium_access_changed', { active: premiumNow, source: premiumNow ? 'premium' : 'none' });
                await syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium: premiumNow }).catch(() => {});
              }
            });
          },
          () => {
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
            scheduleRetry();
          },
        );
      } catch {
        scheduleRetry();
      }
    };

    void start();
    return () => {
      cancelled = true;
      clearRetry();
      clearBackgroundResume();
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };
    // H-VIPCHURN: isPremium намеренно НЕ в deps — читаем его через isPremiumRef внутри
    // колбэка. Подписка переустанавливается только при реальной смене аккаунта
    // (premiumListenerRevision) или reloadTrialEligible, а не на каждом тике premium/VIP.
  }, [reloadTrialEligible, premiumListenerRevision]);

  // Reload when app comes to foreground; after a background round-trip, refresh cloud admin grants first.
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let resumeTask: { cancel?: () => void } | null = null;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const backgroundDurationMs = backgroundedAtRef.current != null
          ? Date.now() - backgroundedAtRef.current
          : 0;
        backgroundedAtRef.current = null;
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTask?.cancel?.();

        if (getForegroundRefreshKind(backgroundDurationMs) === 'cloud') {
          invalidatePremiumCache();
          resumeTimer = setTimeout(() => {
            resumeTimer = null;
            resumeTask = InteractionManager.runAfterInteractions(() => {
              void reloadAfterCloudRefresh();
            });
          }, backgroundDurationMs >= LONG_BACKGROUND_CLOUD_REFRESH_MS ? FOREGROUND_LIGHT_REFRESH_DELAY_MS : FOREGROUND_CLOUD_REFRESH_DELAY_MS);
          return;
        }

        resumeTimer = setTimeout(() => {
          resumeTimer = null;
          resumeTask = InteractionManager.runAfterInteractions(() => {
            void reload();
          });
        }, FOREGROUND_LIGHT_REFRESH_DELAY_MS);
      } else if (state === 'background') {
        backgroundedAtRef.current = Date.now();
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        resumeTask?.cancel?.();
      }
    });
    return () => {
      sub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTask?.cancel?.();
    };
  }, [reload, reloadAfterCloudRefresh]);

  // Instant update on purchase — set true immediately, reload only syncs cache
  useEffect(() => {
    let disposed = false;
    let activationEventEpoch = 0;
    const sub = onAppEvent('premium_activated', () => {
      activationEventEpoch += 1;
      const activationGuard = capturePremiumActivationEventGuard(
        activationEventEpoch,
        () => activationEventEpoch,
        () => disposed,
      );
      void (async () => {
        const disposition = await readPremiumActivationDisposition(activationGuard, IS_STORE_RELEASE);
        if (disposition === 'stale') return;
        if (disposition === 'reload') {
          invalidatePremiumCache();
          await reload();
          return;
        }
        if (!activationGuard.isCurrent()) return;

        const lifetimePlan = await isLifetimePlanLocal();
        if (!activationGuard.isCurrent()) return;

        setIsPremium(true);
        setIsPro(lifetimePlan);
        setHasPremiumAccess(true);
        setTrialEligible(false);
        invalidatePremiumCache();
        void import('../app/lesson_lock_system')
          .then(m => m.getPremiumCourseLevel())
          .catch(() => {});
        // Sync cache in background — but don\'t let it override our true state
        // (RC sandbox can have propagation delay, grace period in premium_guard handles it)
        void reload();
        emitAppEvent('premium_access_changed', { active: true, source: 'premium' });
        void syncPublicProfileSnapshot(
          { reason: 'entitlement_change', isPremium: true, isVip },
          activationGuard.accountToken,
        ).catch(() => {});
      })();
    });
    return () => {
      disposed = true;
      activationEventEpoch += 1;
      sub.remove();
    };
  }, [isVip, reload]);

  // VIP can be activated from the in-app admin panel before the Firestore
  // listener/reload loop has delivered the new local state.
  useEffect(() => {
    const onActivated = onAppEvent('vip_activated', () => {
      setIsVip(true);
      setHasPremiumAccess(true);
      setTrialEligible(false);
      invalidatePremiumCache();
      void reload();
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true }).catch(() => {});
    });
    const onDeactivated = onAppEvent('vip_deactivated', () => {
      setIsVip(false);
      setHasPremiumAccess(isPremium);
      invalidatePremiumCache();
      void reloadTrialEligible();
      void reload();
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium }).catch(() => {});
    });
    return () => {
      onActivated.remove();
      onDeactivated.remove();
    };
  }, [isPremium, reload, reloadTrialEligible]);

  useEffect(() => {
    const sub = onAppEvent('intro_full_access_changed', () => {
      invalidatePremiumCache();
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  // После локального удаления аккаунта сбрасываем entitlement сразу, не ждём remount.
  useEffect(() => {
    const sub = onAppEvent('account_deleted', () => {
      beginPremiumAccountTransition();
      premiumAccountTransitionActiveRef.current = false;
      setPremiumListenerRevision((v) => v + 1);
      emitAppEvent('premium_access_changed', { active: false, source: 'none' });
      void reload();
    });
    return () => sub.remove();
  }, [reload]);


  // Instant update on cancellation/expiry / тестер «Снять премиум»
  useEffect(() => {
    const sub = onAppEvent('premium_deactivated', () => {
      setIsPremium(false);
      setIsPro(false);
      setHasPremiumAccess(isVip);
      invalidatePremiumCache();
      void import('../app/lesson_lock_system')
        .then(m => m.recomputeEarnedUnlocks())
        .catch(() => {});
      void reload();
      emitAppEvent('premium_access_changed', { active: isVip, source: isVip ? 'vip' : 'none' });
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isPremium: false, isVip }).catch(() => {});
    });
    return () => sub.remove();
  }, [isVip, reload]);

  // H-VIPCHURN: мемоизируем value, иначе любой ре-рендер провайдера слал новую ссылку
  // во все usePremium()-потребители по всему приложению (home, inbox, friends…),
  // умножая работу на каждом тике premium/VIP.
  const contextValue = useMemo<PremiumContextValue>(
    () => ({ isPremium, isVip, isPro, hasPremiumAccess, devLocalPlusOverride, accessResolved, isIntroFullAccess, introFullAccessEndsAt, trialEligible, reload }),
    [isPremium, isVip, isPro, hasPremiumAccess, devLocalPlusOverride, accessResolved, isIntroFullAccess, introFullAccessEndsAt, trialEligible, reload],
  );

  return (
    <PremiumContext.Provider value={contextValue}>
      {children}
    </PremiumContext.Provider>
  );
}
