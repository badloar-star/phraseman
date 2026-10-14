// ═══════════════════════════════════════════════════════════════════════════
// use_welcome_back_moment.ts — окно «С возвращением» на Главной (D193): решение, слот в очереди окон, отметка «показано».
//
// зачем (координатор 14.10): окно заменяет winback-пейвол и стоит в ОБЩЕЙ очереди окон Главной сразу после окна итога недели Пика
// (ключ welcomeBack после spireWeekMoment) — в понедельник после долгой отлучки два окна не лягут друг на друга. Решение — после первого
// кадра Главной (первый кадр не ждёт), повторно — когда снимок возвращения появляется, пока Главная открыта (возврат из фона).
// «Показано» ставится, только когда окно реально получило слот.
//
// Как вставить (Дизайн, app/(tabs)/home.tsx), рядом с окном недели:
//   const welcomeBack = useWelcomeBackMoment({ studyTarget, coinRank, energy: { current, max }, active: homeRuntimeActive });
//   {welcomeBack.visible && welcomeBack.decision ? <WelcomeBackMoment lang={lang} coinRank={coinRank} decision={welcomeBack.decision}
//      onCards={…} onHome={welcomeBack.close} /> : null}
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { runAfterHomeFirstFrame } from '../app/first_frame_deferred_warmups';
import type { WelcomeBackDecision } from '../modules/welcome_back/welcome_back_model';
import { markWelcomeBackShown, resolveWelcomeBack } from '../modules/welcome_back/welcome_back_gate';
import { clearWelcomeBackReturnGap, subscribeWelcomeBackReturnGap } from '../modules/welcome_back/welcome_back_signal';

export type WelcomeBackShow = Extract<WelcomeBackDecision, { show: true }>;

export type UseWelcomeBackMomentInput = Readonly<{
  studyTarget: string;
  coinRank: number | null;
  energy: Readonly<{ current: number; max: number }> | null;
  /** Главная на экране и приложение активно. */
  active: boolean;
}>;

export type UseWelcomeBackMomentResult = Readonly<{
  visible: boolean;
  decision: WelcomeBackShow | null;
  close: () => void;
}>;

export function useWelcomeBackMoment(input: UseWelcomeBackMomentInput): UseWelcomeBackMomentResult {
  const { studyTarget, coinRank, active } = input;
  const energyCurrent = input.energy?.current ?? null;
  const energyMax = input.energy?.max ?? null;
  const [decision, setDecision] = useState<WelcomeBackShow | null>(null);
  const [signalTick, setSignalTick] = useState(0);
  const visible = useOverlayVisible('welcomeBack', decision !== null);
  const markedRef = useRef(false);

  // Снимок возвращения появился, пока Главная открыта (возврат из фона) — решаем заново.
  useEffect(() => subscribeWelcomeBackReturnGap((gap) => { if (gap) setSignalTick((n) => n + 1); }), []);

  useEffect(() => {
    if (!active) return undefined;
    if (decision) return undefined;
    let cancelled = false;
    const cancelTask = runAfterHomeFirstFrame('welcome_back_gate', () => resolveWelcomeBack({
      studyTarget,
      coinRank,
      energy: energyCurrent !== null && energyMax !== null ? { current: energyCurrent, max: energyMax } : null,
    }).then((result) => {
      if (cancelled) { console.log('[WELCOME-BACK] решение пришло после ухода с Главной — не показываем'); return; } // guard-ok: ранний выход
      if (result.show) {
        markedRef.current = false;
        setDecision(result.decision);
      }
    }).catch((error: unknown) => {
      console.warn('[WELCOME-BACK] решение упало — окно не показываем', String(error)); // guard-ok: catch пишет причину
    }), { holdDuringOnboarding: true });
    return () => { cancelled = true; cancelTask(); };
  }, [active, coinRank, decision, energyCurrent, energyMax, signalTick, studyTarget]);

  useEffect(() => {
    if (!visible || !decision || markedRef.current) return;
    markedRef.current = true;
    console.log(`[WELCOME-BACK] слот получен — окно на экране: дней=${decision.stats.awayDays} кнопка=${decision.primary.kind}`); // guard-ok: одна строка на показ
    void markWelcomeBackShown();
    clearWelcomeBackReturnGap('shown');
  }, [visible, decision]);

  const close = useCallback(() => {
    console.log('[WELCOME-BACK] окно закрыто'); // guard-ok: одна строка на закрытие
    setDecision(null);
  }, []);

  return { visible: visible && decision !== null, decision, close };
}
