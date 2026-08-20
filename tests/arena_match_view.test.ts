import {
  arenaAwardLines,
  arenaComboView,
  arenaMatchHud,
  arenaOpponentMatchStars,
  arenaOpponentSignal,
  arenaResolvedPairs,
} from '../modules/arena/match_view';
import {
  ARENA_ACCEPT_WINDOW_MS,
  arenaEntryStep,
  arenaMachinePlan,
  arenaParseMatchPlan,
  arenaCanStartOffline,
  arenaEntryFailure,
  arenaEntryFailureCopy,
  arenaSearchFailureCopy,
  arenaPlanTaskToPublic,
  type ArenaMatchPlanWire,
} from '../modules/arena/duel_plan';
import {
  ARENA_LOCAL_READING_MS,
  arenaLocalMatchInit,
  arenaLocalMatchReduce,
  type ArenaLocalMatchState,
} from '../modules/arena/match_machine';
import { arenaLocalPhase } from '../modules/arena/local_clock';
import { ARENA_ANSWER_MS, ARENA_COMBO_THRESHOLD } from '../modules/arena/stars';
import { arenaTaskRenderable } from '../modules/arena/task_adapter';
import * as fs from 'fs';
import * as path from 'path';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';

/**
 * Модель представления матча.
 *
 * Экран не считает ничего сам, поэтому всё, что он покажет, проверяется здесь.
 * Особенно два владельческих требования: индикатор обязан загораться, как
 * только соперник ответил, и игрок обязан понимать, почему звёзд две, а не три.
 */

const MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const;

describe('инициализация локального матча', () => {
  test('гидратирует reducer, когда запечатанный план приходит после mount', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks/use_arena_local_match.ts'), 'utf8');
    expect(source).toContain("type: 'hydrate'");
    expect(source).toContain('state?.matchId === initial.matchId');
    expect(source).toContain("dispatch({ type: 'hydrate', state: initial });");
    expect(source).toContain('state.matchId !== plan.matchId');
  });

  test('не удаляет финальный снимок до долговечной записи отчёта', () => {
    const hook = fs.readFileSync(path.join(process.cwd(), 'hooks/use_arena_local_match.ts'), 'utf8');
    const screen = fs.readFileSync(path.join(process.cwd(), 'app/arena_match.tsx'), 'utf8');
    expect(hook).not.toContain('void arenaClearMatch(keyValue)');
    expect(screen.indexOf('const durable = await arenaOutboxEnqueue('))
      .toBeLessThan(screen.indexOf('const response = await arenaV2MatchFinish('));
    expect(screen).toContain('if (durable) {');
    expect(screen).toContain('await arenaClearMatch(AsyncStorage as unknown as ArenaKeyValueStore);');
  });
});

const PLAN = arenaParseMatchPlan({
  schemaVersion: 'arena-match-plan.v2',
  rulesVersion: 'arena-stars.v3',
  matchId: 'm1',
  mode: 'ranked',
  viewerSeat: 'a',
  taskCount: 5,
  countdownMs: 3_200,
  readingMs: 1_500,
  revealMs: 1_200,
  rules: {
    starsCorrect: 2, starsCorrectFirst: 3, starsPerPair: 1, comboThreshold: 3,
    comboBonus: 1, timeQuantumMs: 100, starPolicy: 'banked',
    awardsRankPoints: true, matchStarCeiling: 19,
  },
  tasks: MODES.map((mode, taskIndex) => ({
    taskId: `t${taskIndex}`, taskIndex, mode, kind: 'choice', difficulty: 2,
    answerMs: ARENA_ANSWER_MS[mode],
    payload: { phrase: 'give up', options: ['a', 'b', 'c', 'd'] },
    answerFingerprints: ['fp0', 'fp1', 'fp2', 'fp3'],
  })),
  opponent: { seat: 'b', name: 'Соперник', rank: 4 },
  opponentTicks: [],
  liveChannelPath: 'arenaLive/m1',
  planHash: 'h',
  issuedAtMs: 1_000,
}) as ArenaMatchPlanWire;

const MACHINE = arenaMachinePlan(PLAN);
const MONO0 = 10_000;
const WALL0 = 1_700_000_000_000;
const COUNTDOWN = 3_200;

const init = (): ArenaLocalMatchState => arenaLocalMatchInit(MACHINE, {
  monoNowMs: MONO0, wallNowMs: WALL0, monoEpochId: 'e1', countdownRemainingMs: COUNTDOWN,
});

const step = (s: ArenaLocalMatchState, monoNowMs: number) =>
  arenaLocalMatchReduce(MACHINE, s, { type: 'tick', monoNowMs });

/** Доводит матч до фазы ответа на задании 0. */
function toAnswer(): ArenaLocalMatchState {
  let s = step(init(), MONO0 + COUNTDOWN);
  s = step(s, s.phaseStartedAtMonoMs + ARENA_LOCAL_READING_MS);
  if (s.phase !== 'answer') throw new Error('ожидалась фаза ответа');
  return s;
}

const answerNow = (s: ArenaLocalMatchState, at: number, correct: boolean) =>
  arenaLocalMatchReduce(MACHINE, s, {
    type: 'answer', monoNowMs: at, wallNowMs: WALL0 + at, correct, answer: { selectedIndex: 1 },
  });

