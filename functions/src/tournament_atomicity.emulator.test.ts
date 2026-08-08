import { readFileSync } from 'node:fs';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const runtime = require('./tournaments') as Record<string, (...args: any[]) => Promise<any>>;
const core = require('./tournament_core') as Record<string, any>;

const PROJECT_ID = 'demo-phraseman-tournament-lifecycle';

jest.setTimeout(30_000);

describe('tournament timeout replacement pure timing', () => {
  test('uses the original round start at the deadline and awards no speed bonus', () => {
    const task = {
      taskId: 'pure-timing-task',
      mode: 'choice',
      isVoice: false,
      difficulty: 1,
      payload: { phrase: 'Choose yes', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
      tags: [],
      verified: true,
    };
    const room = {
      roomId: 'pure-timing-room', slotId: 'daily', seed: 'pure-timing-room', state: 'table1', startsAt: 1_000,
      stateStartedAtMs: 11_000, stateDeadlineAtMs: 21_000, version: 1, createdAtMs: 1,
      players: [{ ...player('pure-timing-u1', 2), streak: 0 }],
      rounds: [{
        ...round(1),
        taskIds: [task.taskId],
        results: {
          'pure-timing-u1': {
            playerId: 'pure-timing-u1', correct: 0, total: 1, roundScore: 0,
            submittedAtMs: 11_000, submissionStatus: 'timed_out', timedOut: true,
            streakBefore: 2, roundStartedAtMs: 1_000,
          },
        },
      }],
    };
    const applied = require('./tournament_core').applyTournamentSubmission(room, {
      playerId: 'pure-timing-u1', roundNo: 1,
      answers: [{ taskId: task.taskId, answer: { selectedIndex: 0 } }],
      tasks: [task], receivedAtMs: 11_000, maxMsPerTask: 10_000,
    });
    expect(applied.result.roundScore).toBe(3);
    expect(applied.room.players[0]).toMatchObject({ score: 3, streak: 3 });
  });
});

function player(id: string, streak = 0): Record<string, unknown> {
  return {
    id,
    isBot: false,
    name: id,
    avatar: '🙂',
    color: '#47C870',
    score: 0,
    streak,
  };
}

function round(roundNo: number): Record<string, unknown> {
  return {
    roundNo,
    mode: 'choice',
    taskIds: [`atomic-task-${roundNo}`],
    results: {},
  };
}

function speedMatchTask(taskId: string): Record<string, unknown> {
  const pairs = [
    ['ticket', 'билет'],
    ['hotel', 'отель'],
    ['coffee', 'кофе'],
    ['train', 'поезд'],
    ['airport', 'аэропорт'],
    ['passport', 'паспорт'],
  ];
  const rightOptions = pairs.map(([, translation]) => translation);
  return {
    taskId,
    mode: 'speed_match',
    isVoice: false,
    difficulty: 1,
    payload: {
      prompt: 'Match the pairs',
      rightOptions,
      items: pairs.map(([prompt], correctIndex) => ({
        prompt, options: rightOptions, correctIndex,
      })),
    },
    tags: [],
    verified: true,
  };
}

describe('tournament submit atomicity at the scheduler deadline', () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    app = initializeApp({ projectId: PROJECT_ID }, `tournament-atomicity-${process.pid}`);
    db = getFirestore(app);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  test('captures one server receive timestamp before the retryable submit transaction', () => {
    const source = readFileSync(`${__dirname}/tournaments.ts`, 'utf8');
    const start = source.indexOf('export async function tournamentSubmitTransaction');
    const end = source.indexOf('export const tournamentSubmitAnswers', start);
    const submitSource = source.slice(start, end);
    const capture = submitSource.indexOf('const receivedAtMs = input.receivedAtMs ?? Date.now()');
    const transaction = submitSource.indexOf('return db.runTransaction');

    expect(capture).toBeGreaterThan(-1);
    expect(transaction).toBeGreaterThan(capture);
    expect(submitSource.slice(transaction)).not.toContain('Date.now()');
  });

  test('persists speed-match taps in Firestore without nested arrays', async () => {
    const roomId = `speed-match-firestore-${process.pid}`;
    const taskId = `speed-match-firestore-task-${process.pid}`;
    const stableUid = `speed-match-firestore-user-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task = speedMatchTask(taskId);
    const timing = core.tournamentRoundTaskSchedule([task], 1_000)[0];
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: timing.feedbackEndsAtMs,
        players: [player(stableUid)],
        rounds: [{ roundNo: 1, mode: 'speed_match', taskIds: [taskId], taskSchedule: [timing], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set(task),
    ]);

    await expect(runtime.tournamentSpeedMatchAttemptTransaction(db, {
      authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
      pairIndex: 0, selectedIndex: 1, receivedAtMs: timing.readingEndsAtMs + 1,
    })).resolves.toMatchObject({ correct: false, wrongAttempts: 1, penaltyApplied: true });
    await expect(runtime.tournamentSpeedMatchAttemptTransaction(db, {
      authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
      pairIndex: 0, selectedIndex: 0, receivedAtMs: timing.readingEndsAtMs + 2,
    })).resolves.toMatchObject({ correct: true, wrongAttempts: 1 });

    const progressId = runtime.speedMatchAttemptDocId(1, taskId, stableUid) as unknown as string;
    const progress = (await roomRef.collection('taskSecrets').doc(progressId).get()).data();
    expect(progress).toMatchObject({
      kind: 'speed_match_attempt_v1',
      matchedIndexes: [0, -1, -1, -1, -1, -1],
      triedIndexesByPair: { 0: [1], 1: [], 2: [], 3: [], 4: [], 5: [] },
      wrongAttempts: 1,
    });
    expect(progress).not.toHaveProperty('triedIndexes');
  });

  test('finalizes a fully settled speed-match board immediately', async () => {
    const roomId = `speed-match-complete-${process.pid}`;
    const taskId = `speed-match-complete-task-${process.pid}`;
    const stableUid = `speed-match-complete-user-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task = speedMatchTask(taskId);
    const timing = core.tournamentRoundTaskSchedule([task], 1_000)[0];
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: timing.feedbackEndsAtMs,
        players: [player(stableUid)],
        rounds: [{ roundNo: 1, mode: 'speed_match', taskIds: [taskId], taskSchedule: [timing], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set(task),
    ]);

    for (let pairIndex = 0; pairIndex < 6; pairIndex += 1) {
      await runtime.tournamentSpeedMatchAttemptTransaction(db, {
        authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
        pairIndex, selectedIndex: pairIndex,
        receivedAtMs: timing.readingEndsAtMs + pairIndex + 1,
      });
    }
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      stableUid, roomId, roundNo: 1, taskId,
      idempotencyKey: 'speed-match-complete-v1',
      answer: { selectedIndexes: [0, 1, 2, 3, 4, 5] },
      receivedAtMs: timing.readingEndsAtMs + 10,
    })).resolves.toMatchObject({ correct: true, earnedStars: 6 });

    const completed = (await roomRef.get()).data()!;
    expect(completed.rounds[0].results[stableUid]).toMatchObject({
      roundScore: 6,
      submissionStatus: 'submitted',
    });
  });

  test('does not freeze a partial speed-match receipt before an in-flight pair settles', async () => {
    const roomId = `speed-match-receipt-race-${process.pid}`;
    const taskId = `speed-match-receipt-race-task-${process.pid}`;
    const stableUid = `speed-match-receipt-race-user-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task = speedMatchTask(taskId);
    const timing = core.tournamentRoundTaskSchedule([task], 1_000)[0];
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: timing.feedbackEndsAtMs,
        players: [player(stableUid)],
        rounds: [{ roundNo: 1, mode: 'speed_match', taskIds: [taskId], taskSchedule: [timing], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set(task),
    ]);

    await runtime.tournamentSpeedMatchAttemptTransaction(db, {
      authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
      pairIndex: 0, selectedIndex: 0, receivedAtMs: timing.readingEndsAtMs + 1,
    });
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      stableUid, roomId, roundNo: 1, taskId,
      idempotencyKey: 'speed-match-receipt-race-v1',
      answer: { selectedIndexes: [0, -1, -1, -1, -1, -1] },
      receivedAtMs: timing.readingEndsAtMs + 2,
    })).resolves.toMatchObject({ earnedStars: 1 });
    expect((await roomRef.get()).data()?.rounds[0].results).toEqual({});

    await runtime.tournamentSpeedMatchAttemptTransaction(db, {
      authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
      pairIndex: 1, selectedIndex: 1, receivedAtMs: timing.readingEndsAtMs + 3,
    });
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => timing.feedbackEndsAtMs,
    })).resolves.toBe('advanced');
    const completed = (await roomRef.get()).data()!;
    expect(completed.rounds[0].results[stableUid]).toMatchObject({
      roundScore: 2,
      submissionStatus: 'submitted',
    });
  });

  test('deadline credits authoritative speed-match progress even without a final client receipt', async () => {
    const roomId = `speed-match-orphan-progress-${process.pid}`;
    const taskId = `speed-match-orphan-progress-task-${process.pid}`;
    const stableUid = `speed-match-orphan-progress-user-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task = speedMatchTask(taskId);
    const timing = core.tournamentRoundTaskSchedule([task], 1_000)[0];
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: timing.feedbackEndsAtMs,
        players: [player(stableUid)],
        rounds: [{ roundNo: 1, mode: 'speed_match', taskIds: [taskId], taskSchedule: [timing], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set(task),
    ]);

    await runtime.tournamentSpeedMatchAttemptTransaction(db, {
      authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
      pairIndex: 0, selectedIndex: 0, receivedAtMs: timing.readingEndsAtMs + 1,
    });
    await runtime.tournamentSpeedMatchAttemptTransaction(db, {
      authUid: stableUid, stableUid, roomId, roundNo: 1, taskId,
      pairIndex: 1, selectedIndex: 1, receivedAtMs: timing.readingEndsAtMs + 2,
    });
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => timing.feedbackEndsAtMs,
    })).resolves.toBe('advanced');

    const completed = (await roomRef.get()).data()!;
    expect(completed.rounds[0].results[stableUid]).toMatchObject({
      roundScore: 2,
      submissionStatus: 'submitted',
      review: [{ taskId, starsAwarded: 2 }],
    });
    expect(completed.players[0].score).toBe(2);
  });

  test('deadline ignores speed-match evidence written outside the receive window', async () => {
    const roomId = `speed-match-late-progress-${process.pid}`;
    const taskId = `speed-match-late-progress-task-${process.pid}`;
    const stableUid = `speed-match-late-progress-user-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task = speedMatchTask(taskId);
    const timing = core.tournamentRoundTaskSchedule([task], 1_000)[0];
    const progressId = runtime.speedMatchAttemptDocId(1, taskId, stableUid) as unknown as string;
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: timing.feedbackEndsAtMs,
        players: [player(stableUid)],
        rounds: [{ roundNo: 1, mode: 'speed_match', taskIds: [taskId], taskSchedule: [timing], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set(task),
      roomRef.collection('taskSecrets').doc(progressId).set({
        kind: 'speed_match_attempt_v1', taskId, playerId: stableUid, roundNo: 1,
        matchedIndexes: [0, -1, -1, -1, -1, -1],
        triedIndexesByPair: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] },
        wrongAttempts: 0,
        // The last legal server receipt is feedbackStartsAtMs - 1.
        updatedAtMs: timing.feedbackStartsAtMs,
      }),
    ]);

    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => timing.feedbackEndsAtMs,
    })).resolves.toBe('advanced');
    const completed = (await roomRef.get()).data()!;
    expect(completed.rounds[0].results[stableUid]).toMatchObject({
      roundScore: 0,
      submissionStatus: 'timed_out',
      timedOut: true,
    });
    expect(completed.players[0].score).toBe(0);
  });

  test('enforces each persisted task deadline with the exact 1.5 second receive grace', async () => {
    const core = require('./tournament_core');
    expect(core.TOURNAMENT_TASK_SUBMISSION_GRACE_MS).toBe(1_500);
    const seedRoom = async (suffix: string) => {
      const roomId = `task-grace-${suffix}-${process.pid}`;
      const taskId = `task-grace-${suffix}`;
      const roomRef = db.collection('tournamentRooms').doc(roomId);
      await Promise.all([
        roomRef.set({
          slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
          stateStartedAtMs: 1_000, stateDeadlineAtMs: 16_000,
          players: [player(`task-grace-u-${suffix}`)],
          rounds: [{
            roundNo: 1, mode: 'mix', taskIds: [taskId], results: {},
            taskSchedule: [{
              taskId, taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000,
            }],
          }],
          version: 0, createdAtMs: 1,
        }),
        roomRef.collection('taskSecrets').doc(taskId).set({
          mode: 'guess_phrase', isVoice: false, difficulty: 1,
          payload: { phrase: 'Choose yes', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
          tags: [], verified: true,
        }),
      ]);
      return { roomId, taskId, stableUid: `task-grace-u-${suffix}` };
    };

    const within = await seedRoom('within');
    await expect(runtime.tournamentSubmitTransaction(db, {
      ...within, roundNo: 1, idempotencyKey: 'task-grace-within-v1',
      rawAnswers: [{ taskId: within.taskId, answer: { selectedIndex: 0 } }],
      receivedAtMs: 17_500,
    })).resolves.toMatchObject({ ok: true, replay: false, correct: 1 });

    const late = await seedRoom('late');
    await expect(runtime.tournamentSubmitTransaction(db, {
      ...late, roundNo: 1, idempotencyKey: 'task-grace-late-v1',
      rawAnswers: [{ taskId: late.taskId, answer: { selectedIndex: 0 } }],
      receivedAtMs: 17_501,
    })).rejects.toThrow('task_deadline_elapsed');

    const early = await seedRoom('early');
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...early, roundNo: 1, idempotencyKey: 'task-grace-early-v1',
      answer: { selectedIndex: 0 }, receivedAtMs: 999,
    })).rejects.toThrow('task_not_started');
  });

  test('rejects a batch when an earlier answer misses its own schedule even before the round deadline', async () => {
    const roomId = `batch-task-deadlines-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const taskIds = ['batch-q1', 'batch-q2'];
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
      stateStartedAtMs: 1_000, stateDeadlineAtMs: 31_000,
      players: [player('batch-deadline-u1')],
      rounds: [{
        roundNo: 1, mode: 'mix', taskIds, results: {},
        taskSchedule: [
          { taskId: taskIds[0], taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000 },
          { taskId: taskIds[1], taskIndex: 1, durationMs: 15_000, startsAtMs: 16_000, deadlineAtMs: 31_000 },
        ],
      }],
      version: 0, createdAtMs: 1,
    });
    await Promise.all(taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({
      mode: 'guess_phrase', isVoice: false, difficulty: 1,
      payload: { phrase: taskId, options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
      tags: [], verified: true,
    })));

    await expect(runtime.tournamentSubmitTransaction(db, {
      stableUid: 'batch-deadline-u1', roomId, roundNo: 1,
      idempotencyKey: 'batch-task-deadlines-v1',
      rawAnswers: taskIds.map((taskId) => ({ taskId, answer: { selectedIndex: 0 } })),
      receivedAtMs: 17_501,
    })).rejects.toThrow('task_deadline_elapsed');
    expect((await roomRef.get()).data()?.rounds[0].results).toEqual({});
  });

  test('persists the first per-task answer and replays only the same key after deadline', async () => {
    const roomId = `task-answer-receipt-${process.pid}`;
    const taskId = 'task-answer-receipt-q1';
    const stableUid = 'task-answer-receipt-u1';
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: 16_000,
        players: [player(stableUid)],
        rounds: [{
          roundNo: 1, mode: 'mix', taskIds: [taskId], results: {},
          taskSchedule: [{
            taskId, taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000,
          }],
        }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set({
        mode: 'guess_phrase', isVoice: false, difficulty: 1,
        payload: { phrase: 'Choose yes', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
        tags: [], verified: true,
      }),
    ]);
    const request = {
      stableUid, roomId, roundNo: 1, taskId,
      idempotencyKey: 'task-answer-receipt-v1', answer: { selectedIndex: 0 },
    };
    const first = await runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, receivedAtMs: 16_100,
    });
    await roomRef.update({ state: 'table1' });
    const replay = await runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, answer: { selectedIndex: 1 }, receivedAtMs: 17_500,
    });
    expect(first).toEqual({
      ok: true, replay: false, taskId, acceptedAtMs: 16_100, correct: true,
      earnedStars: 3,
      zeroScoreReason: null,
      explanation: null,
      correctIndex: 0,
    });
    expect(replay).toEqual({ ...first, replay: true });

    const receiptId = await runtime.tournamentTaskAnswerReceiptDocId(1, taskId, stableUid);
    const receipt = (await roomRef.collection('taskSecrets').doc(receiptId).get()).data();
    expect(receipt).toMatchObject({
      kind: 'tournament_task_answer_v1', roundNo: 1, taskId, playerId: stableUid,
      receivedAtMs: 16_100, correct: true, answer: { selectedIndex: 0 },
    });
    expect(receipt?.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt).not.toHaveProperty('idempotencyKey');

    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, idempotencyKey: 'task-answer-receipt-v2', receivedAtMs: 50_000,
    })).rejects.toThrow('task_answer_idempotency_key_mismatch');
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, answer: { selectedIndex: 1 }, receivedAtMs: 50_000,
    })).resolves.toEqual({ ...first, replay: true });
  });

  test('tracks per-task places privately without changing correctness-based stars', async () => {
    // зачем 2026-08-01 (аудит стоимости): место в задании раньше требовало
    // прочитать квитанции ВСЕХ игроков по ВСЕМ заданиям раунда — 64 документа
    // на каждый ответ. Теперь место берётся из счётчика в закрытой taskSecrets.
    // После правила владельца от 2026-08-03 место больше не меняет звёзды, но
    // остаётся серверным тай-брейком. Неверный ответ не должен занимать место.
    const roomId = `rank-counter-${process.pid}`;
    const taskId = 'rank-counter-q1';
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const uids = ['rank-u1', 'rank-u2', 'rank-u3', 'rank-u4'];
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: 16_000,
        players: uids.map((uid) => player(uid)),
        rounds: [{
          roundNo: 1, mode: 'mix', taskIds: [taskId], results: {},
          taskSchedule: [{
            taskId, taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000,
          }],
        }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set({
        mode: 'guess_phrase', isVoice: false, difficulty: 1,
        payload: { phrase: 'Choose yes', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
        tags: [], verified: true,
      }),
    ]);

    const submit = (stableUid: string, selectedIndex: number, receivedAtMs: number) => (
      runtime.tournamentSubmitTaskAnswerTransaction(db, {
        stableUid, roomId, roundNo: 1, taskId,
        idempotencyKey: `rank-counter-${stableUid}-v1`,
        answer: { selectedIndex }, receivedAtMs,
      })
    );

    // Порядок приёма: u1 верно, u2 НЕВЕРНО, u3 верно, u4 верно.
    const first = await submit(uids[0], 0, 2_000);
    const wrong = await submit(uids[1], 1, 3_000);
    const second = await submit(uids[2], 0, 4_000);
    const third = await submit(uids[3], 0, 5_000);

    expect(first).toMatchObject({ correct: true, earnedStars: 3 });
    // Неверный ответ не занимает место в очереди правильных.
    expect(wrong).toMatchObject({ correct: false, earnedStars: 0 });
    expect(second).toMatchObject({ correct: true, earnedStars: 3 });
    expect(third).toMatchObject({ correct: true, earnedStars: 3 });

    // Счётчик виден только серверу и считает ровно верные ответы.
    const counterId = runtime.tournamentTaskRankCounterDocId(1, taskId) as unknown as string;
    const counter = (await roomRef.collection('taskSecrets').doc(counterId).get()).data();
    expect(counter).toMatchObject({ correctCount: 3 });

    // Реплей не сдвигает счётчик и не меняет уже выданную награду.
    await expect(submit(uids[0], 0, 9_000)).resolves.toMatchObject({
      replay: true, earnedStars: 3,
    });
    const counterAfterReplay = (await roomRef.collection('taskSecrets').doc(counterId).get()).data();
    expect(counterAfterReplay).toMatchObject({ correctCount: 3 });
  });

  test('enforces persisted reading, answer, receive-grace, and feedback phases end to end', async () => {
    const roomId = `task-phase-e2e-${process.pid}`;
    const taskId = 'task-phase-e2e-q1';
    const stableUid = 'task-phase-e2e-u1';
    const lateStableUid = 'task-phase-e2e-late-u1';
    const startedAtMs = 1_000;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task = {
      taskId, mode: 'guess_phrase', isVoice: false, difficulty: 1,
      payload: { phrase: 'Choose yes', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
      explanation: {
        ruleNote: 'Choose the exact meaning.', example: 'Yes, I am ready.',
        wrongOptionReasons: ['', 'No reverses the meaning.', 'Later changes the time.', 'Maybe changes certainty.'],
      },
      tags: [], verified: true,
    };
    const timing = core.tournamentRoundTaskSchedule([task], startedAtMs)[0];
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'daily', seed: roomId, state: 'round1', startsAt: startedAtMs,
        stateStartedAtMs: startedAtMs, stateDeadlineAtMs: timing.feedbackEndsAtMs,
        players: [player(stableUid), player(lateStableUid)],
        rounds: [{ roundNo: 1, mode: 'guess_phrase', taskIds: [taskId], taskSchedule: [timing], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set(task),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1')
        .set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
    ]);
    const request = {
      stableUid, roomId, roundNo: 1, taskId,
      idempotencyKey: 'task-phase-e2e-v1', answer: { selectedIndex: 0 },
    };

    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, receivedAtMs: timing.readingEndsAtMs - 1,
    })).rejects.toThrow('task_reading_in_progress');
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, receivedAtMs: timing.feedbackStartsAtMs - 1,
    })).resolves.toMatchObject({ correct: true, earnedStars: 3, correctIndex: 0 });
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request, receivedAtMs: timing.feedbackStartsAtMs,
    })).resolves.toMatchObject({ replay: true, acceptedAtMs: timing.feedbackStartsAtMs - 1 });
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...request,
      stableUid: lateStableUid,
      idempotencyKey: 'task-phase-e2e-late-v1',
      receivedAtMs: timing.feedbackStartsAtMs,
    })).rejects.toThrow('task_deadline_elapsed');
    expect((await roomRef.get()).data()?.stateDeadlineAtMs).toBe(timing.feedbackEndsAtMs);
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => timing.feedbackEndsAtMs,
    })).resolves.toBe('advanced');
    expect((await roomRef.get()).data()).toMatchObject({
      state: 'table1', stateStartedAtMs: timing.feedbackEndsAtMs,
    });
  });

  test('legacy final batch replays the result already finalized from timely per-task receipts', async () => {
    const roomId = `task-answer-batch-${process.pid}`;
    const stableUid = 'task-answer-batch-u1';
    const taskIds = ['task-answer-batch-q1', 'task-answer-batch-q2'];
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
      stateStartedAtMs: 1_000, stateDeadlineAtMs: 31_000,
      players: [player(stableUid)],
      rounds: [{
        roundNo: 1, mode: 'mix', taskIds, results: {},
        taskSchedule: [
          { taskId: taskIds[0], taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000 },
          { taskId: taskIds[1], taskIndex: 1, durationMs: 15_000, startsAtMs: 16_000, deadlineAtMs: 31_000 },
        ],
      }],
      version: 0, createdAtMs: 1,
    });
    await Promise.all(taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({
      mode: 'guess_phrase', isVoice: false, difficulty: 1,
      payload: { phrase: taskId, options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
      tags: [], verified: true,
    })));
    await runtime.tournamentSubmitTaskAnswerTransaction(db, {
      stableUid, roomId, roundNo: 1, taskId: taskIds[0], answer: { selectedIndex: 0 },
      idempotencyKey: 'task-answer-batch-q1-v1', receivedAtMs: 16_100,
    });
    await runtime.tournamentSubmitTaskAnswerTransaction(db, {
      stableUid, roomId, roundNo: 1, taskId: taskIds[1], answer: { selectedIndex: 0 },
      idempotencyKey: 'task-answer-batch-q2-v1', receivedAtMs: 31_100,
    });

    const finalRequest = {
      stableUid, roomId, roundNo: 1, idempotencyKey: 'task-answer-batch-final-v1',
      rawAnswers: taskIds.map((taskId) => ({ taskId, answer: { selectedIndex: 1 } })),
    };
    await expect(runtime.tournamentSubmitTransaction(db, {
      ...finalRequest, receivedAtMs: 31_200,
    })).resolves.toMatchObject({ ok: true, replay: true, correct: 2 });
    await expect(runtime.tournamentSubmitTransaction(db, {
      ...finalRequest, receivedAtMs: 32_500,
    })).resolves.toMatchObject({ ok: true, replay: true, correct: 2 });
    await expect(runtime.tournamentSubmitTransaction(db, {
      ...finalRequest, receivedAtMs: 32_501,
    })).rejects.toThrow('task_deadline_elapsed');
  });

  test('finalizes a fully answered per-task round once and replays the last receipt without rescoring', async () => {
    const roomId = `task-answer-finalizes-${process.pid}`;
    const stableUid = 'task-answer-finalizes-u1';
    const taskIds = ['task-answer-finalizes-q1', 'task-answer-finalizes-q2'];
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
      stateStartedAtMs: 1_000, stateDeadlineAtMs: 31_000,
      players: [player(stableUid)],
      rounds: [{
        roundNo: 1, mode: 'mix', taskIds, results: {},
        taskSchedule: [
          { taskId: taskIds[0], taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000 },
          { taskId: taskIds[1], taskIndex: 1, durationMs: 15_000, startsAtMs: 16_000, deadlineAtMs: 31_000 },
        ],
      }],
      version: 0, createdAtMs: 1,
    });
    await Promise.all(taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({
      mode: 'guess_phrase', isVoice: false, difficulty: 1,
      payload: { phrase: taskId, options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
      tags: [], verified: true,
    })));

    await runtime.tournamentSubmitTaskAnswerTransaction(db, {
      stableUid, roomId, roundNo: 1, taskId: taskIds[0], answer: { selectedIndex: 0 },
      idempotencyKey: 'task-answer-finalizes-q1-v1', receivedAtMs: 15_000,
    });
    expect((await roomRef.get()).data()?.rounds[0].results).toEqual({});

    const lastRequest = {
      stableUid, roomId, roundNo: 1, taskId: taskIds[1], answer: { selectedIndex: 0 },
      idempotencyKey: 'task-answer-finalizes-q2-v1', receivedAtMs: 28_000,
    };
    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, lastRequest))
      .resolves.toMatchObject({ ok: true, replay: false, correct: true });
    const completed = (await roomRef.get()).data()!;
    expect(completed.rounds[0].results[stableUid]).toMatchObject({
      correct: 2, total: 2, submissionStatus: 'submitted',
      review: [
        { taskId: taskIds[0], correct: true, given: { selectedIndex: 0 } },
        { taskId: taskIds[1], correct: true, given: { selectedIndex: 0 } },
      ],
    });
    expect(completed.players[0].score).toBeGreaterThan(0);
    expect(completed.stateDeadlineAtMs).toBe(
      lastRequest.receivedAtMs + require('./tournament_core').TOURNAMENT_EARLY_ADVANCE_DELAY_MS,
    );

    await expect(runtime.tournamentSubmitTaskAnswerTransaction(db, {
      ...lastRequest, answer: { selectedIndex: 1 }, receivedAtMs: 28_100,
    })).resolves.toMatchObject({ ok: true, replay: true, correct: true });
    const replayed = (await roomRef.get()).data()!;
    expect(replayed.players).toEqual(completed.players);
    expect(replayed.rounds).toEqual(completed.rounds);
    expect(replayed.version).toBe(completed.version);
    expect(replayed.stateDeadlineAtMs).toBe(completed.stateDeadlineAtMs);
  });

  test('deadline scores timely receipts and marks only unanswered tasks timed out', async () => {
    const roomId = `task-answer-partial-deadline-${process.pid}`;
    const stableUid = 'task-answer-partial-deadline-u1';
    const zeroReceiptUid = 'task-answer-partial-deadline-u2';
    const taskIds = [1, 2, 3, 4].map((taskNo) => `task-answer-partial-q${taskNo}`);
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: 61_000,
        players: [player(zeroReceiptUid), player(stableUid)],
        rounds: [{
          roundNo: 1, mode: 'mix', taskIds, results: {},
          taskSchedule: taskIds.map((taskId, taskIndex) => ({
            taskId,
            taskIndex,
            durationMs: 15_000,
            startsAtMs: 1_000 + taskIndex * 15_000,
            deadlineAtMs: 1_000 + (taskIndex + 1) * 15_000,
          })),
        }],
        version: 0, createdAtMs: 1,
      }),
      ...taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({
        mode: 'guess_phrase', isVoice: false, difficulty: 1,
        payload: { phrase: taskId, options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
        tags: [], verified: true,
      })),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1').set({
        kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [],
      }),
    ]);

    await runtime.tournamentSubmitTaskAnswerTransaction(db, {
      stableUid, roomId, roundNo: 1, taskId: taskIds[0], answer: { selectedIndex: 0 },
      idempotencyKey: 'task-answer-partial-q1-v1', receivedAtMs: 15_000,
    });
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => 61_000 }))
      .resolves.toBe('advanced');

    const completed = (await roomRef.get()).data()!;
    expect(completed.state).toBe('table1');
    expect(completed.players.find((candidate: { id: string }) => candidate.id === stableUid).score)
      .toBeGreaterThan(0);
    expect(completed.rounds[0].results[stableUid]).toMatchObject({
      correct: 1, total: 4, submissionStatus: 'submitted',
      review: [
        { taskId: taskIds[0], correct: true, given: { selectedIndex: 0 } },
        { taskId: taskIds[1], correct: false, timedOut: true },
        { taskId: taskIds[2], correct: false, timedOut: true },
        { taskId: taskIds[3], correct: false, timedOut: true },
      ],
    });
    expect(completed.rounds[0].results[stableUid]).not.toHaveProperty('timedOut', true);
    expect(completed.rounds[0].results[zeroReceiptUid]).toMatchObject({
      correct: 0, roundScore: 0, submissionStatus: 'timed_out', timedOut: true,
    });
    expect(core.computePlacements(completed.players).standings.map((candidate: { id: string }) => candidate.id))
      .toEqual([stableUid, zeroReceiptUid]);
  });

  test('keeps receipt ranks as a deterministic tie-break without reducing stars', async () => {
    const roomId = `task-answer-rank-${process.pid}`;
    const taskIds = ['task-answer-rank-q1', 'task-answer-rank-q2'];
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
      stateStartedAtMs: 1_000, stateDeadlineAtMs: 31_000,
      players: [player('rank-a'), player('rank-b')],
      rounds: [{
        roundNo: 1, mode: 'mix', taskIds, results: {},
        taskSchedule: [
          { taskId: taskIds[0], taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000 },
          { taskId: taskIds[1], taskIndex: 1, durationMs: 15_000, startsAtMs: 16_000, deadlineAtMs: 31_000 },
        ],
      }],
      version: 0, createdAtMs: 1,
    });
    await Promise.all(taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({
      mode: 'guess_phrase', isVoice: false, difficulty: 1,
      payload: { phrase: taskId, options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
      tags: [], verified: true,
    })));
    const submit = (playerId: string, taskId: string, receivedAtMs: number) => (
      runtime.tournamentSubmitTaskAnswerTransaction(db, {
        stableUid: playerId, roomId, roundNo: 1, taskId, answer: { selectedIndex: 0 },
        idempotencyKey: `${playerId}-${taskId}-v1`, receivedAtMs,
      })
    );

    await submit('rank-a', taskIds[0], 10_000);
    await submit('rank-b', taskIds[0], 9_000);
    await submit('rank-b', taskIds[1], 25_000); // B finalizes first, but was first only on q1.
    await submit('rank-a', taskIds[1], 25_000); // Same q2 time: rank-a wins the stable id tie.

    const completed = (await roomRef.get()).data()!;
    expect(completed.rounds[0].results['rank-a'].roundScore).toBe(6);
    expect(completed.rounds[0].results['rank-b'].roundScore).toBe(6);
  });

  test('replays a transient batch retry once under the same key while still inside grace', async () => {
    const roomId = `batch-retry-grace-${process.pid}`;
    const taskId = 'batch-retry-q1';
    const stableUid = 'batch-retry-u1';
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: 16_000,
        players: [player(stableUid)],
        rounds: [{
          roundNo: 1, mode: 'mix', taskIds: [taskId], results: {},
          taskSchedule: [{
            taskId, taskIndex: 0, durationMs: 15_000, startsAtMs: 1_000, deadlineAtMs: 16_000,
          }],
        }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set({
        mode: 'guess_phrase', isVoice: false, difficulty: 1,
        payload: { phrase: 'Retry me', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
        tags: [], verified: true,
      }),
    ]);
    const request = {
      stableUid, roomId, roundNo: 1, idempotencyKey: 'batch-retry-grace-v1',
      rawAnswers: [{ taskId, answer: { selectedIndex: 0 } }],
    };
    const first = await runtime.tournamentSubmitTransaction(db, { ...request, receivedAtMs: 17_400 });
    const retry = await runtime.tournamentSubmitTransaction(db, { ...request, receivedAtMs: 17_500 });
    expect(first).toMatchObject({ replay: false, correct: 1 });
    expect(retry).toMatchObject({ replay: true, correct: 1 });
    expect((await roomRef.get()).data()?.players[0].score).toBe(first.roundScore);
    await expect(runtime.tournamentSubmitTransaction(db, { ...request, receivedAtMs: 17_501 }))
      .rejects.toThrow('task_deadline_elapsed');
  });

  test('all real submissions shorten the round only to the explicit answer-display delay', async () => {
    const roomId = `early-all-real-${process.pid}`;
    const taskId = `early-all-real-task-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const originalDeadlineAtMs = 100_000;
    const finalSubmitAtMs = 2_100;
    const earlyDelayMs = require('./tournament_core').TOURNAMENT_EARLY_ADVANCE_DELAY_MS as number;
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1_000,
        stateStartedAtMs: 1_000, stateDeadlineAtMs: originalDeadlineAtMs,
        players: [player('early-u1'), player('early-u2')],
        rounds: [{ roundNo: 1, mode: 'guess_phrase', taskIds: [taskId], results: {} }],
        version: 0, createdAtMs: 1,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set({
        mode: 'guess_phrase', isVoice: false, difficulty: 1,
        payload: { phrase: 'Choose yes', options: ['yes', 'no', 'later', 'maybe'], correctIndex: 0 },
        tags: [], verified: true,
      }),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1').set({
        kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [],
      }),
    ]);

    await runtime.tournamentSubmitTransaction(db, {
      stableUid: 'early-u1', roomId, roundNo: 1,
      rawAnswers: [{ taskId, answer: { selectedIndex: 0 } }], receivedAtMs: 2_000,
    });
    expect((await roomRef.get()).data()?.stateDeadlineAtMs).toBe(originalDeadlineAtMs);

    await runtime.tournamentSubmitTransaction(db, {
      stableUid: 'early-u2', roomId, roundNo: 1,
      rawAnswers: [{ taskId, answer: { selectedIndex: 0 } }], receivedAtMs: finalSubmitAtMs,
    });
    const earlyDeadlineAtMs = finalSubmitAtMs + earlyDelayMs;
    expect((await roomRef.get()).data()?.stateDeadlineAtMs).toBe(earlyDeadlineAtMs);
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => earlyDeadlineAtMs - 1 }))
      .resolves.toBe('waiting');
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => earlyDeadlineAtMs }))
      .resolves.toBe('advanced');
  });

  test('an on-time submit replaces only the immediately-next timeout result and scores exactly once', async () => {
    const roomId = `atomic-timeout-race-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const receivedAtMs = 11_000;
    await roomRef.set({
      slotId: 'daily_1200',
      seed: roomId,
      state: 'round1',
      startsAt: 1_000,
      stateStartedAtMs: 1_000,
      stateDeadlineAtMs: receivedAtMs,
      players: [player('atomic-u1', 2)],
      rounds: [round(1), round(2)],
      version: 0,
      createdAtMs: 1,
    });
    await roomRef.collection('taskSecrets').doc('atomic-task-1').set({
      mode: 'choice',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'Choose yes',
        options: ['yes', 'no', 'later', 'maybe'],
        correctIndex: 0,
      },
      tags: [],
      verified: true,
    });

    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => receivedAtMs });
    await expect(runtime.tournamentSubmitTransaction(db, {
      stableUid: 'atomic-u1',
      roomId,
      roundNo: 1,
      rawAnswers: [{ taskId: 'atomic-task-1', answer: { selectedIndex: 0 } }],
      receivedAtMs,
    })).resolves.toMatchObject({ replay: false, correct: 1 });
    await expect(runtime.tournamentSubmitTransaction(db, {
      stableUid: 'atomic-u1',
      roomId,
      roundNo: 1,
      rawAnswers: [{ taskId: 'atomic-task-1', answer: { selectedIndex: 0 } }],
      receivedAtMs: receivedAtMs + 1,
    })).resolves.toMatchObject({ replay: true, correct: 1 });

    const raced = (await roomRef.get()).data()!;
    const result = raced.rounds[0].results['atomic-u1'];
    expect(result).toMatchObject({
      correct: 1,
      roundScore: 3,
      submissionStatus: 'submitted',
      submittedAtMs: receivedAtMs,
    });
    expect(raced.players[0]).toMatchObject({
      score: 3,
      streak: 3,
    });

    const closedRoomId = `atomic-timeout-closed-${process.pid}`;
    const closedRef = db.collection('tournamentRooms').doc(closedRoomId);
    await closedRef.set({
      slotId: 'daily_1200',
      seed: closedRoomId,
      state: 'round1',
      startsAt: 1_000,
      stateStartedAtMs: 1_000,
      stateDeadlineAtMs: receivedAtMs,
      players: [player('atomic-closed-u1')],
      rounds: [round(1), round(2)],
      version: 0,
      createdAtMs: 1,
    });
    await closedRef.collection('taskSecrets').doc('atomic-task-1').set({
      mode: 'choice',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'Choose yes',
        options: ['yes', 'no', 'later', 'maybe'],
        correctIndex: 0,
      },
      tags: [],
      verified: true,
    });
    await closedRef.collection('taskSecrets').doc('atomic-task-2').set({
      mode: 'choice',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'Choose yes again',
        options: ['yes', 'no', 'later', 'maybe'],
        correctIndex: 0,
      },
      tags: [],
      verified: true,
    });
    await closedRef.collection('taskSecrets').doc('__bot_simulation_v1').set({
      kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [],
    });
    await runtime.advanceRoomAtDeadline(db, closedRef, { nowMs: () => receivedAtMs });
    const tableDeadline = (await closedRef.get()).data()!.stateDeadlineAtMs as number;
    await runtime.advanceRoomAtDeadline(db, closedRef, { nowMs: () => tableDeadline });
    const beforeRejectedSubmit = (await closedRef.get()).data()!;

    await expect(runtime.tournamentSubmitTransaction(db, {
      stableUid: 'atomic-closed-u1',
      roomId: closedRoomId,
      roundNo: 1,
      rawAnswers: [{ taskId: 'atomic-task-1', answer: { selectedIndex: 0 } }],
      receivedAtMs,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'round_closed' });
    const afterRejectedSubmit = (await closedRef.get()).data()!;
    expect(afterRejectedSubmit.players).toEqual(beforeRejectedSubmit.players);
    expect(afterRejectedSubmit.rounds).toEqual(beforeRejectedSubmit.rounds);
  });

  test('review finding: cancellation rolls back bank total and contribution count exactly once', async () => {
    const roomId = `atomic-bank-cancel-${process.pid}`;
    const startsAt = 1_900_000_000_000;
    const weekId = require('./tournament_core').tournamentWeekId(startsAt) as string;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'daily_1200',
        seed: roomId,
        state: 'lobby',
        startsAt,
        ticketsRequired: 1,
        players: [{
          ...player('atomic-bank-u1'),
          entry: {
            kind: 'ticket',
            ticketsSpent: 1,
            bankContributionGems: 2,
            weekId,
          },
        }],
        rounds: [],
        version: 0,
        createdAtMs: startsAt - 1_000,
      }),
      db.collection('users').doc('atomic-bank-u1').set({ shards: 0 }),
      db.collection('users').doc('atomic-bank-u1').collection('inventory').doc('tickets').set({ count: 0 }),
      db.collection('tournamentBank').doc(weekId).set({ total: 2, contributions: 1 }),
    ]);

    await runtime.tournamentCancelTransaction(db, roomId, 'legacy_gameplay_unverifiable', startsAt - 500);
    await runtime.tournamentCancelTransaction(db, roomId, 'legacy_gameplay_unverifiable', startsAt - 499);
    expect((await db.collection('tournamentBank').doc(weekId).get()).data()).toMatchObject({
      total: 2,
      contributions: 1,
    });
    expect((await db.collection('users').doc('atomic-bank-u1').get()).data()?.shards).toBe(5);
    expect((await db.collection('users').doc('atomic-bank-u1').collection('inventory')
      .doc('tickets').get()).data()?.count).toBe(1);
    expect((await db.collection('users').doc('atomic-bank-u1').collection('tournament_receipts')
      .doc(`cancel_${roomId}`).get()).exists).toBe(true);
  });

  test('v4 finding 6: submit rejects delimiter-collision task array drift', async () => {
    const roomId = `v4-submit-delimiter-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const initialIds = ['atomic-a|b', 'atomic-c'];
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
      stateStartedAtMs: 1, stateDeadlineAtMs: 10_000, players: [player('v4-submit-u')],
      rounds: [{ roundNo: 1, mode: 'choice', taskIds: initialIds, results: {} }], version: 0, createdAtMs: 1 });
    await Promise.all(initialIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({
      mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: taskId, options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    })));
    const racingDb = {
      collection: (...args: Parameters<Firestore['collection']>) => db.collection(...args),
      runTransaction: async (handler: Parameters<Firestore['runTransaction']>[0]) => {
        await roomRef.update({ rounds: [{ roundNo: 1, mode: 'choice',
          taskIds: ['atomic-a', 'b|atomic-c'], results: {} }] });
        return db.runTransaction(handler);
      },
    };
    await expect(runtime.tournamentSubmitTransaction(racingDb, {
      stableUid: 'v4-submit-u', roomId, roundNo: 1,
      rawAnswers: initialIds.map((taskId) => ({ taskId, answer: { selectedIndex: 0 } })), receivedAtMs: 100,
    })).rejects.toMatchObject({ code: 'aborted', message: 'round_changed_retry' });
  });

  test('v4 finding 7: submit scores the answer key read inside its transaction', async () => {
    const roomId = `v4-submit-secret-race-${process.pid}`;
    const taskId = `v4-secret-task-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const secretRef = roomRef.collection('taskSecrets').doc(taskId);
    await Promise.all([
      roomRef.set({ slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: 10_000, players: [player('v4-secret-u')],
        rounds: [{ roundNo: 1, mode: 'choice', taskIds: [taskId], results: {} }], version: 0, createdAtMs: 1 }),
      secretRef.set({ mode: 'choice', isVoice: false, difficulty: 1,
        payload: { phrase: 'key', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true }),
    ]);
    const racingDb = {
      collection: (...args: Parameters<Firestore['collection']>) => db.collection(...args),
      runTransaction: async (handler: Parameters<Firestore['runTransaction']>[0]) => {
        await secretRef.update({ 'payload.correctIndex': 1 });
        return db.runTransaction(handler);
      },
    };
    const result = await runtime.tournamentSubmitTransaction(racingDb, {
      stableUid: 'v4-secret-u', roomId, roundNo: 1,
      rawAnswers: [{ taskId, answer: { selectedIndex: 0 } }], receivedAtMs: 100,
    });
    expect(result.correct).toBe(0);
    expect(result.roundScore).toBe(0);
  });

  test('v6 finding 1: cancellation cleans 32 task secrets plus reserved bot metadata and refunds once', async () => {
    const roomId = `v6-max-secrets-${process.pid}`;
    const stableUid = `v6-max-secrets-user-${process.pid}`;
    const startsAt = 1_900_000_000_000;
    const weekId = require('./tournament_core').tournamentWeekId(startsAt) as string;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'lobby', startsAt, ticketsRequired: 1, ready: true,
        players: [{ ...player(stableUid), entry: { kind: 'ticket', ticketsSpent: 1,
          bankContributionGems: 2, weekId } }], rounds: [], version: 1, createdAtMs: 1,
      }),
      ...Array.from({ length: 32 }, (_, index) => roomRef.collection('taskSecrets')
        .doc(`v6-max-task-${String(index).padStart(2, '0')}`).set({
          mode: 'choice', isVoice: false, difficulty: 1,
          payload: { phrase: `task ${index}`, options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
          tags: [], verified: true,
        })),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1').set({
        kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [],
      }),
      db.collection('users').doc(stableUid).set({ shards: 0 }),
      db.collection('users').doc(stableUid).collection('inventory').doc('tickets').set({ count: 0 }),
      db.collection('tournamentBank').doc(weekId).set({ total: 2, contributions: 1 }),
    ]);

    await expect(runtime.tournamentCancelTransaction(db, roomRef, 'resources_unavailable', startsAt - 1))
      .resolves.toBe(true);
    expect((await roomRef.get()).data()?.state).toBe('cancelled');
    expect((await roomRef.collection('taskSecrets').get()).size).toBe(0);
    expect((await db.collection('users').doc(stableUid).collection('inventory').doc('tickets').get()).data()?.count)
      .toBe(1);
    expect((await db.collection('users').doc(stableUid).get()).data()?.shards).toBe(5);
    expect((await db.collection('tournamentBank').doc(weekId).get()).data()).toMatchObject({
      total: 2, contributions: 1,
    });
  });

  test('v6 finding 2: replay rechecks identity and ban transactionally before returning prior score', async () => {
    const stableUid = `v6-replay-stable-${process.pid}`;
    const authUid = `v6-replay-auth-${process.pid}`;
    const roomId = `v6-replay-room-${process.pid}`;
    const taskId = `v6-replay-task-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const priorResult = { playerId: stableUid, correct: 1, total: 1, roundScore: 100,
      submittedAtMs: 100, submissionStatus: 'submitted' };
    await Promise.all([
      roomRef.set({ slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: 10_000, players: [player(stableUid)],
        rounds: [{ roundNo: 1, mode: 'choice', taskIds: [taskId], results: { [stableUid]: priorResult } }],
        version: 1, createdAtMs: 1 }),
      db.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
      db.collection('users').doc(stableUid).set({ shards: 0 }),
    ]);
    const input = { authUid, stableUid, roomId, roundNo: 1, rawAnswers: [], receivedAtMs: 200 };
    await expect(runtime.tournamentSubmitTransaction(db, input))
      .resolves.toMatchObject({ replay: true, correct: 1, roundScore: 100 });

    const racingDb = (beforeTransaction: () => Promise<void>) => ({
      collection: (...args: Parameters<Firestore['collection']>) => db.collection(...args),
      runTransaction: async (handler: Parameters<Firestore['runTransaction']>[0]) => {
        await beforeTransaction();
        return db.runTransaction(handler);
      },
    });
    await expect(runtime.tournamentSubmitTransaction(racingDb(async () => {
      await db.collection('auth_links').doc(authUid).set({ stable_id: 'v6-other-account' });
    }), input)).rejects.toMatchObject({ code: 'permission-denied', message: 'stable_identity_changed' });

    await db.collection('auth_links').doc(authUid).set({ stable_id: stableUid });
    await expect(runtime.tournamentSubmitTransaction(racingDb(async () => {
      await db.collection('banned_users').doc(stableUid).set({ reason: 'race' });
    }), input)).rejects.toMatchObject({ code: 'permission-denied', message: 'user_banned' });
    expect((await roomRef.get()).data()?.rounds[0].results[stableUid]).toEqual(priorResult);
  });
});
