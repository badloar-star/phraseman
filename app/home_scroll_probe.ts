// home_scroll_probe.ts — [HOME-SCROLL]: сколько раз перерисовались оболочка вкладок, Главная и «Сцена» за время прокрутки Главной.
// зачем (срочно, владелец 25.10: «скролл стал дёрганым, на главной смотри»; замер Сверки: Главная janky 81 %, p99 2000 мс; правило «сперва логи»):
// прокрутка Главной должна идти на UI-потоке и НЕ перерисовывать дерево. Счётчики растут в теле рендера (noteHomeRender) и на каждом прыжке полосы
// в JS (noteHomeScrollHop); пока окно прокрутки открыто (от касания до остановки), раз в секунду печатается строка и счётчики обнуляются.
// Значений состояния не пишем — только числа. Без таймеров вне прокрутки: интервал живёт ровно пока идёт окно.

type CounterKey = 'layout' | 'home' | 'scene';

const counts: Record<CounterKey | 'hops', number> = { layout: 0, home: 0, scene: 0, hops: 0 };
const WINDOW_TICK_MS = 1000;
const IDLE_CLOSE_MS = 1600;

let active = false;
let startedAt = 0;
let lastActivityAt = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function print(event: string): void {
  const now = Date.now();
  console.log('[HOME-SCROLL]', event, JSON.stringify({ tMs: now - startedAt, layout: counts.layout, home: counts.home, scene: counts.scene, jsHops: counts.hops })); // guard-ok: числа за секунду прокрутки
  counts.layout = 0; counts.home = 0; counts.scene = 0; counts.hops = 0;
}

function stop(reason: string): void {
  if (!active) return;
  print(`end:${reason}`);
  active = false;
  if (timer) { clearInterval(timer); timer = null; }
}

/** Окно открывается касанием прокрутки (onScrollBeginDrag) и закрывается остановкой/простоем. */
export function startHomeScrollWindow(): void {
  lastActivityAt = Date.now();
  if (active) return;
  active = true;
  startedAt = lastActivityAt;
  counts.layout = 0; counts.home = 0; counts.scene = 0; counts.hops = 0;
  console.log('[HOME-SCROLL]', 'start'); // guard-ok: начало окна прокрутки
  timer = setInterval(() => {
    if (Date.now() - lastActivityAt > IDLE_CLOSE_MS) { stop('idle'); return; }
    print('tick');
  }, WINDOW_TICK_MS);
}

export function endHomeScrollWindow(reason: string): void {
  stop(reason);
}

/** Тело рендера: считаем только пока окно открыто (вне прокрутки — одна проверка флага). */
export function noteHomeRender(key: CounterKey): void {
  if (!active) return;
  counts[key] += 1;
  lastActivityAt = Date.now();
}

/** Прыжок полосы из UI-потока в JS (runOnJS(notifyHomeScrollY)). */
export function noteHomeScrollHop(): void {
  if (!active) return;
  counts.hops += 1;
  lastActivityAt = Date.now();
}

/* expo-router: утилита, не экран */
export default function __HomeScrollProbeRouteShim() {
  return null;
}