const hudOf = (s: ArenaLocalMatchState, monoNowMs: number) =>
  arenaMatchHud(PLAN, s, arenaLocalPhase(s, monoNowMs), monoNowMs);

describe('фикстура', () => {
  it('план разобрался', () => {
    expect(PLAN).not.toBeNull();
    expect(PLAN.tasks.length).toBe(5);
  });
});

describe('серия', () => {
  it('единица серией не считается', () => {
    expect(arenaComboView(0).visible).toBe(false);
    expect(arenaComboView(1).visible).toBe(false);
    expect(arenaComboView(2).visible).toBe(true);
  });

  it('до порога показывает, сколько осталось', () => {
    expect(arenaComboView(1).toBonus).toBe(ARENA_COMBO_THRESHOLD - 1);
    expect(arenaComboView(2).toBonus).toBe(ARENA_COMBO_THRESHOLD - 2);
  });

  it('на пороге начинает платить и перестаёт считать остаток', () => {
    const view = arenaComboView(ARENA_COMBO_THRESHOLD);
    expect(view.paying).toBe(true);
    expect(view.toBonus).toBe(0);
  });

  it('мусор и отрицательное не ломают', () => {
    expect(arenaComboView(-5).streak).toBe(0);
    expect(arenaComboView(2.9).streak).toBe(2);
  });
});

describe('точный live-счёт соперника', () => {
  const viewerOutcome = (mode: typeof MODES[number], firstAttemptPairs = 0, taskIndex = 0) => ({
    taskIndex,
    mode,
    status: 'correct' as const,
    raceElapsedMs: 1_000,
    firstAttemptPairs,
    resolvedPairs: mode === 'speed_match' ? 4 : 0,
    answer: null,
  });

  const stateWith = (
    ticks: ArenaLocalMatchState['opponentByTask'],
    outcomes: ArenaLocalMatchState['outcomes'] = [],
  ): ArenaLocalMatchState => ({ ...init(), opponentByTask: ticks, outcomes });

  it('берёт наибольший валидный переданный итог и не даёт ему убывать', () => {
    expect(arenaOpponentMatchStars(PLAN, stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 7 },
      1: { taskIndex: 1, correct: true, raceElapsedMs: 800, matchStars: 5 },
    }))).toBe(7);
  });

  it('вычисляет точный fallback для обычного задания', () => {
    expect(arenaOpponentMatchStars(PLAN, stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900 },
    }, [viewerOutcome('guess_phrase')]))).toBe(3);
  });

  it('для пар использует точное firstAttemptPairs', () => {
    const speedPlan = {
      ...PLAN,
      tasks: [{ ...PLAN.tasks[4], taskIndex: 0 }, ...PLAN.tasks.slice(1)],
    } as ArenaMatchPlanWire;
    const state = stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900, firstAttemptPairs: 4 },
    }, [viewerOutcome('speed_match', 2)]);
    expect(arenaOpponentMatchStars(speedPlan, state)).toBe(4);
  });

  for (const firstAttemptPairs of [0, 1, 3, 4]) {
    it(`для пар считает точные ${firstAttemptPairs}/4 даже при legacy correct:false`, () => {
      const speedPlan = {
        ...PLAN,
        tasks: [{ ...PLAN.tasks[4], taskIndex: 0 }, ...PLAN.tasks.slice(1)],
      } as ArenaMatchPlanWire;
      const state = stateWith({
        0: { taskIndex: 0, correct: false, raceElapsedMs: 900, firstAttemptPairs },
      }, [viewerOutcome('speed_match', 2)]);
      expect(arenaOpponentMatchStars(speedPlan, state)).toBe(firstAttemptPairs);
    });
  }

  it('для точных пар не доверяет противоречащему boolean correct', () => {
    const speedPlan = {
      ...PLAN,
      tasks: [{ ...PLAN.tasks[4], taskIndex: 0 }, ...PLAN.tasks.slice(1)],
    } as ArenaMatchPlanWire;
    expect(arenaOpponentMatchStars(speedPlan, stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900, firstAttemptPairs: 0 },
    }, [viewerOutcome('speed_match', 2)]))).toBe(0);
    expect(arenaOpponentMatchStars(speedPlan, stateWith({
      0: { taskIndex: 0, correct: false, raceElapsedMs: 900, firstAttemptPairs: 4 },
    }, [viewerOutcome('speed_match', 2)]))).toBe(4);
  });

  it('не угадывает счёт пар из boolean correct', () => {
    const speedPlan = {
      ...PLAN,
      tasks: [{ ...PLAN.tasks[4], taskIndex: 0 }, ...PLAN.tasks.slice(1)],
    } as ArenaMatchPlanWire;
    const state = stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900 },
    }, [viewerOutcome('speed_match', 2)]);
    expect(arenaOpponentMatchStars(speedPlan, state)).toBeNull();
  });

  it('не считает пары без firstAttemptPairs или с небезопасным значением', () => {
    const speedPlan = {
      ...PLAN,
      tasks: [{ ...PLAN.tasks[4], taskIndex: 0 }, ...PLAN.tasks.slice(1)],
    } as ArenaMatchPlanWire;
    for (const firstAttemptPairs of [-1, 2.5, 5, undefined]) {
      const tick = firstAttemptPairs === undefined
        ? { taskIndex: 0, correct: false, raceElapsedMs: 900 }
        : { taskIndex: 0, correct: false, raceElapsedMs: 900, firstAttemptPairs };
      expect(arenaOpponentMatchStars(speedPlan, stateWith({ 0: tick }, [
        viewerOutcome('speed_match', 2),
      ]))).toBeNull();
    }
  });

  it('не превращает ambiguous correct:false в точный wrong', () => {
    expect(arenaOpponentMatchStars(PLAN, stateWith({
      0: { taskIndex: 0, correct: false, raceElapsedMs: 900 },
      1: { taskIndex: 1, correct: true, raceElapsedMs: 850 },
    }, [
      viewerOutcome('guess_phrase'),
      viewerOutcome('fill_gap', 0, 1),
    ]))).toBeNull();
  });

  it('останавливает fallback на первом ambiguous false и не продолжает combo', () => {
    expect(arenaOpponentMatchStars(PLAN, stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900 },
      1: { taskIndex: 1, correct: false, raceElapsedMs: 850 },
      2: { taskIndex: 2, correct: true, raceElapsedMs: 800 },
    }, [
      viewerOutcome('guess_phrase'),
      viewerOutcome('fill_gap', 0, 1),
      viewerOutcome('find_oddity', 0, 2),
    ]))).toBe(3);
  });

  it('HUD отдаёт тот же счёт', () => {
    const state = stateWith({
      0: { taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 7 },
    });
    expect(arenaMatchHud(PLAN, state, arenaLocalPhase(state, MONO0), MONO0).opponentMatchStars).toBe(7);
  });

  it('экран передаёт оба live-значения, а неизвестное рисует чертой', () => {
    const screen = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
    const players = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaPlayers.tsx'), 'utf8');
    expect(screen).toContain('const ownScore = hud?.matchStars ?? 0;');
    expect(screen).toContain('const rivalScore = hud?.opponentMatchStars ?? null;');
    expect(screen).toContain('score: ownScore');
    expect(screen).toContain('score: rivalScore');
    expect(players).toContain("typeof player?.score === 'number'");
    expect(players).toContain("knownScore !== null");
    expect(players).not.toContain('player?.score ?? 0');
  });
});

