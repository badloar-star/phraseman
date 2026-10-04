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
  MONTHLY_TRAINING_SESSION_LIMIT,
  previewMonthlyTrainingSessions,
  type MonthlyTrainingSessionQuotaResult,
} from '../app/monthly_training_sessions';

const WAITING: MonthlyTrainingSessionQuotaResult = Object.freeze({
  status: 'waiting', used: 0, limit: MONTHLY_TRAINING_SESSION_LIMIT, resetAt: null, period: null, bypass: null,
});

/** Read-only local monthly session projection for cards and speaking entry UI. */
export function useFlashcardTrainingQuotaPreview(): MonthlyTrainingSessionQuotaResult {
  const { hasPremiumAccess } = usePremium();
  const [token, setToken] = useState<AccountGenerationToken>(captureAccountGeneration);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [result, setResult] = useState<MonthlyTrainingSessionQuotaResult>(WAITING);

  useEffect(() => subscribeAccountGeneration(setToken).remove, []);
  // зачем (находка DQA 04.10, «28 из 30» до и после Блица): лог показывает, перечитал ли экран остаток и по какому поводу.
  const refresh = useCallback((reason: string) => {
    console.log('[BLITZ-LIMIT] screen:refresh', JSON.stringify({ reason })); // guard-ok: фокус экрана/возврат в приложение
    setRefreshRevision((current) => current + 1);
  }, []);
  useFocusEffect(useCallback(() => {
    refresh('focus');
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh('app_active');
    });
    return () => subscription.remove();
  }, [refresh]));
  useEffect(() => {
    let cancelled = false;
    setResult(WAITING);
    void previewMonthlyTrainingSessions({ token, hasPremiumAccess })
      .then((next) => {
        console.log('[BLITZ-LIMIT] screen:read', JSON.stringify({ status: next.status, used: next.used, limit: next.limit, bypass: next.bypass, applied: !cancelled })); // guard-ok: по строке на обновление экрана
        if (!cancelled) setResult(next);
      })
      .catch((error: unknown) => {
        console.warn('[FC-TRAIN-ENTRY] local monthly limit unavailable; allowing start',
          error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        if (!cancelled) setResult({ ...WAITING, status: 'allowed', bypass: 'local_storage' });
      });
    return () => { cancelled = true; };
  }, [hasPremiumAccess, refreshRevision, token]);
  useEffect(() => {
    if (!Number.isFinite(result.resetAt) || result.resetAt === null || result.resetAt <= Date.now()) {
      return undefined;
    }
    const timeout = setTimeout(() => refresh('month_reset'), result.resetAt - Date.now());
    return () => clearTimeout(timeout);
  }, [refresh, result.resetAt]);
  return result;
}
