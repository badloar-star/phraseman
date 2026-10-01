/**
 * Шпиль — клиентская копия формы пакета недели и сборка плана ступени (пакет D).
 * Чистый модуль: ни React, ни Firebase, ни файлов, ни часов.
 *
 * зачем (владелец D54, T8, T10): ступень целиком играется на устройстве — одно
 * скачивание пакета в неделю, ноль вызовов на ступень. Сервер собирает файл
 * `functions/src/spire_pack_contract.ts` (этажи 1..15 → ступени → 3 набора по
 * 10 заданий + отпечатки ответов). Здесь: закрытый разбор этого файла (чужая
 * схема / неделя / язык / шпиль → null, никаких «примерно подходит») и выбор
 * набора для конкретной попытки ступени.
 *
 * СИНХРОНИЗАЦИЯ: форма пакета — SpirePack в functions/src/spire_pack_contract.ts
 * (серверный tsconfig ограничен src, общий модуль невозможен — та же граница, что
 * у config_contract.ts). Правишь поле там — правь разбор здесь.
 */
import type { ArenaTaskMode } from '../arena/contract';
import { isArenaTaskMode } from '../arena/contract';
import type { SpireTaskTimerKind } from './config_contract';
import type { SpireStepPlan, SpireStepTask } from './step_machine';
import { SPIRE_STEP_TASK_COUNT } from './step_machine';

export const SPIRE_PACK_SCHEMA_CLIENT = 'spire-pack-v1' as const;
/** Сколько этажей собрано в пакете (SPIRE_SUMMIT_FLOOR сервера). */
export const SPIRE_PACK_FLOORS = 15;
/** «Над облаками» (16+) берут наборы этажей 11..15 по кругу — поле aboveCloudsCyclesFloors пакета. */
const ABOVE_CLOUDS_FALLBACK = [11, 12, 13, 14, 15] as const;

type TaskKind = SpireStepTask['kind'];
const TASK_KINDS: readonly TaskKind[] = ['choice', 'translate', 'timeattack', 'voice', 'listen', 'dictate', 'match'];

/**
 * PM-286: режимы Шпиля «на слух» и «диктант» (Learning V2, голос телефона D47).
 * зачем: их нет среди режимов Арены, а пакет недели en их несёт — без этого списка
 * decodeTask отбраковал бы задание, и вместе с ним весь пакет (набор без 10 заданий).
 */
export const SPIRE_LISTEN_PACK_MODES = ['listen_choose', 'listen_build'] as const;
export type SpirePackTaskMode = ArenaTaskMode | typeof SPIRE_LISTEN_PACK_MODES[number];

function isSpirePackTaskMode(value: unknown): value is SpirePackTaskMode {
  return isArenaTaskMode(value) || (SPIRE_LISTEN_PACK_MODES as readonly unknown[]).includes(value);
}

/** Публичное задание пакета — то, что видит игрок (без ответа). */
export type SpirePackTask = Readonly<{
  taskId: string;
  mode: SpirePackTaskMode;
  kind: TaskKind;
  difficulty: number;
  payload: Readonly<Record<string, unknown>>;
}>;

export type SpirePackSetClient = Readonly<{
  tasks: readonly SpirePackTask[];
  answerFingerprints: readonly (readonly string[])[];
}>;

export type SpirePackFloorClient = Readonly<{
  floor: number;
  guardian: boolean;
  steps: readonly Readonly<{ step: number; sets: readonly SpirePackSetClient[] }>[];
}>;

export type SpireWeekPack = Readonly<{
  schema: typeof SPIRE_PACK_SCHEMA_CLIENT;
  weekId: string;
  lang: string;
  tier: number;
  packHash: string;
  saltId: string;
  aboveCloudsCyclesFloors: readonly number[];
  floors: readonly SpirePackFloorClient[];
}>;

export type SpirePackExpect = Readonly<{ weekId: string; lang: string; tier: number }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeTask(raw: unknown): SpirePackTask | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.taskId !== 'string' || raw.taskId.length === 0) return null;
  if (!isSpirePackTaskMode(raw.mode)) return null;
  if (!TASK_KINDS.includes(raw.kind as TaskKind)) return null;
  if (!isRecord(raw.payload)) return null;
  const difficulty = typeof raw.difficulty === 'number' && Number.isInteger(raw.difficulty) ? raw.difficulty : 1;
  return { taskId: raw.taskId, mode: raw.mode, kind: raw.kind as TaskKind, difficulty, payload: raw.payload };
}

function decodeSet(raw: unknown): SpirePackSetClient | null {
  if (!isRecord(raw) || !Array.isArray(raw.tasks) || !Array.isArray(raw.answerFingerprints)) return null;
  const tasks = raw.tasks.map(decodeTask);
  if (tasks.length !== SPIRE_STEP_TASK_COUNT || tasks.some((t) => t === null)) return null;
  const prints = raw.answerFingerprints.map((row) => (Array.isArray(row) ? row.filter((x): x is string => typeof x === 'string') : []));
  if (prints.length !== tasks.length || prints.some((row) => row.length === 0)) return null;
  return { tasks: tasks as SpirePackTask[], answerFingerprints: prints };
}