describe('индикатор соперника', () => {
  it('молчит, пока соперник ничего не сообщил', () => {
    expect(arenaOpponentSignal(toAnswer(), MONO0 + 20_000).kind).toBe('silent');
  });

  it('загорается сразу, как пришёл тик по текущему заданию', () => {
    const s = arenaLocalMatchReduce(MACHINE, toAnswer(), {
      type: 'opponent_answered',
      monoNowMs: MONO0 + 6_000,
      tick: { taskIndex: 0, correct: true, raceElapsedMs: 900 },
    });
    const signal = arenaOpponentSignal(s, MONO0 + 6_000);
    expect(signal.kind).toBe('answered');
    expect(signal.kind === 'answered' && signal.correct).toBe(true);
  });

  it('тик про ЧУЖОЕ задание индикатор не зажигает', () => {
    const s = arenaLocalMatchReduce(MACHINE, toAnswer(), {
      type: 'opponent_answered',
      monoNowMs: MONO0 + 6_000,
      tick: { taskIndex: 3, correct: true, raceElapsedMs: 900 },
    });
    expect(arenaOpponentSignal(s, MONO0 + 6_000).kind).toBe('silent');
  });

  it('считает опережение только в фазе ответа', () => {
    const answering = arenaLocalMatchReduce(MACHINE, toAnswer(), {
      type: 'opponent_answered',
      monoNowMs: MONO0 + 6_000,
      tick: { taskIndex: 0, correct: true, raceElapsedMs: 1_000 },
    });
    const at = answering.phaseStartedAtMonoMs + 2_500;
    const signal = arenaOpponentSignal(answering, at);
    expect(signal.kind === 'answered' && signal.aheadByMs).toBe(1_500);
  });

  it('опережение не бывает отрицательным', () => {
    const s = arenaLocalMatchReduce(MACHINE, toAnswer(), {
      type: 'opponent_answered',
      monoNowMs: MONO0 + 6_000,
      tick: { taskIndex: 0, correct: true, raceElapsedMs: 5_000 },
    });
    const signal = arenaOpponentSignal(s, s.phaseStartedAtMonoMs + 100);
    expect(signal.kind === 'answered' && signal.aheadByMs).toBe(0);
  });

  it('доигранный матч отдаёт «закончил» независимо от тиков', () => {
    let s = init();
    for (let guard = 0; guard < 200 && s.phase !== 'finished'; guard += 1) {
      s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
    }
    expect(arenaOpponentSignal(s, MONO0).kind).toBe('finished');
  });

  it('соперник закончил раньше — видно и без тика по заданию', () => {
    const s = arenaLocalMatchReduce(MACHINE, toAnswer(), {
      type: 'opponent_finished', monoNowMs: MONO0 + 6_000,
    });
    expect(arenaOpponentSignal(s, MONO0 + 6_000).kind).toBe('finished');
  });
});

