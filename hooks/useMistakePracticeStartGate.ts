import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { usePremium } from '../components/PremiumContext';
import { useEnergy } from '../components/EnergyContext';
import { mistakePracticeSessionCostsEnergy } from '../modules/mistake-practice/session';
import { trackEvent } from '../app/analytics';
import { captureAccountGeneration } from '../app/account_generation';
import type { PaywallSource } from '../app/paywall_entry_contract';
import { consumeRevenueDailyQuota, type RevenueDailyQuotaResult } from '../app/revenue_daily_quota';
import { rememberMistakeQuotaReceipt } from '../app/mistake_practice_quota_receipt';
import { useRevenueDailyQuotaPreview } from './useRevenueDailyQuotaPreview';

export type MistakePracticeStartGate = Readonly<{
  /** Превью квоты для подписи на кнопке хаба. */
  quota: RevenueDailyQuotaResult;
  /** true — сегодняшняя сессия уже пройдена, тап уведёт на пейвол. */
  locked: boolean;
  /**
   * Вызывать в кадре тапа «Разобрать». true — сессию можно открывать СЕЙЧАС
   * (чек списывается фоном), false — уже увели на пейвол или показали «Нужна энергия».
   * sessionCount — сколько ошибок в будущей сессии (от 5 — платная, см. mistakePracticeSessionCostsEnergy).
   */
  tryStartSession: (sessionCount?: number) => boolean;
  /** true — энергии на платную сессию нет: экран показывает NoEnergyModal; суточная попытка НЕ потрачена. */
  noEnergy: boolean;
  dismissNoEnergy: () => void;
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
  const { predictStartRefusal } = useEnergy();
  const [noEnergy, setNoEnergy] = useState(false);
  const dismissNoEnergy = useCallback(() => setNoEnergy(false), []);
  const quota = useRevenueDailyQuotaPreview('mistake_practice_starts');
  const inFlightRef = useRef(false);
  const locked = quota.status === 'exhausted';

  const openPaywall = useCallback(() => {
    void trackEvent('paywall_shown', { context: 'mistake_practice', source });
    router.push({ pathname: '/premium_modal', params: { context: 'mistake_practice', source } } as never);
  }, [router, source]);

  const tryStartSession = useCallback((sessionCount?: number): boolean => {
    console.log('[MISTAKES-GATE] tap', JSON.stringify({
      surface: source, status: quota.status, used: quota.used, limit: quota.limit, bypass: quota.bypass, sessionCount: sessionCount ?? null,
    }));
    if (quota.status === 'exhausted') {
      openPaywall();
      return false;
    }
    // зачем (аудит R48, координатор 15.10): при 0 энергии попытка дня сгорала до проверки энергии, а тренировка открывалась
    // и молча закрывалась. Теперь энергию проверяем ДО траты попытки: не хватает — шторка «Нужна энергия», попытка цела.
    // Короткие наборы (1–4) энергию не берут — их не проверяем. 'unknown' (энергия ещё не прочитана) пускает: решит сам старт.
    const paid = sessionCount !== undefined && mistakePracticeSessionCostsEnergy(sessionCount);
    if (paid && predictStartRefusal('mistake_practice') === 'insufficient') {
      console.log('[MISTAKES-GATE] no_energy → шторка, попытка дня не тронута', JSON.stringify({ surface: source, sessionCount })); // guard-ok: ранний выход
      setNoEnergy(true);
      return false;
    }
    if (quota.limit === null) return true; // Plus / «Фри» — чек не нужен.
    if (quota.status === 'stale_account') return true; // смена аккаунта: не блокируем, чек не пишем.
    if (inFlightRef.current) return true; // двойной тап: одна сессия, один чек.
    inFlightRef.current = true;
    const receiptId = `mistakes:${Crypto.randomUUID()}`;
    const token = captureAccountGeneration();
    const consume = consumeRevenueDailyQuota({
      kind: 'mistake_practice_starts',
      token,
      accessResolved,
      receiptId,
      surface: source,
    });
    // зачем (хвост R48): тренировка вернёт попытку, если её старт так и не состоится (settleMistakeQuotaStart)
    rememberMistakeQuotaReceipt({ receiptId, token, consume, atMs: Date.now(), surface: source });
    void consume
      .then((result) => {
        console.log('[MISTAKES-GATE] consume:out', JSON.stringify({ receiptId, status: result.status, used: result.used, limit: result.limit, bypass: result.bypass }));
      })
      .catch((error: unknown) => {
        console.warn('[MISTAKES-GATE] consume:catch — чек не записан, сессия уже открыта', error instanceof Error ? error.message : String(error));
      })
      .finally(() => { inFlightRef.current = false; });
    return true;
  }, [accessResolved, openPaywall, predictStartRefusal, quota, source]);

  return { quota, locked, tryStartSession, noEnergy, dismissNoEnergy };
}
