import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager } from 'react-native';
import Purchases from 'react-native-purchases';
import {
  forcePremiumActive,
  getVerifiedPremiumAccessStatus,
  getVerifiedRealPremiumStatus,
  getVerifiedVipStatus,
  invalidatePremiumCache,
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
import { resolvePremiumPackages } from '../app/revenuecat_init';
import { processVipGrantForCelebration } from '../app/vip_celebration_state';
import { getVipProgressState } from '../app/premium_progress';
import {
  ensureAnonUser,
  ensureStableAuthLinkForStableIdDetailed,
  restoreFromCloud,
} from '../app/cloud_sync';
import { getIntroFullAccessState } from '../app/intro_full_access';
import { getLoyaltyGiftState } from '../app/loyalty_gift';
import { isFeatureFreeForEveryone, type FeatureGate } from '../app/feature_gates';
import { isFeatureGrantedByWeeklyBoon } from '../app/boons/boon_feature_grants';
import { getAppSnapshot } from '../app/app_snapshot_store';
import { subscribeNetStatus } from '../app/net_status';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

export const PREMIUM_RELOAD_MAX_ATTEMPTS = 4;
export const PREMIUM_LISTENER_MAX_RETRY_ATTEMPTS = 5;
const PREMIUM_RELOAD_RETRY_BASE_MS = 400;
const PREMIUM_RELOAD_RETRY_MAX_MS = 3_200;
const PREMIUM_LISTENER_RETRY_BASE_MS = 2_500;
const PREMIUM_LISTENER_RETRY_MAX_MS = 20_000;

export function premiumRetryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const safeBase = Math.max(0, baseDelayMs);
  const safeMax = Math.max(safeBase, maxDelayMs);
  return Math.min(safeMax, safeBase * (2 ** safeAttempt));
}

export async function runBoundedPremiumRetrySequence(options: {
  attempt: () => Promise<void>;
  shouldContinue: () => boolean;
  wait: (delayMs: number) => Promise<boolean>;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}): Promise<boolean> {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts));
  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    if (!options.shouldContinue()) return false;
    try {
      await options.attempt();
      return options.shouldContinue();
    } catch {
      if (attemptIndex + 1 >= maxAttempts || !options.shouldContinue()) return false;
      const waited = await options.wait(
        premiumRetryDelayMs(attemptIndex, options.baseDelayMs, options.maxDelayMs),
      );
      if (!waited) return false;
    }
  }
  return false;
}

type PremiumListenerLinkResult = {
  ok?: boolean;
  stableUid?: string | null;
  failure?: 'stable_id_mismatch' | 'unavailable';
} | null | undefined;

export function getPremiumListenerLinkAction(
  linked: PremiumListenerLinkResult,
  retryAttempt: number,
): 'listen' | 'retry' | 'stop' {
  if (linked?.ok && linked.stableUid) return 'listen';
  if (linked?.failure === 'stable_id_mismatch') return 'stop';
  return retryAttempt < PREMIUM_LISTENER_MAX_RETRY_ATTEMPTS ? 'retry' : 'stop';
}

export function shouldRetryUnresolvedPremiumOnNetworkSignal(input: {
  online: boolean;
  accessResolved: boolean;
  mounted: boolean;
  appActive: boolean;
  accountActive: boolean;
  transitioning: boolean;
  refreshPending: boolean;
}): boolean {
  return input.online
    && !input.accessResolved
    && input.mounted
    && input.appActive
    && input.accountActive
    && !input.transitioning
    && !input.refreshPending;
}