describe('таймер', () => {
  it('в фазе ответа отдаёт долю прошедшего', () => {
    const s = toAnswer();
    const hud = hudOf(s, s.phaseStartedAtMonoMs + ARENA_ANSWER_MS.guess_phrase / 2);
    expect(hud.timer).not.toBeNull();
    expect(hud.timer!.fraction).toBeCloseTo(0.5, 3);
    expect(hud.timer!.remainingMs).toBe(ARENA_ANSWER_MS.guess_phrase / 2);
  });

  it('доля не выходит за границы', () => {
    const s = toAnswer();
    expect(hudOf(s, s.phaseStartedAtMonoMs).timer!.fraction).toBe(0);
    expect(hudOf(s, s.phaseStartedAtMonoMs + 10 * ARENA_ANSWER_MS.guess_phrase).timer!.fraction).toBe(1);
    expect(hudOf(s, s.phaseStartedAtMonoMs - 5_000).timer!.fraction).toBe(0);
  });

  it('тревога включается за три секунды до конца, не раньше', () => {
    const s = toAnswer();
    const window = ARENA_ANSWER_MS.guess_phrase;
    expect(hudOf(s, s.phaseStartedAtMonoMs + window - 3_001).timer!.alarm).toBe(false);
    expect(hudOf(s, s.phaseStartedAtMonoMs + window - 3_000).timer!.alarm).toBe(true);
  });

  it('вне фазы ответа таймера нет — кольцо рисовать не по чему', () => {
    expect(hudOf(init(), MONO0).timer).toBeNull();
    const reading = step(init(), MONO0 + COUNTDOWN);
    expect(hudOf(reading, reading.phaseStartedAtMonoMs).timer).toBeNull();
  });
});

describe('кадр целиком', () => {
  it('номер задания показывается от единицы', () => {
    expect(hudOf(toAnswer(), MONO0).taskOrdinal).toBe(1);
    expect(hudOf(toAnswer(), MONO0).taskCount).toBe(5);
  });

  it('нажатия принимаются только в фазе ответа', () => {
    expect(hudOf(init(), MONO0).interactive).toBe(false);
    expect(hudOf(toAnswer(), MONO0).interactive).toBe(true);
    const s = toAnswer();
    const revealed = answerNow(s, s.phaseStartedAtMonoMs + 500, true);
    expect(revealed.phase).toBe('reveal');
    expect(hudOf(revealed, revealed.phaseStartedAtMonoMs).interactive).toBe(false);
  });

  it('звёзды летят только в показе результата и только если они есть', () => {
    const s = toAnswer();
    expect(hudOf(s, MONO0).starsToFly).toBe(0);
    const won = answerNow(s, s.phaseStartedAtMonoMs + 500, true);
    expect(hudOf(won, won.phaseStartedAtMonoMs).starsToFly).toBeGreaterThan(0);
    const lost = answerNow(s, s.phaseStartedAtMonoMs + 500, false);
    expect(lost.phase).toBe('reveal');
    expect(hudOf(lost, lost.phaseStartedAtMonoMs).starsToFly).toBe(0);
  });

  it('награда видна в показе результата и не раньше', () => {
    const s = toAnswer();
    expect(hudOf(s, MONO0).award).toBeNull();
    const revealed = answerNow(s, s.phaseStartedAtMonoMs + 500, true);
    expect(hudOf(revealed, revealed.phaseStartedAtMonoMs).award).not.toBeNull();
  });

  it('доигранный матч не отдаёт задания', () => {
    let s = init();
    for (let guard = 0; guard < 200 && s.phase !== 'finished'; guard += 1) {
      s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
    }
    const hud = hudOf(s, MONO0);
    expect(hud.task).toBeNull();
    expect(hud.mode).toBeNull();
    expect(hud.interactive).toBe(false);
  });

  it('номер задания не выходит за длину матча', () => {
    let s = init();
    for (let guard = 0; guard < 200 && s.phase !== 'finished'; guard += 1) {
      s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
    }
    expect(hudOf(s, MONO0).taskOrdinal).toBe(5);
  });

  it('накопленные звёзды растут вместе с матчем', () => {
    const s = toAnswer();
    const won = answerNow(s, s.phaseStartedAtMonoMs + 500, true);
    expect(hudOf(won, MONO0).matchStars).toBeGreaterThan(hudOf(s, MONO0).matchStars);
  });
});

describe('доска пар', () => {
  /** Доводит матч до фазы ответа на задании с парами (индекс 4). */
  function toPairs(): ArenaLocalMatchState {
    let s = toAnswer();
    while (s.taskIndex < 4) {
      s = answerNow(s, s.phaseStartedAtMonoMs + 400, true);
      s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
      if (s.phase === 'reading') s = step(s, s.phaseStartedAtMonoMs + s.phaseBudgetMs);
    }
    if (s.phase !== 'answer') throw new Error('ожидалась фаза ответа на парах');
    return s;
  }

  it('разобранные пары накапливаются по порядку', () => {
    let s = toPairs();
    expect(arenaResolvedPairs(s)).toEqual([]);
    s = arenaLocalMatchReduce(MACHINE, s, {
      type: 'speed_attempt', monoNowMs: s.phaseStartedAtMonoMs + 100, pairIndex: 2, selectedIndex: 2, correct: true,
    });
    s = arenaLocalMatchReduce(MACHINE, s, {
      type: 'speed_attempt', monoNowMs: s.phaseStartedAtMonoMs + 200, pairIndex: 0, selectedIndex: 0, correct: true,
    });
    expect(arenaResolvedPairs(s)).toEqual([0, 2]);
  });

  it('кадр отдаёт разобранные пары только на доске пар', () => {
    const pairs = toPairs();
    expect(hudOf(pairs, pairs.phaseStartedAtMonoMs).mode).toBe('speed_match');
    expect(hudOf(toAnswer(), MONO0).resolvedPairs).toEqual([]);
  });
});

