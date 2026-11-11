// use_spire_week_moment.ts — D191 этап 2: окно итога недели на Главной (точка монтирования для Дизайна).
//
// зачем (владелец 14.10): окно «повышение / удержался / понижение» при первом открытии после закрытия недели, раньше всех окон
// Главной — поэтому слот берётся в общей очереди окон (ключ spireWeekMoment сразу после системных). Решение — после первого
// кадра Главной (первый кадр не ждёт сеть). «Показано» отмечается, когда окно РЕАЛЬНО получило слот, а не при решении.
//
// Как вставить (Дизайн, app/(tabs)/home.tsx):
//   const weekMoment = useSpireWeekMoment({ uiLang: lang, studyTarget, tabEnabled: spireTabEnabled, active: homeRuntimeActive });
//   {weekMoment.visible && weekMoment.decision ? <m01/m02/m03 по weekMoment.decision.outcome ... onPlay/закрытие → weekMoment.close()/> : null}
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { DebugLogger } from '../debug-logger';
import { runAfterHomeFirstFrame } from '../first_frame_deferred_warmups';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import { asSpireLang } from '../../components/spire/spire_home_week';
import { markSpireWeekMomentShown, resolveSpireWeekMoment, type SpireWeekMomentShow } from './spire_week_moment_gate';
import { scheduleSpireWeekRemindWithFeedback, spireWeekRemindAvailability } from './spire_week_remind';

export type UseSpireWeekMomentInput = Readonly<{ uiLang: string; studyTarget: string; tabEnabled: boolean; active: boolean }>;

export type UseSpireWeekMomentResult = Readonly<{
  /** Окно получило слот в очереди окон — рисовать m01/m02/m03. */
  visible: boolean;
  /** outcome: 'promoted' → m01, 'stayed' → m02, 'demoted' → m03; result — итог недели сервера. */
  decision: SpireWeekMomentShow | null;
  /** Закрыть окно (крестик / «Играть» / «Напомнить вечером»): освобождает слот для следующих окон. */
  close: () => void;
  /**
   * m03 «Напомнить вечером» (координатор 14.10): available=false → кнопку НЕ показывать (нет разрешения, категория «Шпиль»
   * выключена, уже позже 18:30, или это не понижение). schedule() — одно напоминание сегодня в 19:00 местного и закрытие окна.
   */
  remind: Readonly<{ available: boolean; schedule: () => void }>;
}>;

export function useSpireWeekMoment(input: UseSpireWeekMomentInput): UseSpireWeekMomentResult {
  const { uiLang, studyTarget, tabEnabled, active } = input;
  const [accountToken, setAccountToken] = useState(() => captureAccountGeneration());
  const accountTokenRef = useRef(accountToken);
  const [decision, setDecision] = useState<SpireWeekMomentShow | null>(null);
  const decisionIsCurrent = decision !== null
    && decision.lang === asSpireLang(studyTarget)
    && isCurrentAccountGeneration(decision.accountToken, decision.uid);
  const visible = useOverlayVisible('spireWeekMoment', decisionIsCurrent);
  const markedRef = useRef<string | null>(null);
  // зачем (координатор 15.10, аудит Optimistic UI): «Напомнить позже» — синхронная защёлка: два быстрых тапа до размонтирования окна ставили напоминание дважды (оба читали прежний id до записи первого)
  const remindFiredRef = useRef(false);
  const [remindAvailable, setRemindAvailable] = useState(false);

  useEffect(() => {
    const reconcile = (next: AccountGenerationToken): void => {
      const previous = accountTokenRef.current;
      if (previous.generation === next.generation
        && previous.stableId === next.stableId
        && previous.phase === next.phase) return;
      accountTokenRef.current = next;
      setAccountToken(next);
      setDecision(null);
      setRemindAvailable(false);
      markedRef.current = null;
      remindFiredRef.current = false;
    };
    const subscription = subscribeAccountGeneration(reconcile);
    // Subscribe first, then reconcile the current store snapshot: this closes the render→effect missed-update window.
    reconcile(captureAccountGeneration());
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setDecision(null);
    setRemindAvailable(false);
    markedRef.current = null;
    remindFiredRef.current = false;
    if (!active || !accountToken.stableId || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) return undefined;
    let cancelled = false;
    const cancelTask = runAfterHomeFirstFrame('spire_week_moment_gate', () => resolveSpireWeekMoment({ uiLang, studyTarget, tabEnabled, accountToken }).then((next) => {
      if (cancelled || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) { DebugLogger.info('[SPIRE]', '[D191-GATE] решение пришло после ухода/смены аккаунта — не показываем'); return; }
      if (next.show && (next.accountToken.generation !== accountToken.generation || next.accountToken.stableId !== accountToken.stableId || next.lang !== asSpireLang(studyTarget))) {
        DebugLogger.info('[SPIRE]', '[D191-GATE] решение не совпало с владельцем/языком текущего запроса — не показываем');
        return;
      }
      if (next.show) setDecision(next);
    }), { holdDuringOnboarding: true });
    return () => { cancelled = true; cancelTask(); };
  }, [active, uiLang, studyTarget, tabEnabled, accountToken]);

  // зачем: доступность кнопки считается, пока окно ждёт слот — к показу ответ уже есть, первый кадр окна не ждёт.
  useEffect(() => {
    if (!decision || !decisionIsCurrent || decision.outcome !== 'demoted') { setRemindAvailable(false); return undefined; }
    let cancelled = false;
    void spireWeekRemindAvailability().then((a) => {
      if (!cancelled && isCurrentAccountGeneration(decision.accountToken, decision.uid) && decision.lang === asSpireLang(studyTarget)) {
        setRemindAvailable(a.available);
      }
    });
    return () => { cancelled = true; };
  }, [decision, decisionIsCurrent, studyTarget]);

  useEffect(() => {
    if (!visible || !decision || !decisionIsCurrent) return;
    const key = `${decision.uid}:${decision.lang}:${decision.weekId}`;
    if (markedRef.current === key) return;
    markedRef.current = key;
    DebugLogger.info('[SPIRE]', `[D191-GATE] слот получен — окно на экране: weekId=${decision.weekId} outcome=${decision.outcome}`);
    void markSpireWeekMomentShown(decision);
  }, [visible, decision, decisionIsCurrent]);

  useEffect(() => { if (decision) remindFiredRef.current = false; }, [decision]);

  const close = useCallback(() => {
    DebugLogger.info('[SPIRE]', '[D191-GATE] окно закрыто');
    setDecision(null);
  }, []);

  const scheduleRemind = useCallback(() => {
    if (!decision || decision.outcome !== 'demoted' || decision.lang !== asSpireLang(studyTarget)
      || !isCurrentAccountGeneration(decision.accountToken, decision.uid)) {
      DebugLogger.info('[SPIRE]', '[D191-REMIND] устаревшее решение погашено');
      return;
    }
    if (remindFiredRef.current) {
      DebugLogger.info('[SPIRE]', '[D191-REMIND] повторное нажатие погашено');
      return;
    }
    remindFiredRef.current = true;
    // Окно закрывается сразу (мгновенный отклик), напоминание ставится фоном; итог — в [D191-REMIND].
    void scheduleSpireWeekRemindWithFeedback(uiLang, Date.now(), decision.accountToken);
    setDecision(null);
  }, [decision, studyTarget, uiLang]);

  return {
    visible: visible && decisionIsCurrent,
    decision: decisionIsCurrent ? decision : null,
    close,
    remind: { available: remindAvailable && decisionIsCurrent && decision?.outcome === 'demoted', schedule: scheduleRemind },
  };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
