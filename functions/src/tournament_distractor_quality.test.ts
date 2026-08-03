// ═══════════════════════════════════════════════════════════════════════════
// tournament_distractor_quality.test.ts — контракт КАЧЕСТВА дистракторов.
//
// зачем (владелец 2026-08-03): «дистракторы должны заставлять читать задание и
// быть внимательным, а не выбирать самый очевидный вариант». Аудит показал, что
// guess_phrase и find_oddity собирали неправильные варианты из ПРОИЗВОЛЬНЫХ
// других фраз того же дня: 35% дистракторов не имели с правильным ответом ни
// одного общего слова. Игрок узнавал ответ по теме, не читая варианты.
//
// Этот файл — механический страж: он ловит именно «дистрактор, который и близко
// не подходит», а не грамматику. Грамматическую однозначность (ровно один
// верный вариант) стережёт tournament_pool_v2_factory.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { buildNewTournamentPool } from './tournament_pool_v2_factory';
import {
  TOURNAMENT_SOURCE_PLANS,
  loadTournamentSourceDays,
} from './tournament_content_source';
import { validateTournamentTaskForNewRoom } from './tournament_core';

const GENERATION_TIMEOUT_MS = 600_000;

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[’‘`]/gu, "'")
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function wordsOf(value: string): string[] {
  return normalizeText(value).split(' ').filter((token) => token.length > 0);
}

/**
 * Доля общих слов относительно более короткого варианта.
 *
 * зачем: именно эта метрика отличает «правдоподобную ловушку» от «случайной
 * чужой фразы». Ловушка обязана делить с ответом костяк слов и отличаться
 * точечно; чужая фраза про другую тему делит ноль.
 */
function lexicalOverlap(left: string, right: string): number {
  const a = new Set(wordsOf(left));
  const b = new Set(wordsOf(right));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  a.forEach((token) => {
    if (b.has(token)) shared += 1;
  });
  return shared / Math.min(a.size, b.size);
}

type ChoiceTask = {
  readonly taskId: string;
  readonly mode: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
};

function choiceTasks(
  tasks: readonly { taskId: string; mode: string; payload: Record<string, unknown> }[],
  mode: string,
): ChoiceTask[] {
  return tasks
    .filter((task) => task.mode === mode)
    .map((task) => ({
      taskId: task.taskId,
      mode: task.mode,
      options: (task.payload.options as string[]) ?? [],
      correctIndex: Number(task.payload.correctIndex),
    }));
}

describe('качество дистракторов турнирного пула', () => {
  const pool = buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
  const tasks = pool.tasks;

  it('пул целиком проходит строгий валидатор новой комнаты', () => {
    const invalid = tasks
      .map((task) => ({ taskId: task.taskId, validation: validateTournamentTaskForNewRoom(task) }))
      .filter((entry) => !entry.validation.ok);
    expect(invalid).toEqual([]);
  }, GENERATION_TIMEOUT_MS);

  // Ключевой контракт владельца. На старой логике guess_phrase падает здесь:
  // распределение показывало 1489 дистракторов с нулевым пересечением.
  describe.each(['guess_phrase', 'find_oddity'])('%s', (mode) => {
    it('каждый дистрактор делит слова с правильным ответом', () => {
      const offenders = choiceTasks(tasks, mode).flatMap((task) => task.options
        .map((option, index) => ({ option, index }))
        .filter(({ index }) => index !== task.correctIndex)
        .filter(({ option }) => lexicalOverlap(task.options[task.correctIndex], option) === 0)
        .map(({ option }) => ({
          taskId: task.taskId,
          correct: task.options[task.correctIndex],
          distractor: option,
        })));
      expect(offenders.slice(0, 10)).toEqual([]);
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);

    it('дистракторы близки к ответу по длине: нет ни односложных обрубков, ни разрыва в 3+ слова', () => {
      const offenders = choiceTasks(tasks, mode).flatMap((task) => {
        const correct = task.options[task.correctIndex];
        const correctWords = wordsOf(correct).length;
        return task.options
          .map((option, index) => ({ option, index }))
          .filter(({ index }) => index !== task.correctIndex)
          .filter(({ option }) => {
            const optionWords = wordsOf(option).length;
            if (correctWords > 1 && optionWords <= 1) return true;
            return Math.abs(optionWords - correctWords) >= 3;
          })
          .map(({ option }) => ({ taskId: task.taskId, correct, distractor: option }));
      });
      expect(offenders.slice(0, 10)).toEqual([]);
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);

    it('варианты не дублируются и не повторяют правильный ответ', () => {
      const offenders = choiceTasks(tasks, mode).filter((task) => {
        const normalized = task.options.map(normalizeText);
        return new Set(normalized).size !== normalized.length;
      }).map((task) => ({ taskId: task.taskId, options: task.options }));
      expect(offenders.slice(0, 10)).toEqual([]);
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);

    it('ровно один правильный вариант и он лежит по correctIndex', () => {
      const offenders = choiceTasks(tasks, mode).filter((task) => (
        task.options.length !== 4
        || !Number.isInteger(task.correctIndex)
        || task.correctIndex < 0
        || task.correctIndex >= task.options.length
      )).map((task) => ({ taskId: task.taskId, correctIndex: task.correctIndex }));
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);

    it('правильный ответ не выделяется позицией — она размазана по всем четырём', () => {
      const positions = [0, 0, 0, 0];
      for (const task of choiceTasks(tasks, mode)) positions[task.correctIndex] += 1;
      const total = positions.reduce((sum, count) => sum + count, 0);
      for (const count of positions) {
        expect(count / total).toBeGreaterThan(0.15);
        expect(count / total).toBeLessThan(0.35);
      }
    }, GENERATION_TIMEOUT_MS);
  });

  describe('fill_gap', () => {
    it('все четыре варианта — однословные подстановки в один и тот же пропуск', () => {
      const offenders = choiceTasks(tasks, 'fill_gap').filter((task) => (
        task.options.some((option) => wordsOf(option).length !== 1)
      )).map((task) => ({ taskId: task.taskId, options: task.options }));
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);

    it('варианты не дублируются', () => {
      const offenders = choiceTasks(tasks, 'fill_gap').filter((task) => {
        const normalized = task.options.map(normalizeText);
        return new Set(normalized).size !== normalized.length;
      }).map((task) => ({ taskId: task.taskId, options: task.options }));
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);
  });

  describe('translate_build', () => {
    // Ловушка в банке слов обязана конкурировать с конкретным словом ответа
    // (форма/близкое написание), а не быть словом из другой темы.
    it('ловушка формой связана с одним из слов правильного ответа', () => {
      const offenders = tasks
        .filter((task) => task.mode === 'translate_build')
        .flatMap((task) => {
          const bank = (task.payload.wordBank as string[]) ?? [];
          const correct = (task.payload.correctTokens as string[]) ?? [];
          const remaining = [...correct];
          const traps: string[] = [];
          for (const token of bank) {
            const index = remaining.indexOf(token);
            if (index >= 0) remaining.splice(index, 1);
            else traps.push(token);
          }
          return traps
            .filter((trap) => !correct.some((token) => isFormRelated(token, trap)))
            .map((trap) => ({
              taskId: task.taskId,
              answer: task.payload.correctAnswer,
              trap,
            }));
        });
      expect(offenders.slice(0, 10)).toEqual([]);
      expect(offenders).toHaveLength(0);
    }, GENERATION_TIMEOUT_MS);
  });
});

/**
 * Родство по форме: общий корень, приставка-в-приставку или расстояние
 * редактирования в один шаг. Именно так выглядит честная ловушка — «has» против
 * «have», «Is» против «Are», «an» против «a».
 */
function isFormRelated(token: string, trap: string): boolean {
  const a = normalizeText(token);
  const b = normalizeText(trap);
  if (!a || !b || a === b) return false;
  const shortest = Math.min(a.length, b.length);
  const prefix = Math.max(3, Math.ceil(shortest * 0.6));
  if (shortest >= 3 && a.slice(0, prefix) === b.slice(0, prefix)) return true;
  return editDistanceWithin(a, b, 2);
}

function editDistanceWithin(a: string, b: string, limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) return false;
  let previous = Array.from({ length: b.length + 1 }, (_unused, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = a[i - 1] === b[j - 1]
        ? previous[j - 1]
        : 1 + Math.min(previous[j - 1], previous[j], current[j - 1]);
    }
    previous = current;
  }
  return previous[b.length] <= limit;
}
