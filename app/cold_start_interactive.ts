/**
 * [COLD-START] interactive — когда Главная после холодного старта стала отзывчивой (только dev).
 *
 * зачем (координатор 15.10, «холодный старт: сперва логи»): цепочка [COLD-START] доходила до первого кадра Главной
 * ([HOME-PAINT] first_frame), но не говорила, когда Главная начала отвечать на касания — после кадра поток JS ещё
 * секундами занят прогревами и восстановлением. «Интерактивна» = 500 мс подряд без разрыва тиков > 80 мс.
 * Без импортов: только глобальные часы входа (cold_start_entry_mark) и кадра Главной (home_paint_marker).
 * Временная трасса — убрать вместе с [COLD-START].
 */
type Holder = {
  __DEV__?: boolean;
  __phrasemanEntryEpochMs?: number;
  __phrasemanHomePaintedAt?: number;
  __phrasemanHomePaintWaiters?: Array<() => void>;
  __phrasemanColdStartInteractiveStarted?: boolean;
};

export const INTERACTIVE_TICK_MS = 50;
export const INTERACTIVE_MAX_GAP_MS = 80;
export const INTERACTIVE_QUIET_MS = 500;
export const INTERACTIVE_CEILING_MS = 30_000;

export type InteractiveResult = Readonly<{
  outcome: 'interactive' | 'ceiling';
  entryToPaintMs: number;
  paintToInteractiveMs: number;
  entryToInteractiveMs: number;
  maxStallAfterPaintMs: number;
  stallsOver200: number;
}>;

type Deps = Readonly<{
  now: () => number;
  setTimer: (cb: () => void, ms: number) => unknown;
  log: (line: string) => void;
}>;

/** Ждёт тишины после кадра Главной и пишет одну итоговую строку. Возвращает итог (для теста). */
export function measureInteractiveAfterPaint(entryAt: number, paintAt: number, deps: Deps): Promise<InteractiveResult> {
  return new Promise((resolve) => {
    let last = deps.now();
    let quietSince = last;
    let maxStall = 0;
    let stallsOver200 = 0;
    const finish = (outcome: InteractiveResult['outcome'], at: number) => {
      const result: InteractiveResult = Object.freeze({
        outcome,
        entryToPaintMs: entryAt > 0 ? paintAt - entryAt : -1,
        paintToInteractiveMs: at - paintAt,
        entryToInteractiveMs: entryAt > 0 ? at - entryAt : -1,
        maxStallAfterPaintMs: maxStall,
        stallsOver200,
      });
      deps.log(`[COLD-START] ${outcome} entryToPaintMs=${result.entryToPaintMs} paintToInteractiveMs=${result.paintToInteractiveMs} entryToInteractiveMs=${result.entryToInteractiveMs} maxStallAfterPaintMs=${maxStall} stallsOver200=${stallsOver200}`);
      resolve(result);
    };
    const tick = () => {
      const now = deps.now();
      const gap = now - last - INTERACTIVE_TICK_MS;
      last = now;
      if (gap > INTERACTIVE_MAX_GAP_MS) {
        quietSince = now;
        if (gap > maxStall) maxStall = gap;
        if (gap > 200) stallsOver200 += 1;
      }
      if (now - quietSince >= INTERACTIVE_QUIET_MS) { finish('interactive', quietSince); return; }
      if (now - paintAt >= INTERACTIVE_CEILING_MS) { finish('ceiling', now); return; }
      deps.setTimer(tick, INTERACTIVE_TICK_MS);
    };
    deps.setTimer(tick, INTERACTIVE_TICK_MS);
  });
}

/** Запуск один раз на процесс; вне dev — ничего. */
export function startColdStartInteractiveTrace(holder: Holder = globalThis as Holder): void {
  if (holder.__DEV__ !== true) return;
  if (holder.__phrasemanColdStartInteractiveStarted) return;
  holder.__phrasemanColdStartInteractiveStarted = true;
  const deps: Deps = {
    now: () => Date.now(),
    setTimer: (cb, ms) => setTimeout(cb, ms),
    log: (line) => console.warn(line), // guard-ok: временная трасса холодного старта (dev)
  };
  const begin = () => {
    const paintAt = typeof holder.__phrasemanHomePaintedAt === 'number' ? holder.__phrasemanHomePaintedAt : Date.now();
    void measureInteractiveAfterPaint(holder.__phrasemanEntryEpochMs ?? -1, paintAt, deps);
  };
  if (typeof holder.__phrasemanHomePaintedAt === 'number') { begin(); return; }
  const waiters = holder.__phrasemanHomePaintWaiters ?? [];
  waiters.push(begin);
  holder.__phrasemanHomePaintWaiters = waiters;
}

startColdStartInteractiveTrace();

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __ColdStartInteractiveRouteShim() { return null; }
