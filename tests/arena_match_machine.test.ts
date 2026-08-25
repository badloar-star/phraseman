import {
  ARENA_LOCAL_ABANDON_MS,
  arenaLocalMatchInit,
  arenaLocalMatchReduce,
  arenaLocalMatchReport,
  type ArenaLocalEvent,
  type ArenaLocalMatchState,
  type ArenaMatchPlan,
} from '../modules/arena/match_machine';
import type { ArenaTaskMode } from '../modules/arena/contract';

/**
 * Локальная машина матча. Владелец (D-12): задержек быть не должно вообще,
 * поэтому матч считается на устройстве, а сервер только принимает отчёт.
 *
 * Здесь проверяется ровно то, что ломается молча: восстановление после сна,
 * холодный старт, перевод часов, брошенный матч и правило «звезда за пару
 * только с первой попытки».
 */

const MODES: readonly ArenaTaskMode[] = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'];

const makePlan = (count: number): ArenaMatchPlan => ({
  matchId: 'm1',
  seat: 'a',
  mode: count === 5 ? 'quick' : 'ranked',
  planHash: 'h1',
  tasks: Array.from({ length: count }, (_, index) => ({ taskIndex: index, mode: MODES[index % 5] as ArenaTaskMode })),
});

const P10 = makePlan(10);
const P5 = makePlan(5);
const MONO0 = 1_000;
const WALL0 = 500_000;

const init = (plan: ArenaMatchPlan) => arenaLocalMatchInit(plan, {
  monoNowMs: MONO0, wallNowMs: WALL0, monoEpochId: 'e1', countdownRemainingMs: 3_000,
});
const step = (plan: ArenaMatchPlan, state: ArenaLocalMatchState, event: ArenaLocalEvent) =>
  arenaLocalMatchReduce(plan, state, event);

/** Доводит машину до фазы ответа на первом задании. */
const toAnswer = (plan: ArenaMatchPlan) =>
  step(plan, init(plan), { type: 'tick', monoNowMs: MONO0 + 3_000 + 1_500 });

describe('фазы матча', () => {
  it('идёт отсчёт → чтение → ответ и берёт окно из типа задания', () => {
    let s = init(P10);
    expect(s.phase).toBe('countdown');
    s = step(P10, s, { type: 'tick', monoNowMs: MONO0 + 2_999 });
    expect(s.phase).toBe('countdown');
    s = step(P10, s, { type: 'tick', monoNowMs: MONO0 + 3_000 });
    expect(s.phase).toBe('reading');
    s = step(P10, s, { type: 'tick', monoNowMs: MONO0 + 4_500 });
    expect(s.phase).toBe('answer');
    // Окно ровно 8 секунд: сетевого запаса на клиенте нет, потому что нет сети.
    expect(s.phaseBudgetMs).toBe(8_000);
  });

  it('закрывает просроченное задание нулём и ведёт к следующему', () => {
    let s = toAnswer(P10);
    const end = s.phaseStartedAtMonoMs + 8_000;
    s = step(P10, s, { type: 'tick', monoNowMs: end });
    expect(s.matchStars).toBe(0);
    expect(s.outcomes[0].status).toBe('timeout');
    expect(s.phase).toBe('reveal');
    s = step(P10, s, { type: 'tick', monoNowMs: end + 1_200 });
    expect(s.taskIndex).toBe(1);
    expect(s.phase).toBe('reading');
  });
});

describe('начисление в матче', () => {
  it('даёт три звезды, когда соперник не ответил верно', () => {
    let s = toAnswer(P10);
    const at = s.phaseStartedAtMonoMs + 2_000;
    s = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
    expect(s.matchStars).toBe(3);
    expect(s.awards[0].headline.key).toBe('starFirst');
    // Награда показывается сразу, но фиксируется с паузой: за неё успевает
    // прийти тик соперника, и «+3» не превращается в «+2» на глазах.
    expect(s.awardResolveAtMonoMs).toBe(at + 600);
  });

  it('даёт две звезды и называет отставание, если соперник успел раньше', () => {
    let s = toAnswer(P10);
    s = step(P10, s, { type: 'opponent_answered', monoNowMs: s.phaseStartedAtMonoMs + 100,
      tick: { taskIndex: 0, correct: true, raceElapsedMs: 1_000 } });
    const at = s.phaseStartedAtMonoMs + 3_000;
    s = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
    expect(s.matchStars).toBe(2);
    expect(s.awards[0].headline.behindSeconds).toBe(2);
  });

  it('не даёт ошибке соперника отобрать бонус за скорость', () => {
    let s = toAnswer(P10);
    s = step(P10, s, { type: 'opponent_answered', monoNowMs: s.phaseStartedAtMonoMs + 50,
      tick: { taskIndex: 0, correct: false, raceElapsedMs: 200 } });
    const at = s.phaseStartedAtMonoMs + 3_000;
    s = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
    expect(s.matchStars).toBe(3);
  });

  it('не меняет уже зафиксированную награду поздним тиком соперника', () => {
    let s = toAnswer(P10);
    const at = s.phaseStartedAtMonoMs + 2_000;
    s = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
    const before = s.matchStars;
    s = step(P10, s, { type: 'opponent_answered', monoNowMs: at + 100,
      tick: { taskIndex: 0, correct: true, raceElapsedMs: 10 } });
    expect(s.matchStars).toBe(before);
  });

  it('платит комбо с третьего верного подряд', () => {
    let s = init(P10);
    let mono = MONO0 + 3_000;
    for (let i = 0; i < 4; i += 1) {
      s = step(P10, s, { type: 'tick', monoNowMs: mono + 1_500 });
      const at = s.phaseStartedAtMonoMs + 500;
      s = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
      mono = s.phaseStartedAtMonoMs + 1_200;
      s = step(P10, s, { type: 'tick', monoNowMs: mono });
    }
    expect(s.matchStars).toBe(3 + 3 + 4 + 4);
    expect(s.longestCombo).toBe(4);
  });
});

