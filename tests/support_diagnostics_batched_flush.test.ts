/**
 * Журнал диагностики пишется на диск пачкой (координатор 12.10, правило «ничего не замедлять»):
 * событие — в память; сброс — таймер 30 с, уход в фон, захват журнала для обращения. Событие ушедшего аккаунта не попадает в новый.
 */
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, invalidateAccountGeneration } from '../app/account_generation';
import {
  captureSupportDiagnosticBundle,
  flushSupportDiagnostics,
  getPendingSupportDiagnosticCount,
  onSupportDiagnosticPending,
  recordSupportDiagnostic,
  resetSupportDiagnosticsPendingForTests,
} from '../app/support_diagnostics';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/remote_flags', () => ({
  ...jest.requireActual('../app/remote_flags'),
  isSupportDiagnosticsEnabled: () => true,
}));

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('журнал диагностики: пакетный сброс', () => {
  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    resetSupportDiagnosticsPendingForTests();
    await AsyncStorage.clear();
    beginAccountGeneration('stable-batch');
  });

  it('50 событий — ни одной записи на диск до сброса; сброс пишет ключ ОДИН раз', async () => {
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    setItem.mockClear();
    getItem.mockClear();
    const listener = jest.fn();
    onSupportDiagnosticPending(listener);
    const base = Date.now();
    for (let i = 0; i < 50; i += 1) await recordSupportDiagnostic({ atMs: base + i, event: 'navigation', screen: `/s${i}`, result: 'info' });
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(getPendingSupportDiagnosticCount()).toBe(50);
    expect(listener).toHaveBeenCalledTimes(50);
    expect(await flushSupportDiagnostics('test')).toBe(50);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(getPendingSupportDiagnosticCount()).toBe(0);
  });

  it('захват журнала для обращения сначала сбрасывает буфер — последние события в обращении есть', async () => {
    const now = Date.now();
    await recordSupportDiagnostic({ atMs: now, event: 'navigation', screen: '/support', result: 'info' });
    expect(getPendingSupportDiagnosticCount()).toBe(1);
    const bundle = await captureSupportDiagnosticBundle(now + 10);
    expect(bundle?.events.map((e) => e.screen)).toEqual(['/support']);
    expect(getPendingSupportDiagnosticCount()).toBe(0);
  });

  it('событие ушедшего аккаунта при сбросе отбрасывается и не попадает в новый', async () => {
    const now = Date.now();
    await recordSupportDiagnostic({ atMs: now, event: 'navigation', screen: '/old', result: 'info' });
    invalidateAccountGeneration();
    beginAccountGeneration('stable-new');
    expect(await flushSupportDiagnostics('test')).toBe(0);
    expect((await captureSupportDiagnosticBundle(now + 10))?.events ?? []).toEqual([]);
  });

  it('планировщик: 30 с и уход в фон, таймеры — вне кольца; app_activity подключает планировщик', () => {
    const flush = read('app/support_diagnostics_flush.ts');
    expect(flush).toContain('export const SUPPORT_DIAGNOSTIC_FLUSH_DELAY_MS = 30_000;');
    expect(flush).toContain("if (state === 'background' || state === 'inactive') runFlush(`app_${state}`);");
    expect(flush).toContain('onSupportDiagnosticPending(scheduleSupportDiagnosticFlush);');
    expect(read('app/support_diagnostics.ts')).not.toMatch(/setTimeout|setInterval/);
    expect(read('app/app_activity.ts')).toContain("import './support_diagnostics_flush';");
  });
});
