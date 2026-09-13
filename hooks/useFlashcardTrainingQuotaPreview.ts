import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { usePremium } from '../components/PremiumContext';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import {
  previewFlashcardTrainingQuota,
  type RevenueQuotaAccessResult,
} from '../app/revenue_quota_access';
import {
  getPhoneStatePracticeBridgeRevision,
  subscribePhoneStatePracticeBridgeRevision,
} from '../app/phone_state_practice_bridge';

const WAITING: RevenueQuotaAccessResult = Object.freeze({
  status: 'waiting', used: 0, limit: 3, resetAt: null, period: null, bypass: null,
});

/** Read-only quota projection for hubs/setup. Authoritative starts use consume. */
export function useFlashcardTrainingQuotaPreview(): RevenueQuotaAccessResult {
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [token, setToken] = useState<AccountGenerationToken>(captureAccountGeneration);
  const [bridgeRevision, setBridgeRevision] = useState(getPhoneStatePracticeBridgeRevision);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [result, setResult] = useState<RevenueQuotaAccessResult>(WAITING);

  useEffect(() => subscribeAccountGeneration(setToken).remove, []);
  useEffect(() => subscribePhoneStatePracticeBridgeRevision(setBridgeRevision).remove, []);
  const refresh = useCallback(() => setRefreshRevision((current) => current + 1), []);
  useFocusEffect(useCallback(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]));
  useEffect(() => {
    let cancelled = false;
    setResult(WAITING);
    // зачем: catch был немым — любая ошибка превращалась в 'unavailable', а экран
    // по этому статусу молча не пускал в тренировку («нажимается, ничего не происходит»).
    void previewFlashcardTrainingQuota({ token, accessResolved, hasPremiumAccess })
      .then((next) => {
        console.log('[FC-TRAIN-ENTRY] hook:result', JSON.stringify({
          status: next.status, used: next.used, limit: next.limit, bypass: next.bypass,
          accessResolved, hasPremiumAccess, tokenPhase: token.phase, cancelled,
        }));
        if (!cancelled) setResult(next);
      })
      .catch((error: unknown) => {
        console.warn('[FC-TRAIN-ENTRY] hook:catch → unavailable',
          error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        if (!cancelled) setResult({ ...WAITING, status: 'unavailable' });
      });
    return () => { cancelled = true; };
  }, [accessResolved, bridgeRevision, hasPremiumAccess, refreshRevision, token]);
  useEffect(() => {
    if (!Number.isFinite(result.resetAt) || result.resetAt === null || result.resetAt <= Date.now()) {
      return undefined;
    }
    const timeout = setTimeout(refresh, result.resetAt - Date.now());
    return () => clearTimeout(timeout);
  }, [refresh, result.resetAt]);
  return result;
}
