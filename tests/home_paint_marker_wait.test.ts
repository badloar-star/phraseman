/**
 * Ожидание настоящего кадра Главной для тяжёлой фоновой работы (посев озвучки — холодный старт 04.10).
 */
describe('whenHomePainted', () => {
  beforeEach(() => {
    jest.resetModules();
    delete (globalThis as { __phrasemanHomePaintedAt?: number }).__phrasemanHomePaintedAt;
    delete (globalThis as { __phrasemanHomePaintWaiters?: unknown }).__phrasemanHomePaintWaiters;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (globalThis as { requestAnimationFrame?: (cb: () => void) => number }).requestAnimationFrame = (cb) => {
      cb();
      return 0;
    };
  });

  test('ждёт отметки кадра и отпускается сразу после неё', async () => {
    const marker = require('../app/home_paint_marker') as typeof import('../app/home_paint_marker');
    const waiting = marker.whenHomePainted(60_000);
    marker.markHomeFirstPaint();
    await expect(waiting).resolves.toBe('painted');
    await expect(marker.whenHomePainted(60_000)).resolves.toBe('painted');
  });

  test('без кадра — отпускается по потолку, работа не теряется', async () => {
    jest.useFakeTimers();
    const marker = require('../app/home_paint_marker') as typeof import('../app/home_paint_marker');
    const waiting = marker.whenHomePainted(1_000);
    jest.advanceTimersByTime(1_000);
    await expect(waiting).resolves.toBe('ceiling');
    jest.useRealTimers();
  });
});
