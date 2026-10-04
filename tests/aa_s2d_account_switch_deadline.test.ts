/*
 * AA S2d (§139, аудит Optimistic UI): оверлей «стираю» при смене аккаунта не висит
 * бесконечно. Через ACCOUNT_SWITCH_UI_DEADLINE_MS оверлей снимается и показывается
 * статус «ещё идёт» — но сама смена НЕ обрывается (обещание то же): стирание идёт
 * через маркер/карантин и возобновляется на следующем старте, а результат
 * обрабатывается как обычно, когда придёт.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  ACCOUNT_SWITCH_UI_DEADLINE_MS,
  accountSwitchStillRunningDraft,
  awaitWithStillRunningNotice,
} from '../app/account_switch_deadline';

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  warn.mockRestore();
});

test('slow switch: notice fires once at the deadline, the operation is NOT aborted and its result still arrives', async () => {
  let finish!: (value: string) => void;
  const operation = new Promise<string>((resolve) => { finish = resolve; });
  const onStillRunning = jest.fn();
  let settled: string | null = null;
  const pending = awaitWithStillRunningNotice(operation, ACCOUNT_SWITCH_UI_DEADLINE_MS, onStillRunning)
    .then((value) => { settled = value; });

  await jest.advanceTimersByTimeAsync(ACCOUNT_SWITCH_UI_DEADLINE_MS - 1);
  expect(onStillRunning).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(onStillRunning).toHaveBeenCalledTimes(1);
  expect(settled).toBeNull();
  expect(warn.mock.calls.map((c) => String(c[0])).some((l) => l.startsWith('[ACC-SWITCH-WIPE] ui_deadline still_running'))).toBe(true);

  finish('done');
  await pending;
  expect(settled).toBe('done');
  expect(onStillRunning).toHaveBeenCalledTimes(1);
});

test('fast switch: no notice, timer cleared', async () => {
  const onStillRunning = jest.fn();
  await expect(awaitWithStillRunningNotice(Promise.resolve(7), ACCOUNT_SWITCH_UI_DEADLINE_MS, onStillRunning)).resolves.toBe(7);
  await jest.advanceTimersByTimeAsync(ACCOUNT_SWITCH_UI_DEADLINE_MS * 2);
  expect(onStillRunning).not.toHaveBeenCalled();
});

test('a failing switch still rejects to the caller and never fires the notice after settling', async () => {
  const onStillRunning = jest.fn();
  await expect(awaitWithStillRunningNotice(Promise.reject(new Error('boom')), 1000, onStillRunning)).rejects.toThrow('boom');
  await jest.advanceTimersByTimeAsync(2000);
  expect(onStillRunning).not.toHaveBeenCalled();
});

test('draft copy has ru/en with a key for Design', () => {
  expect(accountSwitchStillRunningDraft('ru').key).toBe('account_switch_still_running');
  expect(accountSwitchStillRunningDraft('ru').title.length).toBeGreaterThan(0);
  expect(accountSwitchStillRunningDraft('en').body.length).toBeGreaterThan(0);
  expect(accountSwitchStillRunningDraft('uk')).toEqual(accountSwitchStillRunningDraft('ru'));
});

test('settings wraps both switch calls (save and «без сохранения») with the deadline', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/settings.tsx'), 'utf8');
  expect(source).toContain('const res = await awaitWithStillRunningNotice(signOutAndWipeForAccountSwitch(), ACCOUNT_SWITCH_UI_DEADLINE_MS, onSwitchStillRunning);');
  expect(source).toMatch(/const forced = await awaitWithStillRunningNotice\(signOutAndWipeForAccountSwitch\(\{[\s\S]{0,200}\}\), ACCOUNT_SWITCH_UI_DEADLINE_MS, onSwitchStillRunning\);/);
});
