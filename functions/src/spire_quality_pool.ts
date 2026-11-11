/**
 * Пик: добавка к пулу языка — независимо принятые задания видов «выбор» (content/spire-quality). Чистый модуль.
 *
 * зачем (владелец 11.11.2026: «Только проверенные 1 750» → «Добавить к нынешним»): принятые задания лежали вне проекта.
 * Они НЕ заменяют нынешний пул и не проходят через его контракты «ровно 4 000» — дописываются рядом, как задания «на слух».
 * В пул попадает только то, что проходит ту же проверку, что и нынешние задания (validateTournamentTaskForNewRoom).
 *
 * Форму строки пишет scripts/import_peak_quality_pool.mjs; расхождение ловит tests/spire_quality_pool.test.ts.
 */
import { spireTaskIdBelongsToTarget } from './spire_task_flag_contract';
import { validateTournamentTaskForNewRoom, type TournamentTask } from './tournament_core';
import type { ArenaStudyTarget } from './arena_target_registry';

export const SPIRE_QUALITY_ROW_SCHEMA = 'peak-quality-runtime-v1' as const;
export const SPIRE_QUALITY_BUNDLE_SCHEMA = 'spire-quality-bundle-v1' as const;

const CHOICE_MODES: ReadonlySet<string> = new Set(['guess_phrase', 'fill_gap', 'find_oddity']);

type Raw = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export type SpireQualityRowResult =
  | Readonly<{ ok: true; task: TournamentTask }>
  | Readonly<{ ok: false; reason: string }>;

/** Одна строка добавки → задание пула. Причина отказа возвращается, а не теряется: её считает и пишет в журнал вызывающий. */
export function spireQualityTaskFromRow(row: unknown, lang: string): SpireQualityRowResult {
  if (!isRecord(row) || row.schema !== SPIRE_QUALITY_ROW_SCHEMA) return { ok: false, reason: 'row_schema' };
  if (row.lang !== lang) return { ok: false, reason: 'row_lang' };
  const taskId = typeof row.taskId === 'string' ? row.taskId : '';
  // зачем: номер обязан принадлежать своему языку по тому же правилу, что у жалоб и списка снятых, —
  // иначе снятое по жалобе задание сделало бы документ снятых «битым», и сборка недели языка ушла бы в отказ
  if (!taskId || !spireTaskIdBelongsToTarget(taskId, lang as ArenaStudyTarget)) return { ok: false, reason: 'row_task_id' };
  const mode = typeof row.mode === 'string' ? row.mode : '';
  if (!CHOICE_MODES.has(mode)) return { ok: false, reason: 'row_mode' };
  const difficulty = row.difficulty;
  if (typeof difficulty !== 'number' || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) return { ok: false, reason: 'row_difficulty' };
  const { options, wrongOptionReasons, correctIndex } = row;
  if (!isStringArray(options) || options.length !== 4 || !isStringArray(wrongOptionReasons) || wrongOptionReasons.length !== 4
    || typeof correctIndex !== 'number' || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return { ok: false, reason: 'row_options' };
  }
  if (typeof row.phrase !== 'string' || !row.phrase.trim() || typeof row.ruleNote !== 'string' || !row.ruleNote.trim()) {
    return { ok: false, reason: 'row_texts' };
  }
  // пример — правильная фраза; у «найди лишнее» ключ указывает на фразу С ошибкой, поэтому берём первую верную
  const exampleIndex = mode === 'find_oddity' ? (correctIndex === 0 ? 1 : 0) : correctIndex;
  const task: TournamentTask = {
    taskId,
    mode,
    difficulty,
    isVoice: false,
    tags: [],
    verified: true,
    payload: { phrase: row.phrase, options: [...options], correctIndex },
    explanation: { ruleNote: row.ruleNote, example: options[exampleIndex], wrongOptionReasons: [...wrongOptionReasons] },
  };
  const verdict = validateTournamentTaskForNewRoom(task);
  if (!verdict.ok) return { ok: false, reason: `task_invalid:${verdict.reason}` };
  return { ok: true, task };
}

export type SpireQualityPool = Readonly<{ tasks: TournamentTask[]; rejected: number; reasons: Readonly<Record<string, number>> }>;

/** Все строки языка. Повтор номера — отказ строки (первая остаётся): два задания с одним номером ломают отчёт ступени. */
export function spireQualityPoolFromRows(rows: readonly unknown[], lang: string): SpireQualityPool {
  const tasks: TournamentTask[] = [];
  const seen = new Set<string>();
  const reasons: Record<string, number> = {};
  let rejected = 0;
  for (const row of rows) {
    const result = spireQualityTaskFromRow(row, lang);
    const reason = result.ok ? (seen.has(result.task.taskId) ? 'duplicate_task_id' : null) : result.reason;
    if (reason !== null || !result.ok) {
      rejected += 1;
      const key = reason ?? 'unknown';
      reasons[key] = (reasons[key] ?? 0) + 1;
      continue;
    }
    seen.add(result.task.taskId);
    tasks.push(result.task);
  }
  return { tasks, rejected, reasons };
}
