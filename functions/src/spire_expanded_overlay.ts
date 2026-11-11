/**
 * Пик: «накладка» новых механик поверх пакета недели. Чистый модуль — ни Firebase, ни часов.
 *
 * зачем (владелец 11.11.2026: «давай включай уже» → «Да, делай»): установленные у игроков сборки отбраковывают
 * пакет ЦЕЛИКОМ, если в нём встретился незнакомый вид задания (modules/spire/pack_plan.ts до 11.11 не знал
 * 'expanded') — положи новые задания в сам пакет, и Пик перестанет открываться у всех, кто не обновился.
 * Поэтому пакет недели остаётся байт-в-байт прежним, а новые задания лежат рядом отдельным файлом
 * `spire_packs/{lang}/{tier}/{weekId}.expanded.json`:
 *   - старая сборка этот файл не запрашивает и ничего не замечает;
 *   - новая сборка скачивает оба и подменяет у себя отмеченные слоты;
 *   - packHash пакета не меняется → отчёты ступеней (spireReportSteps) и учёт монет не затронуты вовсе;
 *   - выключить новые задания = удалить файл накладки, без пересборки пакета и без новой сборки приложения.
 *
 * Накладка привязана к пакету отпечатком `basePackHash`: пересобрали пакет — старая накладка клиентом отвергается.
 * Форму читает клиентский modules/spire/expanded_overlay.ts; расхождение ловит tests/spire_expanded_overlay_parity.test.ts.
 */
import { createHash } from 'crypto';

import { SPIRE_EXPANDED_KIND, spireExpandedPoolTaskProblem, type SpireExpandedPoolTask } from './spire_expanded_task';

export const SPIRE_EXPANDED_OVERLAY_SCHEMA = 'spire-expanded-overlay-v1' as const;
/** Сколько заданий «выбор» в каждом наборе ступени заменяется новой механикой. 0 — накладка не собирается. */
export const SPIRE_EXPANDED_OVERLAY_PER_SET = 2;
/** С какого этажа. Умолчание сессии 11.11: с первого — владелец должен увидеть новое на любом этаже своей комнаты. */
export const SPIRE_EXPANDED_OVERLAY_FROM_FLOOR = 1;
/** Вид задания пакета, который разрешено подменять: «выбор» ближе всего к новым механикам по времени и сложности. */
const REPLACEABLE_KIND = 'choice';

export type SpireExpandedOverlayTask = Readonly<{
  taskId: string;
  mode: string;
  kind: typeof SPIRE_EXPANDED_KIND;
  difficulty: number;
  payload: SpireExpandedPoolTask['payload'];
}>;

/** [этаж, ступень, номер набора, номер задания в наборе, id задания из таблицы tasks]. */
export type SpireExpandedOverlaySlot = readonly [number, number, number, number, string];

export type SpireExpandedOverlay = Readonly<{
  schema: typeof SPIRE_EXPANDED_OVERLAY_SCHEMA;
  weekId: string;
  lang: string;
  tier: number;
  basePackHash: string;
  /** Таблица заданий один раз: одно задание может стоять в нескольких ступенях, текст в файле не дублируется. */
  tasks: Readonly<Record<string, SpireExpandedOverlayTask>>;
  slots: readonly SpireExpandedOverlaySlot[];
}>;

export type SpireExpandedOverlayInput = Readonly<{
  /** Разобранный JSON опубликованного пакета недели (те самые байты, что лежат в Storage). */
  pack: unknown;
  weekId: string;
  lang: string;
  tier: number;
  basePackHash: string;
  tasks: readonly SpireExpandedPoolTask[];
  excludedTaskIds?: readonly string[];
  perSet?: number;
  fromFloor?: number;
}>;

export type SpireExpandedOverlayResult =
  | Readonly<{ ok: true; overlay: SpireExpandedOverlay; json: string; stats: Readonly<{ slots: number; uniqueTasks: number; poolTasks: number }> }>
  | Readonly<{ ok: false; reason: string; detail?: Record<string, unknown> }>;

type Raw = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function spireExpandedOverlayPath(lang: string, tier: number, weekId: string): string {
  // зачем тот же корень spire_packs: правило Storage `match /spire_packs/{allPaths=**}` уже пускает вошедшего на чтение —
  // выкладка правил не нужна
  return `spire_packs/${lang}/${tier}/${weekId}.expanded.json`;
}

