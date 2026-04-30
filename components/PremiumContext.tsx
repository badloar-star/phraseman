import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from '../app/premium_guard';
import { FORCE_PREMIUM } from '../app/config';
import { onAppEvent } from '../app/events';

interface PremiumContextValue {
  isPremium: boolean;
  reload: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  reload: async () => {},
});

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(FORCE_PREMIUM);
  const backgroundedAtRef = React.useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (FORCE_PREMIUM) { setIsPremium(true); return; }
    const status = await getVerifiedPremiumStatus();
    setIsPremium(status);
  }, []);

  // Load on mount; if FORCE_PREMIUM — сбрасываем все флаги отмены премиума
  useEffect(() => {
    if (FORCE_PREMIUM) {
      AsyncStorage.multiSet([
        ['premium_active', 'true'],
        ['tester_no_premium', 'false'],
      ]).catch(() => {});
    }
    reload();
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
        reload();
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
      invalidatePremiumCache();
      // Sync cache in background — but don't let it override our true state
      // (RC sandbox can have propagation delay, grace period in premium_guard handles it)
      reload();
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
    <PremiumContext.Provider value={{ isPremium, reload }}>
      {children}
    </PremiumContext.Provider>
  );
}
