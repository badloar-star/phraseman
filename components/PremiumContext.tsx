import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
import { ensureAnonUser, ensureStableAuthLinkForStableId, restoreFromCloud } from '../app/cloud_sync';
import { getIntroFullAccessState } from '../app/intro_full_access';

interface PremiumContextValue {
  isPremium: boolean;
  isVip: boolean;
  hasPremiumAccess: boolean;
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
  isIntroFullAccess: false,
  introFullAccessEndsAt: null,
  trialEligible: false,
  reload: async () => {},
});

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
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

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(FORCE_PREMIUM);
  const [isVip, setIsVip] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(FORCE_PREMIUM);
  const [isIntroFullAccess, setIsIntroFullAccess] = useState(false);
  const [introFullAccessEndsAt, setIntroFullAccessEndsAt] = useState<number | null>(null);
  const [trialEligible, setTrialEligible] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const vipSnapshotStateRef = useRef<boolean | null>(null);
  const reloadRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const cloudRefreshRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const [premiumListenerRevision, setPremiumListenerRevision] = useState(0);

  const reloadTrialEligible = useCallback(async () => {
    const v = await computeTrialEligible();
    setTrialEligible(prev => (prev === v ? prev : v));
  }, []);

  const runReload = useCallback(async () => {
    // FORCE_PREMIUM раздаёт Premium в dev, НО тестерский «Снять премиум»
    // (tester_no_premium) должен побеждать — иначе не проверить не-премиум UI.
    if (await forcePremiumActive()) {
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
    if (!realPremium && !vip) {
      const accessAfterCloud = await getVerifiedPremiumAccessStatus().catch(() => false);
      if (accessAfterCloud) {
        [realPremium, vip] = await Promise.all([
          getVerifiedRealPremiumStatus().catch(() => false),
          getVerifiedVipStatus().catch(() => false),
        ]);
      }
    }
    const introState = await getIntroFullAccessState();
    setIsPremium(realPremium);
    setIsVip(vip);
    setIsIntroFullAccess(introState.active);
    setIntroFullAccessEndsAt(introState.endsAt);
    setHasPremiumAccess(realPremium || vip || introState.active);
    if (realPremium) {
      setTrialEligible(false);
    } else {
      void reloadTrialEligible();
    }
  }, [reloadTrialEligible]);
  const reload = useCallback(async () => {
    reloadRunnerRef.current ??= createCoalescedAsyncRunner(runReload);
    await reloadRunnerRef.current();
  }, [runReload]);

  const runReloadAfterCloudRefresh = useCallback(async () => {
    if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
      await reload();
      return;
    }
    try {
      await restoreFromCloud();
    } catch {
      /* premium state can still fall back to local/RevenueCat */
    }
    invalidatePremiumCache();
    await reload();
  }, [reload]);
  const reloadAfterCloudRefresh = useCallback(async () => {
    cloudRefreshRunnerRef.current ??= createCoalescedAsyncRunner(runReloadAfterCloudRefresh);
    await cloudRefreshRunnerRef.current();
  }, [runReloadAfterCloudRefresh]);

  // Login/merge can swap the canonical stable_id; restart the admin-grant listener on the new users/{stable_id}.
  useEffect(() => {
    const sub = onAppEvent('auth_provider_linked', () => {
      vipSnapshotStateRef.current = null;
      setPremiumListenerRevision((v) => v + 1);
      void reloadAfterCloudRefresh();
    });
    return () => sub.remove();
  }, [reloadAfterCloudRefresh]);

  // Load on mount. При активном dev-FORCE_PREMIUM подтягиваем premium_active,
  // но НЕ затираем tester_no_premium — иначе кнопка «Снять премиум» в dev
  // бесполезна (флаг сбрасывался на каждом маунте). forcePremiumActive()
  // сам уважает tester_no_premium, поэтому при снятом премиуме ничего не пишем.
  useEffect(() => {
    void (async () => {
      if (await forcePremiumActive()) {
        await AsyncStorage.setItem('premium_active', 'true').catch(() => {});
      }
      await reload();
    })();
  }, [reload]);

  // Live VIP grants/revokes from admin/index.html write users/{uid}.progress.
  // Without this, a user who keeps the app open can stay locked until a later cloud restore.
  useEffect(() => {
    if (FORCE_PREMIUM || !CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleRetry = () => {
      if (cancelled || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void start();
      }, 2_500);
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
        if (cancelled || !uid) return;
        await ensureStableAuthLinkForStableId(uid).catch(() => false);

        unsubscribe = db.collection('users').doc(uid).onSnapshot(
          (snap) => {
            if (!snap.exists) return;
            const data = snap.data ? snap.data() : undefined;
            const progress = (data?.progress ?? {}) as Record<string, unknown>;
            const vipState = getVipProgressState(progress);
            if (!vipState) return;

            void (async () => {
              const pairs: [string, string][] = [
                ['vip_active', vipState.active ? 'true' : 'false'],
                ['vip_plan', vipState.active ? vipState.plan : ''],
                ['vip_from', vipState.active ? vipState.fromValue : '0'],
                ['vip_until', vipState.active ? vipState.untilValue : '0'],
                ['vip_admin_override', vipState.active ? 'true' : 'false'],
              ];
              if (vipState.grantAt) pairs.push(['vip_admin_grant_at', vipState.grantAt]);
              await AsyncStorage.multiSet(pairs).catch(() => {});
              if (vipState.active) {
                await processVipGrantForCelebration(vipState.grantAt).catch(() => {});
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
                void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true });
              } else {
                setIsVip(false);
                setHasPremiumAccess(isPremium);
                void reloadTrialEligible();
                emitAppEvent('vip_deactivated');
                emitAppEvent('premium_access_changed', { active: isPremium, source: isPremium ? 'premium' : 'none' });
                void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium });
              }
            })();
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
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };
  }, [isPremium, reloadTrialEligible, premiumListenerRevision]);

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
    const sub = onAppEvent('premium_activated', () => {
      setIsPremium(true);
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
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isPremium: true, isVip });
    });
    return () => sub.remove();
  }, [reload]);

  // VIP can be activated from the in-app admin panel before the Firestore
  // listener/reload loop has delivered the new local state.
  useEffect(() => {
    const onActivated = onAppEvent('vip_activated', () => {
      setIsVip(true);
      setHasPremiumAccess(true);
      setTrialEligible(false);
      invalidatePremiumCache();
      void reload();
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true });
    });
    const onDeactivated = onAppEvent('vip_deactivated', () => {
      setIsVip(false);
      setHasPremiumAccess(isPremium);
      invalidatePremiumCache();
      void reloadTrialEligible();
      void reload();
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium });
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

  // Instant update on cancellation/expiry / тестер «Снять премиум»
  useEffect(() => {
    const sub = onAppEvent('premium_deactivated', () => {
      setIsPremium(false);
      setHasPremiumAccess(isVip);
      invalidatePremiumCache();
      void import('../app/lesson_lock_system')
        .then(m => m.recomputeEarnedUnlocks())
        .catch(() => {});
      void reload();
      emitAppEvent('premium_access_changed', { active: isVip, source: isVip ? 'vip' : 'none' });
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isPremium: false, isVip });
    });
    return () => sub.remove();
  }, [isVip, reload]);

  return (
    <PremiumContext.Provider value={{ isPremium, isVip, hasPremiumAccess, isIntroFullAccess, introFullAccessEndsAt, trialEligible, reload }}>
      {children}
    </PremiumContext.Provider>
  );
}
