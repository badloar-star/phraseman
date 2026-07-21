import {
  DEFAULT_TOURNAMENT_SCHEDULE,
  TOURNAMENT_BASE_SCORE,
  TOURNAMENT_MAX_SPEED_BONUS_RATIO,
  TOURNAMENT_PRIZES,
  TOURNAMENT_STATE_CANCELLED,
  TOURNAMENT_STATES,
  type TournamentState,
  bankContributionGems,
  canCancelTournament,
  canTransitionTournament,
  computePlacements,
  dateKeyInTimezone,
  generateBotProfiles,
  nextHotStreak,
  nextTournamentState,
  normalizeTournamentSchedule,
  prizeForPlace,
  roundSeed,
  roundStateFor,
  scoreAnswer,
  scoreRound,
  seasonPointsForPlace,
  seededShuffle,
  selectRoundTasks,
  simulateBotAnswers,
  slotStartMs,
  tableStateFor,
  tournamentRoomId,
  tournamentWeekId,
  type TournamentPlayer,
  type TournamentTask,
} from './tournament_core';

// «Турниры» Фаза 1 — чистая математика без Firestore (спека §5–§8, §11).

const task = (taskId: string, mode: string, isVoice = false, verified = true): TournamentTask => ({
  taskId,
  mode,
  isVoice,
  difficulty: 1,
  payload: { q: taskId },
  tags: [],
  verified,
});

const player = (id: string, score: number, isBot = false): TournamentPlayer => ({
  id, isBot, name: id, avatar: '🦊', color: '#47C870', score, streak: 0,
});

describe('scoring (§5)', () => {
  it('base correct answer at zero elapsed gets full +40% speed bonus', () => {
    const s = scoreAnswer({ correct: true, elapsedMs: 0, maxMs: 10_000, streakBefore: 0, isVoice: false });
    expect(s).toBe(Math.round(TOURNAMENT_BASE_SCORE * (1 + TOURNAMENT_MAX_SPEED_BONUS_RATIO)));
  });

  it('answer at the time limit gets no speed bonus', () => {
    const s = scoreAnswer({ correct: true, elapsedMs: 10_000, maxMs: 10_000, streakBefore: 0, isVoice: false });
    expect(s).toBe(TOURNAMENT_BASE_SCORE);
  });

  it('elapsed beyond the limit is clamped, never negative bonus', () => {
    const s = scoreAnswer({ correct: true, elapsedMs: 99_000, maxMs: 10_000, streakBefore: 0, isVoice: false });
    expect(s).toBe(TOURNAMENT_BASE_SCORE);
  });

  it('voice tasks get ×1.5 base (and bonus scales from it)', () => {
    const s = scoreAnswer({ correct: true, elapsedMs: 10_000, maxMs: 10_000, streakBefore: 0, isVoice: true });
    expect(s).toBe(Math.round(TOURNAMENT_BASE_SCORE * 1.5));
  });

  it('wrong answer scores zero regardless of speed/streak', () => {
    expect(scoreAnswer({ correct: false, elapsedMs: 0, maxMs: 10_000, streakBefore: 9, isVoice: false })).toBe(0);
  });

  it('streak ×1.5 applies from 3rd correct in a row', () => {
    const s = scoreAnswer({ correct: true, elapsedMs: 10_000, maxMs: 10_000, streakBefore: 2, isVoice: false });
    expect(s).toBe(Math.round(TOURNAMENT_BASE_SCORE * 1.5));
  });

  it('streak ×2 applies from 5th correct in a row', () => {
    const s = scoreAnswer({ correct: true, elapsedMs: 10_000, maxMs: 10_000, streakBefore: 4, isVoice: false });
    expect(s).toBe(TOURNAMENT_BASE_SCORE * 2);
  });

  it('scoreRound accumulates running streak and resets on a mistake', () => {
    const answers = [true, true, true, false, true].map((correct) => ({
      correct, elapsedMs: 10_000, maxMs: 10_000, streakBefore: 0, isVoice: false,
    }));
    const { roundScore, streakAfter } = scoreRound(answers);
    // 100 + 100 + 150 (стрик 3-й) + 0 + 100 = 450
    expect(roundScore).toBe(450);
    expect(streakAfter).toBe(1);
  });
});