function decodeFloor(raw: unknown): SpirePackFloorClient | null {
  if (!isRecord(raw) || typeof raw.floor !== 'number' || !Array.isArray(raw.steps)) return null;
  const steps: { step: number; sets: SpirePackSetClient[] }[] = [];
  for (const rawStep of raw.steps) {
    if (!isRecord(rawStep) || typeof rawStep.step !== 'number' || !Array.isArray(rawStep.sets)) return null;
    const sets = rawStep.sets.map(decodeSet);
    if (sets.length === 0 || sets.some((s) => s === null)) return null;
    steps.push({ step: rawStep.step, sets: sets as SpirePackSetClient[] });
  }
  return { floor: raw.floor, guardian: raw.guardian === true, steps };
}

export type SpirePackDecode =
  | Readonly<{ ok: true; pack: SpireWeekPack }>
  | Readonly<{ ok: false; reason: string }>;

/** Закрытый разбор файла пакета: любая неожиданность — отказ с причиной (для лога). */
export function spireDecodeWeekPack(raw: unknown, expect: SpirePackExpect): SpirePackDecode {
  if (!isRecord(raw)) return { ok: false, reason: 'not_object' };
  if (raw.schema !== SPIRE_PACK_SCHEMA_CLIENT) return { ok: false, reason: `schema:${String(raw.schema)}` };
  if (raw.weekId !== expect.weekId) return { ok: false, reason: `week:${String(raw.weekId)}!=${expect.weekId}` };
  if (raw.lang !== expect.lang) return { ok: false, reason: `lang:${String(raw.lang)}!=${expect.lang}` };
  if (raw.tier !== expect.tier) return { ok: false, reason: `tier:${String(raw.tier)}!=${expect.tier}` };
  if (typeof raw.packHash !== 'string' || raw.packHash.length < 8) return { ok: false, reason: 'pack_hash' };
  if (typeof raw.saltId !== 'string' || raw.saltId.length === 0) return { ok: false, reason: 'salt' };
  if (!Array.isArray(raw.floors)) return { ok: false, reason: 'floors' };
  const floors = raw.floors.map(decodeFloor);
  if (floors.length === 0 || floors.some((f) => f === null)) return { ok: false, reason: 'floor_shape' };
  const cycles = Array.isArray(raw.aboveCloudsCyclesFloors)
    ? raw.aboveCloudsCyclesFloors.filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
    : [];
  return {
    ok: true,
    pack: {
      schema: SPIRE_PACK_SCHEMA_CLIENT,
      weekId: expect.weekId,
      lang: expect.lang,
      tier: expect.tier,
      packHash: raw.packHash,
      saltId: raw.saltId,
      aboveCloudsCyclesFloors: cycles.length > 0 ? cycles : ABOVE_CLOUDS_FALLBACK,
      floors: floors as SpirePackFloorClient[],
    },
  };
}

/** Этаж пакета для этажа башни: 1..15 как есть, 16+ — по кругу из aboveCloudsCyclesFloors. */
export function spirePackFloorFor(pack: SpireWeekPack, floor: number): number {
  if (floor <= SPIRE_PACK_FLOORS) return Math.max(1, Math.trunc(floor));
  const cycle = pack.aboveCloudsCyclesFloors;
  return cycle[(Math.trunc(floor) - SPIRE_PACK_FLOORS - 1) % cycle.length];
}

export type SpireStepPick = Readonly<{
  plan: SpireStepPlan;
  /** Параллельно plan.tasks — публичные задания для отрисовки. */
  tasks: readonly SpirePackTask[];
  packFloor: number;
  setIndex: number;
}>;

/** Вид таймера для задания — ключ baseMsByKind конфига. */
export function spireTimerKindOf(task: SpirePackTask): SpireTaskTimerKind {
  return task.kind;
}

/**
 * План ступени. attempt — номер попытки этой ступени (0 = первая): наборы идут
 * 0,1,2 и дальше по кругу (контракт §4: первая попытка + 2 повтора). step —
 * номер ступени внутри этажа, 1-based (stepInFloor + 1).
 * null — в пакете нет такой ступени (битый/урезанный файл); вызывающий логирует.
 */
export function spirePickStepPlan(
  pack: SpireWeekPack,
  input: Readonly<{ floor: number; step: number; attempt: number; budgetMs: (kinds: readonly SpireTaskTimerKind[]) => number }>,
): SpireStepPick | null {
  const packFloor = spirePackFloorFor(pack, input.floor);
  const floorRow = pack.floors.find((f) => f.floor === packFloor);
  const stepRow = floorRow?.steps.find((s) => s.step === input.step);
  if (!stepRow || stepRow.sets.length === 0) return null;
  const setIndex = Math.max(0, Math.trunc(input.attempt)) % stepRow.sets.length;
  const set = stepRow.sets[setIndex];
  const tasks: SpireStepTask[] = set.tasks.map((task, taskIndex) => ({
    taskId: task.taskId,
    mode: task.mode,
    kind: task.kind,
    answerFingerprints: set.answerFingerprints[taskIndex],
    taskIndex,
  }));
  return {
    plan: {
      packHash: pack.packHash,
      saltId: pack.saltId,
      lang: pack.lang,
      tier: pack.tier,
      floor: input.floor,
      step: input.step,
      budgetMs: input.budgetMs(set.tasks.map(spireTimerKindOf)),
      tasks,
    },
    tasks: set.tasks,
    packFloor,
    setIndex,
  };
}