describe('задание на пары', () => {
  const toPairs = () => {
    let s = init(P10);
    let mono = MONO0 + 3_000;
    for (let i = 0; i < 4; i += 1) {
      s = step(P10, s, { type: 'tick', monoNowMs: mono + 1_500 });
      s = step(P10, s, { type: 'tick', monoNowMs: s.phaseStartedAtMonoMs + s.phaseBudgetMs });
      mono = s.phaseStartedAtMonoMs + 1_200;
      s = step(P10, s, { type: 'tick', monoNowMs: mono });
    }
    return step(P10, s, { type: 'tick', monoNowMs: s.phaseStartedAtMonoMs + 1_500 });
  };

  it('платит только за пары, угаданные с первой попытки', () => {
    let s = toPairs();
    expect(P10.tasks[s.taskIndex].mode).toBe('speed_match');
    const base = s.phaseStartedAtMonoMs;
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 100, pairIndex: 0, selectedIndex: 0, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 200, pairIndex: 1, selectedIndex: 3, correct: false });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 300, pairIndex: 1, selectedIndex: 1, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 400, pairIndex: 2, selectedIndex: 2, correct: true });
    expect(s.phase).toBe('answer');
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 500, pairIndex: 3, selectedIndex: 3, correct: true });
    expect(s.phase).toBe('reveal');
    // Перебор не окупается: четвёртая звезда не выдана.
    expect(s.awards[s.awards.length - 1].base).toBe(3);
  });

  it('журналирует тыки по порядку — сервер пересчитывает по ним', () => {
    let s = toPairs();
    const taskIndex = s.taskIndex;
    const base = s.phaseStartedAtMonoMs;
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 100, pairIndex: 0, selectedIndex: 0, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 200, pairIndex: 1, selectedIndex: 3, correct: false });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 300, pairIndex: 1, selectedIndex: 1, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 400, pairIndex: 2, selectedIndex: 2, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 500, pairIndex: 3, selectedIndex: 3, correct: true });
    expect(s.pairAttemptsByTask[taskIndex]).toEqual({ 0: [0], 1: [3, 1], 2: [2], 3: [3] });
  });

  it('повторный тык по тому же варианту не тратит попытку', () => {
    let s = toPairs();
    const taskIndex = s.taskIndex;
    const base = s.phaseStartedAtMonoMs;
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 100, pairIndex: 0, selectedIndex: 2, correct: false });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 120, pairIndex: 0, selectedIndex: 2, correct: false });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 300, pairIndex: 0, selectedIndex: 0, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 400, pairIndex: 1, selectedIndex: 1, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 500, pairIndex: 2, selectedIndex: 2, correct: true });
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 600, pairIndex: 3, selectedIndex: 3, correct: true });
    expect(s.pairAttemptsByTask[taskIndex][0]).toEqual([2, 0]);
  });

  it('просроченная доска всё равно отдаёт журнал', () => {
    let s = toPairs();
    const taskIndex = s.taskIndex;
    const base = s.phaseStartedAtMonoMs;
    s = step(P10, s, { type: 'speed_attempt', monoNowMs: base + 100, pairIndex: 0, selectedIndex: 0, correct: true });
    s = step(P10, s, { type: 'tick', monoNowMs: base + 60_000 });
    expect(s.pairAttemptsByTask[taskIndex]).toEqual({ 0: [0] });
  });

  it('игнорирует обычный ответ на задании с парами', () => {
    const s = toPairs();
    const at = s.phaseStartedAtMonoMs + 500;
    const next = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
    expect(next.phase).toBe('answer');
    expect(next.outcomes.length).toBe(s.outcomes.length);
  });
});