describe('расшифровка награды', () => {
  it('пустая награда — пустой список, а не падение', () => {
    expect(arenaAwardLines(null)).toEqual([]);
  });

  it('неприменимые строки на экран не попадают', () => {
    const s = toAnswer();
    const revealed = answerNow(s, s.phaseStartedAtMonoMs + 500, true);
    const award = hudOf(revealed, revealed.phaseStartedAtMonoMs).award;
    const lines = arenaAwardLines(award);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.state !== 'not_applicable')).toBe(true);
  });

  /**
   * Ровно тот случай, ради которого строки и заведены: владелец потребовал,
   * чтобы игрок понимал, почему звёзд две, а не три.
   */
  it('упущенный бонус за скорость остаётся в списке отдельной строкой', () => {
    const withRival = arenaLocalMatchReduce(MACHINE, toAnswer(), {
      type: 'opponent_answered',
      monoNowMs: MONO0 + 100,
      tick: { taskIndex: 0, correct: true, raceElapsedMs: 300 },
    });
    const revealed = answerNow(withRival, withRival.phaseStartedAtMonoMs + 4_000, true);
    const award = hudOf(revealed, revealed.phaseStartedAtMonoMs).award!;
    expect(award.firstBonus).toBe(0);
    const missed = arenaAwardLines(award).filter((line) => line.state === 'missed');
    expect(missed.length).toBeGreaterThan(0);
    expect(missed.some((line) => line.reason === 'first')).toBe(true);
  });
});

describe('вход в матч', () => {
  /**
   * Ровно та дыра, из-за которой Арена не работала: принятие дуэли не звалось
   * НИГДЕ, и матч навсегда оставался в состоянии «принимается» — плана для
   * него не существует, сервер отказывает, экран висит.
   */
  it('пока матч принимается — принимаем дальше', () => {
    expect(arenaEntryStep({ state: 'accepting', elapsedSinceEntryMs: 0 })).toBe('accept');
    expect(arenaEntryStep({ state: 'accepting', elapsedSinceEntryMs: ARENA_ACCEPT_WINDOW_MS - 1 })).toBe('accept');
  });

  it('окно принятия истекло — дальше стучаться незачем', () => {
    expect(arenaEntryStep({ state: 'accepting', elapsedSinceEntryMs: ARENA_ACCEPT_WINDOW_MS })).toBe('give_up');
  });

  it('матч пошёл — берём план', () => {
    for (const state of ['countdown', 'task_active', 'task_reveal']) {
      expect(arenaEntryStep({ state, elapsedSinceEntryMs: 0 })).toBe('plan');
    }
  });

  it('матч уже кончился или отменён — плана не просим', () => {
    expect(arenaEntryStep({ state: 'aborted', elapsedSinceEntryMs: 0 })).toBe('give_up');
    expect(arenaEntryStep({ state: 'settled', elapsedSinceEntryMs: 0 })).toBe('give_up');
  });

  it('пустое состояние не заставляет ждать вечно', () => {
    expect(arenaEntryStep({ state: '', elapsedSinceEntryMs: 0 })).toBe('plan');
  });
});

describe('задание для компонента вопроса', () => {
  it('отпечатки ответов в пропсы НЕ уезжают', () => {
    const publicTask = arenaPlanTaskToPublic(PLAN.tasks[0]);
    expect(publicTask).not.toHaveProperty('answerFingerprints');
    expect(JSON.stringify(publicTask)).not.toContain('fp0');
  });

  it('всё нужное для отрисовки на месте', () => {
    const publicTask = arenaPlanTaskToPublic(PLAN.tasks[0]);
    expect(publicTask.taskId).toBe('t0');
    expect(publicTask.mode).toBe('guess_phrase');
    expect(publicTask.payload).toEqual(PLAN.tasks[0].payload);
    expect(publicTask.isVoice).toBe(false);
  });
});

