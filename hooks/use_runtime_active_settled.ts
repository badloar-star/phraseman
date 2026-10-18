// use_runtime_active_settled.ts — useRuntimeActive, у которого активация после возврата на экран ждёт конца перехода (см. app/runtime_active_settle.ts).
//
// зачем (R137, координатор 18.10): возврат с экрана стека («Сегодня» → «назад», закрытие модалки, системное «назад» с глубокой ссылки) не должен гонять рендер и эффекты Главной
// внутри самой анимации. Смена вкладки внутри группы сюда не относится: она меняет ownerVisible, а не фокус экрана, и не откладывается. Возврат из фона меняет только appActive
// (фокус экрана не меняется) — тоже без задержки. Любой отложенный возврат кончается одним из двух исходов с записью в журнал [HOME-ACTIVE-SETTLE]:
// via=focus_tick (группа вкладок подняла focusTick — нормальный путь) или via=fallback (focusTick не пришёл за RUNTIME_ACTIVE_SETTLE_FALLBACK_MS); уход фокуса до конца ожидания пишет cancelled_blur.
import { useEffect, useRef, useState } from 'react';

import { noteBackStep } from '../app/back_tap_probe';
import { DIAG_ENABLED } from '../app/dev_diag_gate';
import { useAppRuntimeActive } from '../app/runtime_app_state_store';
import {
  initialSettleState,
  isRuntimeSettled,
  nextSettleState,
  RUNTIME_ACTIVE_SETTLE_FALLBACK_MS,
  type SettleState,
} from '../app/runtime_active_settle';
import { useTabFocusTick } from '../app/TabContext';
import { useIsScreenFocused } from './use_is_screen_focused';

const LOG = '[HOME-ACTIVE-SETTLE]';

function diag(event: string, detail: Readonly<Record<string, unknown>>): void {
  if (!DIAG_ENABLED) return;
  console.log(`${LOG} ${event} ${JSON.stringify(detail)}`); // guard-ok: одна строка на исход отложенной активации, только dev
  noteBackStep(`home_active_${event}`, detail);
}

export function useRuntimeActiveSettled(ownerVisible = true): boolean {
  const screenFocused = useIsScreenFocused();
  const appActive = useAppRuntimeActive();
  const focusTick = useTabFocusTick();
  const stateRef = useRef<SettleState>(initialSettleState(screenFocused));
  stateRef.current = nextSettleState(stateRef.current, screenFocused, focusTick);
  const state = stateRef.current;
  // tick, для которого страховка уже сработала (render-фаза состояние не пишет, только читает)
  const [fallbackFor, setFallbackFor] = useState<number | null>(null);
  const fallbackElapsed = state.tickAtFocus !== null && fallbackFor === state.tickAtFocus;
  const settled = isRuntimeSettled(state, focusTick, fallbackElapsed);
  const waitingTick = state.focused && !settled ? state.tickAtFocus : null;
  // момент начала ожидания: пока не null — исход ещё не записан (защита от повторных строк при следующих сменах focusTick)
  const waitStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (waitingTick === null) return undefined;
    waitStartRef.current = Date.now();
    diag('deferred', { tickAtFocus: waitingTick, focusTick, fallbackMs: RUNTIME_ACTIVE_SETTLE_FALLBACK_MS });
    const timer = setTimeout(() => setFallbackFor(waitingTick), RUNTIME_ACTIVE_SETTLE_FALLBACK_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: фиксируем начало ожидания один раз на tickAtFocus; focusTick в записи — справочный
  }, [waitingTick]);

  useEffect(() => {
    const startedAt = waitStartRef.current;
    if (startedAt === null) return;
    if (state.focused && settled && state.tickAtFocus !== null) {
      waitStartRef.current = null;
      diag('settled', { via: fallbackElapsed ? 'fallback' : 'focus_tick', waitedMs: Date.now() - startedAt, tickAtFocus: state.tickAtFocus, focusTick });
    } else if (!state.focused) {
      waitStartRef.current = null;
      diag('cancelled_blur', { waitedMs: Date.now() - startedAt, tickAtFocus: state.tickAtFocus, focusTick });
    }
  }, [fallbackElapsed, focusTick, settled, state.focused, state.tickAtFocus]);

  return screenFocused && appActive && ownerVisible && settled;
}
