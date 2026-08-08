import { AppState } from 'react-native';

export type VisibleWallClockDeps = {
  now(): number;
  setInterval(listener: () => void, delayMs: number): unknown;
  clearInterval(id: unknown): void;
  /**
   * Гвард переднего плана. Необязателен: без него часы ведут себя как раньше
   * (полезно в юнит-тестах, где AppState не нужен).
   */
  isForeground?(): boolean;
  subscribeForeground?(listener: (active: boolean) => void): () => void;
};

/**
 * Общие часы на 1 Гц для всех «живых» подписей времени.
 *
 * зачем 2026-07-27 (владелец: «переключая экраны всё лагает, тормозит и
 * греется»): интервал стартовал при первом подписчике и тикал ВСЁ время работы
 * приложения, включая свёрнутое состояние — каждую секунду будил JS-поток и
 * гонял пересчёт у всех подписчиков. Образец правильного поведения уже был
 * рядом (components/energy_countdown_clock.ts): интервал живёт, только пока
 * приложение на переднем плане И есть хоть один слушатель.
 *
 * Свежесть не теряется: при возврате на передний план сразу делаем emit(), так
 * что подписи показывают актуальное время в первом же кадре, а не через секунду.
 */
export function createVisibleWallClock(deps: VisibleWallClockDeps) {
  const listeners = new Set<(now: number) => void>();
  let interval: unknown | null = null;
  let removeForeground: (() => void) | null = null;
  let active = deps.isForeground ? deps.isForeground() : true;

  const emit = () => {
    const now = deps.now();
    listeners.forEach((listener) => listener(now));
  };

  const reconcile = () => {
    const wanted = active && listeners.size > 0;
    if (wanted && interval === null) {
      interval = deps.setInterval(emit, 1000);
    } else if (!wanted && interval !== null) {
      deps.clearInterval(interval);
      interval = null;
    }
  };

  const attachForeground = () => {
    if (removeForeground || !deps.subscribeForeground || listeners.size === 0) return;
    active = deps.isForeground ? deps.isForeground() : true;
    removeForeground = deps.subscribeForeground((next) => {
      if (next === active) return;
      active = next;
      // Вернулись на передний план — публикуем время СРАЗУ, не дожидаясь тика:
      // иначе первую секунду на экране висело бы время момента сворачивания.
      if (active && listeners.size > 0) emit();
      reconcile();
    });
  };

  const detachForeground = () => {
    if (listeners.size > 0 || !removeForeground) return;
    removeForeground();
    removeForeground = null;
  };

  return {
    subscribe(listener: (now: number) => void) {
      listeners.add(listener);
      attachForeground();
      listener(deps.now());
      reconcile();
      return () => {
        listeners.delete(listener);
        reconcile();
        detachForeground();
      };
    },
  };
}

export const visibleWallClock = createVisibleWallClock({
  now: () => Date.now(),
  setInterval: (listener, delayMs) => setInterval(listener, delayMs),
  clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
  isForeground: () => AppState.currentState === 'active',
  subscribeForeground: (listener) => {
    const subscription = AppState.addEventListener('change', (state) => listener(state === 'active'));
    return () => subscription.remove();
  },
});
