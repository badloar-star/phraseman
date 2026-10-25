/**
 * Идёт ли сейчас прокрутка экрана (Главная и др.) — для пауз тяжёлых фонов на время жеста.
 *
 * зачем (координатор 25.10, владелец «скролл стал дёрганым, на главной»): живой фон премиум-тем (PremiumThemeMotion — WebView
 * с шейдером или CSS-анимацией на всю сцену) перерисовывается каждый кадр и спорит с прокруткой за поток отрисовки. На время
 * прокрутки его ставим на паузу. Сигналы приходят из app/scroll_restore_probe.ts, их Главная уже шлёт: начало и конец жеста,
 * шаг положения (каждые ~8 dp, из worklet через runOnJS). «Активно» включается сразу, гаснет после IDLE_MS тишины без пальца.
 */
export const SCROLL_ACTIVITY_IDLE_MS = 220;

type Listener = () => void;
type ScreenActivity = { active: boolean; dragging: boolean; timer: ReturnType<typeof setTimeout> | null; listeners: Set<Listener> };

const screens = new Map<string, ScreenActivity>();

function stateOf(screen: string): ScreenActivity {
  let state = screens.get(screen);
  if (!state) {
    state = { active: false, dragging: false, timer: null, listeners: new Set() };
    screens.set(screen, state);
  }
  return state;
}

function setActive(state: ScreenActivity, active: boolean): void {
  if (state.active === active) return;
  state.active = active;
  for (const listener of state.listeners) listener();
}

function armIdle(state: ScreenActivity): void {
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    if (!state.dragging) setActive(state, false);
  }, SCROLL_ACTIVITY_IDLE_MS);
}

/** Сигнал прокрутки: 'drag_start' / 'drag_end' — палец, 'offset' — сдвиг положения (жест или инерция). */
export function noteScreenScrollActivity(screen: string, kind: 'drag_start' | 'drag_end' | 'offset'): void {
  const state = stateOf(screen);
  if (kind === 'drag_start') {
    state.dragging = true;
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    setActive(state, true);
    return;
  }
  if (kind === 'drag_end') state.dragging = false;
  else setActive(state, true);
  armIdle(state);
}

export function peekScreenScrollActive(screen: string): boolean {
  return screens.get(screen)?.active ?? false;
}

export function subscribeScreenScrollActive(screen: string, listener: Listener): () => void {
  const state = stateOf(screen);
  state.listeners.add(listener);
  return () => { state.listeners.delete(listener); }; // guard-ok: снятие подписчика из памяти (Set)
}

export function resetScreenScrollActivityForTests(): void {
  for (const state of screens.values()) if (state.timer) clearTimeout(state.timer);
  screens.clear();
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
