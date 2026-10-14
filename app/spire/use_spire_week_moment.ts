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
import { markSpireWeekMomentShown, resolveSpireWeekMoment, type SpireWeekMomentShow } from './spire_week_moment_gate';
import { scheduleSpireWeekRemind, spireWeekRemindAvailability } from './spire_week_remind';

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
  const [decision, setDecision] = useState<SpireWeekMomentShow | null>(null);
  const visible = useOverlayVisible('spireWeekMoment', decision !== null);
  const markedRef = useRef<string | null>(null);
  const [remindAvailable, setRemindAvailable] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const cancelTask = runAfterHomeFirstFrame('spire_week_moment_gate', () => resolveSpireWeekMoment({ uiLang, studyTarget, tabEnabled }).then((next) => {
      if (cancelled) { DebugLogger.info('[SPIRE]', '[D191-GATE] решение пришло после ухода с Главной — не показываем'); return; }
      if (next.show) setDecision(next);
    }), { holdDuringOnboarding: true });
    return () => { cancelled = true; cancelTask(); };
  }, [active, uiLang, studyTarget, tabEnabled]);

  // зачем: доступность кнопки считается, пока окно ждёт слот — к показу ответ уже есть, первый кадр окна не ждёт.
  useEffect(() => {
    if (!decision || decision.outcome !== 'demoted') { setRemindAvailable(false); return undefined; }
    let cancelled = false;
    void spireWeekRemindAvailability().then((a) => { if (!cancelled) setRemindAvailable(a.available); });
    return () => { cancelled = true; };
  }, [decision]);

  useEffect(() => {
    if (!visible || !decision) return;
    const key = `${decision.uid}:${decision.lang}:${decision.weekId}`;
    if (markedRef.current === key) return;
    markedRef.current = key;
    DebugLogger.info('[SPIRE]', `[D191-GATE] слот получен — окно на экране: weekId=${decision.weekId} outcome=${decision.outcome}`);
    void markSpireWeekMomentShown(decision);
  }, [visible, decision]);

  const close = useCallback(() => {
    DebugLogger.info('[SPIRE]', '[D191-GATE] окно закрыто');
    setDecision(null);
  }, []);

  const scheduleRemind = useCallback(() => {
    // Окно закрывается сразу (мгновенный отклик), напоминание ставится фоном; итог — в [D191-REMIND].
    void scheduleSpireWeekRemind(uiLang);
    setDecision(null);
  }, [uiLang]);

  return {
    visible: visible && decision !== null,
    decision,
    close,
    remind: { available: remindAvailable && decision?.outcome === 'demoted', schedule: scheduleRemind },
  };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