describe('быстрый матч', () => {
  it('заканчивается на пятом задании и упирается в свой потолок', () => {
    let s = init(P5);
    let mono = MONO0 + 3_000;
    for (let i = 0; i < 5; i += 1) {
      s = step(P5, s, { type: 'tick', monoNowMs: mono + 1_500 });
      const at = s.phaseStartedAtMonoMs + 400;
      if (P5.tasks[s.taskIndex].mode === 'speed_match') {
        for (let pair = 0; pair < 4; pair += 1) {
          s = step(P5, s, { type: 'speed_attempt', monoNowMs: at + pair * 10, pairIndex: pair, selectedIndex: pair, correct: true });
        }
      } else {
        s = step(P5, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct: true, answer: 1 });
      }
      if (s.phase === 'finished') break;
      mono = s.phaseStartedAtMonoMs + 1_200;
      s = step(P5, s, { type: 'tick', monoNowMs: mono });
    }
    expect(s.phase).toBe('finished');
    expect(s.matchStars).toBe(19);
    expect(arenaLocalMatchReport(P5, s)?.outcomes).toHaveLength(5);
  });
});

describe('перерывы, часы и выход', () => {
  it('закрывает просрочкой задания, пройденные во сне', () => {
    let s = toAnswer(P10);
    const far = s.phaseStartedAtMonoMs + 60_000;
    s = step(P10, s, { type: 'resume', monoNowMs: far, wallNowMs: WALL0 + far, monoEpochId: 'e1' });
    expect(s.matchStars).toBe(0);
    expect(s.taskIndex > 0 || s.phase === 'finished').toBe(true);
  });

  it('никогда не начисляет звёзды за восстановленное после холодного старта время', () => {
    let s = toAnswer(P10);
    s = step(P10, s, { type: 'resume', monoNowMs: 40, wallNowMs: WALL0 + 6_000, monoEpochId: 'e2' });
    expect(s.clockSuspect).toBe(true);
    expect(s.outcomes[0].status).toBe('timeout');
    expect(s.matchStars).toBe(0);
  });

  it('помечает перевод часов назад, но звёзды не отбирает', () => {
    let s = toAnswer(P10);
    const at = s.phaseStartedAtMonoMs + 1_000;
    s = step(P10, s, { type: 'answer', monoNowMs: at, wallNowMs: WALL0 - 100_000, correct: true, answer: 1 });
    expect(s.clockSuspect).toBe(true);
    expect(s.matchStars).toBe(3);
  });

  it('помечает брошенным матч, к которому не возвращались слишком долго', () => {
    let s = toAnswer(P10);
    const far = s.phaseStartedAtMonoMs + ARENA_LOCAL_ABANDON_MS + 60_000;
    s = step(P10, s, { type: 'resume', monoNowMs: far, wallNowMs: WALL0 + far, monoEpochId: 'e1' });
    expect(s.phase).toBe('finished');
    expect(s.abandoned).toBe(true);
    expect(s.matchStars).toBe(0);
  });

  it('закрывает все задания при явном выходе', () => {
    let s = toAnswer(P10);
    s = step(P10, s, { type: 'abandon', monoNowMs: 9_000, wallNowMs: WALL0 + 8_000 });
    expect(s.phase).toBe('finished');
    expect(s.outcomes).toHaveLength(10);
    expect(arenaLocalMatchReport(P10, s)?.abandoned).toBe(true);
  });

  it('не выдаёт отчёт до конца матча', () => {
    expect(arenaLocalMatchReport(P10, init(P10))).toBeNull();
  });
});

describe('видимость ответа соперника', () => {
  const exact = {
    taskIndex: 0,
    correct: true,
    raceElapsedMs: 5_000,
    exact: true as const,
  };

  it('stores exact truth without revealing it, then reveals once', () => {
    let state = init(P5);
    state = step(P5, state, {
      type: 'opponent_answered',
      monoNowMs: MONO0,
      tick: exact,
    });
    expect(state.opponentByTask[0]).toEqual(exact);
    expect(state.opponentRevealedByTask?.[0]).toBeUndefined();

    state = step(P5, state, {
      type: 'opponent_revealed',
      monoNowMs: MONO0 + 5_000,
      taskIndex: 0,
    });
    expect(state.opponentRevealedByTask?.[0]).toBe(true);
    expect(step(P5, state, {
      type: 'opponent_revealed',
      monoNowMs: MONO0 + 5_001,
      taskIndex: 0,
    })).toBe(state);
  });

  it('reveals a live tick immediately', () => {
    const live = { taskIndex: 0, correct: true, raceElapsedMs: 900 };
    const state = step(P5, init(P5), {
      type: 'opponent_answered',
      monoNowMs: MONO0,
      tick: live,
    });
    expect(state.opponentRevealedByTask?.[0]).toBe(true);
  });

  it('accepts a late presentation reveal after the player finishes', () => {
    let state: ArenaLocalMatchState = {
      ...init(P5),
      phase: 'finished',
      opponentByTask: { 0: exact },
    };
    state = step(P5, state, {
      type: 'opponent_revealed',
      monoNowMs: MONO0 + 5_000,
      taskIndex: 0,
    });
    expect(state.opponentRevealedByTask?.[0]).toBe(true);
  });
});
