// paywall_close_trace.ts — таймлайн закрытия пейвола: от handleClose до второго кадра Настроек.
// зачем (координатор 15.10, Сверка tabs_tap_r7d: крестик пейвола из Настроек 532-668 мс, цель <= 250; сперва логи): по строкам [PAYWALL-CLOSE-TIMING] видно, какой этап съедает время (аналитика/уведомление до dismiss, сам dismiss, размонтирование,
// перерисовка Настроек), а «пульс» JS-потока показывает, занят ли он тяжёлой работой в момент закрытия. Одна строка на этап; между закрытиями ничего не пишется.
const SAFETY_MS = 3000;
let t0 = 0;
let last = 0;
let active = false;
let renders = 0;
let selfLogMs = 0;
const nowPrecise = (): number => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
/** Пишет строку и копит, сколько времени ушло на сам console.log (в dev-сборке он заметно дорогой). */
function emit(line: string): void {
  const a = nowPrecise();
  console.log(line); // guard-ok: журнал закрытия пейвола
  selfLogMs += nowPrecise() - a;
}
let safety: ReturnType<typeof setTimeout> | null = null;

function total_share(): string {
  const total = Date.now() - t0;
  return total > 0 ? ((selfLogMs / total) * 100).toFixed(0) : '0';
}

function finish(reason: string): void {
  if (!active) return;
  emit(`[PAYWALL-CLOSE-TIMING] END reason=${reason} total=${Date.now() - t0}ms settingsRenders=${renders} selfLogMs=${selfLogMs.toFixed(1)} (${total_share()}% of total; dev-зонд и старые [WINBACK-FREEZE] см. dismiss:pre_log -> dismiss:call)`); // итог закрытия
  active = false;
  if (safety) { clearTimeout(safety); safety = null; }
}

/** Отметка этапа. 'handleClose' запускает отсчёт; остальные этапы без запущенного отсчёта молчат. */
export function paywallCloseMark(stage: string, extra: string = ''): void {
  const now = Date.now();
  if (stage === 'handleClose') {
    t0 = now; last = now; renders = 0; selfLogMs = 0; active = true;
    if (safety) clearTimeout(safety);
    safety = setTimeout(() => finish('safety_timeout'), SAFETY_MS);
  }
  if (!active) return;
  emit(`[PAYWALL-CLOSE-TIMING] stage=${stage} +${now - t0}ms d=${now - last}ms${extra ? ` ${extra}` : ''}`); // этап закрытия пейвола
  last = now;
  if (stage === 'dismiss:call') {
    // пульс JS-потока: насколько поздно сработает пустой таймер = сколько поток занят
    for (const delay of [0, 50, 150, 300]) {
      const planned = now + delay;
      setTimeout(() => { if (active) emit(`[PAYWALL-CLOSE-TIMING] tick +${Date.now() - t0}ms plan=+${planned - t0}ms lag=${Date.now() - planned}ms`); }, delay); // пульс JS-потока
    }
  }
  if (stage === 'settings:frame') finish('settings_frame');
}

/** Перерисовка экрана во время закрытия: считает, сколько раз Настройки рисуются, пока пейвол уходит. */
export function paywallCloseRender(name: string): void {
  if (!active) return;
  renders += 1;
  emit(`[PAYWALL-CLOSE-TIMING] render ${name} n=${renders} +${Date.now() - t0}ms`); // перерисовка во время закрытия
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
