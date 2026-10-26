// home_scroll_probe.ts — [HOME-SCROLL]: сколько раз перерисовались оболочка вкладок, Главная и «Сцена» за время прокрутки Главной.
// зачем (срочно, владелец 25.10: «скролл стал дёрганым, на главной смотри»; замер Сверки: Главная janky 81 %, p99 2000 мс; правило «сперва логи»):
// прокрутка Главной должна идти на UI-потоке и НЕ перерисовывать дерево. Счётчики растут в теле рендера (noteHomeRender) и на каждом прыжке полосы
// в JS (noteHomeScrollHop); пока окно прокрутки открыто (от касания до остановки), раз в секунду печатается строка и счётчики обнуляются.
// Значений состояния не пишем — только числа. Без таймеров вне прокрутки: интервал живёт ровно пока идёт окно.

type CounterKey = 'layout' | 'home' | 'scene';

// зачем (Ревизор + координатор 26.10): в сборке для магазина console.log вырезан (babel.config.js), а цикл кадров и таймер жили бы на каждой прокрутке Главной — лишняя работа JS ровно там, где
// владелец жалуется на дёрганый скролл, и без пользы. Зонд работает только в dev-сборке. typeof-гард: в тестах без react-native-окружения __DEV__ может не быть — тогда зонд включён.
function probeEnabled(): boolean {
  return typeof __DEV__ === 'undefined' || __DEV__ === true;
}

// зачем (координатор 26.10, «сперва логи» для «скролл стал дёрганым»): счётчики перерисовок не показывают, ЧТО видит человек. Пока окно прокрутки открыто, каждый кадр JS-потока
// (requestAnimationFrame) меряет промежуток до прошлого: сколько кадров, самый длинный промежуток, сколько кадров дольше 50 и 100 мс. Промежуток > 33 мс = JS не успел отдать кадр.
// UI-поток этим не виден (его janky меряет Сверка по gfxinfo) — но если провалы JS совпадают с перерисовками, причина найдена. Только числа, раз в секунду, только пока идёт прокрутка.
const frames = { n: 0, maxGap: 0, over50: 0, over100: 0, sumGap: 0 };

const counts: Record<CounterKey | 'hops', number> = { layout: 0, home: 0, scene: 0, hops: 0 };
const WINDOW_TICK_MS = 1000;
const IDLE_CLOSE_MS = 1600;

let active = false;
let startedAt = 0;
let lastActivityAt = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let rafId: number | null = null;
let lastFrameAt = 0;

function resetFrames(): void { frames.n = 0; frames.maxGap = 0; frames.over50 = 0; frames.over100 = 0; frames.sumGap = 0; }

/** Промежуток между кадрами JS-потока, мс. Открыто для теста; в приложении зовётся из цикла кадров. */
export function noteHomeFrameGap(gapMs: number): void {
  if (!active || !Number.isFinite(gapMs) || gapMs < 0) return;
  frames.n += 1;
  frames.sumGap += gapMs;
  if (gapMs > frames.maxGap) frames.maxGap = gapMs;
  if (gapMs > 50) frames.over50 += 1;
  if (gapMs > 100) frames.over100 += 1;
}

function frameLoop(): void {
  const now = Date.now();
  if (lastFrameAt > 0) noteHomeFrameGap(now - lastFrameAt);
  lastFrameAt = now;
  rafId = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(frameLoop) : null;
}

function print(event: string): void {
  const now = Date.now();
  console.log('[HOME-SCROLL]', event, JSON.stringify({ tMs: now - startedAt, layout: counts.layout, home: counts.home, scene: counts.scene, jsHops: counts.hops, frames: frames.n, avgGapMs: frames.n > 0 ? Math.round(frames.sumGap / frames.n) : null, maxGapMs: Math.round(frames.maxGap), over50: frames.over50, over100: frames.over100 })); // guard-ok: числа за секунду прокрутки
  counts.layout = 0; counts.home = 0; counts.scene = 0; counts.hops = 0;
  resetFrames();
}

function stop(reason: string): void {
  if (!active) return;
  print(`end:${reason}`);
  active = false;
  if (timer) { clearInterval(timer); timer = null; }
  if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
  rafId = null;
  lastFrameAt = 0;
}

/** Окно открывается касанием прокрутки (onScrollBeginDrag) и закрывается остановкой/простоем. */
export function startHomeScrollWindow(): void {
  if (!probeEnabled()) return; // сборка магазина: ни кадров, ни таймера (причина — в комментарии к probeEnabled)
  lastActivityAt = Date.now();
  if (active) return;
  active = true;
  startedAt = lastActivityAt;
  counts.layout = 0; counts.home = 0; counts.scene = 0; counts.hops = 0;
  resetFrames();
  lastFrameAt = 0;
  frameLoop();
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
  if (!probeEnabled() || !active) return;
  counts.hops += 1;
  lastActivityAt = Date.now();
}

/* expo-router: утилита, не экран */
export default function __HomeScrollProbeRouteShim() {
  return null;
}
