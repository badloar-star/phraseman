// ═══════════════════════════════════════════════════════════════════════════
// tournament_pool_plan.ts — планировщик КОМПЛЕКТА заданий турнира.
//
// зачем (владелец 2026-07-27): «генератор должен быть переписан — блокер
// снимается, если генератор будет сразу создавать все задания». Раньше он
// генерил только guess_phrase и вслепую: получалось 44 опубликованных задания,
// из которых раунд физически не собирался, потому что раунду нужно 8 заданий
// ОДНОГО режима ОДНОЙ группы сложности, а в отдельных ячейках было по 2-4.
//
// Здесь чистая арифметика без сети и Firestore: какие ячейки (режим × слож-
// ность) нужны турниру, сколько в них уже есть и сколько заказать у ИИ.
// Модуль намеренно pure — покрывается тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════

import { TOURNAMENT_ROUND_MODE_KINDS } from './tournament_core';

/**
 * Заданий в раунде — та же константа, что в tournaments.ts (TASKS_PER_ROUND).
 * зачем копия: она приватная в tournaments.ts, а планировщик обязан быть pure
 * (без импорта модуля с Firestore/onCall) — контрактный тест сверяет значения.
 */
export const TASKS_PER_ROUND = 6;

/**
 * Режимы, играбельные в турнире.
 *
 * зачем такой состав: владелец 2026-07-27 отобрал немые режимы Learning V2 и
 * прямо отказался от аудио и диалогов. Причина отказа от звука: таймер вопроса
 * ~15 с, а загрузка озвучки съедает 1-3 с у игроков с медленной сетью, играют
 * часто без наушников (транспорт, работа), и аудио нельзя «перечитать» —
 * соревнование начинает наказывать за условия, а не за знание языка.
 */
export const TOURNAMENT_MODES = [
  // Исторические четыре (пул уже наполнен ими).
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  // Новые из Learning V2 (немые, ответ проверяется сервером однозначно).
  'context_gap',
  'speed_match',
] as const;

export type TournamentMode = typeof TOURNAMENT_MODES[number];

export function isTournamentMode(value: unknown): value is TournamentMode {
  return typeof value === 'string' && (TOURNAMENT_MODES as readonly string[]).includes(value);
}

/**
 * Группы сложности по номеру раунда — ровно те, что читает selectRoundTasks:
 * раунд 1 → [1], раунд 2 → [1,2], раунд 3 → [2], раунд 4 → [2,3].
 */
export const ROUND_DIFFICULTIES: readonly (readonly number[])[] = Object.freeze([
  [1],
  [1, 2],
  [2],
  [2, 3],
]);

/** Раунды, где режим ОДИН на весь раунд (single) — там и возникает блокер. */
export const SINGLE_MODE_ROUNDS: readonly number[] = TOURNAMENT_ROUND_MODE_KINDS
  .map((kind, index) => (kind === 'single' ? index + 1 : 0))
  .filter((roundNo) => roundNo > 0);

/** Сколько заданий должно быть в ячейке, чтобы single-раунд гарантированно собрался. */
export const CELL_TARGET = TASKS_PER_ROUND;

/**
 * Запас сверх минимума: с ровно 8 заданиями каждый турнир играл бы один и тот
 * же набор — узнаваемо и скучно. Держим кратно больше, чтобы выборка по сиду
 * реально перемешивала.
 */
export const CELL_HEALTHY = TASKS_PER_ROUND * 3;

export type PoolCell = {
  mode: TournamentMode;
  /** Уровень сложности задания: 1 | 2 | 3. */
  difficulty: number;
};

export type PoolCounts = Record<string, number>;

/** Ключ ячейки в счётчике: `<mode>:<difficulty>`. */
export function cellKey(cell: PoolCell): string {
  return `${cell.mode}:${cell.difficulty}`;
}

/**
 * Все ячейки, которые турнир реально может запросить: каждая пара
 * «режим × сложность, встречающаяся хотя бы в одном раунде».
 */
export function requiredCells(modes: readonly TournamentMode[] = TOURNAMENT_MODES): PoolCell[] {
  const difficulties = Array.from(new Set(ROUND_DIFFICULTIES.flat())).sort();
  return modes.flatMap((mode) => difficulties.map((difficulty) => ({ mode, difficulty })));
}