describe('seeded task selection (§6)', () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => task(`q${i}`, 'quiz')),
    ...Array.from({ length: 6 }, (_, i) => task(`f${i}`, 'flashcard')),
    ...Array.from({ length: 4 }, (_, i) => task(`v${i}`, 'voice', true)),
    task('unverified1', 'quiz', false, false),
  ];

  it('same roomId+roundNo always yields the same task set', () => {
    const a = selectRoundTasks({ pool, roomId: 'room1', roundNo: 2, count: 6, modeKind: 'mix' });
    const b = selectRoundTasks({ pool, roomId: 'room1', roundNo: 2, count: 6, modeKind: 'mix' });
    expect(a.map((t) => t.taskId)).toEqual(b.map((t) => t.taskId));
  });

  it('different rounds give different sets (seed = roomId + roundNo)', () => {
    const r1 = selectRoundTasks({ pool, roomId: 'room1', roundNo: 1, count: 6, modeKind: 'mix' });
    const r2 = selectRoundTasks({ pool, roomId: 'room1', roundNo: 2, count: 6, modeKind: 'mix' });
    expect(r1.map((t) => t.taskId)).not.toEqual(r2.map((t) => t.taskId));
  });

  it('single-mode rounds pick tasks of one mode only', () => {
    for (let room = 0; room < 8; room += 1) {
      const sel = selectRoundTasks({ pool, roomId: `room${room}`, roundNo: 1, count: 5, modeKind: 'single' });
      const modes = new Set(sel.map((t) => t.mode));
      expect(modes.size).toBe(1);
    }
  });

  it('unverified tasks never enter a round', () => {
    const sel = selectRoundTasks({ pool, roomId: 'room1', roundNo: 3, count: 20, modeKind: 'mix' });
    expect(sel.some((t) => t.taskId === 'unverified1')).toBe(false);
  });

  it('rounds 1/3 are single-mode, 2/4 are mix per spec rotation', () => {
    expect(roundStateFor(1)).toBe('round1');
    expect(roundStateFor(4)).toBe('round4');
    expect(tableStateFor(3)).toBe('table3');
    expect(tableStateFor(4)).toBeNull();
  });

  it('seededShuffle is a deterministic permutation', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = seededShuffle(items, 'seed-x');
    const b = seededShuffle(items, 'seed-x');
    expect(a).toEqual(b);
    expect(a.slice().sort()).toEqual(items.slice().sort());
  });
});

describe('state machine (§11)', () => {
  it('walks the full happy path in order', () => {
    let state: typeof TOURNAMENT_STATES[number] = TOURNAMENT_STATES[0];
    const visited: string[] = [state];
    while (true) {
      const next = nextTournamentState(state);
      if (!next) break;
      expect(canTransitionTournament(state, next)).toBe(true);
      visited.push(next);
      state = next;
    }
    expect(visited).toEqual([...TOURNAMENT_STATES]);
  });

  it('rejects skipping states and going backwards', () => {
    expect(canTransitionTournament('lobby', 'round2')).toBe(false);
    expect(canTransitionTournament('round3', 'round2')).toBe(false);
    expect(canTransitionTournament('results', 'rewards')).toBe(true);
    expect(canTransitionTournament('rewards', 'closed')).toBe(true);
    expect(canTransitionTournament('closed', 'scheduled')).toBe(false);
  });

  it('rejects unknown states', () => {
    expect(canTransitionTournament('lobby', 'nope')).toBe(false);
    expect(canTransitionTournament(TOURNAMENT_STATE_CANCELLED, 'round1')).toBe(false);
  });

  it('cancel is allowed only before rounds start', () => {
    expect(canCancelTournament('scheduled')).toBe(true);
    expect(canCancelTournament('lobby')).toBe(true);
    expect(canCancelTournament('round1')).toBe(false);
    expect(canCancelTournament('results')).toBe(false);
  });
});

describe('prizes / placements (§7)', () => {
  it('prize table matches the approved 50/25/10 + ticket back + title', () => {
    expect(TOURNAMENT_PRIZES.map((p) => p.gems)).toEqual([50, 25, 10]);
    expect(prizeForPlace(1)?.ticketBack).toBe(true);
    expect(prizeForPlace(1)?.titleId).toBe('tournament_champion_of_day');
    expect(prizeForPlace(2)?.ticketBack).toBe(true);
    expect(prizeForPlace(3)?.ticketBack).toBe(false);
    expect(prizeForPlace(4)).toBeNull();
  });

  it('bots never take prize places; prizes shift to real players', () => {
    const players = [
      player('bot-a', 900, true),
      player('u1', 800),
      player('bot-b', 700, true),
      player('u2', 600),
      player('u3', 100),
    ];
    const { standings, realPlacements } = computePlacements(players);
    expect(standings[0].id).toBe('bot-a');
    expect(realPlacements.map((p) => [p.player.id, p.place])).toEqual([['u1', 1], ['u2', 2], ['u3', 3]]);
  });
});

