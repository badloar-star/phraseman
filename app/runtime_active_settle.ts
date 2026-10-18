// runtime_active_settle.ts — чистая логика «активация экрана после возврата ждёт конца перехода» (без импортов, чтобы тестироваться без среды).
//
// зачем (R137, координатор 18.10; журнал Сверки back_after3): при возврате «Сегодня» → «назад» Главная получала фокус на 70–130-й мс (homeRuntimeActive false→true) и в самой анимации
// возврата выполняла рендер и все эффекты, привязанные к активности; ещё через ~150 мс приходил focusTick и второй рендер — вместе ≈250 мс JS в первом окне, первый кадр 366–421 мс.
// Главная при этом уже нарисована из кэша, видимых изменений активация не даёт. Поэтому после смены «не в фокусе → в фокусе» активность откладывается до смены focusTick
// (его поднимает группа вкладок, когда фокус реально вернулся) — два рендера сливаются в один, а за время анимации JS свободен.
export type SettleState = Readonly<{
  /** Экран сейчас в фокусе (по последнему наблюдению). */
  focused: boolean;
  /** focusTick в момент, когда фокус вернулся; null — экран был в фокусе с монтирования, ждать нечего. */
  tickAtFocus: number | null;
}>;

/** Страховка: фокус вернулся, а focusTick не изменился (необычный путь) — через столько мс активируем без него. */
export const RUNTIME_ACTIVE_SETTLE_FALLBACK_MS = 500;

export function initialSettleState(screenFocused: boolean): SettleState {
  return { focused: screenFocused, tickAtFocus: null };
}

/** Следующее состояние по наблюдению фокуса. Смена «вне фокуса → в фокус» запоминает focusTick этого момента. */
export function nextSettleState(prev: SettleState, screenFocused: boolean, focusTick: number): SettleState {
  if (screenFocused === prev.focused) return prev;
  return { focused: screenFocused, tickAtFocus: screenFocused ? focusTick : null };
}

/** Можно ли считать экран активным: в фокусе и (был в фокусе с самого начала, либо focusTick уже сменился, либо истекла страховка). */
export function isRuntimeSettled(state: SettleState, focusTick: number, fallbackElapsed: boolean): boolean {
  if (!state.focused) return false;
  if (state.tickAtFocus === null) return true;
  return state.tickAtFocus !== focusTick || fallbackElapsed;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