interface PremiumContextValue {
  isPremium: boolean;
  isVip: boolean;
  hasPremiumAccess: boolean;
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

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isVip: false,
  hasPremiumAccess: false,
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
 * Пересчитывается на событие 'remote_config_changed' (onSnapshot remote_config/app),
 * поэтому смена тумблера в админке отражается в открытом приложении за секунды.
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

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const initialAccountTokenRef = useRef(captureAccountGeneration());
  const initialAccountTransitioning = initialAccountTokenRef.current.phase === 'transitioning';
  const [isPremium, setIsPremium] = useState(
    () => !initialAccountTransitioning && (FORCE_PREMIUM || snapshotPremiumActive()),
  );
  const [isVip, setIsVip] = useState(() => !initialAccountTransitioning && snapshotVipActive());
  const [hasPremiumAccess, setHasPremiumAccess] = useState(
    () => !initialAccountTransitioning
      && (FORCE_PREMIUM || snapshotPremiumActive() || snapshotVipActive()),
  );
  const [accessResolved, setAccessResolved] = useState(false);
  const accessResolvedRef = useRef(accessResolved);
  accessResolvedRef.current = accessResolved;
  const [isIntroFullAccess, setIsIntroFullAccess] = useState(false);
  const [introFullAccessEndsAt, setIntroFullAccessEndsAt] = useState<number | null>(null);
  const [trialEligible, setTrialEligible] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const appStateRef = useRef(AppState.currentState);
  const vipSnapshotStateRef = useRef<boolean | null>(null);
  const accountGenerationRef = useRef(initialAccountTokenRef.current.generation);
  const accountStableIdRef = useRef(initialAccountTokenRef.current.stableId);
  const accountPhaseRef = useRef(initialAccountTokenRef.current.phase);
  const accountTransitionRef = useRef(initialAccountTransitioning);
  const accountRefreshPendingRef = useRef(initialAccountTransitioning);
  // H-VIPCHURN: зеркало isPremium в ref, чтобы onSnapshot-эффект мог читать актуальное
  // значение БЕЗ isPremium в своём dep-массиве. Иначе эффект пересоздавал Firestore-
  // подписку (отписка+переподписка) на каждый переход premium/VIP.
  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;
  const isVipRef = useRef(isVip);
  isVipRef.current = isVip;
  const reloadSequencePromiseRef = useRef<Promise<boolean> | null>(null);
  const reloadSequenceGenerationRef = useRef<number | null>(null);
  const reloadInFlightPromiseRef = useRef<Promise<boolean> | null>(null);
  const reloadRetryWaitRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    finish: (completed: boolean) => void;
  } | null>(null);
  const cloudRefreshRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const [premiumListenerRevision, setPremiumListenerRevision] = useState(0);

  const cancelReloadRetryWait = useCallback(() => {
    const pending = reloadRetryWaitRef.current;
    if (!pending) return;
    reloadRetryWaitRef.current = null;
    clearTimeout(pending.timer);
    pending.finish(false);
  }, []);

  const waitForReloadRetry = useCallback((delayMs: number) => new Promise<boolean>((resolve) => {
    cancelReloadRetryWait();
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      if (reloadRetryWaitRef.current?.finish === finish) reloadRetryWaitRef.current = null;
      resolve(completed);
    };
    const timer = setTimeout(() => finish(true), delayMs);
    reloadRetryWaitRef.current = { timer, finish };
  }), [cancelReloadRetryWait]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelReloadRetryWait();
    };
  }, [cancelReloadRetryWait]);

  const reloadTrialEligible = useCallback(async () => {
    const generation = accountGenerationRef.current;
    if (
      !mountedRef.current
      || appStateRef.current !== 'active'
      || accountTransitionRef.current
      || accountRefreshPendingRef.current
    ) return;
    const v = await computeTrialEligible();
    if (
      !mountedRef.current
      || appStateRef.current !== 'active'
      || accountTransitionRef.current
      || accountRefreshPendingRef.current
      || accountGenerationRef.current !== generation
    ) return;
    setTrialEligible(prev => (prev === v ? prev : v));
  }, []);

  const runReload = useCallback(async () => {
    const generation = accountGenerationRef.current;
    const canCommit = () => (
      mountedRef.current
      && appStateRef.current === 'active'
      && !accountTransitionRef.current
      && !accountRefreshPendingRef.current
      && accountGenerationRef.current === generation
    );
    if (!canCommit()) return;
    // FORCE_PREMIUM раздаёт Premium в dev, НО тестерский «Снять премиум»
    // (tester_no_premium) должен побеждать — иначе не проверить не-премиум UI.
    if (await forcePremiumActive()) {
      if (!canCommit()) return;
      isPremiumRef.current = true;
      isVipRef.current = false;
      setIsPremium(true);
      setIsVip(false);
      setHasPremiumAccess(true);
      setIsIntroFullAccess(false);
      setIntroFullAccessEndsAt(null);
      // Активный премиум — копия про триал нерелевантна
      setTrialEligible(false);
      return;
    }
    let [realPremium, vip] = await Promise.all([
      getVerifiedRealPremiumStatus(),
      getVerifiedVipStatus(),
    ]);
    if (!canCommit()) return;
    if (!realPremium && !vip) {
      const accessAfterCloud = await getVerifiedPremiumAccessStatus().catch(() => false);
      if (!canCommit()) return;
      if (accessAfterCloud) {
        [realPremium, vip] = await Promise.all([
          getVerifiedRealPremiumStatus().catch(() => false),
          getVerifiedVipStatus().catch(() => false),
        ]);
        if (!canCommit()) return;
      }
    }
    // Тестер «Снять премиум» гасит и intro-доступ (3 дня) — иначе он
    // переживал бы снятие и hasPremiumAccess оставался true.
    const noPremiumTester =
      (await AsyncStorage.getItem('tester_no_premium').catch(() => null)) === 'true';
    const introState = noPremiumTester
      ? { active: false, endsAt: null }
      : await getIntroFullAccessState();
    // Подарок лояльности (72ч для существующих free-юзеров) — производный доступ,
    // как и intro; так же гасится тестерским «Снять премиум».
    const loyaltyState = noPremiumTester
      ? { active: false }
      : await getLoyaltyGiftState().catch(() => ({ active: false }));
    if (!canCommit()) return;
    isPremiumRef.current = realPremium;
    isVipRef.current = vip;
    setIsPremium(realPremium);
    setIsVip(vip);
    setIsIntroFullAccess(introState.active);
    setIntroFullAccessEndsAt(introState.endsAt);
    setHasPremiumAccess(realPremium || vip || introState.active || loyaltyState.active);
    if (realPremium) {
      setTrialEligible(false);
    } else {
      void reloadTrialEligible();
    }
  }, [reloadTrialEligible]);
  const reloadForCurrentAccount = useCallback(async (): Promise<boolean> => {
    const generation = accountGenerationRef.current;
    const stableId = accountStableIdRef.current;
    const canContinue = () => (
      mountedRef.current
      && appStateRef.current === 'active'
      && !accountTransitionRef.current
      && !accountRefreshPendingRef.current
      && accountGenerationRef.current === generation
      && accountStableIdRef.current === stableId
    );
    if (!canContinue()) return false;

    const existing = reloadSequencePromiseRef.current;
    if (existing) {
      if (reloadSequenceGenerationRef.current === generation) return existing;
      await existing;
      if (!canContinue()) return false;
      const replacement = reloadSequencePromiseRef.current;
      if (replacement) return replacement;
    }

    // A storage/runtime failure is not proof of Free access. Keep the gate
    // unresolved and retry with a bounded exponential delay.
    const sequence = runBoundedPremiumRetrySequence({
      attempt: () => withAccountTransitionLock(async () => {
        if (!canContinue()) return;
        await runReload();
      }),
      shouldContinue: canContinue,
      wait: waitForReloadRetry,
      maxAttempts: PREMIUM_RELOAD_MAX_ATTEMPTS,
      baseDelayMs: PREMIUM_RELOAD_RETRY_BASE_MS,
      maxDelayMs: PREMIUM_RELOAD_RETRY_MAX_MS,
    }).then((completed) => {
      if (completed && canContinue()) {
        // A false entitlement is actionable only after the local/cloud-backed
        // checks completed successfully for this exact account generation.
        accessResolvedRef.current = true;
        setAccessResolved(true);
        return true;
      }
      return false;
    });
    reloadSequencePromiseRef.current = sequence;
    reloadSequenceGenerationRef.current = generation;
    reloadInFlightPromiseRef.current = sequence;
    try {
      return await sequence;
    } finally {
      if (reloadSequencePromiseRef.current === sequence) {
        reloadSequencePromiseRef.current = null;
        reloadSequenceGenerationRef.current = null;
      }
      if (reloadInFlightPromiseRef.current === sequence) reloadInFlightPromiseRef.current = null;
    }
  }, [runReload, waitForReloadRetry]);

  const reload = useCallback(async () => {
    await reloadForCurrentAccount();
  }, [reloadForCurrentAccount]);

  const runReloadAfterCloudRefresh = useCallback(async () => {
    const generation = accountGenerationRef.current;
    const completingAccountTransition = accountRefreshPendingRef.current;
    const olderReload = reloadInFlightPromiseRef.current;
    if (olderReload) await olderReload.catch(() => {});
    if (
      accountTransitionRef.current
      || accountGenerationRef.current !== generation
    ) return;
    if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
      accountRefreshPendingRef.current = false;
      if (completingAccountTransition) setPremiumListenerRevision((v) => v + 1);
      await reload();
      return;
    }
    try {
      await restoreFromCloud();
    } catch {
      /* premium state can still fall back to local/RevenueCat */
    }
    if (
      accountTransitionRef.current
      || accountGenerationRef.current !== generation
    ) return;
    invalidatePremiumCache();
    accountRefreshPendingRef.current = false;
    if (completingAccountTransition) setPremiumListenerRevision((v) => v + 1);
    await reload();
  }, [reload]);
  const reloadAfterCloudRefresh = useCallback(async () => {
    cloudRefreshRunnerRef.current ??= createCoalescedAsyncRunner(runReloadAfterCloudRefresh);
    await cloudRefreshRunnerRef.current();
  }, [runReloadAfterCloudRefresh]);

  // Account switches are synchronous privacy boundaries. Clear the previous
  // account before any new screen can consume its in-memory Plus/VIP state,
  // then restore the new account only after older entitlement work has drained.
  useEffect(() => {
    const handleAccountGeneration = (token: ReturnType<typeof captureAccountGeneration>) => {
      const previousGeneration = accountGenerationRef.current;
      const previousStableId = accountStableIdRef.current;
      const previousPhase = accountPhaseRef.current;
      const wasRefreshingAccount = accountRefreshPendingRef.current;
      const stableIdChanged = previousStableId != null
        && token.stableId != null
        && previousStableId !== token.stableId;

      if (token.generation !== previousGeneration) cancelReloadRetryWait();

      accountGenerationRef.current = token.generation;
      accountStableIdRef.current = token.stableId;
      accountPhaseRef.current = token.phase;

      if (token.phase === 'transitioning') {
        accountTransitionRef.current = true;
        accountRefreshPendingRef.current = true;
        invalidatePremiumCache();
        vipSnapshotStateRef.current = null;
        isPremiumRef.current = false;
        isVipRef.current = false;
        setIsPremium(false);
        setIsVip(false);
        setHasPremiumAccess(false);
        accessResolvedRef.current = false;
        setAccessResolved(false);
        setIsIntroFullAccess(false);
        setIntroFullAccessEndsAt(null);
        setTrialEligible(false);
        setPremiumListenerRevision((v) => v + 1);
        return;
      }

      accountTransitionRef.current = false;
      const becameActive = token.phase === 'active' && previousPhase !== 'active';
      if (token.phase !== 'active' || (!wasRefreshingAccount && !stableIdChanged && !becameActive)) return;

      if (previousPhase === 'uninitialized' && !wasRefreshingAccount && !stableIdChanged) {
        // Boot activation is not an account switch: keep the synchronously
        // hydrated snapshot visible, but restart any check captured before the
        // stable identity existed.
        accountRefreshPendingRef.current = true;
        accessResolvedRef.current = false;
        setAccessResolved(false);
        void reloadAfterCloudRefresh();
        return;
      }

      // A direct active→active stable-id change is treated exactly like an
      // explicit transition, even if a legacy caller forgot to invalidate first.
      accountRefreshPendingRef.current = true;
      invalidatePremiumCache();
      vipSnapshotStateRef.current = null;
      isPremiumRef.current = false;
      isVipRef.current = false;
      setIsPremium(false);
      setIsVip(false);
      setHasPremiumAccess(false);
      accessResolvedRef.current = false;
      setAccessResolved(false);
      setIsIntroFullAccess(false);
      setIntroFullAccessEndsAt(null);
      setTrialEligible(false);
      void reloadAfterCloudRefresh();
    };

    const sub = subscribeAccountGeneration(handleAccountGeneration);
    handleAccountGeneration(captureAccountGeneration());
    return () => sub.remove();
  }, [cancelReloadRetryWait, reloadAfterCloudRefresh]);

  // Login/merge can swap the canonical stable_id; restart the admin-grant listener on the new users/{stable_id}.
  useEffect(() => {
    const sub = onAppEvent('auth_provider_linked', () => {
      cancelReloadRetryWait();
      accountRefreshPendingRef.current = true;
      accessResolvedRef.current = false;
      setAccessResolved(false);
      vipSnapshotStateRef.current = null;
      setPremiumListenerRevision((v) => v + 1);
      void reloadAfterCloudRefresh();
    });
    return () => sub.remove();
  }, [cancelReloadRetryWait, reloadAfterCloudRefresh]);

  // Load on mount. При активном dev-FORCE_PREMIUM подтягиваем premium_active,
  // но НЕ затираем tester_no_premium — иначе кнопка «Снять премиум» в dev
  // бесполезна (флаг сбрасывался на каждом маунте). forcePremiumActive()
  // сам уважает tester_no_premium, поэтому при снятом премиуме ничего не пишем.
  useEffect(() => {
    void (async () => {
      const bootToken = captureAccountGeneration();
      if (await forcePremiumActive()) {
        await withAccountTransitionLock(async () => {
          if (
            !mountedRef.current
            || accountTransitionRef.current
            || accountGenerationRef.current !== bootToken.generation
            || accountStableIdRef.current !== bootToken.stableId
          ) return;
          await AsyncStorage.setItem('premium_active', 'true').catch(() => {});
        });
      }
      await reload();
    })();
  }, [reload]);

  // The shared network coordinator emits only status changes. While access is
  // unresolved, an online signal gets one coalesced retry; resolved accounts do
  // not keep a subscriber or create an extra connectivity probe here.
  useEffect(() => {
    if (accessResolved) return;
    const unsubscribe = subscribeNetStatus((online) => {
      if (!shouldRetryUnresolvedPremiumOnNetworkSignal({
        online,
        accessResolved: accessResolvedRef.current,
        mounted: mountedRef.current,
        appActive: appStateRef.current === 'active',
        accountActive: accountPhaseRef.current === 'active',
        transitioning: accountTransitionRef.current,
        refreshPending: accountRefreshPendingRef.current,
      })) return;
      invalidatePremiumCache();
      void reload();
    });
    return unsubscribe;
  }, [accessResolved, reload]);

  // Live VIP grants/revokes from admin/index.html write users/{uid}.progress.
  // Without this, a user who keeps the app open can stay locked until a later cloud restore.
  useEffect(() => {
    if (FORCE_PREMIUM || !CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
    if (accountTransitionRef.current || accountRefreshPendingRef.current) return;

    let cancelled = false;
    const listenerGeneration = accountGenerationRef.current;
    const listenerAccountStableId = accountStableIdRef.current;
    const listenerIsCurrent = () => (
      !cancelled
      && mountedRef.current
      && appStateRef.current === 'active'
      && !accountTransitionRef.current
      && !accountRefreshPendingRef.current
      && accountGenerationRef.current === listenerGeneration
      && accountStableIdRef.current === listenerAccountStableId
    );
    let unsubscribe: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let listenerRetryAttempt = 0;
    let startInFlight: Promise<void> | null = null;
    let requestStart: () => Promise<void>;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleRetry = () => {
      if (
        !listenerIsCurrent()
        || retryTimer
        || listenerRetryAttempt >= PREMIUM_LISTENER_MAX_RETRY_ATTEMPTS
      ) return;
      const delayMs = premiumRetryDelayMs(
        listenerRetryAttempt,
        PREMIUM_LISTENER_RETRY_BASE_MS,
        PREMIUM_LISTENER_RETRY_MAX_MS,
      );
      listenerRetryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void requestStart();
      }, delayMs);
    };

    const start = async () => {
      clearRetry();
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      const db = getFirestoreForPremiumListener() as {
        collection?: (name: string) => {
          doc: (id: string) => {
            onSnapshot: (
              onNext: (snap: { exists?: boolean; data?: () => Record<string, unknown> | undefined }) => void,
              onError?: () => void,
            ) => () => void;
          };
        };
      } | null;
      if (!db?.collection) return;
      try {
        const uid = await ensureAnonUser();
        if (!listenerIsCurrent()) return;
        if (!uid) {
          scheduleRetry();
          return;
        }
        const linked = await ensureStableAuthLinkForStableIdDetailed(uid).catch(() => null);
        if (!listenerIsCurrent()) return;
        const linkAction = getPremiumListenerLinkAction(linked, listenerRetryAttempt);
        if (linkAction === 'stop') return;
        if (linkAction === 'retry' || !linked?.stableUid) {
          scheduleRetry();
          return;
        }
        const listenerStableUid = linked.stableUid;

        unsubscribe = db.collection('users').doc(listenerStableUid).onSnapshot(
          (snap) => {
            if (!listenerIsCurrent()) return;
            listenerRetryAttempt = 0;
            if (!snap.exists) return;
            const data = snap.data ? snap.data() : undefined;
            const progress = (data?.progress ?? {}) as Record<string, unknown>;
            const vipState = getVipProgressState(progress);
            if (!vipState) return;

            void (async () => {
              if (!listenerIsCurrent()) return;
              const pairs: [string, string][] = [
                ['vip_active', vipState.active ? 'true' : 'false'],
                ['vip_plan', vipState.active ? vipState.plan : ''],
                ['vip_from', vipState.active ? vipState.fromValue : '0'],
                ['vip_until', vipState.active ? vipState.untilValue : '0'],
                ['vip_admin_override', vipState.active ? 'true' : 'false'],
              ];
              if (vipState.grantAt) pairs.push(['vip_admin_grant_at', vipState.grantAt]);
              const persistedForCurrentAccount = await withAccountTransitionLock(async () => {
                if (!listenerIsCurrent()) return false;
                await AsyncStorage.multiSet(pairs).catch(() => {});
                if (vipState.active) {
                  await processVipGrantForCelebration(vipState.grantAt).catch(() => {});
                }
                return listenerIsCurrent();
              });
              if (!persistedForCurrentAccount) return;
              if (!listenerIsCurrent()) return;
              invalidatePremiumCache();

              const previous = vipSnapshotStateRef.current;
              vipSnapshotStateRef.current = vipState.active;
              if (previous === vipState.active) return;

              if (vipState.active) {
                isVipRef.current = true;
                setIsVip(true);
                setHasPremiumAccess(true);
                emitAppEvent('vip_activated');
                emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
                void withAccountTransitionLock(async () => {
                  if (!listenerIsCurrent()) return;
                  await syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true }).catch(() => {});
                }).catch(() => {});
              } else {
                const premiumNow = isPremiumRef.current;
                isVipRef.current = false;
                setIsVip(false);
                setHasPremiumAccess(premiumNow);
                void reloadTrialEligible();
                emitAppEvent('vip_deactivated');
                emitAppEvent('premium_access_changed', { active: premiumNow, source: premiumNow ? 'premium' : 'none' });
                void withAccountTransitionLock(async () => {
                  if (!listenerIsCurrent()) return;
                  await syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium: premiumNow }).catch(() => {});
                }).catch(() => {});
              }
            })();
          },
          () => {
            if (!listenerIsCurrent()) return;
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

    requestStart = () => {
      if (startInFlight) return startInFlight;
      startInFlight = (async () => {
        try {
          await start();
        } finally {
          startInFlight = null;
        }
      })();
      return startInFlight;
    };

    void requestStart();
    return () => {
      cancelled = true;
      clearRetry();
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
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = state;
      if (state === 'active') {
        if (!wasActive) setPremiumListenerRevision((v) => v + 1);
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
      } else {
        cancelReloadRetryWait();
        if (wasActive) setPremiumListenerRevision((v) => v + 1);
        if (state === 'background') backgroundedAtRef.current = Date.now();
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
  }, [cancelReloadRetryWait, reload, reloadAfterCloudRefresh]);

  // Premium/VIP events intentionally carry no account id. Treat them as hints:
  // only a verified reload for the currently active account may change access.
  const refreshEntitlementsFromUnscopedEvent = useCallback((afterVerifiedRefresh?: () => void) => {
    const eventToken = captureAccountGeneration();
    const eventIsCurrent = () => (
      mountedRef.current
      && appStateRef.current === 'active'
      && !accountTransitionRef.current
      && !accountRefreshPendingRef.current
      && accountGenerationRef.current === eventToken.generation
      && accountStableIdRef.current === eventToken.stableId
      && isCurrentAccountGeneration(eventToken, eventToken.stableId)
    );
    if (!eventIsCurrent()) return;

    // Entitlement events are account-unscoped hints. Keep paid gates unresolved
    // while any older check drains, then force one fresh check for this account.
    // Otherwise a pre-event in-flight reload can commit stale Free state and be
    // incorrectly reused by reloadForCurrentAccount().
    accessResolvedRef.current = false;
    setAccessResolved(false);
    cancelReloadRetryWait();
    void (async () => {
      const olderReload = reloadInFlightPromiseRef.current;
      if (olderReload) await olderReload.catch(() => false);
      if (!eventIsCurrent()) return;
      invalidatePremiumCache();
      const completed = await reloadForCurrentAccount();
      if (!completed || !eventIsCurrent()) return;
      afterVerifiedRefresh?.();

      const premiumNow = isPremiumRef.current;
      const vipNow = isVipRef.current;
      emitAppEvent('premium_access_changed', {
        active: premiumNow || vipNow,
        source: premiumNow ? 'premium' : vipNow ? 'vip' : 'none',
      });
      await withAccountTransitionLock(async () => {
        if (!eventIsCurrent()) return;
        await syncPublicProfileSnapshot({
          reason: 'entitlement_change',
          isPremium: premiumNow,
          isVip: vipNow,
        }).catch(() => {});
      });
    })().catch(() => {});
  }, [cancelReloadRetryWait, reloadForCurrentAccount]);

  // Purchase events trigger an immediate verified read for the active account.
  useEffect(() => {
    const sub = onAppEvent('premium_activated', () => {
      refreshEntitlementsFromUnscopedEvent(() => {
        void import('../app/lesson_lock_system')
          .then(m => m.getPremiumCourseLevel())
          .catch(() => {});
      });
    });
    return () => sub.remove();
  }, [refreshEntitlementsFromUnscopedEvent]);

  // VIP events are also unscoped, so they use the same verified account read.
  useEffect(() => {
    const onActivated = onAppEvent('vip_activated', () => {
      refreshEntitlementsFromUnscopedEvent();
    });
    const onDeactivated = onAppEvent('vip_deactivated', () => {
      refreshEntitlementsFromUnscopedEvent();
    });
    return () => {
      onActivated.remove();
      onDeactivated.remove();
    };
  }, [refreshEntitlementsFromUnscopedEvent]);

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
      cancelReloadRetryWait();
      invalidatePremiumCache();
      vipSnapshotStateRef.current = false;
      isPremiumRef.current = false;
      isVipRef.current = false;
      setIsPremium(false);
      setIsVip(false);
      setHasPremiumAccess(false);
      accessResolvedRef.current = true;
      setAccessResolved(true);
      setIsIntroFullAccess(false);
      setIntroFullAccessEndsAt(null);
      setTrialEligible(false);
      setPremiumListenerRevision((v) => v + 1);
      emitAppEvent('premium_access_changed', { active: false, source: 'none' });
    });
    return () => sub.remove();
  }, [cancelReloadRetryWait]);

  // Подарок лояльности активирован/откатан — мгновенно пересчитываем доступ.
  useEffect(() => {
    const sub = onAppEvent('loyalty_gift_changed', () => {
      invalidatePremiumCache();
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  // Cancellation/expiry is verified for the active account before state changes.
  useEffect(() => {
    const sub = onAppEvent('premium_deactivated', () => {
      refreshEntitlementsFromUnscopedEvent(() => {
        void import('../app/lesson_lock_system')
          .then(m => m.recomputeEarnedUnlocks())
          .catch(() => {});
      });
    });
    return () => sub.remove();
  }, [refreshEntitlementsFromUnscopedEvent]);

  // H-VIPCHURN: мемоизируем value, иначе любой ре-рендер провайдера слал новую ссылку
  // во все usePremium()-потребители по всему приложению (home, arena, inbox, friends…),
  // умножая работу на каждом тике premium/VIP.
  const contextValue = useMemo<PremiumContextValue>(
    () => ({ isPremium, isVip, hasPremiumAccess, accessResolved, isIntroFullAccess, introFullAccessEndsAt, trialEligible, reload }),
    [isPremium, isVip, hasPremiumAccess, accessResolved, isIntroFullAccess, introFullAccessEndsAt, trialEligible, reload],
  );

  return (
    <PremiumContext.Provider value={contextValue}>
      {children}
    </PremiumContext.Provider>
  );
}