/** Детерминированный порядок: пересбор той же недели даёт тот же файл (без Math.random). */
function seededOrder<T extends { taskId: string }>(items: readonly T[], seed: string): T[] {
  const rank = (item: T) => createHash('sha256').update(`${seed}|${item.taskId}`, 'utf8').digest('hex');
  return items.map((item) => ({ item, key: rank(item) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((entry) => entry.item);
}

/** Очередь заданий одной трудности: выдаёт по кругу, пропуская уже занятые в текущей ступени. */
type Queue = { order: SpireExpandedPoolTask[]; pos: number };

function takeFrom(queue: Queue | undefined, usedInStep: ReadonlySet<string>): SpireExpandedPoolTask | null {
  if (!queue || queue.order.length === 0) return null;
  for (let tries = 0; tries < queue.order.length; tries += 1) {
    const task = queue.order[queue.pos % queue.order.length];
    queue.pos += 1;
    if (!usedInStep.has(task.taskId)) return task;
  }
  return null;
}

/**
 * Собирает накладку для уже опубликованного пакета. Сам пакет не читает дальше формы «этажи → ступени → наборы → задания»
 * и ничего в нём не меняет. Нет подходящих заданий — накладка с пустым списком слотов не пишется (ok: false, reason).
 */
export function buildSpireExpandedOverlay(input: SpireExpandedOverlayInput): SpireExpandedOverlayResult {
  const perSet = Math.max(0, Math.trunc(input.perSet ?? SPIRE_EXPANDED_OVERLAY_PER_SET));
  const fromFloor = input.fromFloor ?? SPIRE_EXPANDED_OVERLAY_FROM_FLOOR;
  if (perSet === 0) return { ok: false, reason: 'overlay_disabled' };
  if (!isRecord(input.pack) || !Array.isArray(input.pack.floors)) return { ok: false, reason: 'pack_shape' };
  if (input.pack.packHash !== input.basePackHash) {
    return { ok: false, reason: 'pack_hash_mismatch', detail: { inFile: String(input.pack.packHash), expected: input.basePackHash } };
  }
  if (input.pack.lang !== input.lang || input.pack.tier !== input.tier || input.pack.weekId !== input.weekId) {
    return { ok: false, reason: 'pack_identity_mismatch' };
  }

  const excluded = new Set(input.excludedTaskIds ?? []);
  const pool = input.tasks.filter((task) => !excluded.has(task.taskId));
  for (const task of pool) {
    // зачем: битое задание или задание другого языка — отказ всей накладки с причиной, а не «тихо пропустили»
    const problem = spireExpandedPoolTaskProblem(task, input.lang);
    if (problem) return { ok: false, reason: 'expanded_task_invalid', detail: { taskId: String((task as { taskId?: unknown }).taskId), problem } };
  }
  if (pool.length === 0) return { ok: false, reason: 'expanded_pool_empty' };

  const seed = `spire-expanded-overlay:${input.weekId}:${input.lang}:${input.tier}`;
  const queues = new Map<number, Queue>();
  for (const difficulty of [1, 2, 3]) {
    queues.set(difficulty, { order: seededOrder(pool.filter((task) => task.difficulty === difficulty), `${seed}|${difficulty}`), pos: 0 });
  }
  const pick = (difficulty: number, usedInStep: ReadonlySet<string>): SpireExpandedPoolTask | null => {
    // сначала та же трудность, что у подменяемого задания, затем ближайшие — слот не пропадает из-за пустой корзины
    for (const level of [difficulty, difficulty - 1, difficulty + 1, difficulty - 2, difficulty + 2]) {
      const task = takeFrom(queues.get(level), usedInStep);
      if (task) return task;
    }
    return null;
  };

  const tasks: Record<string, SpireExpandedOverlayTask> = {};
  const slots: SpireExpandedOverlaySlot[] = [];
  for (const floor of input.pack.floors) {
    if (!isRecord(floor) || typeof floor.floor !== 'number' || !Array.isArray(floor.steps)) return { ok: false, reason: 'pack_floor_shape' };
    if (floor.floor < fromFloor) continue;
    for (const step of floor.steps) {
      if (!isRecord(step) || typeof step.step !== 'number' || !Array.isArray(step.sets)) return { ok: false, reason: 'pack_step_shape' };
      const usedInStep = new Set<string>();
      for (let setIndex = 0; setIndex < step.sets.length; setIndex += 1) {
        const set = step.sets[setIndex];
        if (!isRecord(set) || !Array.isArray(set.tasks)) return { ok: false, reason: 'pack_set_shape' };
        let left = perSet;
        for (let taskIndex = 0; taskIndex < set.tasks.length && left > 0; taskIndex += 1) {
          const base = set.tasks[taskIndex];
          if (!isRecord(base) || base.kind !== REPLACEABLE_KIND) continue;
          const difficulty = typeof base.difficulty === 'number' && Number.isInteger(base.difficulty) ? base.difficulty : 1;
          const chosen = pick(difficulty, usedInStep);
          if (!chosen) break;
          usedInStep.add(chosen.taskId);
          tasks[chosen.taskId] = { taskId: chosen.taskId, mode: chosen.mode, kind: SPIRE_EXPANDED_KIND, difficulty: chosen.difficulty, payload: chosen.payload };
          slots.push([floor.floor, step.step, setIndex, taskIndex, chosen.taskId]);
          left -= 1;
        }
      }
    }
  }
  if (slots.length === 0) return { ok: false, reason: 'no_replaceable_slots' };

  const overlay: SpireExpandedOverlay = {
    schema: SPIRE_EXPANDED_OVERLAY_SCHEMA,
    weekId: input.weekId,
    lang: input.lang,
    tier: input.tier,
    basePackHash: input.basePackHash,
    tasks,
    slots,
  };
  return { ok: true, overlay, json: JSON.stringify(overlay), stats: { slots: slots.length, uniqueTasks: Object.keys(tasks).length, poolTasks: pool.length } };
}
