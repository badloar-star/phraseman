// зачем (Сверка 24.10 через координатора): раздел «Наборы» показывал только серые заглушки и не выходил из них — без сети запрос
// каталога висел, а флаг «каталог пришёл» ставился только по завершению загрузки. Сторож: заглушки снимаются всегда —
// пришло, упало или не ответило за SETS_LOAD_CEILING_MS; поздний ответ не дёргает экран повторно. Журнал [SETS-LOAD].
import fs from 'node:fs';
import path from 'node:path';
import { SETS_LOAD_CEILING_MS, awaitSetsLoadWithCeiling } from '../app/flashcards/sets_load_ceiling';

beforeEach(() => { jest.useFakeTimers(); jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('каталог ответил — заглушки сняты один раз, исход done', async () => {
  const onSettled = jest.fn();
  const outcome = awaitSetsLoadWithCeiling(() => Promise.resolve([]), onSettled, { reason: 'focus' });
  await expect(outcome).resolves.toBe('done');
  expect(onSettled).toHaveBeenCalledTimes(1);
  expect(onSettled).toHaveBeenCalledWith('done');
});

test('загрузка упала — заглушки всё равно сняты, исход error, причина в журнале', async () => {
  const onSettled = jest.fn();
  const outcome = awaitSetsLoadWithCeiling(() => Promise.reject(new Error('unavailable')), onSettled, { reason: 'retry' });
  await expect(outcome).resolves.toBe('error');
  expect(onSettled).toHaveBeenCalledWith('error');
  expect((console.log as jest.Mock).mock.calls.some((c) => String(c[0]).includes('[SETS-LOAD] settle outcome=error') && String(c[0]).includes('unavailable'))).toBe(true);
});

test('каталог не ответил (нет сети) — по потолку заглушки сняты; поздний ответ экран не дёргает', async () => {
  const onSettled = jest.fn();
  let resolveLate: (v: unknown) => void = () => undefined;
  const outcome = awaitSetsLoadWithCeiling(() => new Promise((r) => { resolveLate = r; }), onSettled, { reason: 'focus' });
  jest.advanceTimersByTime(SETS_LOAD_CEILING_MS - 1);
  expect(onSettled).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  await expect(outcome).resolves.toBe('ceiling');
  expect(onSettled).toHaveBeenCalledWith('ceiling');
  resolveLate([]);
  await Promise.resolve();
  expect(onSettled).toHaveBeenCalledTimes(1);
  expect((console.log as jest.Mock).mock.calls.some((c) => String(c[0]).startsWith('[SETS-LOAD] late done'))).toBe(true);
});

test('синхронная ошибка загрузчика не оставляет заглушки', async () => {
  const onSettled = jest.fn();
  await expect(awaitSetsLoadWithCeiling(() => { throw new TypeError('boom'); }, onSettled, { reason: 'focus' })).resolves.toBe('error');
  expect(onSettled).toHaveBeenCalledWith('error');
});

test('экран «Наборы» снимает заглушки через потолок и на входе, и на «Повторить»; загрузка пишет [SETS-LOAD]', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/flashcards_packs.tsx'), 'utf8');
  expect(src).toContain("awaitSetsLoadWithCeiling(() => loadHubMarket(), () => setCommunityLoaded(true), { reason: 'focus' })");
  expect(src).toContain("awaitSetsLoadWithCeiling(() => loadHubMarket({ force: true }), () => setCommunityLoaded(true), { reason: 'retry' })");
  expect(src).not.toContain('loadHubMarket().finally(() => setCommunityLoaded(true))');
  for (const tag of ["'[SETS-LOAD] load:enter'", '[SETS-LOAD] load:throttled', "'[SETS-LOAD] load:network'"]) expect(src).toContain(tag);
});
