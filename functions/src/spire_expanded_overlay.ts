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
import { spireHardness } from './spire_pack_contract';

export const SPIRE_EXPANDED_OVERLAY_SCHEMA = 'spire-expanded-overlay-v1' as const;
/**
 * Правило подбора заданий в накладку; пишется в метаданные файла. Накладка с другим правилом — устаревшая и пересобирается
 * (пакет недели при этом не меняется). Менять строку при каждом изменении подбора.
 */
export const SPIRE_EXPANDED_OVERLAY_RULE = 'rank-by-hardness-v1' as const;
/** Окно подбора вокруг трудности места: не меньше стольких заданий… */
const RANK_WINDOW_MIN = 48;
/** …и не меньше такой доли пула языка. */
const RANK_WINDOW_SHARE = 0.15;
/**
 * Сколько заданий «выбор» в каждом наборе ступени заменяется новой механикой. 0 — накладка не собирается.
 * зачем «все» (владелец 11.11.2026, на вопрос о плотности: «Все подходящие места»): при двух на набор новые механики
 * терялись среди прежних заданий — владелец не увидел ни одной. Запрет повтора в ступени и снятие по жалобе остаются.
 */
export const SPIRE_EXPANDED_OVERLAY_PER_SET = Number.MAX_SAFE_INTEGER;
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
  | Readonly<{
    ok: true;
    overlay: SpireExpandedOverlay;
    json: string;
    stats: Readonly<{ slots: number; uniqueTasks: number; poolTasks: number; meanRankLowFloor: number | null; meanRankTopFloor: number | null }>;
  }>
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

/** Ключ сортировки пула по сложности фразы: оценка автора; нет её — середина корзины трудности 1..3. */
function rankOf(task: SpireExpandedPoolTask): number {
  return typeof task.rank === 'number' && Number.isFinite(task.rank) ? task.rank : 20 + (task.difficulty - 0.5) * 10;
}

/**
 * Порядок кандидатов для одной ступени: сначала окно пула вокруг трудности места (перемешано детерминированно, чтобы ступени
 * одного этажа не повторяли друг друга), затем остальные — по близости к центру, чтобы при нехватке брать ближайшие по
 * сложности, а не случайные.
 * зачем (владелец 11.11.2026: «первый этаж самой первой башни должно быть изи-пизи, а потом сложнее и сложнее»).
 */
export function spireExpandedStepCandidates(sorted: readonly SpireExpandedPoolTask[], hardness: number, seed: string): SpireExpandedPoolTask[] {
  const n = sorted.length;
  if (n === 0) return [];
  const width = Math.min(n, Math.max(RANK_WINDOW_MIN, Math.round(n * RANK_WINDOW_SHARE)));
  const center = Math.round(Math.max(0, Math.min(1, hardness)) * (n - 1));
  const start = Math.max(0, Math.min(n - width, center - Math.floor(width / 2)));
  const window = seededOrder(sorted.slice(start, start + width), seed);
  const rest = sorted
    .map((task, index) => ({ task, index }))
    .filter(({ index }) => index < start || index >= start + width)
    .sort((a, b) => Math.abs(a.index - center) - Math.abs(b.index - center) || a.index - b.index)
    .map(({ task }) => task);
  return [...window, ...rest];
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
  // зачем (владелец 11.11.2026: «не по механикам, а по самим фразам»): пул упорядочен по оценке сложности фразы, место в
  // наборе получает фразу той же доли пула, что и трудность места по формуле набора недели (шпиль + этаж)
  const sorted = [...pool].sort((a, b) => rankOf(a) - rankOf(b) || (a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0));

  const tasks: Record<string, SpireExpandedOverlayTask> = {};
  const slots: SpireExpandedOverlaySlot[] = [];
  for (const floor of input.pack.floors) {
    if (!isRecord(floor) || typeof floor.floor !== 'number' || !Array.isArray(floor.steps)) return { ok: false, reason: 'pack_floor_shape' };
    if (floor.floor < fromFloor) continue;
    const hardness = spireHardness(input.tier, floor.floor);
    for (const step of floor.steps) {
      if (!isRecord(step) || typeof step.step !== 'number' || !Array.isArray(step.sets)) return { ok: false, reason: 'pack_step_shape' };
      const usedInStep = new Set<string>();
      const candidates = spireExpandedStepCandidates(sorted, hardness, `${seed}|${floor.floor}|${step.step}`);
      let cursor = 0;
      const pick = (): SpireExpandedPoolTask | null => {
        while (cursor < candidates.length && usedInStep.has(candidates[cursor].taskId)) cursor += 1;
        return cursor < candidates.length ? candidates[cursor++] : null;
      };
      for (let setIndex = 0; setIndex < step.sets.length; setIndex += 1) {
        const set = step.sets[setIndex];
        if (!isRecord(set) || !Array.isArray(set.tasks)) return { ok: false, reason: 'pack_set_shape' };
        let left = perSet;
        for (let taskIndex = 0; taskIndex < set.tasks.length && left > 0; taskIndex += 1) {
          const base = set.tasks[taskIndex];
          if (!isRecord(base) || base.kind !== REPLACEABLE_KIND) continue;
          const chosen = pick();
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
  // зачем (сперва логи): средняя оценка фраз на нижнем и верхнем этаже — раскладку «от лёгкого к трудному» видно в журнале сборки
  const rankById = new Map(pool.map((task) => [task.taskId, rankOf(task)]));
  const floors = slots.map(([floorNo]) => floorNo);
  const meanRankAt = (floorNo: number): number | null => {
    const ranks = slots.filter(([f]) => f === floorNo).map(([, , , , id]) => rankById.get(id) ?? 0);
    return ranks.length === 0 ? null : Number((ranks.reduce((sum, r) => sum + r, 0) / ranks.length).toFixed(2));
  };
  return {
    ok: true,
    overlay,
    json: JSON.stringify(overlay),
    stats: {
      slots: slots.length,
      uniqueTasks: Object.keys(tasks).length,
      poolTasks: pool.length,
      meanRankLowFloor: meanRankAt(Math.min(...floors)),
      meanRankTopFloor: meanRankAt(Math.max(...floors)),
    },
  };
}
