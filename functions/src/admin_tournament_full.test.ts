/**
 * Контракт генерации целого турнира.
 *
 * зачем: группировка определяет, сколько запросов уйдёт в OpenAI и сколько
 * заданий получит каждый раунд. Ошибка здесь = деньги на ветер либо турнир,
 * который создаётся и тут же отменяется из-за недобора заданий.
 */

import {
  difficultyWord,
  groupPlannedTasks,
  parseTournamentFullRequest,
} from './admin_tournament_full';
import {
  ROUND_DIFFICULTY,
  TASKS_PER_ROUND,
  TOURNAMENT_AI_KINDS,
  TOURNAMENT_AI_TOTAL_TASKS,
} from './tournament_ai_blueprint';

function expectRejected(run: () => unknown): void {
  expect(run).toThrow();
}

describe('разбор запроса генерации турнира', () => {
  it('уровень по умолчанию A2, dryRun выключен', () => {
    expect(parseTournamentFullRequest(undefined)).toMatchObject({ level: 'A2', dryRun: false });
  });

  it('отклоняет неизвестный уровень и посторонние поля', () => {
    expectRejected(() => parseTournamentFullRequest({ level: 'Z9' }));
    expectRejected(() => parseTournamentFullRequest({ level: 'B1', evil: true }));
  });

  it('тема обрезается, dryRun включается только явным true', () => {
    const parsed = parseTournamentFullRequest({ level: 'B1', topicHint: 'x'.repeat(300), dryRun: 'yes' });
    expect(parsed.topicHint.length).toBeLessThanOrEqual(120);
    expect(parsed.dryRun).toBe(false);
  });
});

describe('группировка заданий турнира', () => {
  it('покрывает ровно весь турнир — ни одного задания не теряется', () => {
    const total = groupPlannedTasks().reduce((sum, group) => sum + group.count, 0);
    expect(total).toBe(TOURNAMENT_AI_TOTAL_TASKS);
  });

  it('запросов к OpenAI меньше, чем заданий — группами, а не поштучно', () => {
    // Поштучные запросы стоили бы в разы дороже при том же результате.
    const groups = groupPlannedTasks();
    expect(groups.length).toBeLessThan(TOURNAMENT_AI_TOTAL_TASKS);
    expect(groups.length).toBeGreaterThan(0);
  });

  it('каждая группа однородна: один тип, одна сложность', () => {
    for (const group of groupPlannedTasks()) {
      expect(TOURNAMENT_AI_KINDS).toContain(group.kind);
      expect(group.count).toBeGreaterThan(0);
      expect(group.count).toBeLessThanOrEqual(TOURNAMENT_AI_TOTAL_TASKS);
      // Сложность обязана встречаться хотя бы в одном раунде — иначе задание
      // осядет в пуле мёртвым грузом и ни один раунд его не возьмёт.
      const usedSomewhere = Object.values(ROUND_DIFFICULTY)
        .some((allowed) => allowed.includes(group.difficulty));
      expect(usedSomewhere).toBe(true);
    }
  });

  it('все четыре типа попадают в группы', () => {
    const kinds = new Set(groupPlannedTasks().map((group) => group.kind));
    for (const kind of TOURNAMENT_AI_KINDS) expect(kinds.has(kind)).toBe(true);
  });

  it('ни одна группа не просит больше, чем помещается в раунд разом', () => {
    // Крупная группа = длинный ответ модели и риск обрыва по токенам.
    for (const group of groupPlannedTasks()) {
      expect(group.count).toBeLessThanOrEqual(TASKS_PER_ROUND * 2);
    }
  });
});

describe('слово сложности для промпта', () => {
  it('1 → easy, 2 → medium, 3 → hard', () => {
    expect(difficultyWord(1)).toBe('easy');
    expect(difficultyWord(2)).toBe('medium');
    expect(difficultyWord(3)).toBe('hard');
    // Края не должны падать в undefined.
    expect(difficultyWord(0)).toBe('easy');
    expect(difficultyWord(9)).toBe('hard');
  });
});
