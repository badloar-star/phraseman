import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from '../app/premium_guard';

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
  const [isPremium, setIsPremium] = useState(false);
  const backgroundedAtRef = React.useRef<number | null>(null);

  const reload = useCallback(async () => {
    const status = await getVerifiedPremiumStatus();
    setIsPremium(status);
  }, []);

  // Load on mount
  useEffect(() => { reload(); }, [reload]);

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
    const sub = DeviceEventEmitter.addListener('premium_activated', () => {
      setIsPremium(true);
      invalidatePremiumCache();
      // Sync cache in background — but don't let it override our true state
      // (RC sandbox can have propagation delay, grace period in premium_guard handles it)
      reload();
    });
    return () => sub.remove();
  }, [reload]);

  // Instant update on cancellation/expiry
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('premium_deactivated', () => {
      setIsPremium(false);
      invalidatePremiumCache();
    });
    return () => sub.remove();
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, reload }}>
      {children}
    </PremiumContext.Provider>
  );
}
