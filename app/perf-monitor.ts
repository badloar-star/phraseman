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
 * Замер с промежуточными отсечками — когда общая цифра известна, но непонятно,
 * КАКОЙ шаг её съел.
 *
 * зачем (владелец 2026-09-02): загрузка Главной ~1 секунда при пороге 300 мс,
 * а внутри неё десяток последовательных чтений диска. Без отсечек пришлось бы
 * гадать, какое именно звено тормозит — правило «сперва логи» это запрещает.
 *
 *   const step = perfSteps('home:loadData');
 *   await a(); step('storage');
 *   await b(); step('lessons');
 *   step.end();   // печатает всю раскладку одной строкой
 */
export function perfSteps(label: string): ((name: string) => void) & { end: () => void } {
  if (!IS_DEV) {
    // В релизе замер не нужен: возвращаем пустышку той же формы.
    const noop = (_name: string): void => {};
    return Object.assign(noop, { end: () => {} });
  }
  const start = Date.now();
  let last = start;
  const parts: string[] = [];
  const step = (name: string): void => {
    const now = Date.now();
    parts.push(`${name}=${now - last}ms`);
    last = now;
  };
  return Object.assign(step, {
    end: () => {
      const total = Date.now() - start;
      const flag = total > SLOW_THRESHOLD_MS ? '  ⚠️ SLOW' : '';
      console.log(`[PERF-STEPS] ${label}: total=${total}ms · ${parts.join(' · ')}${flag}`);
    },
  });
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
