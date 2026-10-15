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
import { hapticWarning } from './use-haptics';

/** Дольше этого чек «пишется» только при зависшей сети — замок двойного тапа снимается, кнопка снова отвечает (Ревизор 2.81). */
export const MISTAKE_GATE_INFLIGHT_CEILING_MS = 8_000;

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
  /**
   * Параметр маршрута для тренировки, открываемой ЭТИМ тапом: { quotaReceipt } — id списанной попытки, по нему экран
   * вернёт её, если старт не состоится. Звать сразу после успешного tryStartSession; без списания — пустой объект.
   */
  takeQuotaReceiptParam: () => Readonly<{ quotaReceipt?: string }>;
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
  // зачем (Ревизор 2.81): замок «чек пишется» с временем и id чека — consume ждёт сеть без потолка (revenue_daily_quota.ts:349-389),
  // и без потолка кнопка молча не отвечала бы; поздний finally старого чека не снимает замок новой попытки
  const inFlightRef = useRef<{ receiptId: string; startedAtMs: number } | null>(null);
  // зачем (Ревизор 15.10): id чека этого тапа уходит в маршрут, а не в общий слот — у каждой тренировки свой возврат
  const lastReceiptRef = useRef<string | null>(null);
  const locked = quota.status === 'exhausted';
  const takeQuotaReceiptParam = useCallback((): Readonly<{ quotaReceipt?: string }> => {
    const receiptId = lastReceiptRef.current;
    lastReceiptRef.current = null;
    return receiptId ? { quotaReceipt: receiptId } : {};
  }, []);

  const openPaywall = useCallback(() => {
    void trackEvent('paywall_shown', { context: 'mistake_practice', source });
    router.push({ pathname: '/premium_modal', params: { context: 'mistake_practice', source } } as never);
  }, [router, source]);

  const tryStartSession = useCallback((sessionCount?: number): boolean => {
    lastReceiptRef.current = null; // чек прошлого тапа не должен уехать в маршрут бесплатного входа
    console.log('[MISTAKES-GATE] tap', JSON.stringify({
      surface: source, status: quota.status, used: quota.used, limit: quota.limit, bypass: quota.bypass, sessionCount: sessionCount ?? null,
    }));
    // зачем (координатор 15.10, Ревизор 2.76): одна строка решения на каждый тап — откуда вход, Plus ли, что с квотой и чем кончилось
    const decide = (decision: 'paywall' | 'no_energy' | 'start_unlimited' | 'start_stale_account' | 'blocked_double_tap' | 'start_with_receipt') => {
      console.log('[MISTAKES-GATE] decision', JSON.stringify({
        source, premium: quota.limit === null, quota: { status: quota.status, used: quota.used, limit: quota.limit }, sessionCount: sessionCount ?? null, decision,
      }));
    };
    if (quota.status === 'exhausted') {
      decide('paywall');
      openPaywall();
      return false;
    }
    // зачем (аудит R48, координатор 15.10): при 0 энергии попытка дня сгорала до проверки энергии, а тренировка открывалась
    // и молча закрывалась. Теперь энергию проверяем ДО траты попытки: не хватает — шторка «Нужна энергия», попытка цела.
    // Короткие наборы (1–4) энергию не берут — их не проверяем. 'unknown' (энергия ещё не прочитана) пускает: решит сам старт.
    const paid = sessionCount !== undefined && mistakePracticeSessionCostsEnergy(sessionCount);
    if (paid && predictStartRefusal('mistake_practice') === 'insufficient') {
      console.log('[MISTAKES-GATE] no_energy → шторка, попытка дня не тронута', JSON.stringify({ surface: source, sessionCount })); // guard-ok: ранний выход
      decide('no_energy');
      setNoEnergy(true);
      return false;
    }
    if (quota.limit === null) { decide('start_unlimited'); return true; } // Plus / «Фри» — чек не нужен.
    if (quota.status === 'stale_account') { decide('start_stale_account'); return true; } // смена аккаунта: не блокируем, чек не пишем.
    // зачем (Ревизор 2.78): повторный тап, пока чек пишется, раньше пускал (true) — второй экран уходил БЕЗ чека, а первый при
    // размонтировании возвращал попытку → бесплатная сессия. Теперь второй тап ничего не открывает: сессия первого уже открывается.
    const inFlight = inFlightRef.current;
    if (inFlight) {
      const heldMs = Date.now() - inFlight.startedAtMs;
      if (heldMs < MISTAKE_GATE_INFLIGHT_CEILING_MS) {
        decide('blocked_double_tap');
        void hapticWarning(); // отклик, а не тишина: тап услышан, тренировка уже открывается
        return false;
      }
      console.warn('[MISTAKE-GATE] inflight_ceiling — замок чека снят по потолку', JSON.stringify({ // guard-ok: сброс по потолку пишет причину
        surface: source, receiptId: inFlight.receiptId, heldMs, ceilingMs: MISTAKE_GATE_INFLIGHT_CEILING_MS,
      }));
      inFlightRef.current = null;
    }
    decide('start_with_receipt');
    const receiptId = `mistakes:${Crypto.randomUUID()}`;
    inFlightRef.current = { receiptId, startedAtMs: Date.now() };
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
    lastReceiptRef.current = receiptId;
    void consume
      .then((result) => {
        console.log('[MISTAKES-GATE] consume:out', JSON.stringify({ receiptId, status: result.status, used: result.used, limit: result.limit, bypass: result.bypass }));
      })
      .catch((error: unknown) => {
        console.warn('[MISTAKES-GATE] consume:catch — чек не записан, сессия уже открыта', error instanceof Error ? error.message : String(error));
      })
      // замок снимает только СВОЙ чек: после сброса по потолку там может стоять уже новая попытка
      .finally(() => { if (inFlightRef.current?.receiptId === receiptId) inFlightRef.current = null; });
    return true;
  }, [accessResolved, openPaywall, predictStartRefusal, quota, source]);

  return { quota, locked, tryStartSession, noEnergy, dismissNoEnergy, takeQuotaReceiptParam };
}
