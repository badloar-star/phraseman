/**
 * Контракт плана турнира для ИИ-генерации.
 *
 * зачем: план обязан совпадать с тем, как сервер РЕАЛЬНО собирает раунды
 * (selectRoundTasks + buildRounds). Расхождение здесь означает турнир, который
 * создаётся и тут же отменяется, списывая игрокам билеты.
 */

import {
  KIND_TO_FORMAT,
  KIND_TO_MODE,
  ROUND_DIFFICULTY,
  TASKS_PER_ROUND,
  TOURNAMENT_AI_KINDS,
  TOURNAMENT_AI_TOTAL_TASKS,
  buildTournamentPlan,
  flattenPlan,
  planKindCounts,
} from './tournament_ai_blueprint';
import { TOURNAMENT_ROUNDS, TOURNAMENT_ROUND_MODE_KINDS } from './tournament_core';

describe('план турнира: размеры', () => {
  it('одна генерация = целый турнир, а не пачка вопросов', () => {
    // Требование владельца: «генерация всегда генерировала 1 фулл готовый
    // турнир, все раунды, а не 10 вопросов».
    expect(TOURNAMENT_AI_TOTAL_TASKS).toBe(TOURNAMENT_ROUNDS * TASKS_PER_ROUND);
    expect(flattenPlan(buildTournamentPlan())).toHaveLength(TOURNAMENT_AI_TOTAL_TASKS);
  });

  it('в каждом раунде ровно столько заданий, сколько берёт сервер', () => {
    for (const round of buildTournamentPlan()) {
      expect(round.kinds).toHaveLength(TASKS_PER_ROUND);
      expect(round.difficulties).toHaveLength(TASKS_PER_ROUND);
    }
  });
});

describe('план турнира: соответствие серверу', () => {
  it('режимы раундов совпадают с TOURNAMENT_ROUND_MODE_KINDS', () => {
    const plan = buildTournamentPlan();
    expect(plan.map((round) => round.modeKind)).toEqual([...TOURNAMENT_ROUND_MODE_KINDS]);
  });

  it('single-раунд собран ОДНИМ типом — иначе сервер не наберёт задания', () => {
    // selectRoundTasks при modeKind='single' выбирает один режим из пула:
    // разные типы в таком раунде означают недобор и отмену комнаты.
    for (const round of buildTournamentPlan()) {
      if (round.modeKind !== 'single') continue;
      expect(new Set(round.kinds).size).toBe(1);
    }
  });

  it('сложности не выходят из полосы раунда (зеркало selectRoundTasks)', () => {
    for (const round of buildTournamentPlan()) {
      const allowed = ROUND_DIFFICULTY[round.roundNo];
      expect(allowed).toBeDefined();
      for (const difficulty of round.difficulties) {
        expect(allowed).toContain(difficulty);
      }
    }
  });
});

describe('план турнира: разнообразие', () => {
  it('все четыре типа вопросов реально встречаются', () => {
    // Жалоба владельца: «ОНИ ВСЕ ОДНОТИПНЫЕ».
    const counts = planKindCounts(buildTournamentPlan());
    for (const kind of TOURNAMENT_AI_KINDS) {
      expect(counts[kind]).toBeGreaterThan(0);
    }
  });

  it('ни один тип не забирает больше половины турнира', () => {
    // Регрессия расчёта: с single-раундами на situation/gap выходило 10/10/2/2 —
    // редкие типы вырождались в довесок.
    const counts = planKindCounts(buildTournamentPlan());
    for (const kind of TOURNAMENT_AI_KINDS) {
      expect(counts[kind]).toBeLessThanOrEqual(TOURNAMENT_AI_TOTAL_TASKS / 2);
      expect(counts[kind]).toBeGreaterThanOrEqual(4);
    }
  });

  it('каждый тип знает свой режим пула и серверный формат', () => {
    for (const kind of TOURNAMENT_AI_KINDS) {
      expect(KIND_TO_MODE[kind]).toBeTruthy();
      expect(['choice', 'translate']).toContain(KIND_TO_FORMAT[kind]);
    }
    // Режимы уникальны: иначе раздельные пулы в админке склеятся.
    const modes = TOURNAMENT_AI_KINDS.map((kind) => KIND_TO_MODE[kind]);
    expect(new Set(modes).size).toBe(modes.length);
  });

  it('режим «собери фразу» использует translate-контракт сервера', () => {
    expect(KIND_TO_FORMAT.assembly).toBe('translate');
    expect(KIND_TO_MODE.assembly).toBe('translate_build');
  });
});
