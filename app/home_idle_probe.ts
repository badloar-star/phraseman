// ═════════════════════════════════════════════════════════════════════
// home_idle_probe.ts — что крутится в покое: таймеры и кадровые циклы по месту вызова ([HOME-IDLE]).
//
// зачем (координатор 04.11, замер Эмулятора): на Главной в покое число View растёт 1,2–1,8 тыс. → 7,4–9,8 тыс. за 13–15 мин, JS-поток 100 % CPU.
// Правило владельца «сперва логи»: вместо догадок печатаем, ОТКУДА создаются таймеры и кадровые циклы и с какой частотой.
// Раз в 15 с одна строка: живые таймеры/интервалы, создания за окно по месту вызова (топ), rAF за окно, рендеры Главной.
// Данных пользователя нет — только имена файлов и числа. Только dev и не стор-релиз: в релизе модуль ничего не делает.
// ═════════════════════════════════════════════════════════════════════
import { IS_STORE_RELEASE } from './config';

const WINDOW_MS = 15_000;
const TOP_SITES = 6;
const TIMEOUT_STACK_EVERY = 20; // стек у каждого 20-го setTimeout: дёшево, но частый источник всё равно виден

type Counter = Record<string, number>;

let installed = false;
let homeRenders = 0;
let liveTimeouts = 0;
let liveIntervals = 0;
let createdTimeouts = 0;
let createdIntervals = 0;
let rafCalls = 0;
const sitesTimeout: Counter = {};
const sitesInterval: Counter = {};
const sitesRaf: Counter = {};

/** Главная сообщает о каждом своём рендере. */
export function noteHomeIdleRender(): void {
  homeRenders += 1;
}

function siteOf(): string {
  const stack = new Error().stack ?? '';
  const lines = stack.split('\n');
  for (const line of lines.slice(2)) {
    if (line.includes('home_idle_probe')) continue;
    const match = /([\w.\-/\\()[\]]+\.(?:tsx?|jsx?|bundle)[:\d]*)/.exec(line);
    return match ? match[1].slice(-70) : line.trim().slice(0, 70);
  }
  return 'unknown';
}

const bump = (bucket: Counter, key: string): void => { bucket[key] = (bucket[key] ?? 0) + 1; };
const top = (bucket: Counter): Counter => Object.fromEntries(Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, TOP_SITES));
const reset = (bucket: Counter): void => { for (const key of Object.keys(bucket)) delete bucket[key]; };

export function installHomeIdleProbe(): void {
  if (installed) return;
  if (typeof __DEV__ === 'undefined' || !__DEV__ || IS_STORE_RELEASE) return;
  installed = true;
  const g = globalThis as unknown as Record<string, unknown>;
  const rawSetTimeout = g.setTimeout as typeof setTimeout;
  const rawSetInterval = g.setInterval as typeof setInterval;
  const rawClearTimeout = g.clearTimeout as typeof clearTimeout;
  const rawClearInterval = g.clearInterval as typeof clearInterval;
  const rawRaf = g.requestAnimationFrame as ((cb: (t: number) => void) => number) | undefined;
  const liveT = new Set<unknown>();
  const liveI = new Set<unknown>();

  g.setTimeout = ((handler: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => {
    createdTimeouts += 1;
    if (createdTimeouts % TIMEOUT_STACK_EVERY === 0) bump(sitesTimeout, siteOf());
    let id: unknown;
    const wrapped = (...a: unknown[]) => { liveT.delete(id); liveTimeouts = liveT.size; return handler(...a); };
    id = rawSetTimeout(wrapped as never, ms, ...(args as never[]));
    liveT.add(id); liveTimeouts = liveT.size;
    return id;
  }) as unknown as typeof setTimeout;
  g.clearTimeout = ((id: never) => { liveT.delete(id); liveTimeouts = liveT.size; return rawClearTimeout(id); }) as unknown as typeof clearTimeout;
  g.setInterval = ((handler: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => {
    createdIntervals += 1;
    bump(sitesInterval, `${siteOf()} @${ms ?? 0}ms`);
    const id = rawSetInterval(handler as never, ms, ...(args as never[]));
    liveI.add(id); liveIntervals = liveI.size;
    return id;
  }) as unknown as typeof setInterval;
  g.clearInterval = ((id: never) => { liveI.delete(id); liveIntervals = liveI.size; return rawClearInterval(id); }) as unknown as typeof clearInterval;
  if (rawRaf) {
    g.requestAnimationFrame = ((cb: (t: number) => void) => { rafCalls += 1; if (rafCalls % TIMEOUT_STACK_EVERY === 0) bump(sitesRaf, siteOf()); return rawRaf(cb); }) as unknown as typeof requestAnimationFrame;
  }

  const startedAt = Date.now();
  rawSetInterval(() => {
    // зачем: строка одна на окно, чтобы вытащить всю цепочку одним поиском [HOME-IDLE]
    console.log('[HOME-IDLE]', JSON.stringify({ // guard-ok: замер покоя Главной, только dev
      tSec: Math.round((Date.now() - startedAt) / 1000),
      homeRenders, liveTimeouts, liveIntervals, createdTimeouts, createdIntervals, rafCalls,
      timeoutSites: top(sitesTimeout), intervalSites: top(sitesInterval), rafSites: top(sitesRaf),
    }));
    homeRenders = 0; createdTimeouts = 0; createdIntervals = 0; rafCalls = 0;
    reset(sitesTimeout); reset(sitesInterval); reset(sitesRaf);
  }, WINDOW_MS);
  console.log('[HOME-IDLE]', JSON.stringify({ stage: 'installed', windowMs: WINDOW_MS })); // guard-ok: замер покоя Главной, только dev
}

installHomeIdleProbe();