describe('вход без сети (D-72)', () => {
  /**
   * Владелец сказал прямо: рейтинговый матч нельзя начать без сети. И отдельно
   * (D-58): НАЧАТЫЙ матч доигрывается оффлайн. Разница тонкая и в коде теряется
   * легко: «начать» и «доиграть» — разные вещи.
   *
   * Начать нельзя не из-за технического ограничения, а потому что соперник
   * живой: матч, начатый в одностороннем порядке, — это матч, которого у
   * второго игрока не было.
   */
  it('начать матч без сети нельзя ни в каком режиме', () => {
    expect(arenaCanStartOffline()).toBe(false);
  });

  it('обрыв сети распознаётся как отсутствие сети', () => {
    for (const error of [
      { code: 'unavailable', message: 'network error' },
      new Error('Failed to fetch'),
      'ECONNREFUSED',
      { code: 'functions/unavailable' },
    ]) {
      expect(arenaEntryFailure(error)).toBe('offline');
    }
  });

  /**
   * Выключенная Арена и отсутствующий конфиг — НЕ отсутствие сети. Повтор их
   * не лечит, и предлагать игроку «попробовать ещё раз» значит врать ему.
   */
  it('выключенная Арена и старое приложение — не «нет сети»', () => {
    for (const error of [
      'arena_config_missing',
      'arena_config_incompatible',
      'arena_disabled',
      'arena_client_update_required',
    ]) {
      expect(arenaEntryFailure(error)).toBe('gated');
    }
  });

  it('временный отказ сервера отделён от окончательного', () => {
    expect(arenaEntryFailure('deadline-exceeded')).toBe('transient');
    expect(arenaEntryFailure({ code: 'resource-exhausted' })).toBe('transient');
    expect(arenaEntryFailure('arena_match_missing')).toBe('rejected');
    expect(arenaEntryFailure('arena_match_not_participant')).toBe('rejected');
  });

  it('пустая ошибка не выдаётся за отсутствие сети', () => {
    for (const error of [null, undefined, '', {}]) {
      expect(arenaEntryFailure(error)).toBe('rejected');
    }
  });
});

/**
 * Экран матча сводил четыре причины к трём веткам, и две из них показывал
 * одним словом «Повторить» — глаголом вместо объяснения, да ещё и без кнопки
 * повтора. Игрок читал приказ, который нечем выполнить.
 */
describe('почему матч не начался — словами, а не глаголом', () => {
  const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

  it('каждая причина объясняется своими словами', () => {
    const titles = (['offline', 'transient', 'gated', 'rejected', 'no_opponent'] as const)
      .map((failure) => arenaEntryFailureCopy(failure).title);
    // Пять причин — пять разных заголовков. Совпадение здесь и означало бы,
    // что игроку снова говорят одно и то же о разных вещах.
    expect(new Set(titles).size).toBe(titles.length);
  });

  /** Повтор предлагается только там, где он может сработать. */
  it('повтор предлагается только когда он может помочь', () => {
    expect(arenaEntryFailureCopy('offline').canRetry).toBe(true);
    expect(arenaEntryFailureCopy('transient').canRetry).toBe(true);
    // Выключенную Арену повтором не включить, ушедшего соперника не вернуть, а
    // законченный матч не воскресить: кнопка была бы обманом.
    expect(arenaEntryFailureCopy('gated').canRetry).toBe(false);
    expect(arenaEntryFailureCopy('no_opponent').canRetry).toBe(false);
    expect(arenaEntryFailureCopy('rejected').canRetry).toBe(false);
  });

  it('неизвестная причина не превращается в молчание', () => {
    const copy = arenaEntryFailureCopy(null);
    expect(copy.title).toBe('entryGone');
    expect(copy.hint).toBe('entryGoneHint');
  });

  it('все строки переведены на восемь языков', () => {
    for (const failure of ['offline', 'transient', 'gated', 'rejected', 'no_opponent'] as const) {
      const copy = arenaEntryFailureCopy(failure);
      for (const lang of LANGS) {
        expect(arenaText(lang, copy.title).length).toBeGreaterThan(0);
        expect(arenaText(lang, copy.hint).length).toBeGreaterThan(0);
        // Заголовок обязан быть объяснением, а не кнопкой: «Повторить» в этой
        // роли и было исходной ошибкой.
        expect(arenaText(lang, copy.title)).not.toBe(arenaText(lang, 'retry'));
      }
    }
  });

  /**
   * Поиск соперника — третье место, где красное «Повторить» стояло вместо
   * объяснения. Отличие от матча одно: окончательный отказ здесь не значит
   * «матча больше нет» — матча ещё и не было, поэтому повтор осмыслен.
   */
  it('поиск соперника объясняет отказ и всегда даёт повтор, кроме выключенной Арены', () => {
    expect(arenaSearchFailureCopy('rejected').title).toBe('searchFailed');
    expect(arenaSearchFailureCopy('rejected').canRetry).toBe(true);
    expect(arenaSearchFailureCopy(null).canRetry).toBe(true);
    // Выключенную Арену повтором не включить и здесь.
    expect(arenaSearchFailureCopy('gated').canRetry).toBe(false);
    // «Матча больше нет» на экране поиска сказать нельзя: его ещё не было.
    for (const failure of ['offline', 'transient', 'gated', 'rejected'] as const) {
      expect(arenaSearchFailureCopy(failure).title).not.toBe('entryGone');
    }
  });

  it('экран поиска берёт слова из развилки, а не краснеет глаголом', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_matchmaking.tsx'), 'utf8');
    expect(source).toContain('arenaSearchFailureCopy');
    expect(source).not.toContain("styles.error, { color: P.danger }]}>{arenaText(lang, 'retry')");
    // Причина хранится разобранной, а не сырым текстом ошибки, который всё
    // равно никогда не показывался.
    expect(source).not.toContain('setError(String(reason))');
  });

  /** После сведения игрок уже найден. Пока оба клиента принимают дуэль и
   * приезжает план, нельзя снова говорить, что мы всё ещё ищем второго. */
  it('после сведения готовит дуэль, а не ждёт второго игрока', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
    expect(source).toContain("arenaText(lang, 'preparingDuel')");
    expect(source).toContain("arenaText(lang, 'preparingDuelHint')");
    expect(source).not.toContain("arenaText(lang, 'waiting')");
    expect(source).not.toContain("<View style={styles.center}><Text style={{ color: P.text }}>{arenaText(lang, 'loading')}</Text></View>");
    for (const lang of LANGS) {
      expect(arenaText(lang, 'preparingDuel').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'preparingDuelHint').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'preparingDuel')).not.toBe(arenaText(lang, 'waiting'));
    }
  });

  it('свершившийся ответ соперника не подписан глаголом кнопки', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
    expect(source).toContain("arenaText(lang, 'opponentAnsweredBadge')");
    expect(source).not.toContain("arenaText(lang, 'opponent')} · {arenaText(lang, 'submit')}");
    for (const lang of LANGS) {
      expect(arenaText(lang, 'opponentAnsweredBadge').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'opponentAnsweredBadge')).not.toBe(arenaText(lang, 'submit'));
    }
  });

  it('экран матча берёт слова из этой развилки, а не решает сам', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
    expect(source).toContain('arenaEntryFailureCopy');
    // Старая развилка «в трёх ветках» не должна вернуться.
    expect(source).not.toContain("entryFailure === 'gated' ? 'maintenance' : 'retry'");
    // Соперник, не принявший вызов, называется своим именем.
    expect(source).toContain("setEntryFailure('no_opponent')");
  });
});


