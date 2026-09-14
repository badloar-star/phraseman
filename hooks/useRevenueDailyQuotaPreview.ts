import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { usePremium } from '../components/PremiumContext';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { onAppEvent } from '../app/events';
import {
  getPhoneStatePracticeBridgeRevision,
  subscribePhoneStatePracticeBridgeRevision,
} from '../app/phone_state_practice_bridge';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';
import {
  previewRevenueDailyQuota,
  type RevenueDailyQuotaKind,
  type RevenueDailyQuotaResult,
} from '../app/revenue_daily_quota';

/**
 * Read-only превью дневной квоты (голосовая практика, матчи Арены). Списание —
 * `consumeRevenueDailyQuota` в момент действия. Обновляется по событиям, без
 * поллинга: смена аккаунта, ревизия PhoneState, возврат приложения в активное
 * состояние, покупка дневного пропуска, и один таймер на границу окна.
 *
 * зачем (2026-09-13): кнопка «Устно» обязана реагировать мгновенно — решение
 * «пускать / пейвол» берётся из этого превью в кадре тапа, чек пишется фоном.
 */
export function useRevenueDailyQuotaPreview(kind: RevenueDailyQuotaKind): RevenueDailyQuotaResult {
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [token, setToken] = useState<AccountGenerationToken>(captureAccountGeneration);
  const [bridgeRevision, setBridgeRevision] = useState(getPhoneStatePracticeBridgeRevision);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [result, setResult] = useState<RevenueDailyQuotaResult>(() => Object.freeze({
    status: 'waiting', used: 0, limit: REVENUE_DAILY_LIMITS[kind], extra: 0, resetAt: null, period: null, bypass: null,
  }));

  useEffect(() => subscribeAccountGeneration(setToken).remove, []);
  useEffect(() => subscribePhoneStatePracticeBridgeRevision(setBridgeRevision).remove, []);
  const refresh = useCallback(() => setRefreshRevision((current) => current + 1), []);
  /**
   * зачем (владелец 2026-09-14, Арена): раньше здесь был только слушатель
   * AppState — этого хватало кнопке, которая живёт на ОДНОМ экране (микрофон).
   * Арена уходит в матч и возвращается на хаб, не сворачивая приложение:
   * запись чека ревизию моста не двигает, поэтому без перечитывания по фокусу
   * точка осталась бы гореть после сыгранного матча и врала бы человеку.
   * Паттерн взят у карточного превью, где та же проблема уже решена.
   */
  useFocusEffect(useCallback(() => {
    refresh();
    const appState = AppState.addEventListener('change', (next) => { if (next === 'active') refresh(); });
    const pass = onAppEvent('revenue_quota_pass_granted', refresh);
    return () => { appState.remove(); pass.remove(); };
  }, [refresh]));

  useEffect(() => {
    let cancelled = false;
    void previewRevenueDailyQuota({ kind, token, accessResolved, hasPremiumAccess })
      .then((next) => { if (!cancelled) setResult(next); })
      .catch((error: unknown) => {
        console.warn('[DAILY-QUOTA] hook:catch → unavailable', error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        if (!cancelled) setResult({ status: 'unavailable', used: 0, limit: REVENUE_DAILY_LIMITS[kind], extra: 0, resetAt: null, period: null, bypass: null });
      });
    return () => { cancelled = true; };
  }, [accessResolved, bridgeRevision, hasPremiumAccess, kind, refreshRevision, token]);

  useEffect(() => {
    if (result.resetAt === null || !Number.isFinite(result.resetAt) || result.resetAt <= Date.now()) return undefined;
    const timeout = setTimeout(refresh, result.resetAt - Date.now());
    return () => clearTimeout(timeout);
  }, [refresh, result.resetAt]);

  return result;
}
