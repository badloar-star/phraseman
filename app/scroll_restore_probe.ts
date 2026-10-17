/**
 * [SCROLL-RESTORE] — журнал «экран открылся прокрученным вниз» (Настройки, Главная).
 *
 * зачем (координатор 18.10, находка Сверки: после смены языка и при заходе в Настройки или на Главную экран «залипает» прокрученным вниз, тапы по верхним
 * пунктам попадают ниже; правило «сперва логи, потом починка»): сначала нужно увидеть, кто выставил положение — восстановление `scrollTo` по сохранённому
 * числу, смена высоты содержимого после перевода (язык меняет длину строк) или рывок без пальца. Журнал ничего не меняет в прокрутке и пишет только на
 * событиях: смена языка, показ вкладки, изменение высоты содержимого ≥ 24 dp и рывок положения ≥ 300 dp без жеста пальца в окне 2,5 с после события.
 * Не больше 8 строк на событие, значения — числа и имена, без текстов пользователя.
 */
const LOG = '[SCROLL-RESTORE]';
export const SCROLL_RESTORE_WINDOW_MS = 2500;
export const SCROLL_RESTORE_LINES_PER_EVENT = 8;
export const SCROLL_RESTORE_JUMP_DP = 300;
export const SCROLL_RESTORE_HEIGHT_DELTA_DP = 24;

type ScreenState = {
  y: number;
  contentH: number | null;
  lastEvent: string;
  lastEventAt: number;
  linesForEvent: number;
  dragging: boolean;
};

const screens = new Map<string, ScreenState>();

function stateOf(screen: string): ScreenState {
  let state = screens.get(screen);
  if (!state) {
    state = { y: 0, contentH: null, lastEvent: 'none', lastEventAt: 0, linesForEvent: 0, dragging: false };
    screens.set(screen, state);
  }
  return state;
}

function emit(screen: string, state: ScreenState, what: string, detail: Readonly<Record<string, unknown>>, now: number): void {
  if (state.linesForEvent >= SCROLL_RESTORE_LINES_PER_EVENT) return;
  state.linesForEvent += 1;
  console.log(LOG, what, JSON.stringify({ screen, event: state.lastEvent, sinceEventMs: state.lastEventAt ? now - state.lastEventAt : null, y: Math.round(state.y), contentH: state.contentH === null ? null : Math.round(state.contentH), ...detail })); // guard-ok: строка на событие, не больше 8 на событие
}

/** Событие экрана: 'lang_change', 'tab_visible' и т. п. `setBy` — кто сейчас выставит положение ('restore_scrollTo', 'none'). */
export function noteScrollEvent(screen: string, event: string, detail: Readonly<Record<string, unknown>> = {}, now: number = Date.now()): void {
  const state = stateOf(screen);
  state.lastEvent = event;
  state.lastEventAt = now;
  state.linesForEvent = 0;
  emit(screen, state, 'event', detail, now);
}

/** Жест пальца: рывки положения во время жеста — не наши. */
export function noteScrollDrag(screen: string, dragging: boolean): void {
  stateOf(screen).dragging = dragging;
}

/** Новое положение прокрутки (из обработчика экрана). Пишет только рывок без пальца вскоре после события. */
export function noteScrollOffset(screen: string, y: number, now: number = Date.now()): void {
  const state = stateOf(screen);
  const prev = state.y;
  state.y = y;
  if (state.dragging) return;
  if (state.lastEventAt === 0 || now - state.lastEventAt > SCROLL_RESTORE_WINDOW_MS) return;
  if (Math.abs(y - prev) < SCROLL_RESTORE_JUMP_DP) return;
  emit(screen, state, 'jump_without_finger', { from: Math.round(prev), to: Math.round(y) }, now);
}

/** Высота содержимого изменилась (после перевода длинные строки растягивают экран). */
export function noteScrollContentHeight(screen: string, height: number, now: number = Date.now()): void {
  const state = stateOf(screen);
  const before = state.contentH;
  state.contentH = height;
  if (before === null || Math.abs(height - before) < SCROLL_RESTORE_HEIGHT_DELTA_DP) return;
  emit(screen, state, 'content_height', { before: Math.round(before), after: Math.round(height) }, now);
}

export function resetScrollRestoreProbeForTests(): void {
  screens.clear();
}
