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
  awaitWithStillRunningNotice,
} from '../app/account_switch_deadline';
import { accountSwitchStillRunningCopy } from '../app/account_switch_still_running_copy';

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

test('status copy comes from Design (9 languages) and settings uses it', () => {
  // Раунд 4: текст «Дизайна» (9 языков) вместо черновика; Настройки берут его для статуса.
  expect(accountSwitchStillRunningCopy('ru').key).toBe('account_switch_still_running');
  expect(accountSwitchStillRunningCopy('ru').title.length).toBeGreaterThan(0);
  expect(accountSwitchStillRunningCopy('en').body.length).toBeGreaterThan(0);
  expect(accountSwitchStillRunningCopy('uk').title).not.toBe(accountSwitchStillRunningCopy('en').title);
  const settings = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/settings.tsx'), 'utf8');
  expect(settings).toContain('const stillRunning = accountSwitchStillRunningCopy(lang);');
  expect(settings).not.toContain('accountSwitchStillRunningDraft');
});

test('settings wraps both switch calls (save and «без сохранения») with the deadline', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/settings.tsx'), 'utf8');
  expect(source).toContain('const res = await awaitWithStillRunningNotice(signOutAndWipeForAccountSwitch(), ACCOUNT_SWITCH_UI_DEADLINE_MS, onSwitchStillRunning);');
  expect(source).toMatch(/const forced = await awaitWithStillRunningNotice\(signOutAndWipeForAccountSwitch\(\{[\s\S]{0,200}\}\), ACCOUNT_SWITCH_UI_DEADLINE_MS, onSwitchStillRunning\);/);
});

// ── Раунд 4 (L-R3-5): повторный тап после потолка — статус «ещё идёт», а не отказ ──
test('L-R3-5: the still-running mark is set at the deadline and cleared when the switch settles', async () => {
  const deadline = require('../app/account_switch_deadline') as typeof import('../app/account_switch_deadline');
  let finish!: () => void;
  const operation = new Promise<void>((resolve) => { finish = resolve; });
  expect(deadline.isAccountSwitchStillRunning()).toBe(false);
  const pending = deadline.awaitWithStillRunningNotice(operation, 1000, () => undefined);
  await jest.advanceTimersByTimeAsync(999);
  expect(deadline.isAccountSwitchStillRunning()).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  expect(deadline.isAccountSwitchStillRunning()).toBe(true);
  finish();
  await pending;
  expect(deadline.isAccountSwitchStillRunning()).toBe(false);
});

test('L-R3-5: settings answers a repeated tap during a still-running switch with the same status', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/settings.tsx'), 'utf8');
  const marker = 'if (isAccountSwitchStillRunning()) {';
  const first = source.indexOf(marker);
  expect(first).toBeGreaterThan(0);
  expect(source.indexOf(marker, first + 1)).toBeGreaterThan(first);
  expect(source.slice(first, first + 400)).toContain('showAccountSwitchStillRunning();');
});