describe('season / bank / hot streak (§8, §9)', () => {
  it('season points by place', () => {
    expect(seasonPointsForPlace(1)).toBe(25);
    expect(seasonPointsForPlace(2)).toBe(15);
    expect(seasonPointsForPlace(3)).toBe(10);
    expect(seasonPointsForPlace(9)).toBe(2);
  });

  it('bank contribution is 20% of ticket value in gems, floored', () => {
    expect(bankContributionGems(1, 10)).toBe(2);
    expect(bankContributionGems(3, 10)).toBe(6);
    expect(bankContributionGems(0, 10)).toBe(0);
  });

  it('hot streak increments on win and resets on loss', () => {
    expect(nextHotStreak(0, true)).toBe(1);
    expect(nextHotStreak(4, true)).toBe(5);
    expect(nextHotStreak(9, false)).toBe(0);
  });

  it('week id matches ISO week format used by league functions', () => {
    expect(tournamentWeekId(Date.UTC(2026, 6, 21))).toMatch(/^2026-W\d{2}$/);
  });
});

describe('schedule config (§2)', () => {
  it('defaults to 3 daily slots 12:00/19:00/21:00', () => {
    expect(DEFAULT_TOURNAMENT_SCHEDULE.slots.map((s) => s.localTime)).toEqual(['12:00', '19:00', '21:00']);
    expect(DEFAULT_TOURNAMENT_SCHEDULE.freeWeeklyEntry).toBe(true);
  });

  it('normalize keeps valid slots, drops malformed, falls back to defaults', () => {
    const cfg = normalizeTournamentSchedule({
      slots: [
        { slotId: 'vip_sun', localTime: '20:00', timezone: 'Europe/Moscow', ticketsRequired: 5, enabled: true },
        { slotId: '', localTime: '25:99' },
        'garbage',
      ],
      ticketGemValue: 12,
    });
    expect(cfg.slots).toHaveLength(1);
    expect(cfg.slots[0].ticketsRequired).toBe(5);
    expect(cfg.ticketGemValue).toBe(12);
    expect(normalizeTournamentSchedule(null).slots).toHaveLength(3);
  });

  it('room id is deterministic and filesystem-safe', () => {
    const id = tournamentRoomId('daily_1200', 'Europe/Moscow', '2026-07-21');
    expect(id).toBe('daily_1200_Europe_Moscow_2026-07-21');
  });

  it('slot start time resolves in the slot timezone', () => {
    const ms = slotStartMs('2026-07-21', '12:00', 'Europe/Moscow');
    const shown = new Date(ms).toLocaleString('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
    expect(shown).toBe('12:00');
    expect(dateKeyInTimezone(ms, 'Europe/Moscow')).toBe('2026-07-21');
  });
});

describe('bot personas (§3)', () => {
  it('generates deterministic realistic profiles', () => {
    const a = generateBotProfiles(50, 'tournament-v1');
    const b = generateBotProfiles(50, 'tournament-v1');
    expect(a).toEqual(b);
    expect(a).toHaveLength(50);
    for (const bot of a) {
      expect(bot.winRate).toBeGreaterThanOrEqual(0.15);
      expect(bot.winRate).toBeLessThanOrEqual(0.85);
      expect(bot.name.length).toBeGreaterThan(0);
      expect(bot.botId).toMatch(/^bot_\d{3}$/);
    }
  });

  it('winRate distribution is not degenerate (spread across the range)', () => {
    const bots = generateBotProfiles(200, 'tournament-v1');
    const rates = bots.map((b) => b.winRate);
    expect(Math.min(...rates)).toBeLessThan(0.4);
    expect(Math.max(...rates)).toBeGreaterThan(0.6);
  });

  it('bot answers are deterministic per room/round and voice-aware', () => {
    const bot = generateBotProfiles(1, 'tournament-v1')[0];
    const tasks = [task('a', 'quiz'), task('b', 'voice', true)];
    const p = { roomId: 'room1', roundNo: 1, tasks, maxMsPerTask: 8000 };
    const run1 = simulateBotAnswers(bot, p);
    const run2 = simulateBotAnswers(bot, p);
    expect(run1).toEqual(run2);
    expect(run1[1].isVoice).toBe(true);
    for (const ans of run1) expect(ans.elapsedMs).toBeLessThanOrEqual(8000);
  });
});
