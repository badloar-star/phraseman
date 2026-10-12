/**
 * «Сегодня»: сбой записи на диск не теряет прогресс дня (аудит Optimistic UI 99ba26b1e, координатор 12.10).
 * Раньше событие отбрасывалось (`event:dropped`). Теперь состояние видно сразу, держится в памяти и пишется повторно
 * при следующем событии и открытии Главной; монеты за задание — только после успешной записи.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TODAY_TASK_POOL, type TodayTaskKindCore } from '../modules/today-tasks/today_tasks_core';
import {
  __todayTasksStoreTestHooks as hooks,
  peekTodayTasks,
  recordTodayTaskActivity,
  refreshTodayTasks,
  type TodayTaskGrantRequest,
} from '../modules/today-tasks/today_tasks_store';

const OWNER = 'owner-unsaved-1';
const NOON = new Date(2026, 9, 12, 12, 0, 0).getTime();
const KINDS: readonly TodayTaskKindCore[] = TODAY_TASK_POOL.filter((k) => k !== 'spire_steps');
/** Цели заданий из today_tasks_core (KIND_RULES): многошаговые — для подсчёта, одношаговые — для монет. */
const MULTI_STEP: readonly TodayTaskKindCore[] = ['cards', 'mistakes'];
const ONE_STEP: readonly TodayTaskKindCore[] = ['lesson', 'dialog'];

let grants: TodayTaskGrantRequest[] = [];

const taskOf = (kind: TodayTaskKindCore) => peekTodayTasks()?.tasks.find((t) => t.kind === kind) ?? null;
const firstInDay = (candidates: readonly TodayTaskKindCore[]) => candidates.find((kind) => taskOf(kind)) ?? null;

async function storedUnits(kind: TodayTaskKindCore): Promise<number | null> {
  const raw = await AsyncStorage.getItem(`today_tasks_v1:${OWNER}`);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { tasks: { kind: string; units: number }[] };
  return parsed.tasks.find((t) => t.kind === kind)?.units ?? null;
}

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  grants = [];
  hooks.setDeps({
    now: () => NOON,
    ownerStableId: async () => OWNER,
    grant: async (request) => { grants.push(request); },
    sha256Hex: async (input) => {
      const { createHash } = await import('node:crypto');
      return createHash('sha256').update(input, 'utf8').digest('hex');
    },
  });
  await refreshTodayTasks(KINDS);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('сбой записи: прогресс виден сразу, держится в памяти и ложится на диск при открытии Главной', async () => {
  const kind = firstInDay(MULTI_STEP);
  expect(kind).not.toBeNull();
  const before = taskOf(kind!)!.units;
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk_full'));
  await recordTodayTaskActivity({ kind: kind!, unitKey: `${kind}:u1`, source: 'test' });
  expect(taskOf(kind!)!.units).toBe(before + 1); // видно сразу, а не «не засчиталось»
  expect(await storedUnits(kind!)).toBe(before); // на диске ещё старое

  await refreshTodayTasks(KINDS); // открытие Главной — повтор записи
  expect(await storedUnits(kind!)).toBe(before + 1);
  expect(taskOf(kind!)!.units).toBe(before + 1);
});

test('сбой записи: следующее событие сохраняет и прошлое, и своё', async () => {
  const kind = firstInDay(MULTI_STEP);
  expect(kind).not.toBeNull();
  const before = taskOf(kind!)!.units;
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk_full'));
  await recordTodayTaskActivity({ kind: kind!, unitKey: `${kind}:a`, source: 'test' });
  await recordTodayTaskActivity({ kind: kind!, unitKey: `${kind}:b`, source: 'test' });
  expect(await storedUnits(kind!)).toBe(before + 2);
});

test('монеты за выполненное при сбое записи — только после того, как запись легла', async () => {
  const kind = firstInDay(ONE_STEP);
  expect(kind).not.toBeNull();
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk_full'));
  await recordTodayTaskActivity({ kind: kind!, unitKey: `${kind}:done`, source: 'test' });
  expect(taskOf(kind!)!.done).toBe(true);
  expect(grants).toHaveLength(0); // выполнено, но на диск не легло — выплаты нет
  await refreshTodayTasks(KINDS);
  expect(grants.length).toBeGreaterThan(0);
  expect(new Set(grants.map((g) => g.kind))).toEqual(new Set([kind]));
});
