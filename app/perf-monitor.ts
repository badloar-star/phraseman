/**
 * Лёгкий замерщик производительности для диагностики зависаний.
 * Логирует время в Metro терминал. Только в DEV режиме — в prod ничего не делает.
 *
 * Использование:
 *   const end = perfMark('home:loadData');
 *   await loadData();
 *   end(); // выведет [PERF] home:loadData: 342ms  ⚠️ SLOW если > 300ms
 */

const IS_DEV = __DEV__;
const SLOW_THRESHOLD_MS = 300;

export function perfMark(label: string): () => void {
  if (!IS_DEV) return () => {};
  const start = Date.now();
  return () => {
    const ms = Date.now() - start;
    const flag = ms > SLOW_THRESHOLD_MS ? '  ⚠️ SLOW' : '';
    if (__DEV__) {
      console.log(`[PERF] ${label}: ${ms}ms${flag}`);
    }
  };
}

/**
 * Замер навигационного перехода — вызывается в useEffect экрана при монтировании.
 *
 * Использование в экране:
 *   useEffect(() => { perfScreenMount('lesson_menu'); }, []);
 */
const _mountTimes: Record<string, number> = {};

export function perfNavStart(screenName: string): void {
  if (!IS_DEV) return;
  _mountTimes[screenName] = Date.now();
}

export function perfScreenMount(screenName: string): void {
  if (!IS_DEV) return;
  const start = _mountTimes[screenName];
  if (start) {
    const ms = Date.now() - start;
    const flag = ms > 500 ? '  ⚠️ SLOW NAV' : '';
    if (__DEV__) {
      console.log(`[PERF] nav → ${screenName}: ${ms}ms${flag}`);
    }
    delete _mountTimes[screenName];
  } else {
    if (__DEV__) {
      console.log(`[PERF] ${screenName}: mounted (no nav start recorded)`);
    }
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
