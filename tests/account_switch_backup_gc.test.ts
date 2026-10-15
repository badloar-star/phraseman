// Уборка аварийных копий (координатор 15.10, 🔴 по прогону №7: 358 из 440 ключей — страницы копий). Сработал — чини уборку, не тест.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPruneAged = jest.fn(async (_now?: number, _keys?: readonly string[]) => 0);
jest.mock('../app/cloud_sync', () => ({
  pruneShelvedAccountSwitchBackups: (now?: number, keys?: readonly string[]) => mockPruneAged(now, keys),
}));

import { __resetAccountSwitchBackupGcForTests, runAccountSwitchBackupGc } from '../app/account_switch_backup_gc';

const SLOT = 'account_switch_emergency_backup_latest_v1';
const PAGE = 'account_switch_emergency_backup_page_v1:';
const SHELF = 'account_switch_emergency_backup_shelved_v1:';
const NOW = Date.UTC(2026, 9, 15, 8, 0, 0);
const HOUR = 60 * 60_000;
const id = (at: number, tail: string) => `${at.toString(36)}-${tail}`;
const root = (owner: string, backupId: string) => JSON.stringify({ version: 3, stableId: owner, backupId, pageCount: 2 });

async function seed(entries: Record<string, string>): Promise<void> {
  await AsyncStorage.multiSet(Object.entries(entries));
}

describe('runAccountSwitchBackupGc', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAccountSwitchBackupGcForTests();
    mockPruneAged.mockClear();
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.join(' ')); });
    jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { logs.push(args.join(' ')); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('одна полка на владельца, страницы без корня снимаются, слот и свежие страницы целы', async () => {
    const slotId = id(NOW - 2 * HOUR, 'slot');
    const oldShelfId = id(NOW - 30 * HOUR, 'aold');
    const newShelfId = id(NOW - 3 * HOUR, 'anew');
    const otherShelfId = id(NOW - 5 * HOUR, 'bshelf');
    const orphanId = id(NOW - 20 * HOUR, 'orphan');
    const writingNowId = id(NOW - 60_000, 'writing');
    await seed({
      [SLOT]: root('owner-C', slotId),
      [`${PAGE}${slotId}:0`]: 'p', [`${PAGE}${slotId}:1`]: 'p',
      [`${SHELF}owner-A:${(NOW - 30 * HOUR).toString(36)}`]: root('owner-A', oldShelfId),
      [`${PAGE}${oldShelfId}:0`]: 'p', [`${PAGE}${oldShelfId}:1`]: 'p',
      [`${SHELF}owner-A:${(NOW - 3 * HOUR).toString(36)}`]: root('owner-A', newShelfId),
      [`${PAGE}${newShelfId}:0`]: 'p',
      [`${SHELF}owner-B:${(NOW - 5 * HOUR).toString(36)}`]: root('owner-B', otherShelfId),
      [`${PAGE}${otherShelfId}:0`]: 'p',
      [`${PAGE}${orphanId}:0`]: 'p', [`${PAGE}${orphanId}:1`]: 'p', [`${PAGE}${orphanId}:2`]: 'p',
      [`${PAGE}${writingNowId}:0`]: 'p',
      'unrelated_key_v1': 'x',
    });

    const result = await runAccountSwitchBackupGc('test', NOW);

    expect(result).toMatchObject({ status: 'done', owners: 3, roots: 4, prunedShelves: 1, prunedPages: 5 });
    const left = new Set(await AsyncStorage.getAllKeys());
    expect(left.has(SLOT)).toBe(true);
    expect(left.has(`${PAGE}${slotId}:1`)).toBe(true);
    expect(left.has(`${SHELF}owner-A:${(NOW - 3 * HOUR).toString(36)}`)).toBe(true);
    expect(left.has(`${PAGE}${newShelfId}:0`)).toBe(true);
    expect(left.has(`${SHELF}owner-B:${(NOW - 5 * HOUR).toString(36)}`)).toBe(true);
    expect(left.has(`${PAGE}${otherShelfId}:0`)).toBe(true);
    // старшая полка A и её страницы, страницы-сироты — сняты; страница копии, которую пишут сейчас, — цела
    expect(left.has(`${SHELF}owner-A:${(NOW - 30 * HOUR).toString(36)}`)).toBe(false);
    expect(left.has(`${PAGE}${oldShelfId}:0`)).toBe(false);
    expect(left.has(`${PAGE}${orphanId}:2`)).toBe(false);
    expect(left.has(`${PAGE}${writingNowId}:0`)).toBe(true);
    expect(left.has('unrelated_key_v1')).toBe(true);
    // чужие полки старше срока — прежним помощником, без снятых ключей в списке
    expect(mockPruneAged).toHaveBeenCalledTimes(1);
    expect(mockPruneAged.mock.calls[0]?.[1]).not.toContain(`${PAGE}${orphanId}:0`);
    expect(logs.some((line) => line.includes('[ACC-SWITCH-BACKUP] owners=3 roots=4') && line.includes('pruned=6'))).toBe(true);
    expect(logs.join('\n')).not.toContain('owner-A');
  });

  it('страницы, общие для слота и полки (дубль после обрыва), не снимаются', async () => {
    const sharedId = id(NOW - 40 * HOUR, 'shared');
    await seed({
      [SLOT]: root('owner-A', sharedId),
      [`${SHELF}owner-B:${(NOW - 40 * HOUR).toString(36)}`]: root('owner-B', sharedId),
      [`${PAGE}${sharedId}:0`]: 'p',
    });
    const result = await runAccountSwitchBackupGc('test', NOW);
    expect(result).toMatchObject({ status: 'done', prunedPages: 0, prunedShelves: 0 });
    expect(await AsyncStorage.getItem(`${PAGE}${sharedId}:0`)).toBe('p');
  });

  it('один раз за процесс и не чаще раза в 6 ч; повтор пишет причину', async () => {
    expect((await runAccountSwitchBackupGc('test', NOW)).status).toBe('done');
    expect((await runAccountSwitchBackupGc('test', NOW)).status).toBe('already_ran');
    __resetAccountSwitchBackupGcForTests();
    expect((await runAccountSwitchBackupGc('test', NOW + HOUR)).status).toBe('throttled');
    __resetAccountSwitchBackupGcForTests();
    expect((await runAccountSwitchBackupGc('test', NOW + 7 * HOUR)).status).toBe('done');
    expect(logs.some((line) => line.includes('[ACC-SWITCH-BACKUP] skip reason=throttled'))).toBe(true);
  });
});
