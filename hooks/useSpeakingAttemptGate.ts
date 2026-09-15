import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { usePremium } from '../components/PremiumContext';
import { trackEvent } from '../app/analytics';
import { emitAppEvent } from '../app/events';
import { captureAccountGeneration } from '../app/account_generation';
import type { PaywallSource } from '../app/paywall_entry_contract';
import type { PremiumContext } from '../app/premium_context';
import { consumeRevenueDailyQuota, type RevenueDailyQuotaResult } from '../app/revenue_daily_quota';
import { useRevenueDailyQuotaPreview } from './useRevenueDailyQuotaPreview';

export type SpeakingAttemptGate = Readonly<{
  /** Превью квоты для подписей/бейджей. */
  quota: RevenueDailyQuotaResult;
  /** true — сегодняшний лимит исчерпан, тап уведёт на пейвол. */
  locked: boolean;
  /**
   * Вызывать в кадре тапа. Возвращает true, если попытку можно начать СЕЙЧАС
   * (чек списывается фоном), false — уже увели на пейвол.
   */
  tryStartAttempt: () => boolean;
}>;

/**
 * Единый гейт голосовой попытки для всех поверхностей вне карточной сессии:
 * «Устно» в уроках, hold-to-talk, голосовой ввод в диалоге.
 *
 * зачем (владелец, 2026-09-13): раньше `!useFeatureAccess('speaking')` = глухой
 * пейвол. Теперь обычный аккаунт получает N попыток в день (REVENUE_DAILY_LIMITS),
 * Plus и «Фри»-флаг Пульта — без лимита. Optimistic UI: решение берётся из
 * локального превью в кадре тапа, микрофон стартует сразу; списание чека идёт
 * фоном под замком аккаунта. `waiting`/`unavailable` НЕ открывают пейвол — у
 * голоса нет серверной цены, поэтому честнее пустить, чем показать ложный замок.
 * Гонка «превью allowed, consume exhausted» ограничена одной лишней попыткой:
 * начатую запись не обрываем, следующий тап увидит exhausted.
 */
export function useSpeakingAttemptGate(input: Readonly<{ context: PremiumContext; source: PaywallSource }>): SpeakingAttemptGate {
  const router = useRouter();
  const { accessResolved } = usePremium();
  const quota = useRevenueDailyQuotaPreview('speaking_attempts');
  const inFlightRef = useRef(false);
  const locked = quota.status === 'exhausted';

  const openPaywall = useCallback(() => {
    void trackEvent('paywall_shown', { context: input.context, source: input.source });
    router.push({ pathname: '/premium_modal', params: { context: input.context, source: input.source } } as never);
  }, [input.context, input.source, router]);

  const tryStartAttempt = useCallback((): boolean => {
    console.log('[SPEAK-GATE] tap', JSON.stringify({
      surface: input.source, status: quota.status, used: quota.used, limit: quota.limit, extra: quota.extra, bypass: quota.bypass,
    }));
    if (quota.status === 'exhausted') {
      openPaywall();
      return false;
    }
    if (quota.limit === null) return true; // Plus / «Фри» — чек не нужен.
    if (quota.status === 'stale_account') return true; // смена аккаунта: не блокируем UX, чек не пишем.
    if (inFlightRef.current) return true; // двойной тап: одна попытка, один чек.
    inFlightRef.current = true;
    const receiptId = `speak:${Crypto.randomUUID()}`;
    void consumeRevenueDailyQuota({
      kind: 'speaking_attempts',
      token: captureAccountGeneration(),
      accessResolved,
      receiptId,
      surface: input.source,
    })
      .then((result) => {
        console.log('[SPEAK-GATE] consume:out', JSON.stringify({ receiptId, status: result.status, used: result.used, limit: result.limit, bypass: result.bypass }));
        // зачем событие (владелец 2026-09-15, «3 попытки не уменьшаются вообще,
        // а потом просто показывает надо купить подписку»): превью читало квоту
        // по смене аккаунта, фокусу экрана и возврату приложения. В диалоге
        // человек НЕ уходит с экрана — счётчик стоял на «3 из 3» до самого
        // конца, а потом внезапно превращался в пейвол. Своё же списание
        // превью не видело. Теперь видит.
        emitAppEvent('revenue_quota_consumed', {
          kind: 'speaking_attempts',
          used: result.used,
          limit: result.limit,
        });
      })
      .catch((error: unknown) => {
        console.warn('[SPEAK-GATE] consume:catch — чек не записан, попытка уже идёт', error instanceof Error ? error.message : String(error));
      })
      .finally(() => { inFlightRef.current = false; });
    return true;
  }, [accessResolved, input.source, openPaywall, quota]);

  return { quota, locked, tryStartAttempt };
}
