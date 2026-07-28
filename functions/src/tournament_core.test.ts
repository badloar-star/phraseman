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
  planBotJoinTimes,
  TOURNAMENT_BOT_FIRST_WAVE,
  TOURNAMENT_BOT_JOIN_SPREAD_MAX_MS,
  TOURNAMENT_BOT_JOIN_SPREAD_MIN_MS,
  normalizeTournamentSchedule,
  prizeForPlace,
  roundSeed,
  resolveSeasonEntryName,
  resolveTournamentPlayerAvatar,
  resolveTournamentPlayerName,
  roundStateFor,
  scoreAnswer,
  scoreRound,
  seasonPointsForPlace,
  TOURNAMENT_FALLBACK_NAME,
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
  payload: isVoice
    ? { phrase: taskId, reference: `reference/${taskId}` }
    : { phrase: taskId, options: ['yes', 'no', 'maybe', 'later'], correctIndex: 0 },
  tags: [],
  verified,
});

const player = (id: string, score: number, isBot = false): TournamentPlayer => ({
  id, isBot, name: id, avatar: '🦊', color: '#47C870', score, streak: 0,
});

// зачем 2026-07-27: шкала звёзд переписана по правилам владельца — «кто первый
// ответил, тот три звезды, кто второй — две, кто третий и остальные — одну»,
// плюс бонусы за стрик и камбэк. Старые тесты проверяли формулу «база 100 ×
// скорость × стрик» (до 420 за задание) — она давала нечитаемые тысячи очков.
describe('звёзды за ответ (владелец 2026-07-27)', () => {
  const answer = (over: Partial<Parameters<typeof scoreAnswer>[0]> = {}) => scoreAnswer({
    correct: true, elapsedMs: 1_000, maxMs: 10_000, streakBefore: 0, isVoice: false, ...over,
  });

  it('первый правильный ответ — 3 звезды', () => {
    expect(answer({ answerRank: 1 })).toBe(3);
  });

  it('второй правильный ответ — 2 звезды', () => {
    expect(answer({ answerRank: 2 })).toBe(2);
  });

  it('третий и все последующие — 1 звезда', () => {
    expect(answer({ answerRank: 3 })).toBe(1);
    expect(answer({ answerRank: 16 })).toBe(1);
  });

  it('без ранга (одиночная игра) форы нет — 1 звезда', () => {
    expect(answer()).toBe(1);
  });

  it('неверный ответ — ноль, сколько бы ни было серии', () => {
    expect(answer({ correct: false, answerRank: 1, streakBefore: 9 })).toBe(0);
  });

  it('серия от 3 подряд добавляет звезду', () => {
    expect(answer({ answerRank: 3, streakBefore: 2 })).toBe(1 + 1);
    // Первому серия тоже добавляет: 3 + 1.
    expect(answer({ answerRank: 1, streakBefore: 2 })).toBe(4);
  });

  it('камбэк после 3 ошибок подряд добавляет звезду', () => {
    expect(answer({ answerRank: 3, missStreakBefore: 3 })).toBe(1 + 1);
    // Двух ошибок мало — бонуса нет.
    expect(answer({ answerRank: 3, missStreakBefore: 2 })).toBe(1);
  });

  it('scoreRound копит серию и сбрасывает её на ошибке', () => {
    const answers = [true, true, true, false, true].map((correct) => ({
      correct, elapsedMs: 1_000, maxMs: 10_000, streakBefore: 0, isVoice: false, answerRank: 3,
    }));
    const { roundScore, streakAfter } = scoreRound(answers);
    // 1 + 1 + 2 (звезда за серию с 3-го) + 0 + 1 = 5
    expect(roundScore).toBe(5);
    expect(streakAfter).toBe(1);
  });

  it('scoreRound даёт камбэк-звезду после трёх ошибок подряд', () => {
    const answers = [false, false, false, true].map((correct) => ({
      correct, elapsedMs: 1_000, maxMs: 10_000, streakBefore: 0, isVoice: false, answerRank: 3,
    }));
    // 0 + 0 + 0 + (1 базовая + 1 за камбэк) = 2
    expect(scoreRound(answers).roundScore).toBe(2);
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

// зачем 2026-07-27: боевой баг — в таблице сезона у живого игрока стояло
// «Player». Имя искали только в users/{uid}, а настоящий ник лежит в
// leaderboard/{uid}. Заглушка уходила в рейтинг, где её видели ВСЕ.
// Эти тесты фиксируют приоритет источников, чтобы он не уехал снова.
describe('имя игрока в комнате и рейтинге', () => {
  it('берёт ник из leaderboard — там настоящий профиль', () => {
    expect(resolveTournamentPlayerName({ name: 'Radium 95935' }, {})).toBe('Radium 95935');
  });

  it('РЕГРЕССИЯ: пустой users/{uid} больше не даёт заглушку', () => {
    // Ровно боевой случай: users пуст, ник есть только в лидерборде.
    const user = { name: undefined, displayName: undefined };
    expect(resolveTournamentPlayerName({ name: 'Vertex 65924' }, user)).toBe('Vertex 65924');
  });

  it('падает на users, если лидерборда ещё нет', () => {
    expect(resolveTournamentPlayerName(null, { name: 'Аня' })).toBe('Аня');
    expect(resolveTournamentPlayerName({}, { displayName: 'Борис' })).toBe('Борис');
  });

  it('заглушка — только когда ника нет нигде', () => {
    expect(resolveTournamentPlayerName(null, null)).toBe(TOURNAMENT_FALLBACK_NAME);
    expect(resolveTournamentPlayerName({ name: '   ' }, { name: '' })).toBe(TOURNAMENT_FALLBACK_NAME);
  });

  it('чистит пробелы и режет слишком длинный ник', () => {
    expect(resolveTournamentPlayerName({ name: '  Ро  ма  ' }, {})).toBe('Ро ма');
    expect(resolveTournamentPlayerName({ name: 'я'.repeat(80) }, {})).toHaveLength(48);
  });

  it('аватар идёт тем же порядком источников', () => {
    expect(resolveTournamentPlayerAvatar({ avatar: '7' }, { avatar_emoji: '🦊' })).toBe('7');
    expect(resolveTournamentPlayerAvatar({}, { avatar_emoji: '🦊' })).toBe('🦊');
    expect(resolveTournamentPlayerAvatar(null, null)).toBe('');
  });

  it('ГЛАВНОЕ: заглушка не затирает уже сохранённый настоящий ник', () => {
    // Игрок сыграл первый турнир ДО фикса (в недели лежит «Player»), второй —
    // после. Запись обязана получить настоящее имя, а не остаться заглушкой.
    expect(resolveSeasonEntryName('Radium 95935', 'Player')).toBe('Radium 95935');
    // И наоборот: старая комната прислала заглушку — сохранённое имя сильнее.
    expect(resolveSeasonEntryName('Player', 'Radium 95935')).toBe('Radium 95935');
  });

  it('обе стороны пусты — остаётся заглушка, но не пустое имя', () => {
    expect(resolveSeasonEntryName('Player', 'Player')).toBe(TOURNAMENT_FALLBACK_NAME);
    expect(resolveSeasonEntryName('', '')).toBe(TOURNAMENT_FALLBACK_NAME);
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
    expect(normalizeTournamentSchedule(null)).toEqual({
      slots: [],
      freeWeeklyEntry: false,
      ticketGemValue: 0,
    });
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

describe('Phase-1 hardening contracts', () => {
  const hardening = require('./tournament_core') as Record<string, any>;

  const choiceTask = {
    taskId: 'choice-1',
    mode: 'choice',
    isVoice: false,
    difficulty: 1,
    payload: {
      phrase: 'I am ready',
      options: ['Я готов', 'Я устал', 'Я дома', 'Я занят'],
      correctIndex: 0,
      correctAnswer: 'Я готов',
    },
    tags: ['daily'],
    verified: true,
  };

  const fillRoom = () => ({
    roomId: 'room-budget', slotId: 'daily', seed: 'room-budget', state: 'lobby', startsAt: 10_000,
    players: Array.from({ length: 16 }, (_, index) => player(`p${index}`, 0, index >= 2)),
    rounds: [], version: 1, createdAtMs: 0,
  });

  const roundsFor = (tasks: TournamentTask[]) => Array.from({ length: 4 }, (_, roundIndex) => ({
    roundNo: roundIndex + 1,
    mode: 'mix',
    taskIds: tasks.slice(roundIndex * 6, roundIndex * 6 + 6).map((candidate) => candidate.taskId),
    tasks: tasks.slice(roundIndex * 6, roundIndex * 6 + 6)
      .map((candidate) => hardening.toPublicTournamentTask(candidate)),
    results: {},
  }));

  it('accepts only explicitly verified, structurally valid tasks', () => {
    expect(hardening.validateTournamentTask(choiceTask)).toEqual({ ok: true, kind: 'choice' });
    expect(hardening.validateTournamentTask({ ...choiceTask, verified: undefined })).toEqual({
      ok: false,
      reason: 'task_not_verified',
    });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      payload: { ...choiceTask.payload, correctIndex: 99 },
    })).toEqual({ ok: false, reason: 'choice_contract_invalid' });
    expect(hardening.validateTournamentTask({ ...choiceTask, difficulty: 4 })).toEqual({
      ok: false,
      reason: 'task_difficulty_invalid',
    });
  });

  it('publishes the task without answer keys or voice references', () => {
    const publicTask = hardening.toPublicTournamentTask({
      ...choiceTask,
      payload: { ...choiceTask.payload },
    });
    expect(publicTask).toEqual({
      taskId: 'choice-1',
      mode: 'choice',
      kind: 'choice',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'I am ready',
        options: ['Я готов', 'Я устал', 'Я дома', 'Я занят'],
      },
    });
    expect(JSON.stringify(publicTask)).not.toMatch(/correct|reference/i);
  });

  it('rejects unexpected private payload structures instead of persisting them to taskSecrets', () => {
    const adversarial = {
      ...choiceTask,
      payload: {
        ...choiceTask.payload,
        explanation: 'unknown fields are not public',
        correct_answer: 'secret snake case',
        CorrectAnswer: 'secret alternate case',
        answerKey: 'secret alias',
        nested: { hint: 'also unknown', expected_answer: 'secret nested' },
        cards: [{ label: 'unknown array', correct_option: 2 }],
      },
    };
    expect(hardening.validateTournamentTask(adversarial)).toEqual({
      ok: false,
      reason: 'task_payload_fields_invalid',
    });
    expect(hardening.toPublicTournamentTask(adversarial)).toBeNull();
  });

  it('enforces byte-aware per-mode bounds for every persisted string and array', () => {
    const limits = hardening.TOURNAMENT_TASK_LIMITS;
    const exactEmojiPhrase = '🙂'.repeat(Math.floor(limits.phraseBytes / 4));
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      payload: { ...choiceTask.payload, phrase: exactEmojiPhrase },
    })).toEqual({ ok: true, kind: 'choice' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      payload: { ...choiceTask.payload, phrase: `${exactEmojiPhrase}🙂` },
    })).toEqual({ ok: false, reason: 'choice_contract_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      taskId: 'i'.repeat(limits.taskIdBytes + 1),
    })).toEqual({ ok: false, reason: 'task_identity_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      tags: Array.from({ length: limits.maxTags + 1 }, () => 'tag'),
    })).toEqual({ ok: false, reason: 'task_tags_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      payload: { ...choiceTask.payload, options: Array.from({ length: 4 }, () => 'o'.repeat(limits.optionBytes + 1)) },
    })).toEqual({ ok: false, reason: 'choice_contract_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      mode: 'translate-bank',
      payload: {
        phrase: 'Translate',
        wordBank: Array.from({ length: limits.maxWordBankItems + 1 }, () => 'word'),
        correctTokens: ['word'],
      },
    })).toEqual({ ok: false, reason: 'translate_contract_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      mode: 'timeattack',
      payload: {
        prompt: 'Fast',
        items: Array.from({ length: limits.maxTimeattackItems + 1 }, () => ({
          prompt: 'item', options: ['a', 'b'], correctIndex: 0,
        })),
      },
    })).toEqual({ ok: false, reason: 'timeattack_contract_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      mode: 'voice', isVoice: true,
      payload: { phrase: 'Speak', reference: 'r'.repeat(limits.referenceBytes + 1) },
    })).toEqual({ ok: false, reason: 'voice_contract_invalid' });
  });

  it('rejects a cumulatively oversized fill although every selected task is schema-valid', () => {
    const limits = hardening.TOURNAMENT_TASK_LIMITS;
    const tasks = Array.from({ length: 24 }, (_, index) => ({
      taskId: `time-budget-${index}`,
      mode: 'timeattack', isVoice: false, difficulty: 1 + Math.floor(index / 8),
      payload: {
        prompt: 'p'.repeat(limits.promptBytes),
        items: Array.from({ length: limits.maxTimeattackItems }, (_, itemIndex) => ({
          prompt: 'i'.repeat(limits.promptBytes),
          options: Array.from({ length: limits.maxTimeattackOptions }, (_, optionIndex) => (
            `${itemIndex}-${optionIndex}`.padEnd(limits.optionBytes, 'o')
          )),
          correctIndex: 0,
        })),
      },
      tags: Array.from({ length: limits.maxTags }, () => 't'.repeat(limits.tagBytes)),
      verified: true,
    }));
    expect(tasks.every((candidate) => hardening.validateTournamentTask(candidate).ok)).toBe(true);
    const result = hardening.validateTournamentFillMutation({
      room: fillRoom(), rounds: roundsFor(tasks), selectedTasks: tasks, botPlayers: [],
      metadata: { ready: true, readyAtMs: 10_000 },
    });
    expect(result).toMatchObject({ ok: false, reason: 'fill_size_budget_exceeded' });
    expect(result.serializedBytes).toBeGreaterThan(hardening.TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES);
  });

  it('accepts a max-bound product-safe fill and rejects oversized round taskIds arrays', () => {
    const limits = hardening.TOURNAMENT_TASK_LIMITS;
    const tasks = Array.from({ length: 24 }, (_, index) => ({
      ...choiceTask,
      taskId: `choice-budget-${index}`,
      difficulty: 1 + Math.floor(index / 8),
      payload: {
        phrase: 'p'.repeat(limits.phraseBytes),
        options: Array.from({ length: 4 }, () => 'o'.repeat(limits.optionBytes)),
        correctIndex: 0,
        correctAnswer: 'a'.repeat(limits.answerBytes),
      },
      tags: Array.from({ length: limits.maxTags }, () => 't'.repeat(limits.tagBytes)),
    }));
    const rounds = roundsFor(tasks);
    expect(hardening.validateTournamentFillMutation({
      room: fillRoom(), rounds, selectedTasks: tasks, botPlayers: [], metadata: { ready: true },
    }).ok).toBe(true);
    expect(hardening.validateTournamentFillMutation({
      room: fillRoom(),
      rounds: [{ ...rounds[0], taskIds: Array.from({ length: limits.maxTaskIdsPerRound + 1 }, (_, i) => `q${i}`) }],
      selectedTasks: tasks,
      botPlayers: [],
    })).toMatchObject({ ok: false, reason: 'fill_rounds_invalid' });
  });

  it('requires the complete supported schema for every server-verifiable task kind', () => {
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      payload: { phrase: 'I am ready', options: ['a', 'b'], correctIndex: 0 },
    })).toEqual({ ok: false, reason: 'choice_contract_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      mode: 'translate-bank',
      payload: { phrase: 'Ð¯ Ð³Ð¾Ñ‚Ð¾Ð²', wordBank: ['I', 'am', 'ready'], correctTokens: [] },
    })).toEqual({ ok: false, reason: 'translate_contract_invalid' });
    expect(hardening.validateTournamentTask({
      ...choiceTask,
      mode: 'timeattack',
      payload: { prompt: 'Fast set', items: [{ options: ['a', 'b'], correctIndex: 0 }] },
    })).toEqual({ ok: false, reason: 'timeattack_contract_invalid' });
  });

  it('normalizes choice, translate-bank and timeattack answers consistently', () => {
    expect(hardening.verifyTournamentAnswer(choiceTask, { selectedIndex: 0 })).toBe(true);
    expect(hardening.verifyTournamentAnswer(choiceTask, { selectedIndex: '0' })).toBe(false);

    const translate = {
      ...choiceTask,
      taskId: 'translate-1',
      mode: 'translate-bank',
      payload: {
        phrase: 'Я готов',
        wordBank: ['I', 'am', 'ready'],
        correctTokens: ['I', 'am', 'ready'],
      },
    };
    expect(hardening.validateTournamentTask(translate)).toEqual({ ok: true, kind: 'translate' });
    expect(hardening.verifyTournamentAnswer(translate, { tokens: ['I', 'am', 'ready'] })).toBe(true);
    expect(hardening.verifyTournamentAnswer(translate, { tokens: ['ready', 'I', 'am'] })).toBe(false);

    const timeattack = {
      ...choiceTask,
      taskId: 'time-1',
      mode: 'timeattack',
      payload: {
        prompt: 'Fast set',
        items: [
          { prompt: 'one', options: ['a', 'b'], correctIndex: 1 },
          { prompt: 'two', options: ['x', 'y'], correctIndex: 0 },
        ],
      },
    };
    expect(hardening.validateTournamentTask(timeattack)).toEqual({ ok: true, kind: 'timeattack' });
    expect(hardening.verifyTournamentAnswer(timeattack, { selectedIndexes: [1, 0] })).toBe(true);
    expect(hardening.verifyTournamentAnswer(timeattack, { selectedIndexes: [1, 1] })).toBe(false);
  });

  it('publishes one answer fingerprint per speed-match pair', () => {
    const match = {
      ...choiceTask,
      taskId: 'match-1',
      mode: 'speed_match',
      payload: {
        prompt: 'Match the pairs',
        items: [
          { prompt: 'one', options: ['один', 'два'], correctIndex: 0 },
          { prompt: 'two', options: ['один', 'два'], correctIndex: 1 },
        ],
      },
    };

    const publicTask = hardening.toPublicTournamentTask(match, 'room-match');
    expect(publicTask?.kind).toBe('match');
    expect(publicTask?.answerFingerprints).toEqual([
      hardening.answerFingerprint('room-match', 'match-1', hardening.canonicalAnswerValue(0)),
      hardening.answerFingerprint('room-match', 'match-1', hardening.canonicalAnswerValue(1)),
    ]);
  });

  it('never credits voice from a client-supplied reference string', () => {
    const voice = {
      ...choiceTask,
      taskId: 'voice-1',
      mode: 'voice',
      isVoice: true,
      payload: { phrase: 'I am ready', reference: 'voice/reference/1' },
    };
    expect(hardening.validateTournamentTask(voice)).toEqual({ ok: true, kind: 'voice' });
    expect(hardening.validateTournamentTask({ ...voice, isVoice: false })).toEqual({
      ok: false,
      reason: 'voice_contract_invalid',
    });
    expect(hardening.verifyTournamentAnswer(voice, 'voice/reference/1')).toBe(false);
    expect(hardening.verifyTournamentAnswer(voice, { reference: 'voice/reference/1' })).toBe(false);
    expect(hardening.tournamentFeatureGates()).toMatchObject({
      voiceScoring: { enabled: false, reason: 'verified_voice_evidence_contract_missing' },
    });
  });

  it('excludes voice tasks from room selection while voice evidence is disabled', () => {
    const voice = {
      ...choiceTask,
      taskId: 'voice-disabled',
      mode: 'voice',
      isVoice: true,
      payload: { phrase: 'I am ready', reference: 'voice/reference/1' },
    };
    const selected = hardening.selectRoundTasks({
      pool: [voice, choiceTask], roomId: 'room-no-voice', roundNo: 1, count: 10, modeKind: 'mix',
    });
    expect(selected.map((candidate: TournamentTask) => candidate.taskId)).toEqual(['choice-1']);
  });

  it('enforces the round difficulty progression before seeded mode selection', () => {
    const pool = [1, 2, 3].flatMap((difficulty) => Array.from({ length: 8 }, (_, index) => ({
      ...choiceTask,
      taskId: `d${difficulty}-${index}`,
      difficulty,
      mode: index % 2 === 0 ? 'choice' : 'quiz',
    })));
    const expected: Record<number, number[]> = { 1: [1], 2: [1, 2], 3: [2], 4: [2, 3] };
    for (const roundNo of [1, 2, 3, 4]) {
      const selected = hardening.selectRoundTasks({
        pool, roomId: `room-difficulty-${roundNo}`, roundNo, count: 20,
        modeKind: roundNo % 2 === 1 ? 'single' : 'mix',
      });
      expect(new Set(selected.map((candidate: TournamentTask) => candidate.difficulty)))
        .toEqual(new Set(expected[roundNo]));
    }
  });

  it('derives bounded scoring time only from server timestamps', () => {
    expect(hardening.serverBoundedElapsedMs({
      stateStartedAtMs: 1_000,
      receivedAtMs: 7_000,
      taskCount: 3,
      maxMsPerTask: 10_000,
    })).toBe(2_000);
    expect(hardening.serverBoundedElapsedMs({
      stateStartedAtMs: 10_000,
      receivedAtMs: 9_000,
      taskCount: 3,
      maxMsPerTask: 10_000,
    })).toBe(10_000);
  });

  it('drops schedule slots with an invalid IANA timezone', () => {
    expect(normalizeTournamentSchedule({
      slots: [{ slotId: 'bad', localTime: '12:00', timezone: 'Mars/Olympus', ticketsRequired: 1, enabled: true }],
      freeWeeklyEntry: true,
      ticketGemValue: 10,
    }).slots).toEqual([]);
  });

  it('persists every table/final/results state and advances after deadlines', () => {
    expect(hardening.stateAfterTournamentDeadline('round1')).toBe('table1');
    expect(hardening.stateAfterTournamentDeadline('table1')).toBe('round2');
    expect(hardening.stateAfterTournamentDeadline('round4')).toBe('final');
    expect(hardening.stateAfterTournamentDeadline('final')).toBe('results');
    expect(hardening.stateAfterTournamentDeadline('results')).toBe('rewards');
    expect(hardening.stateAfterTournamentDeadline('rewards')).toBe('closed');
  });

  it('refunds the recorded paid provenance exactly and restores free provenance separately', () => {
    expect(hardening.cancellationRefundForPlayer({
      id: 'paid', isBot: false, name: 'P', avatar: '🙂', color: '#000', score: 0, streak: 0,
      entry: { kind: 'ticket', ticketsSpent: 5, bankContributionGems: 10, weekId: '2026-W30' },
    })).toEqual({ tickets: 5, restoreFreeWeek: null, bankContributionGems: 10, compensationGems: 3 });
    expect(hardening.cancellationRefundForPlayer({
      id: 'free', isBot: false, name: 'F', avatar: '🙂', color: '#000', score: 0, streak: 0,
      entry: { kind: 'free_weekly', ticketsSpent: 0, bankContributionGems: 0, weekId: '2026-W30' },
    })).toEqual({ tickets: 0, restoreFreeWeek: '2026-W30', bankContributionGems: 0, compensationGems: 3 });
  });

  it('exposes implemented rewards and explicit pending gates without unsafe fields', () => {
    // 2026-07-26: билеты убраны (приз целиком в жемчужинах), а суммы приходят
    // из банка турнира. Без банка — откат на прежнюю таблицу.
    expect(hardening.tournamentRewardPlan(1)).toMatchObject({
      gems: 50,
      tickets: 0,
      titleId: 'tournament_champion_of_day',
      pending: {
        xpCashback: 'disabled_pending_progress_event_contract',
        avatarFrameExpiry: 'disabled_pending_avatar_frame_contract',
        referralTickets: 'disabled_pending_referral_receipt_contract',
        seasonPayout: 'disabled_pending_season_payout_contract',
      },
    });
    expect(hardening.tournamentRewardPlan(8)).toMatchObject({ gems: 0, tickets: 0 });
  });
});

