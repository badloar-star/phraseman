/** PM-220: метка [NAV-PAINT] — одна строка на смену маршрута, первый маршрут пропускается, группы. */
import { __resetNavPaintForTests, navPaintGroup, noteNavRoute, normalizeNavRoute } from '../app/nav_paint_trace';

beforeEach(() => {
  __resetNavPaintForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  (global as unknown as { requestAnimationFrame: (cb: () => void) => void }).requestAnimationFrame = (cb) => cb();
});
afterEach(() => jest.restoreAllMocks());

test('groups: training routes, tabs, other screens', () => {
  expect(navPaintGroup('/lesson1')).toBe('training');
  expect(navPaintGroup('/flashcards_blitz_session')).toBe('training');
  expect(navPaintGroup('/home')).toBe('tab');
  expect(navPaintGroup('/')).toBe('tab');
  expect(navPaintGroup('/manage_subscription')).toBe('screen');
});

test('first route is skipped (covered by [HOME-PAINT]); repeats of the same route are ignored', () => {
  let t = 1000;
  noteNavRoute('/home', () => t);
  noteNavRoute('/home', () => t);
  expect(console.warn).not.toHaveBeenCalled();
  noteNavRoute('/lesson1', () => { t += 50; return t; });
  expect(console.warn).toHaveBeenCalledTimes(1);
  expect((console.warn as jest.Mock).mock.calls[0][0]).toMatch(/^\[NAV-PAINT\] group=training route=\/lesson1 ms=\d+$/);
});

test('query and hash never reach the log', () => {
  expect(normalizeNavRoute('/pack_opening?packId=secret#x')).toBe('/pack_opening');
});
