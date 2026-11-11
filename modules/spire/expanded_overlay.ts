/**
 * Пик — «накладка» новых механик поверх пакета недели. Чистый модуль: ни React, ни Firebase, ни часов.
 *
 * зачем (владелец 11.11.2026: «давай включай уже» → «Да, делай»): установленные сборки отбраковывают пакет целиком,
 * если в нём есть незнакомый вид задания, поэтому новые задания сервер кладёт НЕ в пакет, а отдельным файлом рядом
 * (functions/src/spire_expanded_overlay.ts). Старая сборка файл не запрашивает; эта — подменяет у себя отмеченные
 * слоты «выбор» заданиями новых механик. Отпечаток пакета (packHash) остаётся прежним — отчёты ступеней не меняются.
 *
 * Закрытый разбор: накладка от другого пакета/недели/языка отвергается целиком; битая строка слота или задание,
 * которое экран показать не сможет, пропускается поодиночке — слот остаётся за прежним заданием пакета, игра идёт.
 * Причины возвращаются вызывающему для журнала.
 */
import { isExpandedFormat } from '../expanded-formats/types';
import { SPIRE_EXPANDED_KIND, spireExpandedTaskIsValid } from './expanded_pack_task';
import type { SpirePackFloorClient, SpirePackSetClient, SpirePackTask, SpireWeekPack } from './pack_plan';

/** Схема файла — SPIRE_EXPANDED_OVERLAY_SCHEMA в functions/src/spire_expanded_overlay.ts. */
export const SPIRE_EXPANDED_OVERLAY_SCHEMA_CLIENT = 'spire-expanded-overlay-v1' as const;
/** Вид задания пакета, который сервер подменяет; чужой вид в слоте — признак рассинхрона, слот не трогаем. */
const REPLACEABLE_KIND = 'choice';

export type SpireExpandedOverlayApply = Readonly<{
  pack: SpireWeekPack;
  /** Сколько слотов подменено. 0 — пакет возвращён как был. */
  applied: number;
  /** Сколько строк накладки пропущено и первая причина (для журнала). */
  skipped: number;
  reason: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function overlayTask(raw: unknown, taskId: string, lang: string): SpirePackTask | null {
  if (!isRecord(raw) || raw.taskId !== taskId || raw.kind !== SPIRE_EXPANDED_KIND) return null;
  if (!isExpandedFormat(raw.mode) || !isRecord(raw.payload)) return null;
  const candidate = { taskId, mode: raw.mode, kind: SPIRE_EXPANDED_KIND, payload: raw.payload };
  if (!spireExpandedTaskIsValid(candidate, lang)) return null;
  const difficulty = typeof raw.difficulty === 'number' && Number.isInteger(raw.difficulty) ? raw.difficulty : 1;
  return { taskId, mode: raw.mode, kind: SPIRE_EXPANDED_KIND, difficulty, payload: raw.payload };
}

/**
 * Пакет + разобранный JSON накладки → пакет с подменёнными слотами (новый объект, исходный не меняется).
 * Любая причина отказа — пакет возвращается прежним, `applied: 0`.
 */
export function spireApplyExpandedOverlay(pack: SpireWeekPack, raw: unknown): SpireExpandedOverlayApply {
  const refuse = (reason: string): SpireExpandedOverlayApply => ({ pack, applied: 0, skipped: 0, reason });
  if (!isRecord(raw)) return refuse('overlay_not_object');
  if (raw.schema !== SPIRE_EXPANDED_OVERLAY_SCHEMA_CLIENT) return refuse(`overlay_schema:${String(raw.schema)}`);
  if (raw.weekId !== pack.weekId || raw.lang !== pack.lang || raw.tier !== pack.tier) return refuse('overlay_identity');
  // зачем: накладка собрана по слотам конкретного пакета; пакет пересобрали — старые номера слотов указывают не туда
  if (raw.basePackHash !== pack.packHash) return refuse('overlay_base_pack_hash');
  if (!isRecord(raw.tasks) || !Array.isArray(raw.slots)) return refuse('overlay_shape');

  // ключ «этаж:ступень:набор» → (номер задания → новое задание)
  const bySet = new Map<string, Map<number, SpirePackTask>>();
  const taskCache = new Map<string, SpirePackTask | null>();
  let skipped = 0;
  let firstSkip = '';
  const skip = (why: string) => {
    skipped += 1;
    if (!firstSkip) firstSkip = why;
  };
  for (const slot of raw.slots) {
    if (!Array.isArray(slot) || slot.length !== 5) { skip('slot_shape'); continue; }
    const [floor, step, setIndex, taskIndex, taskId] = slot as unknown[];
    if (!isIndex(floor) || !isIndex(step) || !isIndex(setIndex) || !isIndex(taskIndex) || typeof taskId !== 'string') { skip('slot_fields'); continue; }
    if (!taskCache.has(taskId)) taskCache.set(taskId, overlayTask(raw.tasks[taskId], taskId, pack.lang));
    const task = taskCache.get(taskId) ?? null;
    if (!task) { skip(`task_invalid:${taskId}`); continue; }
    const key = `${floor}:${step}:${setIndex}`;
    const row = bySet.get(key) ?? new Map<number, SpirePackTask>();
    row.set(taskIndex, task);
    bySet.set(key, row);
  }
  if (bySet.size === 0) return { pack, applied: 0, skipped, reason: firstSkip || 'overlay_empty' };

  let applied = 0;
  const floors: SpirePackFloorClient[] = pack.floors.map((floor) => ({
    ...floor,
    steps: floor.steps.map((step) => ({
      ...step,
      sets: step.sets.map((set, setIndex): SpirePackSetClient => {
        const row = bySet.get(`${floor.floor}:${step.step}:${setIndex}`);
        if (!row) return set;
        const seen = new Set(set.tasks.map((task) => task.taskId));
        const tasks = set.tasks.map((task, taskIndex) => {
          const next = row.get(taskIndex);
          if (!next) return task;
          // слот не «выбор» или задание уже стоит в наборе — рассинхрон с сервером, оставляем прежнее задание
          if (task.kind !== REPLACEABLE_KIND || seen.has(next.taskId)) { skip(`slot_mismatch:${floor.floor}:${step.step}:${setIndex}:${taskIndex}`); return task; }
          seen.add(next.taskId);
          applied += 1;
          return next;
        });
        // отпечатки ответа остаются от прежнего задания: к новой механике они не применяются (вердикт даёт экран),
        // а строка обязана быть непустой — так набор по-прежнему проходит разбор пакета
        return { tasks, answerFingerprints: set.answerFingerprints };
      }),
    })),
  }));
  if (applied === 0) return { pack, applied: 0, skipped, reason: firstSkip || 'overlay_no_slot_matched' };
  return { pack: { ...pack, floors }, applied, skipped, reason: firstSkip || 'ok' };
}