describe('transaction plan semantics', () => {
  const plans = require('./tournament_core') as Record<string, (...args: any[]) => any>;
  const tasks = [
    {
      taskId: 'q1', mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'one', options: ['yes', 'no', 'maybe', 'later'], correctIndex: 0 }, tags: [], verified: true,
    },
  ];
  const room = () => ({
    roomId: 'room-race', slotId: 'daily', seed: 'room-race', state: 'round1', startsAt: 1_000,
    stateStartedAtMs: 1_000, stateDeadlineAtMs: 11_000, participantAuthUids: ['auth-u1', 'auth-u2'],
    players: [player('u1', 0), player('u2', 0), { ...player('bot1', 0, true), botWinRate: 1 }],
    rounds: [{ roundNo: 1, mode: 'choice', taskIds: ['q1'], results: {} }],
    version: 1, createdAtMs: 0,
  });

  it('optimistic transaction retry preserves two submissions and replay scores once', () => {
    const answer = [{ taskId: 'q1', answer: { selectedIndex: 0 } }];
    const first = plans.applyTournamentSubmission(room(), {
      playerId: 'u1', roundNo: 1, answers: answer, tasks, receivedAtMs: 2_000,
    });
    const afterRetry = plans.applyTournamentSubmission(first.room, {
      playerId: 'u2', roundNo: 1, answers: answer, tasks, receivedAtMs: 2_500,
    });
    const replay = plans.applyTournamentSubmission(afterRetry.room, {
      playerId: 'u1', roundNo: 1, answers: answer, tasks, receivedAtMs: 3_000,
    });

    expect(Object.keys(afterRetry.room.rounds[0].results).sort()).toEqual(['u1', 'u2']);
    expect(afterRetry.room.players.find((p: TournamentPlayer) => p.id === 'u1')?.score).toBe(
      first.room.players.find((p: TournamentPlayer) => p.id === 'u1')?.score,
    );
    expect(replay.replay).toBe(true);
    expect(replay.room).toEqual(afterRetry.room);
  });

  it('join then cancel refunds the joined provenance; cancel then join fails closed', () => {
    const lobby = { ...room(), state: 'lobby', players: [], rounds: [] };
    const entrant = {
      ...player('u1', 0),
      entry: { kind: 'ticket', ticketsSpent: 1, bankContributionGems: 2, weekId: '2026-W30' },
    };
    const joined = plans.applyTournamentJoin(lobby, entrant, 'auth-u1');
    const cancelled = plans.planTournamentCancellation(joined, 'not_enough_players', 2_000);
    expect(cancelled.refunds).toEqual([{ playerId: 'u1', tickets: 1, restoreFreeWeek: null, bankContributionGems: 2, compensationGems: 3 }]);
    expect(() => plans.applyTournamentJoin(cancelled.room, entrant, 'auth-u1')).toThrow('room_not_joinable');
  });

  it('repeated join appends the current auth identity without charging again', () => {
    const joined = {
      ...room(), state: 'lobby', startsAt: 10_000,
      players: [player('u1', 0)], participantAuthUids: ['old-auth'], rounds: [],
    };
    const replay = plans.applyTournamentJoin(joined, player('u1', 0), 'new-auth', 9_000);
    expect(replay.players).toHaveLength(1);
    expect(replay.participantAuthUids).toEqual(['old-auth', 'new-auth']);
    expect(replay.version).toBe(joined.version + 1);
  });

  it('rejects a new join at or after the lobby start cutoff', () => {
    const lobby = { ...room(), state: 'lobby', startsAt: 10_000, players: [], rounds: [] };
    expect(() => plans.applyTournamentJoin(lobby, player('u1', 0), 'auth-u1', 10_000))
      .toThrow('join_cutoff_elapsed');
  });

  it('conservatively refunds legacy entrants and permits an idempotent active-room recovery cancel', () => {
    const legacyPlayer = player('legacy-u1', 0);
    expect(plans.cancellationRefundForPlayer(legacyPlayer, { fallbackTickets: 1 }))
      .toEqual({ tickets: 1, restoreFreeWeek: null, bankContributionGems: 0, compensationGems: 3 });
    const legacyRound = {
      ...room(), state: 'round1', players: [legacyPlayer], stateDeadlineAtMs: undefined,
    };
    const first = plans.planTournamentCancellation(
      legacyRound, 'legacy_gameplay_unverifiable', 12_000, { allowActive: true, fallbackTickets: 1 },
    );
    const replay = plans.planTournamentCancellation(
      first.room, 'legacy_gameplay_unverifiable', 13_000, { allowActive: true, fallbackTickets: 1 },
    );
    expect(first.refunds[0]).toMatchObject({ playerId: 'legacy-u1', tickets: 1 });
    expect(replay).toMatchObject({ alreadyCancelled: true, refunds: [] });
  });

  it('classifies legacy missing-deadline and missing-secret rooms for safe recovery', () => {
    const scheduled = { ...room(), state: 'scheduled', startsAt: 10_000, stateDeadlineAtMs: undefined };
    expect(plans.legacyTournamentRecoveryAction(scheduled, 9_000, true)).toBe('wait');
    expect(plans.legacyTournamentRecoveryAction(scheduled, 10_000, true)).toBe('cancel');
    expect(plans.legacyTournamentRecoveryAction({ ...scheduled, state: 'lobby' }, 10_000, true)).toBe('cancel');
    expect(plans.legacyTournamentRecoveryAction({ ...scheduled, state: 'round1' }, 10_000, true)).toBe('cancel');
    expect(plans.legacyTournamentRecoveryAction({
      ...scheduled, state: 'round1', stateDeadlineAtMs: 11_000,
    }, 10_000, false)).toBe('cancel');
  });

  it('propagates transient task snapshot reads but returns null for proven missing data', async () => {
    const transient = new Error('firestore_unavailable');
    await expect(plans.loadCompleteTournamentTasks(
      ['q1'],
      async () => { throw transient; },
    )).rejects.toBe(transient);
    await expect(plans.loadCompleteTournamentTasks(
      ['q1'],
      async () => null,
    )).resolves.toBeNull();
    await expect(plans.loadCompleteTournamentTasks(
      ['q1'],
      async () => tasks[0],
    )).resolves.toEqual(tasks);
  });

  it('repeated cancellation emits no second refund or compensation', () => {
    const paid = {
      ...player('u1', 0),
      entry: { kind: 'ticket', ticketsSpent: 5, bankContributionGems: 10, weekId: '2026-W30' },
    };
    const first = plans.planTournamentCancellation({ ...room(), state: 'lobby', players: [paid], rounds: [] }, 'not_enough_players', 2_000);
    const replay = plans.planTournamentCancellation(first.room, 'not_enough_players', 3_000);
    expect(first.refunds).toHaveLength(1);
    expect(first.receiptId).toBe('tournament_cancel_room-race');
    expect(replay).toMatchObject({ alreadyCancelled: true, refunds: [] });
  });

  it('deadline completion records missing humans as zero and scores bots in that round', () => {
    const answer = [{ taskId: 'q1', answer: { selectedIndex: 0 } }];
    const submitted = plans.applyTournamentSubmission(room(), {
      playerId: 'u1', roundNo: 1, answers: answer, tasks, receivedAtMs: 2_000,
    });
    const completed = plans.completeTournamentRoundAtDeadline(submitted.room, tasks, 11_001);
    expect(completed.room.rounds[0].results.u2).toMatchObject({ correct: 0, roundScore: 0, timedOut: true });
    expect(completed.room.rounds[0].results.bot1.roundScore).toBeGreaterThan(0);
    expect(completed.room.players.find((p: TournamentPlayer) => p.id === 'bot1')?.score).toBeGreaterThan(0);
    expect(completed.room.state).toBe('table1');
  });

  it('repeated finalization plan emits season/played/streak/claim effects once', () => {
    const finalRoom = {
      ...room(), state: 'results', players: [player('u1', 100), player('u2', 50)],
      rounds: [], stateDeadlineAtMs: 2_000,
    };
    const first = plans.planTournamentFinalization(finalRoom, 3_000);
    const replay = plans.planTournamentFinalization(first.room, 4_000);
    expect(first.receiptId).toBe('tournament_finalize_room-race');
    expect(first.playerEffects).toHaveLength(2);
    // Приз считается от банка комнаты: 2 живых × 3 = 6, минус 20% в недельный
    // банк = 5 призёрам, 60/25/15 → победителю 4. Билетов больше нет.
    expect(first.playerEffects[0]).toMatchObject({
      playerId: 'u1', seasonPoints: 25, tournamentsPlayed: 1, won: true,
      reward: { gems: 4, tickets: 0 },
    });
    // В недельный банк уходит доля турнира.
    expect(first.weeklyBankGems).toBe(1);
    expect(replay).toMatchObject({ alreadyFinalized: true, playerEffects: [] });
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

/**
 * зачем (владелец 2026-07-27): «не должно быть ощущения фальши, поэтому боты
 * добираются не сразу все». До этого все 15 ботов появлялись одномоментно —
 * игрок видел себя одного, потом мгновенно 16 из 16.
 */
describe('bot join spread (анти-фальшь лобби)', () => {
  const from = 1_000_000;
  const startsAt = from + 2 * 60 * 1000;

  it('боты НЕ появляются все одновременно', () => {
    const times = planBotJoinTimes({ seed: 'room-a', botCount: 15, fromMs: from, startsAtMs: startsAt });
    expect(new Set(times).size).toBeGreaterThan(1);
  });

  it('первая волна уже в лобби, остальные растянуты во времени', () => {
    const times = planBotJoinTimes({ seed: 'room-a', botCount: 15, fromMs: from, startsAtMs: startsAt });
    const immediate = times.filter((value: number) => value === from);
    expect(immediate).toHaveLength(TOURNAMENT_BOT_FIRST_WAVE);
    for (const value of times.slice(TOURNAMENT_BOT_FIRST_WAVE)) {
      expect(value).toBeGreaterThanOrEqual(from + TOURNAMENT_BOT_JOIN_SPREAD_MIN_MS);
      expect(value).toBeLessThanOrEqual(from + TOURNAMENT_BOT_JOIN_SPREAD_MAX_MS);
    }
  });

  it('детерминированно: у всех клиентов комнаты одна картина', () => {
    const a = planBotJoinTimes({ seed: 'room-a', botCount: 15, fromMs: from, startsAtMs: startsAt });
    const b = planBotJoinTimes({ seed: 'room-a', botCount: 15, fromMs: from, startsAtMs: startsAt });
    expect(a).toEqual(b);
    const other = planBotJoinTimes({ seed: 'room-b', botCount: 15, fromMs: from, startsAtMs: startsAt });
    expect(other).not.toEqual(a);
  });

  it('никто не появляется позже старта — иначе комната играет неполной', () => {
    // Добор впритык: разлёт обязан сжаться, а не вылезти за старт.
    const tight = planBotJoinTimes({ seed: 'room-a', botCount: 15, fromMs: from, startsAtMs: from + 5000 });
    for (const value of tight) {
      expect(value).toBeGreaterThanOrEqual(from);
      expect(value).toBeLessThanOrEqual(from + 5000);
    }
  });

  it('пустой добор не падает', () => {
    expect(planBotJoinTimes({ seed: 'room-a', botCount: 0, fromMs: from, startsAtMs: startsAt })).toEqual([]);
  });
});
