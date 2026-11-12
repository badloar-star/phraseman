/**
 * зачем (координатор 12.11, обход 4: холодный старт Главной — «Сегодня» на первом кадре один набор, через секунду другой,
 * раскладка съезжает): первый кадр должен показывать тот же набор дня, что потом прочитает загрузка с диска.
 * Стартовое чтение снимка кладёт сохранённый день и список видов в память до первого кадра.
 */
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TODAY_TASK_POOL, createTodayTasksDay, todayLocalDayKey, type TodayTaskKindCore } from '../modules/today-tasks/today_tasks_core';
import {
  __todayTasksStoreTestHooks as hooks,
  peekTodayTasks,
  peekTodayTasksAvailableKinds,
  primeTodayTasksFromBoot,
  refreshTodayTasks,
  todayTasksBootKeys,
} from '../modules/today-tasks/today_tasks_store';

const OWNER = 'owner-cold-1';
const NOON = new Date(2026, 10, 12, 12, 0, 0).getTime();
const KINDS: readonly TodayTaskKindCore[] = TODAY_TASK_POOL.filter((k) => k !== 'spire_steps');
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const kindsOf = (state: { tasks: readonly { kind: string }[] } | null) => state?.tasks.map((t) => t.kind) ?? null;

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  hooks.setDeps({
    now: () => NOON,
    ownerStableId: async () => OWNER,
    grant: async () => undefined,
    sha256Hex: async (input) => {
      const { createHash } = await import('node:crypto');
      return createHash('sha256').update(input).digest('hex');
    },
  });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** День сохранён — «перезапуск»: память пуста, на диске день и список видов. */
async function savedDayThenColdStart(): Promise<{ state: string | null; available: string | null; savedKinds: string[] | null }> {
  const saved = await refreshTodayTasks(KINDS);
  const keys = todayTasksBootKeys(OWNER);
  const [state, available] = await Promise.all([AsyncStorage.getItem(keys.state), AsyncStorage.getItem(keys.available)]);
  hooks.simulateRestart();
  return { state, available, savedKinds: kindsOf(saved) };
}

it('холодный старт без стартового чтения: память пуста — первый кадр собирал набор «на глазок»', async () => {
  await savedDayThenColdStart();
  expect(peekTodayTasks()).toBeNull();
  expect(peekTodayTasksAvailableKinds()).toBeNull();
});

it('после стартового чтения первый кадр видит сохранённый день — тот же, что потом загрузит диск', async () => {
  const boot = await savedDayThenColdStart();
  primeTodayTasksFromBoot(boot.state, boot.available, OWNER);
  const firstFrame = kindsOf(peekTodayTasks());
  expect(firstFrame).toEqual(boot.savedKinds);
  const afterLoad = kindsOf(await refreshTodayTasks(KINDS));
  expect(afterLoad).toEqual(firstFrame);
});

it('нового дня ещё нет: первый кадр строит день из того же сохранённого списка видов, что и загрузка', async () => {
  const boot = await savedDayThenColdStart();
  // следующий день — сохранённого состояния на сегодня нет
  const TOMORROW = NOON + 24 * 60 * 60 * 1000;
  hooks.setDeps({ now: () => TOMORROW, ownerStableId: async () => OWNER, grant: async () => undefined,
    sha256Hex: async (input) => (await import('node:crypto')).createHash('sha256').update(input).digest('hex') });
  primeTodayTasksFromBoot(boot.state, boot.available, OWNER);
  expect(peekTodayTasks()).toBeNull();
  const stored = peekTodayTasksAvailableKinds();
  expect(stored).not.toBeNull();
  const firstFrame = kindsOf(createTodayTasksDay(OWNER, todayLocalDayKey(TOMORROW), stored ?? []));
  const afterLoad = kindsOf(await refreshTodayTasks(stored ?? []));
  expect(afterLoad).toEqual(firstFrame);
});

it('день чужого владельца в память не кладётся', async () => {
  const boot = await savedDayThenColdStart();
  primeTodayTasksFromBoot(boot.state, boot.available, 'someone-else');
  expect(peekTodayTasks()).toBeNull();
});

it('проводка: стартовое чтение несёт ключи заданий, хук первого кадра берёт сохранённый список видов, журнал первого кадра Главной полный', () => {
  const boot = read('app/app_snapshot_bootstrap.ts');
  expect(boot).toContain('...(todayKeys ? [todayKeys.state, todayKeys.available] : []),');
  const primeAt = boot.indexOf('primeTodayTasksFromBoot(values.get(todayKeys.state)');
  expect(primeAt).toBeGreaterThan(-1);
  expect(primeAt).toBeLessThan(boot.indexOf('patchAppSnapshot((current) => ({\n    profile,'));
  const hook = read('hooks/use_today_tasks.ts');
  expect(hook).toContain('const storedKinds = peekTodayTasksAvailableKinds();');
  const home = read('app/(tabs)/home.tsx');
  for (const field of ['coinsKnown:', 'energy: energyPeekNow?.energy ?? null', 'snapshotPrimedAt:', 'todayKinds:', 'todayFromStore:']) {
    expect(home).toContain(field);
  }
});
