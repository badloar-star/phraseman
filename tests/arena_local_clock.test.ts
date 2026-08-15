import {
  arenaLocalMatchBudgetMs,
  arenaLocalNextBoundaryMs,
  arenaLocalPhase,
} from '../modules/arena/local_clock';
import {
  ARENA_LOCAL_READING_MS,
  ARENA_LOCAL_REVEAL_MS,
  arenaLocalMatchInit,
  arenaLocalMatchReduce,
  type ArenaLocalMatchState,
  type ArenaMatchPlan,
} from '../modules/arena/match_machine';
import { ARENA_ANSWER_MS } from '../modules/arena/stars';

/**
 * Часы матча — чистое ядро того единственного места, где во всей Арене есть
 * эффекты. Хук ставит ТОЧНЫЙ таймер на границу фазы, а не тик раз в секунду:
 * тик по расписанию промахивается мимо конца окна на половину своего периода,
 * то есть игрок увидел бы «время вышло» позже, чем оно вышло. Владелец назвал
 * это недопустимым прямо, поэтому граница считается здесь и проверяется здесь.
 */

const MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const;

const PLAN: ArenaMatchPlan = {
  matchId: 'm1',
  seat: 'a',
  mode: 'ranked',
  planHash: 'h',
  tasks: MODES.map((mode, taskIndex) => ({ taskIndex, mode })),
};

const MONO0 = 10_000;
const WALL0 = 1_700_000_000_000;
const COUNTDOWN = 3_200;

const init = (): ArenaLocalMatchState => arenaLocalMatchInit(PLAN, {
  monoNowMs: MONO0, wallNowMs: WALL0, monoEpochId: 'e1', countdownRemainingMs: COUNTDOWN,
});

const step = (state: ArenaLocalMatchState, monoNowMs: number): ArenaLocalMatchState =>
  arenaLocalMatchReduce(PLAN, state, { type: 'tick', monoNowMs });

describe('видимая фаза', () => {
  it('отсчёт отдаёт остаток, а не прошедшее', () => {
    const phase = arenaLocalPhase(init(), MONO0 + 1_200);
    expect(phase.kind).toBe('countdown');
    expect(phase.kind === 'countdown' && phase.remainingMs).toBe(COUNTDOWN - 1_200);
  });

  it('остаток никогда не отрицательный', () => {
    const phase = arenaLocalPhase(init(), MONO0 + 10 * COUNTDOWN);
    expect(phase.kind === 'countdown' && phase.remainingMs).toBe(0);
  });

  it('часы, ушедшие назад, не делают остаток больше окна', () => {
    // Без потолка кольцо таймера прокрутилось бы больше полного оборота.
    const phase = arenaLocalPhase(init(), MONO0 - 5_000);
    expect(phase.kind === 'countdown' && phase.remainingMs).toBe(COUNTDOWN);
  });

  it('фаза ответа отдаёт и остаток, и полное окно — для кольца таймера', () => {
    let s = step(init(), MONO0 + COUNTDOWN);
    s = step(s, s.phaseStartedAtMonoMs + ARENA_LOCAL_READING_MS);
    expect(s.phase).toBe('answer');
    const phase = arenaLocalPhase(s, s.phaseStartedAtMonoMs + 2_000);
    expect(phase.kind).toBe('answer');
    if (phase.kind !== 'answer') throw new Error('phase');
    expect(phase.budgetMs).toBe(ARENA_ANSWER_MS.guess_phrase);
    expect(phase.remainingMs).toBe(ARENA_ANSWER_MS.guess_phrase - 2_000);
    expect(phase.taskIndex).toBe(0);
  });

  it('доигранный матч отдаёт только «готово»', () => {
    let s = init();
    for (let guard = 0; guard < 200 && s.phase !== 'finished'; guard += 1) {
      s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
    }
    expect(s.phase).toBe('finished');
    expect(arenaLocalPhase(s, MONO0 + 10_000_000).kind).toBe('finished');
  });
});

describe('следующая граница фазы', () => {
  it('в начале отсчёта — весь отсчёт', () => {
    expect(arenaLocalNextBoundaryMs(init(), MONO0)).toBe(COUNTDOWN);
  });

  it('к концу фазы стремится к нулю, но не уходит ниже', () => {
    const s = init();
    expect(arenaLocalNextBoundaryMs(s, MONO0 + COUNTDOWN - 1)).toBe(1);
    expect(arenaLocalNextBoundaryMs(s, MONO0 + COUNTDOWN)).toBe(0);
    expect(arenaLocalNextBoundaryMs(s, MONO0 + COUNTDOWN + 5_000)).toBe(0);
  });

  it('у доигранного матча границы нет — таймер ставить не на что', () => {
    let s = init();
    for (let guard = 0; guard < 200 && s.phase !== 'finished'; guard += 1) {
      s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
    }
    expect(arenaLocalNextBoundaryMs(s, MONO0)).toBeNull();
  });

  /**
   * Здесь и проверяется главное свойство точного таймера: сколько бы раз его
   * ни перевзвели посреди фазы, момент срабатывания остаётся ТЕМ ЖЕ. Именно
   * поэтому хук может смело перевзводить таймер на каждое изменение состояния.
   */
  it('перевзвод посреди фазы не двигает границу', () => {
    const s = init();
    const target = MONO0 + COUNTDOWN;
    for (const at of [MONO0, MONO0 + 100, MONO0 + 1_500, MONO0 + 3_100]) {
      expect(at + (arenaLocalNextBoundaryMs(s, at) as number)).toBe(target);
    }
  });

  it('граница совпадает с моментом, когда редьюсер меняет фазу', () => {
    const s = step(init(), MONO0 + COUNTDOWN);
    expect(s.phase).toBe('reading');
    const boundary = arenaLocalNextBoundaryMs(s, s.phaseStartedAtMonoMs) as number;
    expect(boundary).toBe(ARENA_LOCAL_READING_MS);
    expect(step(s, s.phaseStartedAtMonoMs + boundary - 1).phase).toBe('reading');
    expect(step(s, s.phaseStartedAtMonoMs + boundary).phase).toBe('answer');
  });
});

describe('полная длина матча', () => {
  it('складывается из отсчёта, чтения, окон и показа результата', () => {
    const expected = COUNTDOWN + MODES.reduce(
      (sum, mode) => sum + ARENA_LOCAL_READING_MS + ARENA_ANSWER_MS[mode] + ARENA_LOCAL_REVEAL_MS, 0);
    expect(arenaLocalMatchBudgetMs(PLAN, COUNTDOWN)).toBe(expected);
  });

  it('отрицательный отсчёт считается нулевым', () => {
    expect(arenaLocalMatchBudgetMs(PLAN, -5_000)).toBe(arenaLocalMatchBudgetMs(PLAN, 0));
  });

  it('матч на десять заданий строго длиннее матча на пять', () => {
    const long: ArenaMatchPlan = { ...PLAN, tasks: [...PLAN.tasks, ...PLAN.tasks.map((t, i) => ({ ...t, taskIndex: i + 5 }))] };
    expect(arenaLocalMatchBudgetMs(long, COUNTDOWN)).toBeGreaterThan(arenaLocalMatchBudgetMs(PLAN, COUNTDOWN));
  });
});
