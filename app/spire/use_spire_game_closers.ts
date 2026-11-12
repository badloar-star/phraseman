// ═══════════════════════════════════════════════════════════════════════════
// use_spire_game_closers.ts — закрытия игровой части Пика: отмена «Готовим ступень…», ступень не началась, крестик «Итога недели».
//
// зачем (сторож ≤ 400 строк, spire_game_source_contract; координатор 12.11): вынесено из use_spire_game.ts без изменения поведения —
// те же логи [SPIRE], тот же порядок сброса замка старта, тот же плавный подъём башни после крестика.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, type MutableRefObject } from 'react';

import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import { spireDismissWeekResult, type SpireWeekResultView } from './spire_week_result_client';
import type { SpireLang } from '../../modules/spire/report_queue';

const LOG = '[SPIRE]';

type Input<TPending, TSession> = Readonly<{
  prepIdRef: MutableRefObject<string | null>;
  startingRef: MutableRefObject<boolean>;
  setStarting: (v: boolean) => void;
  setPending: (v: TPending | null) => void;
  setSession: (v: TSession | null) => void;
  weekResult: SpireWeekResultView | null;
  setWeekResult: (v: SpireWeekResultView | null) => void;
  ids: Readonly<{ uid: string }> | null;
  lang: SpireLang | null;
}>;

export function useSpireGameClosers<TPending, TSession>({ prepIdRef, startingRef, setStarting, setPending, setSession, weekResult, setWeekResult, ids, lang }: Input<TPending, TSession>) {
  /** «Назад» на экране «Готовим ступень…» до пакета: закрыть без энергии и без штрафа; поздний пакет игнорируется. */
  const cancelPendingStep = useCallback(() => {
    const prep = prepIdRef.current;
    if (!prep) {
      DebugLogger.info(LOG, 'game: отмена подготовки — подготовки нет, пропуск');
      return;
    }
    DebugLogger.info(LOG, `game: подготовка ${prep} отменена человеком до пакета — энергия не тронута`);
    prepIdRef.current = null;
    startingRef.current = false;
    setStarting(false);
    setPending(null);
  }, [prepIdRef, startingRef, setStarting, setPending]);

  const onStepAbort = useCallback((reason: 'no_energy' | 'cancelled') => {
    DebugLogger.info(LOG, `game: ступень не началась (${reason}) — энергия не тронута`);
    setSession(null);
  }, [setSession]);

  const dismissWeekResult = useCallback(() => {
    const res = weekResult;
    if (res) animateNextLayoutTransition(); // зачем: крестик убирает карточку из потока — башня поднимается плавно
    setWeekResult(null);
    if (res && ids && lang) void spireDismissWeekResult(ids.uid, lang, res.weekId);
  }, [weekResult, setWeekResult, ids, lang]);

  return { cancelPendingStep, onStepAbort, dismissWeekResult };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
