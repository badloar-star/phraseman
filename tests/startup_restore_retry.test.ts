// зачем (правило владельца 18.10, матрица Сайта A12): после переустановки сбой восстановления не показывает тост — повторы идут тихо в фоне.
const mockEmit = jest.fn();
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));
jest.mock('../app/net_status', () => ({ getNetStatus: () => 'online', subscribeNetStatus: () => () => undefined }));

import fs from 'fs';
import path from 'path';
import { scheduleSilentStartupRestore, STARTUP_RESTORE_RETRY_DELAYS_MS } from '../app/startup_restore_retry';

type Timer = { fn: () => void; ms: number; cleared: boolean };

function makeHarness(opts: { results: Array<'failed' | 'restored' | 'throw'>; offline?: boolean }) {
  const timers: Timer[] = [];
  const onlineListeners: Array<() => void> = [];
  let offline = opts.offline ?? false;
  const attempt = jest.fn(async () => {
    const next = opts.results.shift() ?? 'failed';
    if (next === 'throw') throw new Error('boom user@example.test');
    return { status: next, failureReason: next === 'failed' ? 'transport_unavailable' : null };
  });
  const notifyOffline = jest.fn();
  const cancel = scheduleSilentStartupRestore({
    attempt,
    notifyOffline,
    isOffline: () => offline,
    onOnline: (listener) => { onlineListeners.push(listener); return () => { onlineListeners.splice(onlineListeners.indexOf(listener), 1); }; },
    setTimer: (fn, ms) => { const t: Timer = { fn, ms, cleared: false }; timers.push(t); return t; },
    clearTimer: (h) => { (h as Timer).cleared = true; },
  });
  const fire = async () => {
    const t = timers.filter((x) => !x.cleared).pop()!;
    t.cleared = true;
    t.fn();
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  };
  return { attempt, notifyOffline, cancel, timers, onlineListeners, fire, setOffline: (v: boolean) => { offline = v; } };
}

describe('scheduleSilentStartupRestore', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => { mockEmit.mockClear(); logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); warnSpy.mockRestore(); });

  it('первый повтор через 5 с; успех — тишина: ни тоста, ни следующих таймеров', async () => {
    const h = makeHarness({ results: ['restored'] });
    expect(h.timers[0]!.ms).toBe(STARTUP_RESTORE_RETRY_DELAYS_MS[0]);
    await h.fire();
    expect(h.attempt).toHaveBeenCalledTimes(1);
    expect(h.timers).toHaveLength(1);
    expect(h.notifyOffline).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('три неудачи подряд при живой сети — тоже тишина до следующего старта', async () => {
    const h = makeHarness({ results: ['failed', 'throw', 'failed'], offline: false });
    await h.fire(); await h.fire(); await h.fire();
    expect(h.attempt).toHaveBeenCalledTimes(3);
    expect(h.timers.map((t) => t.ms)).toEqual([...STARTUP_RESTORE_RETRY_DELAYS_MS]);
    expect(h.notifyOffline).not.toHaveBeenCalled();
    expect(h.onlineListeners).toHaveLength(0);
  });

  it('интернета нет: одна спокойная строка и одна тихая попытка после возврата сети', async () => {
    const h = makeHarness({ results: ['failed', 'failed', 'failed', 'restored'], offline: true });
    await h.fire(); await h.fire(); await h.fire();
    expect(h.notifyOffline).toHaveBeenCalledTimes(1);
    expect(h.onlineListeners).toHaveLength(1);
    h.onlineListeners[0]!();
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(h.attempt).toHaveBeenCalledTimes(4);
    expect(h.onlineListeners).toHaveLength(0);
    expect(h.notifyOffline).toHaveBeenCalledTimes(1);
  });

  it('отмена снимает таймеры и подписку; незавершённая попытка новых не ставит', async () => {
    const h = makeHarness({ results: ['failed'] });
    h.cancel();
    expect(h.timers[0]!.cleared).toBe(true);
    expect(h.timers).toHaveLength(1);
  });

  it('журнал не содержит текста ошибки (там бывает почта)', async () => {
    const h = makeHarness({ results: ['throw'] });
    await h.fire();
    const written = JSON.stringify(warnSpy.mock.calls);
    expect(written).not.toContain('user@example.test');
    expect(written).toContain('Error');
  });
});

describe('_layout: ветка cloud_unavailable_toast не выводит тост, а запускает тихий повтор', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');

  it('текста про облако в _layout нет; вызывается планировщик с той же функцией восстановления', () => {
    expect(layout).not.toContain('Облако сейчас недоступно');
    const start = layout.indexOf("recoveryPresentation === 'cloud_unavailable_toast'");
    expect(start).toBeGreaterThan(-1);
    const branch = layout.slice(start, start + 900);
    expect(branch).toContain('scheduleSilentStartupRestore(');
    expect(branch).toContain('restoreFromCloudWithRecoveryDetails(coldExamBestPctRestoreOptions)');
    expect(branch).not.toContain("emitAppEvent('action_toast'");
  });

  it('единственная строка — в модуле повтора и только про отсутствие интернета', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/startup_restore_retry.ts'), 'utf8');
    expect(source).toContain('Нет интернета. Восстановим прогресс, как только он появится.');
    expect(source).not.toContain("messageRu: 'Облако");
  });
});
