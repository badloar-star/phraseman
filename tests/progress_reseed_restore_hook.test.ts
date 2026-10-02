// зачем (Account V2, Пакет 8I): restore при признаке затирания 8G — ОДИН вызов дозаливки и
// сброс клиентских ключей снимка синхронизации; без признака — ни вызова, ни сброса.
import * as fs from 'fs';
import * as path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

const detect = jest.fn();
const submit = jest.fn();
jest.mock('../app/progress_events_client', () => ({
  detectProgressReseedNeed: (...args: unknown[]) => detect(...args),
  submitProgressReseed: (...args: unknown[]) => submit(...args),
}));

import { __cloudSyncTestHooks } from '../app/cloud_sync';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const { maybeReseedWipedProgressAfterRestore } = __cloudSyncTestHooks;
const SNAPSHOT_KEY = 'cloud_last_sync_snapshot_v1';
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('8I — хук restore', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    detect.mockReset();
    submit.mockReset();
    submit.mockResolvedValue('reseeded');
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((line: unknown) => { logs.push(String(line)); });
    jest.spyOn(console, 'warn').mockImplementation((line: unknown) => { logs.push(String(line)); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('признак затирания → один вызов + из снимка убраны клиентские ключи, которых нет в облаке', async () => {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
      flashcards_v1: '[{"id":1}]', library_saved_v1: '["a"]', user_name: 'Ann', lesson5_cellIndex: '7', streak_count: '4',
    }));
    detect.mockResolvedValue({ snapshot: { lesson5_cellIndex: '7' }, localLessonKeys: 1 });
    const root = { progressServerAuthoritative: true, progress: { user_name: 'Ann' } };
    await expect(maybeReseedWipedProgressAfterRestore(root, 'stable-1', () => true)).resolves.toBe('reseed_started');
    await flush();
    expect(detect).toHaveBeenCalledWith('stable-1', { user_name: 'Ann' });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith('stable-1', { lesson5_cellIndex: '7' });
    // Клиентские ключи без облачной копии — из снимка вон; серверные и совпадающие — остаются.
    expect(JSON.parse(String(await AsyncStorage.getItem(SNAPSHOT_KEY)))).toEqual({
      user_name: 'Ann', lesson5_cellIndex: '7', streak_count: '4',
    });
    expect(logs).toContain('[PROGRESS-RESEED] client_snapshot_reset removed_keys=2');
    for (const line of logs) expect(line).not.toContain('stable-1');
  });

  it('без признака (детектор ответил null) — нет вызова, снимок не тронут', async () => {
    const snapshot = JSON.stringify({ flashcards_v1: '[]' });
    await AsyncStorage.setItem(SNAPSHOT_KEY, snapshot);
    detect.mockResolvedValue(null);
    await expect(maybeReseedWipedProgressAfterRestore({ progressServerAuthoritative: true, progress: {} }, 'stable-1', () => true))
      .resolves.toBe('skipped');
    await flush();
    expect(submit).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(SNAPSHOT_KEY)).toBe(snapshot);
  });

  it('аккаунт без серверного прогресса — даже детектор не зовём', async () => {
    await expect(maybeReseedWipedProgressAfterRestore({ progress: {} }, 'stable-1', () => true)).resolves.toBe('skipped');
    expect(detect).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(logs).toContain('[PROGRESS-RESEED] skip reason=not_authoritative flag=undefined');
  });

  it('аккаунт сменился, пока проверяли, — ни сброса, ни вызова', async () => {
    const snapshot = JSON.stringify({ flashcards_v1: '[]' });
    await AsyncStorage.setItem(SNAPSHOT_KEY, snapshot);
    detect.mockResolvedValue({ snapshot: { lesson5_cellIndex: '7' }, localLessonKeys: 1 });
    await expect(maybeReseedWipedProgressAfterRestore({ progressServerAuthoritative: true, progress: {} }, 'stable-1', () => false))
      .resolves.toBe('skipped');
    expect(submit).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(SNAPSHOT_KEY)).toBe(snapshot);
  });

  it('смена аккаунта между чтением и записью снимка — снимок не пишется, вызова нет', async () => {
    const snapshot = JSON.stringify({ flashcards_v1: '[]', user_name: 'Ann' });
    await AsyncStorage.setItem(SNAPSHOT_KEY, snapshot);
    detect.mockResolvedValue({ snapshot: { lesson5_cellIndex: '7' }, localLessonKeys: 1 });
    let checks = 0;
    // 1-я проверка (до сброса) — аккаунт тот же; 2-я (после getItem, перед setItem) — уже другой.
    const isCurrent = () => { checks += 1; return checks < 2; };
    await expect(maybeReseedWipedProgressAfterRestore({ progressServerAuthoritative: true, progress: {} }, 'stable-1', isCurrent))
      .resolves.toBe('skipped');
    await flush();
    expect(checks).toBeGreaterThanOrEqual(2);
    expect(submit).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(SNAPSHOT_KEY)).toBe(snapshot);
    expect(logs).toContain('[PROGRESS-RESEED] skip reason=stale_account_generation stage=snapshot_reset');
  });

  it('проводка: restore зовёт хук после применения документа и не падает от его ошибки', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8').replace(/\r\n/g, '\n');
    const body = source.slice(source.indexOf('async function restoreAndMigrateFromCloudResult('));
    const applyAt = body.indexOf('applyRestoreFromUserDoc(doc, isCurrent');
    const hookAt = body.indexOf('await maybeReseedWipedProgressAfterRestore(doc.data() ?? {}, uid, isCurrent);');
    expect(applyAt).toBeGreaterThan(-1);
    expect(hookAt).toBeGreaterThan(applyAt);
    expect(body.slice(hookAt - 200, hookAt)).toContain('try {');
    expect(body.slice(hookAt, hookAt + 300)).toContain('[PROGRESS-RESEED] restore_hook_failed');
  });
});