/**
 * Испорченное задание роняло весь матч.
 *
 * Разбор задания бросает исключение, а зовут его во время отрисовки — то есть
 * падало не задание, а экран целиком, и вместе с ним матч. Машина матча всё
 * это время умела закрывать такое задание как пропущенное и играть дальше
 * (`reportBroken`), но узнать о поломке ей было неоткуда: её никто не звал.
 */
describe('сломанное задание не уносит матч', () => {
  const task = (payload: Record<string, unknown>) => ({
    taskId: 't1',
    mode: 'guess_phrase' as const,
    kind: 'choice',
    difficulty: 1,
    payload,
  });

  it('нормальное задание отрисовывается', () => {
    expect(arenaTaskRenderable(task({ prompt: 'что это', options: ['раз', 'два'] }) as never)).toBe(true);
  });

  it('задание без вариантов ответа честно признаётся неотрисуемым', () => {
    expect(arenaTaskRenderable(task({ prompt: 'что это', options: [] }) as never)).toBe(false);
    expect(arenaTaskRenderable(task({ prompt: 'что это' }) as never)).toBe(false);
  });

  it('проверка не бросает исключений сама — иначе она бы падала так же, как то, что проверяет', () => {
    expect(() => arenaTaskRenderable(null as never)).not.toThrow();
    expect(arenaTaskRenderable(undefined as never)).toBe(false);
  });

  it('экран матча спрашивает до отрисовки и закрывает задание как пропущенное', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
    expect(source).toContain('arenaTaskRenderable');
    expect(source).toContain('reportBroken');
    expect(source).toContain("'taskBroken'");
  });
});

/**
 * Отмена поиска уходила домой ДАЖЕ ЕСЛИ отмена не прошла: игрок был уверен,
 * что вышел из очереди, а сервер продолжал его искать. В рейтинге это кончалось
 * матчем, который начался без него, то есть поражением ни за что.
 */
describe('отмена поиска не притворяется удавшейся', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_matchmaking.tsx'), 'utf8');
  const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

  it('домой уходим только после успешной отмены', () => {
    expect(source).not.toContain("arenaV2QueueCancel(requestId).finally(() => router.replace('/arena' as never))");
    expect(source).toContain('cancelFailed');
  });

  it('игроку сказано, что он всё ещё в очереди и что она отпустит сама', () => {
    for (const lang of langs) {
      expect(arenaText(lang, 'cancelFailed').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'cancelFailedHint').length).toBeGreaterThan(0);
    }
  });
});


/**
 * Молчащий живой канал и пассивный соперник выглядели ОДИНАКОВО: пустое место
 * рядом с таймером. Игрок читал это как «соперник ничего не делает», спокойно
 * доигрывал — и получал в конце неожиданное поражение.
 */
describe('молчание канала не выдаётся за молчание соперника', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
  const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

  it('экран различает отказ канала и отсутствие ходов', () => {
    expect(source).toContain('const rivalUnseen');
    expect(source).toContain('live.error');
    // Оговорка снимается, как только пришёл хоть один ход: канал очевидно жив.
    expect(source).toContain('Object.keys(match.state.opponentByTask).length === 0');
  });

  it('сказано, что это связь и что на результат не влияет', () => {
    for (const lang of langs) {
      expect(arenaText(lang, 'rivalUnseen').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'rivalUnseenHint').length).toBeGreaterThan(0);
    }
  });
});

/**
 * Экран матча намеренно не скроллится: таймер и счёт обязаны быть видны всегда.
 * Но из-за этого длинные варианты ответа просто уезжали за край — нижний
 * вариант становился НЕНАЖИМАЕМЫМ, то есть задание нельзя было ответить.
 * Потерянное задание из-за вёрстки — худший вид потери: игрок ничего не сделал
 * не так.
 */
