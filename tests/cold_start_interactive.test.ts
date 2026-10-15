/**
 * [COLD-START] interactive (app/cold_start_interactive.ts): когда Главная стала отзывчивой после холодного старта.
 * зачем (координатор 15.10): «интерактивна» = 500 мс подряд без разрыва тиков > 80 мс; потолок 30 с; вне dev — ничего.
 */
import {
  INTERACTIVE_CEILING_MS,
  measureInteractiveAfterPaint,
  startColdStartInteractiveTrace,
} from '../app/cold_start_interactive';

/** Фальшивые часы: каждый тик сдвигает время на заданную величину (50 мс = тишина, больше — остановка потока). */
function fakeClock(stepsMs: number[], start = 10_000) {
  let now = start;
  let i = 0;
  const lines: string[] = [];
  const deps = {
    now: () => now,
    setTimer: (cb: () => void) => {
      const step = stepsMs[Math.min(i, stepsMs.length - 1)];
      i += 1;
      now += step;
      cb();
    },
    log: (l: string) => { lines.push(l); },
  };
  return { deps, lines, at: () => now };
}

describe('[COLD-START] interactive', () => {
  it('сразу тихо — интерактивна через 500 мс после кадра', async () => {
    const c = fakeClock([50]);
    const r = await measureInteractiveAfterPaint(4_000, 10_000, c.deps);
    expect(r.outcome).toBe('interactive');
    expect(r.paintToInteractiveMs).toBe(0);
    expect(r.entryToPaintMs).toBe(6_000);
    expect(r.maxStallAfterPaintMs).toBe(0);
    expect(c.lines[0]).toContain('[COLD-START] interactive entryToPaintMs=6000');
  });

  it('остановки потока сдвигают отсчёт тишины и попадают в счётчики', async () => {
    // две остановки (700 и 300 мс), затем тишина
    const c = fakeClock([50, 50, 750, 50, 350, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]);
    const r = await measureInteractiveAfterPaint(4_000, 10_000, c.deps);
    expect(r.outcome).toBe('interactive');
    expect(r.maxStallAfterPaintMs).toBe(700);
    expect(r.stallsOver200).toBe(2);
    expect(r.paintToInteractiveMs).toBe(50 + 50 + 750 + 50 + 350); // тишина отсчитывается от последней остановки
  });

  it('поток так и не успокоился — потолок', async () => {
    const c = fakeClock([400]);
    const r = await measureInteractiveAfterPaint(-1, 10_000, c.deps);
    expect(r.outcome).toBe('ceiling');
    expect(r.paintToInteractiveMs).toBeGreaterThanOrEqual(INTERACTIVE_CEILING_MS);
    expect(r.entryToPaintMs).toBe(-1);
  });

  it('вне dev ничего не запускает', () => {
    const holder: Record<string, unknown> = { __DEV__: false };
    startColdStartInteractiveTrace(holder as never);
    expect(holder.__phrasemanColdStartInteractiveStarted).toBeUndefined();
    expect(holder.__phrasemanHomePaintWaiters).toBeUndefined();
  });

  it('в dev встаёт в очередь ожидания кадра Главной один раз', () => {
    const holder: Record<string, unknown> = { __DEV__: true };
    startColdStartInteractiveTrace(holder as never);
    startColdStartInteractiveTrace(holder as never);
    expect((holder.__phrasemanHomePaintWaiters as unknown[]).length).toBe(1);
  });
});
