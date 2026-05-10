import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import Purchases from 'react-native-purchases';
import { unlockLesson } from '../app/lesson_lock_system';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from '../app/premium_guard';
import { DEV_IAP_BYPASS, FORCE_PREMIUM, IS_EXPO_GO } from '../app/config';
import { onAppEvent } from '../app/events';
import { getTrialReofferBlockedByCooldown } from '../app/premium_trial_eligibility';
import { anyPackageHasTrialIntro } from '../app/premium_trial_signal';
import { resolvePremiumPackages } from '../app/revenuecat_init';

interface PremiumContextValue {
  isPremium: boolean;
  /**
   * `true`, если для пользователя реально доступна копия «Попробуй Premium бесплатно»:
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

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}

async function computeTrialEligible(): Promise<boolean> {
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

  const reloadTrialEligible = useCallback(async () => {
    const v = await computeTrialEligible();
    setTrialEligible(prev => (prev === v ? prev : v));
  }, []);

  const reload = useCallback(async () => {
    if (FORCE_PREMIUM) {
      setIsPremium(true);
      // Активный премиум — копия про триал нерелевантна
      setTrialEligible(false);
      void unlockLesson(19);
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

  // Reload when app comes to foreground — only invalidate cache if background > 5 min
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const backgroundDurationMs = backgroundedAtRef.current != null
          ? Date.now() - backgroundedAtRef.current
          : 0;
        backgroundedAtRef.current = null;
        if (backgroundDurationMs > 5 * 60 * 1000) {
          invalidatePremiumCache();
        }
        void reload();
      } else if (state === 'background') {
        backgroundedAtRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [reload]);

  // Instant update on purchase — set true immediately, reload only syncs cache
  useEffect(() => {
    const sub = onAppEvent('premium_activated', () => {
      setIsPremium(true);
      setTrialEligible(false);
      void unlockLesson(19);
      invalidatePremiumCache();
      // Sync cache in background — but don't let it override our true state
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