export type CellGap = PoolCell & {
  have: number;
  /** Сколько не хватает до гарантии сборки single-раунда. */
  missing: number;
  /** Сколько не хватает до здорового запаса (разнообразие между турнирами). */
  missingHealthy: number;
  /** Блокирует ли эта ячейка single-раунд прямо сейчас. */
  blocking: boolean;
};

/**
 * Дыры комплекта: что и сколько заказывать генератору.
 * Сортировка — сначала блокирующие ячейки, потом самые пустые.
 */
export function planPoolGaps(
  counts: PoolCounts,
  modes: readonly TournamentMode[] = TOURNAMENT_MODES,
): CellGap[] {
  return requiredCells(modes)
    .map((cell) => {
      const have = Math.max(0, Number(counts[cellKey(cell)] ?? 0));
      return {
        ...cell,
        have,
        missing: Math.max(0, CELL_TARGET - have),
        missingHealthy: Math.max(0, CELL_HEALTHY - have),
        blocking: have < CELL_TARGET,
      };
    })
    .sort((a, b) => (Number(b.blocking) - Number(a.blocking)) || (a.have - b.have));
}

export type RoundReadiness = {
  roundNo: number;
  /** Режимы, которыми этот раунд может быть сыгран прямо сейчас. */
  readyModes: TournamentMode[];
  /** Раунд соберётся: есть режим с 8 заданиями, либо это mix-раунд с запасом. */
  ok: boolean;
  /** Всего подходящих заданий для раунда (для mix-раундов важен суммарный объём). */
  totalTasks: number;
};

/**
 * Готовность каждого раунда — то, что показываем в админке вместо догадок.
 *
 * single-раунд собирается, только если ХОТЯ БЫ ОДИН режим имеет 8 заданий
 * нужной сложности. mix-раунд смешивает режимы, ему достаточно 8 суммарно.
 */
export function roundReadiness(
  counts: PoolCounts,
  modes: readonly TournamentMode[] = TOURNAMENT_MODES,
): RoundReadiness[] {
  return ROUND_DIFFICULTIES.map((difficulties, index) => {
    const roundNo = index + 1;
    const isSingle = TOURNAMENT_ROUND_MODE_KINDS[index] === 'single';
    const perMode = modes.map((mode) => ({
      mode,
      count: difficulties.reduce((sum, difficulty) => sum + Math.max(0, Number(counts[`${mode}:${difficulty}`] ?? 0)), 0),
    }));
    const readyModes = perMode.filter((entry) => entry.count >= TASKS_PER_ROUND).map((entry) => entry.mode);
    const totalTasks = perMode.reduce((sum, entry) => sum + entry.count, 0);
    return {
      roundNo,
      readyModes,
      totalTasks,
      ok: isSingle ? readyModes.length > 0 : totalTasks >= TASKS_PER_ROUND,
    };
  });
}

/** Комплект готов: каждый раунд собирается. */
export function poolIsTournamentReady(
  counts: PoolCounts,
  modes: readonly TournamentMode[] = TOURNAMENT_MODES,
): boolean {
  return roundReadiness(counts, modes).every((round) => round.ok);
}

export type GenerationOrder = {
  mode: TournamentMode;
  difficulty: number;
  /** Сколько заданий заказать в этой ячейке. */
  count: number;
};

/**
 * План заказа для ИИ: закрываем сначала блокирующие ячейки, затем добиваем до
 * здорового запаса, пока не упрёмся в общий лимит батча.
 *
 * зачем лимит: генерация стоит денег (OpenAI) — владелец не должен случайно
 * заказать тысячу заданий одним нажатием. Админка вызывает планировщик
 * повторно, пока комплект не станет зелёным.
 */
export function planGenerationOrders(
  counts: PoolCounts,
  options?: { maxTasks?: number; healthy?: boolean; modes?: readonly TournamentMode[] },
): GenerationOrder[] {
  const maxTasks = Math.max(0, options?.maxTasks ?? CELL_TARGET * 4);
  const healthy = options?.healthy === true;
  const gaps = planPoolGaps(counts, options?.modes);
  const orders: GenerationOrder[] = [];
  let budget = maxTasks;

  for (const gap of gaps) {
    if (budget <= 0) break;
    const need = healthy ? gap.missingHealthy : gap.missing;
    if (need <= 0) continue;
    const count = Math.min(need, budget);
    orders.push({ mode: gap.mode, difficulty: gap.difficulty, count });
    budget -= count;
  }
  return orders;
}