describe('до любого варианта ответа можно дотянуться', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaQuestion.tsx'), 'utf8');

  it('список вариантов прокручивается, если не помещается', () => {
    expect(source).toContain('<ScrollView');
    expect(source).toContain('optionsScroll');
  });

  it('прокрутка занимает только оставшееся место, не выталкивая таймер', () => {
    expect(source).toContain('optionsScroll: { flexShrink: 1 }');
  });

  it('один длинный вариант не съедает экран целиком', () => {
    expect(source).toContain('numberOfLines={3}');
  });

  it('длинное слово на доске пар не растягивает колонку', () => {
    expect(source).toContain('numberOfLines={2}');
  });

  /**
   * Сборщик перевода: банк слов рос от длинных слов и выдавливал кнопку
   * отправки за край. Игрок собирал перевод — и не мог его отправить, то есть
   * терял задание, сделав всё правильно.
   */
  it('в сборщике перевода прокручивается банк, а кнопка отправки остаётся', () => {
    expect(source).toContain('contentContainerStyle={styles.builder}');
    // Кнопка отправки живёт СНАРУЖИ прокрутки.
    const scrollEnd = source.lastIndexOf('</ScrollView>');
    const ctaStart = source.indexOf('<V2Cta', scrollEnd);
    expect(ctaStart).toBeGreaterThan(scrollEnd);
  });
});

describe('пары и конструктор занимают оставшееся поле', () => {
  const question = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaQuestion.tsx'), 'utf8');
  const match = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
  const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

  it('даёт короткую инструкцию на всех восьми языках', () => {
    for (const lang of langs) {
      expect(arenaText(lang, 'matchInstruction').trim()).not.toBe('');
      expect(arenaText(lang, 'builderInstruction').trim()).not.toBe('');
    }
  });

  it('immersive-ветки не завёрнуты в V2Card и растут по высоте', () => {
    const matchingBranch = question.slice(
      question.indexOf("if (view.type === 'matching')"),
      question.indexOf("if (view.type === 'builder')"),
    );
    const builderBranch = question.slice(
      question.indexOf("if (view.type === 'builder')"),
      question.indexOf('const selected = choice !== null'),
    );
    expect(matchingBranch).toContain('style={styles.immersive}');
    expect(builderBranch).toContain('style={styles.immersive}');
    expect(matchingBranch).not.toContain('<V2Card');
    expect(builderBranch).not.toContain('<V2Card');
    expect(question).toContain('immersive: { flex: 1');
  });

  it('доска пар ограничена остатком экрана и прокручивается внутри', () => {
    const matchingBranch = question.slice(
      question.indexOf("if (view.type === 'matching')"),
      question.indexOf("if (view.type === 'builder')"),
    );
    expect(matchingBranch).toContain('<ScrollView');
    expect(matchingBranch).toContain('style={styles.matchGridScroll}');
    expect(matchingBranch).toContain('contentContainerStyle={[styles.matchGrid');
    expect(matchingBranch).toContain('nestedScrollEnabled');
    expect(question).toContain('matchGridScroll: { flex: 1, minHeight: 0 }');
  });

  it('лоток ответа ограничен по высоте и прокручивается, не выталкивая CTA', () => {
    const builderStart = question.indexOf("if (view.type === 'builder')");
    const builderEnd = question.indexOf('const selected = choice !== null');
    const builderBranch = question.slice(builderStart, builderEnd);
    expect(question).toContain('useWindowDimensions');
    expect(question).toContain('arenaQuestionViewportLayout(windowHeight, systemFontScale)');
    expect(builderBranch).toContain('style={[styles.answerTrayScroll, { maxHeight: viewport.answerTrayMaxHeight');
    expect(builderBranch).toContain('contentContainerStyle={styles.answerTray}');
    expect(builderBranch).toContain('nestedScrollEnabled');
    expect(builderBranch.indexOf('<V2Cta')).toBeGreaterThan(builderBranch.lastIndexOf('</ScrollView>'));
  });

  it('кнопка конструктора остаётся вне его ScrollView, а фишки не мельче 48 pt', () => {
    const builderStart = question.indexOf("if (view.type === 'builder')");
    const builderEnd = question.indexOf('const selected = choice !== null');
    const builderBranch = question.slice(builderStart, builderEnd);
    expect(builderBranch.indexOf('</ScrollView>')).toBeGreaterThan(0);
    expect(builderBranch.indexOf('<V2Cta')).toBeGreaterThan(builderBranch.lastIndexOf('</ScrollView>'));
    const touchHeight = Number(/touchChip:\s*\{\s*minHeight:\s*(\d+)/.exec(question)?.[1]);
    expect(touchHeight).toBeGreaterThanOrEqual(48);
  });

  it('компактный блок игроков включается только для immersive-заданий', () => {
    expect(match).toContain('const immersive = hud?.mode ? arenaQuestionLayout(hud.mode).immersive : false;');
    expect(match).toContain('compact={immersive}');
  });
});

/**
 * Крупный системный шрифт растягивает шапку матча: имя соперника и оговорка
 * про связь обязаны оставаться в пределах одной-двух строк, иначе шапка
 * выдавливает само задание.
 */
describe('шапка матча не растёт от длинного текста', () => {
  const screen = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');

  it('имя соперника — одна строка', () => {
    expect(screen).toContain('numberOfLines={1}');
  });

  it('оговорка про связь — не больше двух строк', () => {
    expect(screen).toContain('numberOfLines={2}');
  });
});
