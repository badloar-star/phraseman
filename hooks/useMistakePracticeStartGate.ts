import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { usePremium } from '../components/PremiumContext';
import { trackEvent } from '../app/analytics';
import { captureAccountGeneration } from '../app/account_generation';
import type { PaywallSource } from '../app/paywall_entry_contract';
import { consumeRevenueDailyQuota, type RevenueDailyQuotaResult } from '../app/revenue_daily_quota';
import { useRevenueDailyQuotaPreview } from './useRevenueDailyQuotaPreview';

export type MistakePracticeStartGate = Readonly<{
  /** Превью квоты для подписи на кнопке хаба. */
  quota: RevenueDailyQuotaResult;
  /** true — сегодняшняя сессия уже пройдена, тап уведёт на пейвол. */
  locked: boolean;
  /**
   * Вызывать в кадре тапа «Разобрать». true — сессию можно открывать СЕЙЧАС
   * (чек списывается фоном), false — уже увели на пейвол.
   */
  tryStartSession: () => boolean;
}>;

/**
 * Дневной лимит «Работы над ошибками»: 1 сессия в сутки у обычного аккаунта.
 *
 * зачем (владелец 2026-09-14): раздел перестал быть «только Plus». Тот же
 * рисунок, что у голоса и Арены (useSpeakingAttemptGate): решение из локального
 * превью в кадре тапа, экран открывается сразу, чек пишется фоном под замком
 * аккаунта. `waiting`/`unavailable` пускают: у сессии нет серверной цены,
 * честнее пустить, чем показать ложный замок. Возобновление сохранённой сессии
 * через гейт не проходит - оно не новая сессия.
 */
export function useMistakePracticeStartGate(source: PaywallSource): MistakePracticeStartGate {
  const router = useRouter();
  const { accessResolved } = usePremium();
  const quota = useRevenueDailyQuotaPreview('mistake_practice_starts');
  const inFlightRef = useRef(false);
  const locked = quota.status === 'exhausted';

  const openPaywall = useCallback(() => {
    void trackEvent('paywall_shown', { context: 'mistake_practice', source });
    router.push({ pathname: '/premium_modal', params: { context: 'mistake_practice', source } } as never);
  }, [router, source]);

  const tryStartSession = useCallback((): boolean => {
    console.log('[MISTAKES-GATE] tap', JSON.stringify({
      surface: source, status: quota.status, used: quota.used, limit: quota.limit, bypass: quota.bypass,
    }));
    if (quota.status === 'exhausted') {
      openPaywall();
      return false;
    }
    if (quota.limit === null) return true; // Plus / «Фри» — чек не нужен.
    if (quota.status === 'stale_account') return true; // смена аккаунта: не блокируем, чек не пишем.
    if (inFlightRef.current) return true; // двойной тап: одна сессия, один чек.
    inFlightRef.current = true;
    const receiptId = `mistakes:${Crypto.randomUUID()}`;
    void consumeRevenueDailyQuota({
      kind: 'mistake_practice_starts',
      token: captureAccountGeneration(),
      accessResolved,
      receiptId,
      surface: source,
    })
      .then((result) => {
        console.log('[MISTAKES-GATE] consume:out', JSON.stringify({ receiptId, status: result.status, used: result.used, limit: result.limit, bypass: result.bypass }));
      })
      .catch((error: unknown) => {
        console.warn('[MISTAKES-GATE] consume:catch — чек не записан, сессия уже открыта', error instanceof Error ? error.message : String(error));
      })
      .finally(() => { inFlightRef.current = false; });
    return true;
  }, [accessResolved, openPaywall, quota, source]);

  return { quota, locked, tryStartSession };
}
