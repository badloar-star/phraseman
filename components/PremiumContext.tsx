import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager } from 'react-native';
import Purchases from 'react-native-purchases';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from '../app/premium_guard';
import { CLOUD_SYNC_ENABLED, DEV_IAP_BYPASS, FORCE_PREMIUM, IS_EXPO_GO, IS_STORE_RELEASE } from '../app/config';
import { onAppEvent } from '../app/events';
import { getTrialReofferBlockedByCooldown } from '../app/premium_trial_eligibility';
import { anyPackageHasTrialIntro } from '../app/premium_trial_signal';
import { resolvePremiumPackages } from '../app/revenuecat_init';

interface PremiumContextValue {
  isPremium: boolean;
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
  trialEligible: false,
  reload: async () => {},
});

const FOREGROUND_CLOUD_PREMIUM_REFRESH_MS = 30 * 1000;
const MIN_BACKGROUND_FOR_CLOUD_REFRESH_MS = 2 * 1000;

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
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
  const [trialEligible, setTrialEligible] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const lastForegroundCloudRefreshRef = useRef(0);

  const reloadTrialEligible = useCallback(async () => {
    const v = await computeTrialEligible();
    setTrialEligible(prev => (prev === v ? prev : v));
  }, []);

  const reload = useCallback(async () => {
    if (FORCE_PREMIUM) {
      setIsPremium(true);
      // Активный премиум — копия про триал нерелевантна
      setTrialEligible(false);
      return;
    }
    const status = await getVerifiedPremiumStatus();
    setIsPremium(status);
    if (status) {
      setTrialEligible(false);
    } else {
      void reloadTrialEligible();
    }
  }, [reloadTrialEligible]);

  const reloadAfterCloudRefresh = useCallback(async () => {
    if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
      await reload();
      return;
    }
    try {
      const { restoreFromCloud } = await import('../app/cloud_sync');
      await restoreFromCloud();
    } catch {
      /* premium state can still fall back to local/RevenueCat */
    }
    invalidatePremiumCache();
    await reload();
  }, [reload]);

  // Load on mount; if FORCE_PREMIUM — сбрасываем все флаги отмены премиума
  useEffect(() => {
    if (FORCE_PREMIUM) {
      AsyncStorage.multiSet([
        ['premium_active', 'true'],
        ['tester_no_premium', 'false'],
      ]).catch(() => {});
    }
    void reload();
  }, [reload]);

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
        if (backgroundDurationMs > 5 * 60 * 1000) {
          invalidatePremiumCache();
          lastForegroundCloudRefreshRef.current = Date.now();
          void reloadAfterCloudRefresh();
          return;
        }
        const shouldRefreshCloud =
          backgroundDurationMs >= MIN_BACKGROUND_FOR_CLOUD_REFRESH_MS &&
          Date.now() - lastForegroundCloudRefreshRef.current >= FOREGROUND_CLOUD_PREMIUM_REFRESH_MS;
        if (shouldRefreshCloud) {
          lastForegroundCloudRefreshRef.current = Date.now();
          void reloadAfterCloudRefresh();
          return;
        }
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTask?.cancel?.();
        resumeTimer = setTimeout(() => {
          resumeTimer = null;
          resumeTask = InteractionManager.runAfterInteractions(() => {
            void reload();
          });
        }, 650);
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
      setTrialEligible(false);
      invalidatePremiumCache();
      void import('../app/lesson_lock_system')
        .then(m => m.getPremiumCourseLevel())
        .catch(() => {});
      // Sync cache in background — but don\'t let it override our true state
      // (RC sandbox can have propagation delay, grace period in premium_guard handles it)
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  // Instant update on cancellation/expiry / тестер «Снять премиум»
  useEffect(() => {
    const sub = onAppEvent('premium_deactivated', () => {
      setIsPremium(false);
      invalidatePremiumCache();
      void import('../app/lesson_lock_system')
        .then(m => m.recomputeEarnedUnlocks())
        .catch(() => {});
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  return (
    <PremiumContext.Provider value={{ isPremium, trialEligible, reload }}>
      {children}
    </PremiumContext.Provider>
  );
}
