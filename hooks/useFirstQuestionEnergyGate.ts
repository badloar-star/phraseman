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
import { actionToastTri, emitAppEvent } from '../app/events';
import { captureAccountGeneration } from '../app/account_generation';
import { energyActivityForSessionKind, type EnergyActivityKey } from '../app/energy_contract';
import {
  chargeFirstQuestion,
  markFirstAnswerGiven,
  markFirstQuestionShown,
  noteFirstQuestionSessionExit,
  recoverUnshownFirstQuestionCharges,
  refundIfFirstQuestionNotShown,
  type FirstQuestionChargeResult,
  type FirstQuestionFinalizeOn,
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
  /**
   * D159: 'first_answer' — списание окончательно только после первого ответа (экран зовёт `markAnswered`);
   * вышел без ответа → возврат; повторный вход в тот же раздел урока в окне — бесплатно. По умолчанию 'shown' (D72).
   */
  finalizeOn?: FirstQuestionFinalizeOn;
}>;

export type FirstQuestionEnergyGate = Readonly<{
  charge: () => Promise<FirstQuestionChargeResult>;
  markShown: () => void;
  refundNotShown: (reason: string) => void;
  /** D159: первый ответ дан — энергия списана окончательно. Повторные вызовы безопасны. */
  markAnswered: () => void;
}>;

export function useFirstQuestionEnergyGate(options: FirstQuestionEnergyGateOptions): FirstQuestionEnergyGate {
  const { intent, screen, firstQuestionVisible } = options;
  const finalizeOn: FirstQuestionFinalizeOn = options.finalizeOn ?? 'shown';
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
    return chargeFirstQuestion(deps, { activity, intent, screen, finalizeOn });
  }, [activity, intent, screen, finalizeOn]);

  const markShown = useCallback(() => {
    const deps = depsRef.current;
    if (!deps) return;
    void markFirstQuestionShown(deps, operationId);
  }, [operationId]);

  const markAnswered = useCallback(() => {
    const deps = depsRef.current;
    if (!deps) return;
    void markFirstAnswerGiven(deps, operationId);
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
      // D159: в режиме first_answer «до первого вопроса» значит «без единого ответа» (гейт допишет no_answer).
      if (deps) void refundIfFirstQuestionNotShown(deps, operationId, `unmounted_before_first_question:${screen}`);
      // Порядок важен: возврат синхронно ставит статус refunding — сессия без ответа окно не откроет.
      void noteFirstQuestionSessionExit(operationId);
    };
  }, [operationId, screen]);

  // Авто-режим. Латч по operationId: ре-рендеры и смена энергии после списания
  // эффект не перезапускают в повторное списание (а даже если бы — гейт дедуплит).
  const autoTriggeredRef = useRef<string | null>(null);
  useEffect(() => {
    // зачем (координатор 12.10, energy-modes-017 — сначала логи): каждый ранний выход авто-списания и вызванный обработчик.
    if (firstQuestionVisible !== true) {
      console.log(`[ENERGY-GATE] auto: wait screen=${screen} op=${operationId} firstQuestionVisible=${String(firstQuestionVisible)}`); // guard-ok: ранний выход называет значение
      return;
    }
    if (autoTriggeredRef.current === operationId) {
      console.log(`[ENERGY-GATE] auto: skip screen=${screen} op=${operationId} reason=already_triggered_for_op`); // guard-ok: ранний выход называет причину
      return;
    }
    autoTriggeredRef.current = operationId;
    console.log(`[ENERGY-GATE] auto: charge screen=${screen} activity=${activity} op=${operationId} finalizeOn=${finalizeOn}`);
    void charge().then((result) => {
      onResultRef.current?.(result);
      if (!mountedRef.current) {
        console.log(`[ENERGY-GATE] auto: result=${result} after unmount op=${operationId} — handlers skipped`);
        return;
      }
      if (result === 'spent' || result === 'unlimited') {
        console.log(`[ENERGY-GATE] auto: result=${result} screen=${screen} op=${operationId} → markShown (no modal)`);
        markShown();
        return;
      }
      console.log(`[ENERGY-GATE] auto: result=${result} screen=${screen} op=${operationId} → ${result === 'insufficient' ? 'onInsufficient (modal)' : 'onCancelled (back)'} handler=${result === 'insufficient' ? typeof onInsufficientRef.current : typeof onCancelledRef.current}`);
      if (result === 'insufficient') onInsufficientRef.current?.();
      else {
        // зачем (аудит Optimistic UI 13.10): 'cancelled' — это сбой (хранилище энергии не прочиталось, журнал не записался,
        // сменился аккаунт), а экраны молча уходили назад — человек видел, что занятие закрылось само. Говорим причину.
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не получилось начать занятие. Энергия не списана — попробуй ещё раз.',
          uk: 'Не вдалося почати заняття. Енергію не списано — спробуй ще раз.',
          en: "Couldn't start the session. No energy was spent — please try again.",
          es: 'No se pudo empezar la sesión. No se gastó energía, inténtalo de nuevo.',
          'pt-BR': 'Não foi possível começar a sessão. Nenhuma energia foi gasta — tente de novo.',
          vi: 'Không thể bắt đầu buổi học. Chưa trừ năng lượng — hãy thử lại.',
          id: 'Sesi tidak bisa dimulai. Energi tidak terpakai — coba lagi.',
          tr: 'Ders başlatılamadı. Enerji harcanmadı — tekrar dene.',
          pl: 'Nie udało się rozpocząć zajęć. Energia nie została zużyta — spróbuj ponownie.',
        }));
        onCancelledRef.current?.();
      }
      // Не списано — разрешаем новую попытку того же входа (пополнил энергию).
      autoTriggeredRef.current = null;
    });
  }, [activity, charge, finalizeOn, firstQuestionVisible, markShown, operationId, screen]);

  return useMemo(() => ({ charge, markShown, refundNotShown, markAnswered }), [charge, markShown, refundNotShown, markAnswered]);
}
