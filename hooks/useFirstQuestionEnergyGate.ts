/**
 * React-обёртка над app/energy_first_question_gate.ts.
 *
 * зачем: D72/D87/PM-084 — одна точка «−1 энергия в момент показа первого
 * вопроса» для всех занятий вместо копии логики в каждом экране. Раньше каждый
 * экран держал свой латч + `active`-флаг эффекта: смена энергии после списания
 * перезапускала эффект, флаг гас, и подтверждение старта (ack) не писалось, а
 * закрытие экрана до показа вопроса оставляло энергию списанной.
 *
 * Два режима:
 *  • авто — `firstQuestionVisible: true`, когда первый вопрос уже на экране:
 *    гейт спишет один раз и сразу подтвердит показ;
 *  • ручной — экран сам зовёт `charge()` прямо перед показом вопроса, затем
 *    `markShown()` в том же синхронном шаге, где делает вопрос видимым.
 * Размонтирование до показа = возврат (D87). Plus — без списания (D07).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useEnergy } from '../components/EnergyContext';
import { captureAccountGeneration } from '../app/account_generation';
import { energyActivityForSessionKind, type EnergyActivityKey } from '../app/energy_contract';
import {
  chargeFirstQuestion,
  markFirstQuestionShown,
  recoverUnshownFirstQuestionCharges,
  refundIfFirstQuestionNotShown,
  type FirstQuestionChargeResult,
  type FirstQuestionRecoveryDeps,
} from '../app/energy_first_question_gate';
import {
  readEnergySessionStartStatus,
  type EnergySessionIntent,
} from '../app/energy_session_operation_ledger';

export type FirstQuestionEnergyGateOptions = Readonly<{
  intent: EnergySessionIntent;
  /** Имя экрана для логов [ENERGY-GATE]. */
  screen: string;
  activity?: EnergyActivityKey;
  /** Авто-режим: true — первый вопрос уже виден. undefined — ручной режим. */
  firstQuestionVisible?: boolean;
  onInsufficient?: () => void;
  onCancelled?: () => void;
  /** Любой итог авто-списания (для трасс экрана), вызывается до обработчиков. */
  onResult?: (result: FirstQuestionChargeResult) => void;
}>;

export type FirstQuestionEnergyGate = Readonly<{
  charge: () => Promise<FirstQuestionChargeResult>;
  markShown: () => void;
  refundNotShown: (reason: string) => void;
}>;

export function useFirstQuestionEnergyGate(options: FirstQuestionEnergyGateOptions): FirstQuestionEnergyGate {
  const { intent, screen, firstQuestionVisible } = options;
  const activity = options.activity ?? energyActivityForSessionKind(intent.grant.kind);
  const { confirmActivityStart, refundActivityStart, acknowledgeSessionStart, energyReady } = useEnergy();

  const depsRef = useRef<FirstQuestionRecoveryDeps | null>(null);
  depsRef.current = {
    confirmActivityStart: (key, gateIntent) => confirmActivityStart(key, gateIntent as EnergySessionIntent),
    refundActivityStart,
    acknowledgeSessionStart,
    getOwnerId: () => captureAccountGeneration().stableId ?? null,
    readStartStatus: async (operationId) => (await readEnergySessionStartStatus(operationId)).status,
  };
  const onInsufficientRef = useRef(options.onInsufficient);
  onInsufficientRef.current = options.onInsufficient;
  const onCancelledRef = useRef(options.onCancelled);
  onCancelledRef.current = options.onCancelled;
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;
  const mountedRef = useRef(true);

  const operationId = intent.operationId;

  const charge = useCallback((): Promise<FirstQuestionChargeResult> => {
    const deps = depsRef.current;
    if (!deps) return Promise.resolve('cancelled');
    return chargeFirstQuestion(deps, { activity, intent, screen });
  }, [activity, intent, screen]);

  const markShown = useCallback(() => {
    const deps = depsRef.current;
    if (!deps) return;
    void markFirstQuestionShown(deps, operationId);
  }, [operationId]);

  const refundNotShown = useCallback((reason: string) => {
    const deps = depsRef.current;
    if (!deps) return;
    void refundIfFirstQuestionNotShown(deps, operationId, reason);
  }, [operationId]);

  // Возврат «списано, но вопрос не показан» из прошлого запуска — один раз на
  // процесс, как только энергия прочитана (refund требует готовый контекст).
  useEffect(() => {
    if (!energyReady || !depsRef.current) return;
    void recoverUnshownFirstQuestionCharges(depsRef.current);
  }, [energyReady]);

  // D87: ушли с экрана (или он упал и размонтировался) до показа вопроса —
  // вернуть. После markShown гейт ничего не вернёт.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const deps = depsRef.current;
      if (deps) void refundIfFirstQuestionNotShown(deps, operationId, `unmounted_before_first_question:${screen}`);
    };
  }, [operationId, screen]);

  // Авто-режим. Латч по operationId: ре-рендеры и смена энергии после списания
  // эффект не перезапускают в повторное списание (а даже если бы — гейт дедуплит).
  const autoTriggeredRef = useRef<string | null>(null);
  useEffect(() => {
    if (firstQuestionVisible !== true) return;
    if (autoTriggeredRef.current === operationId) return;
    autoTriggeredRef.current = operationId;
    void charge().then((result) => {
      onResultRef.current?.(result);
      if (!mountedRef.current) {
        console.log(`[ENERGY-GATE] auto: result=${result} after unmount op=${operationId} — handlers skipped`);
        return;
      }
      if (result === 'spent' || result === 'unlimited') {
        markShown();
        return;
      }
      if (result === 'insufficient') onInsufficientRef.current?.();
      else onCancelledRef.current?.();
      // Не списано — разрешаем новую попытку того же входа (пополнил энергию).
      autoTriggeredRef.current = null;
    });
  }, [charge, firstQuestionVisible, markShown, operationId]);

  return useMemo(() => ({ charge, markShown, refundNotShown }), [charge, markShown, refundNotShown]);
}
