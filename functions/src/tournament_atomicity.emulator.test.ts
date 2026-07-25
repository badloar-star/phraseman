import { readFileSync } from 'node:fs';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const runtime = require('./tournaments') as Record<string, (...args: any[]) => Promise<any>>;

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
    expect(applied.result.roundScore).toBe(150);
    expect(applied.room.players[0]).toMatchObject({ score: 150, streak: 3 });
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
      roundScore: 150,
      submissionStatus: 'submitted',
      submittedAtMs: receivedAtMs,
    });
    expect(raced.players[0]).toMatchObject({
      score: 150,
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
      total: 0,
      contributions: 0,
    });
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
    expect((await db.collection('users').doc(stableUid).get()).data()?.shards).toBe(3);
    expect((await db.collection('tournamentBank').doc(weekId).get()).data()).toMatchObject({
      total: 0, contributions: 0,
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
