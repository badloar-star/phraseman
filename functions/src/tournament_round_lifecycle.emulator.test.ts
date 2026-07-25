import { readFileSync } from 'node:fs';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const runtime = require('./tournaments') as Record<string, (...args: any[]) => Promise<any>>;
const core = require('./tournament_core') as Record<string, any>;

const PROJECT_ID = 'demo-phraseman-tournament-lifecycle';

jest.setTimeout(30_000);

describe('tournament lobby recovery pure timing', () => {
  test('uses the persisted lobby deadline for modern rooms and startsAt only for legacy rooms', () => {
    const startsAt = 1_900_000_000_000;
    const lobbyDeadlineAtMs = startsAt - core.TOURNAMENT_LOBBY_OPEN_MS;
    const baseRoom = {
      roomId: 'pure-lobby', slotId: 'daily', seed: 'pure-lobby', state: 'scheduled', startsAt,
      players: [], rounds: [], version: 0, createdAtMs: lobbyDeadlineAtMs - 1_000,
    };
    expect(core.legacyTournamentRecoveryAction(
      { ...baseRoom, stateDeadlineAtMs: lobbyDeadlineAtMs }, lobbyDeadlineAtMs - 1, true,
    )).toBe('wait');
    expect(core.legacyTournamentRecoveryAction(
      { ...baseRoom, stateDeadlineAtMs: lobbyDeadlineAtMs }, lobbyDeadlineAtMs, true,
    )).toBe('advance');
    expect(core.legacyTournamentRecoveryAction(baseRoom, startsAt - 1, true)).toBe('wait');
    expect(core.legacyTournamentRecoveryAction(baseRoom, startsAt, true)).toBe('cancel');
  });

  test('final reviewer B: fill lookahead covers two one-minute scheduler intervals', () => {
    expect(core.TOURNAMENT_FILL_BOTS_AHEAD_MS).toBeGreaterThanOrEqual(2 * 60 * 1000);
  });

  test('final reviewer E: finalization requires a positive elapsed results deadline', () => {
    const baseRoom = {
      roomId: 'pure-results-deadline', slotId: 'daily', seed: 'pure-results-deadline', state: 'results',
      startsAt: 1, stateStartedAtMs: 100, players: [], rounds: [], version: 0, createdAtMs: 1,
    };
    expect(() => core.planTournamentFinalization(baseRoom, 1_000)).toThrow('results_deadline_missing');
    expect(() => core.planTournamentFinalization({ ...baseRoom, stateDeadlineAtMs: 0 }, 1_000))
      .toThrow('results_deadline_missing');
    expect(() => core.planTournamentFinalization({ ...baseRoom, stateDeadlineAtMs: 1_001 }, 1_000))
      .toThrow('results_visibility_pending');
    expect(core.planTournamentFinalization({ ...baseRoom, stateDeadlineAtMs: 1_000 }, 1_000).room.state)
      .toBe('rewards');
  });
});

function player(id: string): Record<string, unknown> {
  return {
    id,
    isBot: false,
    name: id,
    avatar: '🙂',
    color: '#47C870',
    score: 0,
    streak: 0,
  };
}

function round(roundNo: number): Record<string, unknown> {
  return {
    roundNo,
    mode: 'choice',
    taskIds: [`lifecycle-task-${roundNo}`],
    results: {},
  };
}

function fillResources(prefix: string): Record<string, unknown> {
  return {
    tasks: Array.from({ length: 24 }, (_, index) => ({
      taskId: `${prefix}-task-${index}`,
      mode: 'choice',
      isVoice: false,
      difficulty: 1 + Math.floor(index / 8),
      payload: { phrase: `phrase ${index}`, options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      tags: [],
      verified: true,
    })),
    bots: Array.from({ length: 8 }, (_, index) => ({
      botId: `${prefix}-bot-${index}`,
      name: `Bot ${index}`,
      avatarEmoji: '🤖',
      color: '#123456',
      winRate: 0.5,
      rank: 'silver',
      titles: [],
    })),
  };
}

describe('tournament round lifecycle recovery', () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    app = initializeApp({ projectId: PROJECT_ID }, `tournament-lifecycle-${process.pid}`);
    db = getFirestore(app);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  test('opens a modern scheduled room at its lobby deadline and uses startsAt only for legacy rooms', async () => {
    const startsAt = 1_900_000_000_000;
    const lobbyDeadlineAtMs = startsAt - core.TOURNAMENT_LOBBY_OPEN_MS;
    const roomId = `lifecycle-modern-lobby-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      slotId: 'lifecycle-slot',
      seed: roomId,
      state: 'scheduled',
      startsAt,
      ticketsRequired: 1,
      stateStartedAtMs: lobbyDeadlineAtMs - 1_000,
      stateDeadlineAtMs: lobbyDeadlineAtMs,
      players: [],
      participantAuthUids: [],
      participantAuthUidsComplete: true,
      rounds: [],
      version: 0,
      createdAtMs: lobbyDeadlineAtMs - 1_000,
    });
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => lobbyDeadlineAtMs - 1 }))
      .resolves.toBe('waiting');
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => lobbyDeadlineAtMs }))
      .resolves.toBe('advanced');
    expect((await roomRef.get()).data()).toMatchObject({ state: 'lobby', stateDeadlineAtMs: startsAt });

    await Promise.all([
      db.collection('tournamentSchedule').doc('config').set({
        slots: [{
          slotId: 'lifecycle-slot', localTime: '12:00', timezone: 'UTC', ticketsRequired: 1, enabled: true,
        }],
        freeWeeklyEntry: false,
        ticketGemValue: 10,
      }),
      db.collection('users').doc('lifecycle-join-u1').set({ name: 'Lobby Player', shards: 0 }),
      db.collection('users').doc('lifecycle-join-u1').collection('inventory').doc('tickets').set({ count: 1 }),
      db.collection('auth_links').doc('lifecycle-auth-u1').set({ stable_id: 'lifecycle-join-u1' }),
    ]);
    await expect(runtime.tournamentJoinTransaction(db, {
      authUid: 'lifecycle-auth-u1',
      stableUid: 'lifecycle-join-u1',
      roomId,
      nowMs: lobbyDeadlineAtMs + 1,
    })).resolves.toMatchObject({ joined: true });
    expect((await roomRef.get()).data()?.players).toHaveLength(1);

    const legacyId = `lifecycle-legacy-lobby-${process.pid}`;
    const legacyRef = db.collection('tournamentRooms').doc(legacyId);
    await legacyRef.set({
      slotId: 'lifecycle-slot', seed: legacyId, state: 'scheduled', startsAt,
      players: [], rounds: [], version: 0, createdAtMs: lobbyDeadlineAtMs - 1_000,
    });
    await expect(runtime.advanceRoomAtDeadline(db, legacyRef, { nowMs: () => startsAt - 1 }))
      .resolves.toBe('waiting');
    await expect(runtime.advanceRoomAtDeadline(db, legacyRef, { nowMs: () => startsAt }))
      .resolves.toBe('cancel_legacy');
    expect((await legacyRef.get()).data()?.state).toBe('scheduled');
  });

  test('final spec finding: fill preserves a modern lobby deadline and skips legacy scheduled rooms without one', async () => {
    const startsAt = 1_900_100_000_000;
    const lobbyDeadlineAtMs = startsAt - core.TOURNAMENT_LOBBY_OPEN_MS;
    const entrants = Array.from({ length: 8 }, (_, index) => player(`fill-real-${index}`));
    const resources = fillResources(`fill-lifecycle-${process.pid}`);
    const modernId = `fill-modern-scheduled-${process.pid}`;
    const modernRef = db.collection('tournamentRooms').doc(modernId);
    await modernRef.set({
      slotId: 'daily', seed: modernId, state: 'scheduled', startsAt,
      stateStartedAtMs: lobbyDeadlineAtMs - 1_000, stateDeadlineAtMs: lobbyDeadlineAtMs,
      players: entrants, participantAuthUids: [], participantAuthUidsComplete: true,
      rounds: [], version: 0, createdAtMs: lobbyDeadlineAtMs - 1_000,
    });
    await expect(runtime.tournamentFillRoomTransaction(db, modernRef, resources, {
      nowMs: () => lobbyDeadlineAtMs - 500,
    })).resolves.toBe('filled');
    expect((await modernRef.get()).data()?.stateDeadlineAtMs).toBe(lobbyDeadlineAtMs);
    await expect(runtime.advanceRoomAtDeadline(db, modernRef, { nowMs: () => lobbyDeadlineAtMs }))
      .resolves.toBe('advanced');
    expect((await modernRef.get()).data()?.state).toBe('lobby');

    const legacyId = `fill-legacy-scheduled-${process.pid}`;
    const legacyRef = db.collection('tournamentRooms').doc(legacyId);
    await legacyRef.set({
      slotId: 'daily', seed: legacyId, state: 'scheduled', startsAt,
      players: entrants, participantAuthUids: [], rounds: [], version: 0,
      createdAtMs: lobbyDeadlineAtMs - 1_000,
    });
    await expect(runtime.tournamentFillRoomTransaction(db, legacyRef, resources, {
      nowMs: () => lobbyDeadlineAtMs - 500,
    })).resolves.toBe('skip');
    const legacyAfterFill = (await legacyRef.get()).data()!;
    expect(legacyAfterFill.ready).not.toBe(true);
    expect(legacyAfterFill.stateDeadlineAtMs).toBeUndefined();
    expect((await legacyRef.collection('taskSecrets').get()).empty).toBe(true);
    await expect(runtime.advanceRoomAtDeadline(db, legacyRef, { nowMs: () => startsAt }))
      .resolves.toBe('cancel_legacy');
  });

  test('red-team finding: scheduler rejects stale round tasks loaded before its transaction', async () => {
    const roomId = `lifecycle-stale-task-race-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const task1 = {
      taskId: 'race-task-1', mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'one', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    };
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
      stateStartedAtMs: 1_000, stateDeadlineAtMs: 11_000,
      players: [player('race-task-u1')],
      rounds: [
        { roundNo: 1, mode: 'choice', taskIds: ['race-task-1'], results: {} },
        { roundNo: 2, mode: 'choice', taskIds: ['race-task-2'], results: {} },
      ],
      version: 0, createdAtMs: 1,
    });
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => 12_000,
      loadTasksByIds: async () => {
        await roomRef.update({
          state: 'round2', stateStartedAtMs: 2_000, stateDeadlineAtMs: 12_000, version: 2,
        });
        return [task1];
      },
    })).resolves.toBe('stale');
    expect((await roomRef.get()).data()).toMatchObject({ state: 'round2', version: 2 });
  });

  test('red-team finding: results-to-rewards race cannot close before current task secrets are collected', async () => {
    const roomId = `lifecycle-secret-cleanup-race-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const secretRef = roomRef.collection('taskSecrets').doc('cleanup-secret');
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'results', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: 100,
        players: [], rounds: [], version: 1, createdAtMs: 1,
      }),
      secretRef.set({ marker: 'private' }),
    ]);
    const racingDb = {
      collection: (...args: Parameters<Firestore['collection']>) => db.collection(...args),
      runTransaction: async (handler: Parameters<Firestore['runTransaction']>[0]) => {
        await roomRef.update({ state: 'rewards', stateStartedAtMs: 100, stateDeadlineAtMs: 20_000, version: 2 });
        return db.runTransaction(handler);
      },
    };
    await expect(runtime.advanceRoomAtDeadline(racingDb, roomRef, { nowMs: () => 200 }))
      .resolves.toBe('stale');
    expect((await roomRef.get()).data()?.state).toBe('rewards');
    expect((await secretRef.get()).exists).toBe(true);
  });

  test('isolates poisoned rooms, backs them off, and drains a healthy room beyond fifty due entries', async () => {
    expect(typeof runtime.processDueTournamentRooms).toBe('function');
    const batch = db.batch();
    for (let index = 0; index < 49; index += 1) {
      const roomId = `lifecycle-poison-${String(index).padStart(2, '0')}-${process.pid}`;
      batch.set(db.collection('tournamentRooms').doc(roomId), {
        slotId: 'daily_1200',
        seed: roomId,
        state: 'results',
        startsAt: 1,
        stateStartedAtMs: 1,
        stateDeadlineAtMs: 100 + index,
        players: [null],
        rounds: [],
        version: 0,
        createdAtMs: 1,
      });
    }
    const healthyId = `lifecycle-healthy-${process.pid}`;
    batch.set(db.collection('tournamentRooms').doc(healthyId), {
      slotId: 'daily_1200',
      seed: healthyId,
      state: 'table1',
      startsAt: 1,
      stateStartedAtMs: 1,
      stateDeadlineAtMs: 149,
      players: [player('lifecycle-healthy-u1')],
      rounds: [round(1), round(2)],
      version: 0,
      createdAtMs: 1,
    });
    batch.set(db.collection('tournamentRooms').doc(healthyId).collection('taskSecrets').doc('lifecycle-task-2'), {
      mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'healthy', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    });
    const tailId = `lifecycle-tail-${process.pid}`;
    batch.set(db.collection('tournamentRooms').doc(tailId), {
      slotId: 'daily_1200',
      seed: tailId,
      state: 'table1',
      startsAt: 1,
      stateStartedAtMs: 1,
      stateDeadlineAtMs: 150,
      players: [player('lifecycle-tail-u1')],
      rounds: [round(1), round(2)],
      version: 0,
      createdAtMs: 1,
    });
    batch.set(db.collection('tournamentRooms').doc(tailId).collection('taskSecrets').doc('lifecycle-task-2'), {
      mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'tail', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    });
    await batch.commit();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(runtime.processDueTournamentRooms({ db, nowMs: 1_000 }))
        .resolves.toEqual({ scanned: 51, advanced: 2, failed: 49 });
      await expect(runtime.processDueTournamentRooms({ db, nowMs: 1_000 }))
        .resolves.toEqual({ scanned: 49, advanced: 0, failed: 0 });
    } finally {
      errorSpy.mockRestore();
    }

    expect((await db.collection('tournamentRooms').doc(healthyId).get()).data()?.state).toBe('round2');
    expect((await db.collection('tournamentRooms').doc(tailId).get()).data()?.state).toBe('round2');
    expect((await db.collection('tournamentRooms').doc(`lifecycle-poison-00-${process.pid}`).get()).data())
      .toMatchObject({ stateDeadlineAtMs: 100, lifecycleRetryAtMs: 61_000 });
  });

  test('review finding: tournamentAdvanceRound rejects before private reads and rechecks transactionally', async () => {
    const tournamentsSource = readFileSync(`${__dirname}/tournaments.ts`, 'utf8');
    const indexSource = readFileSync(`${__dirname}/index.ts`, 'utf8');
    const callableStart = tournamentsSource.indexOf('export const tournamentAdvanceRound');
    const callableEnd = tournamentsSource.indexOf('// â”€â”€ Claim', callableStart);
    const callableSource = tournamentsSource.slice(callableStart, callableEnd);

    expect(callableSource).toMatch(/export const tournamentAdvanceRound = onCall\(\s*\{\s*\.\.\.HOT_CALLABLE_OPTIONS,\s*enforceAppCheck: true/);
    expect(callableSource).toContain('expectedState');
    expect(callableSource).toContain('expectedDeadlineAtMs');
    expect(callableSource).toContain('requesterStableUid');
    expect(callableSource).not.toMatch(/request\.data\?\.(nowMs|requesterStableUid)/);
    expect(indexSource).toMatch(/tournamentAdvanceRooms,\s*tournamentAdvanceRound,/);

    const roomId = `lifecycle-stale-token-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      slotId: 'daily_1200',
      seed: roomId,
      state: 'table1',
      startsAt: 1,
      stateStartedAtMs: 1,
      stateDeadlineAtMs: 2_000,
      players: [player('lifecycle-member')],
      rounds: [round(1), round(2)],
      version: 0,
      createdAtMs: 1,
    });
    await roomRef.collection('taskSecrets').doc('lifecycle-task-2').set({
      mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'advance', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    });

    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => 2_000,
      requesterStableUid: 'lifecycle-outsider',
      expectedState: 'table1',
      expectedDeadlineAtMs: 2_000,
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'not_in_room' });

    const missingSecretsId = `lifecycle-missing-secrets-${process.pid}`;
    const missingSecretsRef = db.collection('tournamentRooms').doc(missingSecretsId);
    await missingSecretsRef.set({
      slotId: 'daily_1200',
      seed: missingSecretsId,
      state: 'round1',
      startsAt: 1,
      stateStartedAtMs: 1,
      stateDeadlineAtMs: 2_000,
      players: [player('lifecycle-secret-member')],
      rounds: [round(1)],
      version: 0,
      createdAtMs: 1,
    });
    let privateSecretReads = 0;
    const countPrivateSecretRead = async () => {
      privateSecretReads += 1;
      return [];
    };
    await expect(runtime.advanceRoomAtDeadline(db, missingSecretsRef, {
      nowMs: () => 2_000,
      requesterStableUid: 'lifecycle-secret-outsider',
      expectedState: 'round1',
      expectedDeadlineAtMs: 2_000,
      loadTasksByIds: countPrivateSecretRead,
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'not_in_room' });
    await expect(runtime.advanceRoomAtDeadline(db, missingSecretsRef, {
      nowMs: () => 2_000,
      requesterStableUid: 'lifecycle-secret-member',
      expectedState: 'round2',
      expectedDeadlineAtMs: 2_000,
      loadTasksByIds: countPrivateSecretRead,
    })).resolves.toBe('stale');
    expect(privateSecretReads).toBe(0);

    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => 2_000,
      requesterStableUid: 'lifecycle-member',
      expectedState: 'table2',
      expectedDeadlineAtMs: 2_000,
    })).resolves.toBe('stale');
    expect((await roomRef.get()).data()?.state).toBe('table1');
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => 2_000,
      requesterStableUid: 'lifecycle-member',
      expectedState: 'table1',
      expectedDeadlineAtMs: 2_000,
    })).resolves.toBe('advanced');
    expect((await roomRef.get()).data()?.state).toBe('round2');
  });

  test('forbids finalization before the results visibility deadline', async () => {
    const roomId = `lifecycle-early-finalize-${process.pid}`;
    await db.collection('tournamentRooms').doc(roomId).set({
      slotId: 'daily_1200',
      seed: roomId,
      state: 'results',
      startsAt: 1,
      stateStartedAtMs: 1_000,
      stateDeadlineAtMs: 5_000,
      players: [player('lifecycle-final-u1')],
      rounds: [],
      version: 0,
      createdAtMs: 1,
    });

    await expect(runtime.tournamentFinalizeTransaction(db, roomId, 4_999)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'results_visibility_pending',
    });
    expect((await db.collection('tournamentRooms').doc(roomId).get()).data()?.state).toBe('results');
  });

  test('final reviewer A: lifecycle backoff preserves the authoritative deadline and blocks late submit', async () => {
    const existingRooms = await db.collection('tournamentRooms').get();
    if (!existingRooms.empty) {
      const cleanup = db.batch();
      for (const doc of existingRooms.docs) cleanup.delete(doc.ref);
      await cleanup.commit();
    }
    const nowMs = 8_000_000_000_000;
    const originalDeadlineAtMs = nowMs - 100_000;
    const retryAtMs = nowMs + 60_000;
    const poisonId = `final-a-poison-${process.pid}`;
    const poisonRef = db.collection('tournamentRooms').doc(poisonId);
    await poisonRef.set({
      slotId: 'daily', seed: poisonId, state: 'results', startsAt: nowMs - 200_000,
      stateStartedAtMs: originalDeadlineAtMs - 50_000, stateDeadlineAtMs: originalDeadlineAtMs,
      players: [null], rounds: [], version: 0, createdAtMs: nowMs - 200_000,
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(runtime.processDueTournamentRooms({ db, nowMs }))
        .resolves.toEqual({ scanned: 1, advanced: 0, failed: 1 });
    } finally {
      errorSpy.mockRestore();
    }
    expect((await poisonRef.get()).data()).toMatchObject({
      stateDeadlineAtMs: originalDeadlineAtMs,
      lifecycleRetryAtMs: retryAtMs,
    });

    const taskId = `final-a-task-${process.pid}`;
    const roomId = `final-a-late-submit-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: nowMs - 200_000,
        stateStartedAtMs: originalDeadlineAtMs - 10_000, stateDeadlineAtMs: originalDeadlineAtMs,
        lifecycleRetryAtMs: retryAtMs,
        players: [player('final-a-user')],
        rounds: [{ roundNo: 1, mode: 'choice', taskIds: [taskId], results: {} }],
        version: 0, createdAtMs: nowMs - 200_000,
      }),
      roomRef.collection('taskSecrets').doc(taskId).set({
        mode: 'choice', isVoice: false, difficulty: 1,
        payload: { phrase: 'A', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
        tags: [], verified: true,
      }),
    ]);
    await expect(runtime.tournamentSubmitTransaction(db, {
      stableUid: 'final-a-user', roomId, roundNo: 1,
      rawAnswers: [{ taskId, answer: { selectedIndex: 0 } }], receivedAtMs: originalDeadlineAtMs + 1,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'round_deadline_elapsed' });
    await expect(runtime.processDueTournamentRooms({ db, nowMs }))
      .resolves.toEqual({ scanned: 2, advanced: 0, failed: 0 });
    const secondErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(runtime.processDueTournamentRooms({ db, nowMs: retryAtMs + 1 }))
        .resolves.toEqual({ scanned: 2, advanced: 1, failed: 1 });
    } finally {
      secondErrorSpy.mockRestore();
    }
    const progressed = (await roomRef.get()).data()!;
    expect(progressed.state).toBe('table1');
    expect(progressed.lifecycleRetryAtMs).toBeUndefined();
  });

  test('final reviewer B: fill processor isolates one room failure and fills another within lookahead', async () => {
    expect(typeof runtime.processTournamentFillRooms).toBe('function');
    const nowMs = -1_000_000;
    const startsAt = nowMs + 90_000;
    const resources = fillResources(`final-b-fill-${process.pid}`);
    const entrants = Array.from({ length: 8 }, (_, index) => player(`final-b-user-${index}`));
    const poisonId = `final-b-00-poison-${process.pid}`;
    const healthyId = `final-b-01-healthy-${process.pid}`;
    await Promise.all([poisonId, healthyId].map((roomId) => db.collection('tournamentRooms').doc(roomId).set({
      slotId: 'daily', seed: roomId, state: 'scheduled', startsAt,
      stateStartedAtMs: nowMs - 1, stateDeadlineAtMs: startsAt - core.TOURNAMENT_LOBBY_OPEN_MS,
      players: entrants, participantAuthUids: [], participantAuthUidsComplete: true,
      rounds: [], version: 0, createdAtMs: nowMs - 1,
    })));
    const fillRoom = async (
      targetDb: Firestore,
      roomRef: FirebaseFirestore.DocumentReference,
      pool: Record<string, unknown>,
    ) => {
      if (roomRef.id === poisonId) throw new Error('injected_fill_failure');
      return runtime.tournamentFillRoomTransaction(targetDb, roomRef, pool, { nowMs: () => nowMs });
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(runtime.processTournamentFillRooms({ db, nowMs, resources, fillRoom }))
        .resolves.toEqual({ scanned: 2, filled: 1, failed: 1 });
    } finally {
      errorSpy.mockRestore();
    }
    expect((await db.collection('tournamentRooms').doc(poisonId).get()).data()?.ready).not.toBe(true);
    expect((await db.collection('tournamentRooms').doc(healthyId).get()).data()?.ready).toBe(true);
  });

  test('final reviewer B: a concurrent successful fill wins over a stale cancel_resources outcome', async () => {
    expect(typeof runtime.settleAdvanceOutcome).toBe('function');
    const startsAt = 50_000;
    const roomId = `final-b-fill-race-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const entrants = Array.from({ length: 8 }, (_, index) => player(`final-b-race-user-${index}`));
    const resources = fillResources(`final-b-race-${process.pid}`);
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'lobby', startsAt,
      stateStartedAtMs: startsAt - 1_000, stateDeadlineAtMs: startsAt,
      players: entrants, participantAuthUids: [], participantAuthUidsComplete: true,
      rounds: [], ready: false, version: 0, createdAtMs: 1,
    });
    const staleOutcome = await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => startsAt });
    expect(staleOutcome).toBe('cancel_resources');
    await expect(runtime.tournamentFillRoomTransaction(db, roomRef, resources, { nowMs: () => startsAt }))
      .resolves.toBe('filled');
    await expect(runtime.settleAdvanceOutcome(db, roomRef, staleOutcome, { nowMs: () => startsAt }))
      .resolves.toBe('advanced');
    expect((await roomRef.get()).data()?.state).toBe('round1');
  });

  test('final reviewer C: authoritative identity and ban read errors propagate while missing docs remain allowed', async () => {
    expect(typeof runtime.resolveStableUid).toBe('function');
    expect(typeof runtime.assertNotBanned).toBe('function');
    const missingSnap = { exists: false, data: () => undefined };
    const failingDb = (failedCollection: string) => ({
      collection: (name: string) => ({
        doc: () => ({
          get: async () => {
            if (name === failedCollection) throw new Error(`${name}_read_failed`);
            return missingSnap;
          },
        }),
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      }),
    });
    await expect(runtime.resolveStableUid(failingDb('users'), 'auth-c'))
      .rejects.toThrow('identity_check_unavailable');
    await expect(runtime.assertNotBanned(failingDb('banned_users'), 'stable-c'))
      .rejects.toThrow('banned_users_read_failed');
    await expect(runtime.assertNotBanned(failingDb('none'), 'stable-c')).resolves.toBeUndefined();
  });

  test('final reviewer D: every cancellation path deletes task secrets idempotently', async () => {
    const cases = [
      { suffix: 'active-resource', state: 'round1', reason: 'resources_unavailable' },
      { suffix: 'active-legacy', state: 'round1', reason: 'legacy_gameplay_unverifiable' },
      { suffix: 'lobby-resource', state: 'lobby', reason: 'resources_unavailable' },
    ];
    for (const entry of cases) {
      const roomId = `final-d-${entry.suffix}-${process.pid}`;
      const roomRef = db.collection('tournamentRooms').doc(roomId);
      const taskIds = [`${roomId}-task-1`, `${roomId}-task-2`];
      await roomRef.set({
        slotId: 'daily', seed: roomId, state: entry.state, startsAt: 10,
        stateStartedAtMs: 10, stateDeadlineAtMs: 20, players: [],
        rounds: [{ roundNo: 1, mode: 'choice', taskIds, results: {} }],
        ready: entry.state !== 'lobby', version: 0, createdAtMs: 1,
      });
      await Promise.all(taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId).set({ marker: true })));
      await expect(runtime.tournamentCancelTransaction(db, roomRef, entry.reason, 30)).resolves.toBe(true);
      await expect(runtime.tournamentCancelTransaction(db, roomRef, entry.reason, 31)).resolves.toBe(true);
      expect((await roomRef.collection('taskSecrets').get()).size).toBe(0);
    }
  });

  test('final reviewer F: delimiter-containing task ids cannot hide task snapshot drift', async () => {
    const roomId = `final-f-delimiter-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const initialIds = ['final-f-a|b', 'final-f-c'];
    await roomRef.set({
      slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
      stateStartedAtMs: 1, stateDeadlineAtMs: 100, players: [player('final-f-user')],
      rounds: [{ roundNo: 1, mode: 'choice', taskIds: initialIds, results: {} }],
      version: 0, createdAtMs: 1,
    });
    const tasks = initialIds.map((taskId) => ({
      taskId, mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: taskId, options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      tags: [], verified: true,
    }));
    await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => 100,
      loadTasksByIds: async () => {
        await roomRef.update({
          rounds: [{ roundNo: 1, mode: 'choice', taskIds: ['final-f-a', 'b|final-f-c'], results: {} }],
        });
        return tasks;
      },
    })).resolves.toBe('stale');
  });

  test('final reviewer F: state, deadline, and active-round drift are each rejected independently', async () => {
    const cases = [
      { suffix: 'state', patch: { state: 'round2' } },
      { suffix: 'deadline', patch: { stateDeadlineAtMs: 101 } },
      {
        suffix: 'round',
        patch: { rounds: [{ roundNo: 2, mode: 'choice', taskIds: ['final-f-round-task'], results: {} }] },
      },
    ];
    for (const entry of cases) {
      const roomId = `final-f-${entry.suffix}-${process.pid}`;
      const roomRef = db.collection('tournamentRooms').doc(roomId);
      const taskId = entry.suffix === 'round' ? 'final-f-round-task' : `final-f-${entry.suffix}-task`;
      await roomRef.set({
        slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: 100, players: [player(`final-f-${entry.suffix}-user`)],
        rounds: [
          { roundNo: 1, mode: 'choice', taskIds: [taskId], results: {} },
          { roundNo: 2, mode: 'choice', taskIds: [`${taskId}-round2`], results: {} },
        ],
        version: 0, createdAtMs: 1,
      });
      await expect(runtime.advanceRoomAtDeadline(db, roomRef, {
        nowMs: () => 100,
        loadTasksByIds: async () => {
          await roomRef.update(entry.patch);
          return [{
            taskId, mode: 'choice', isVoice: false, difficulty: 1,
            payload: { phrase: taskId, options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
            tags: [], verified: true,
          }];
        },
      })).resolves.toBe('stale');
    }
  });

  test('v4 finding 1: stale resource cancellation cannot cancel a room already advanced after fill', async () => {
    const startsAt = 100_000;
    const roomId = `v4-live-round-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const entrants = Array.from({ length: 8 }, (_, index) => player(`v4-live-u${index}`));
    const resources = fillResources(`v4-live-${process.pid}`);
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'lobby', startsAt,
      stateStartedAtMs: 1, stateDeadlineAtMs: startsAt, players: entrants, rounds: [], ready: false,
      version: 0, createdAtMs: 1 });
    const stale = await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => startsAt });
    expect(stale).toBe('cancel_resources');
    await runtime.tournamentFillRoomTransaction(db, roomRef, resources, { nowMs: () => startsAt });
    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => startsAt });
    await runtime.settleAdvanceOutcome(db, roomRef, stale, { nowMs: () => startsAt });
    expect((await roomRef.get()).data()?.state).toBe('round1');
  });

  test('v4 finding 2: lookahead does not cancel under-quorum lobby before the T-30 cutoff', async () => {
    const startsAt = 500_000;
    const roomId = `v4-cutoff-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const seven = Array.from({ length: 7 }, (_, index) => player(`v4-cutoff-u${index}`));
    const resources = fillResources(`v4-cutoff-${process.pid}`);
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'lobby', startsAt,
      stateStartedAtMs: 1, stateDeadlineAtMs: startsAt, players: seven, rounds: [], ready: false,
      version: 0, createdAtMs: 1 });
    await expect(runtime.tournamentFillRoomTransaction(db, roomRef, resources, { nowMs: () => startsAt - 120_000 }))
      .resolves.toBe('skip');
    expect((await roomRef.get()).data()?.state).toBe('lobby');
    await roomRef.update({ players: [...seven, player('v4-cutoff-u7')], version: 1 });
    await expect(runtime.tournamentFillRoomTransaction(db, roomRef, resources, { nowMs: () => startsAt - 90_000 }))
      .resolves.toBe('filled');
  });

  test('v4 finding 3: lifecycle drains room 51 past fifty backed-off rows without moving deadlines', async () => {
    const prior = await db.collection('tournamentRooms').get();
    const cleanup = db.batch(); prior.docs.forEach((doc) => cleanup.delete(doc.ref)); await cleanup.commit();
    const nowMs = 9_000_000_000_000;
    const batch = db.batch();
    for (let index = 0; index < 50; index += 1) {
      const id = `v4-life-${String(index).padStart(2, '0')}`;
      batch.set(db.collection('tournamentRooms').doc(id), { slotId: 'daily', seed: id, state: 'table1',
        startsAt: 1, stateStartedAtMs: 1, stateDeadlineAtMs: nowMs - 1, lifecycleRetryAtMs: nowMs + 60_000,
        players: [], rounds: [round(1), round(2)], version: 0, createdAtMs: 1 });
    }
    const tail = db.collection('tournamentRooms').doc('v4-life-zz-tail');
    batch.set(tail, { slotId: 'daily', seed: tail.id, state: 'table1', startsAt: 1,
      stateStartedAtMs: 1, stateDeadlineAtMs: nowMs - 1, players: [], rounds: [round(1), round(2)],
      version: 0, createdAtMs: 1 });
    batch.set(tail.collection('taskSecrets').doc('lifecycle-task-2'), {
      mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'tail', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    });
    await batch.commit();
    await runtime.processDueTournamentRooms({ db, nowMs });
    expect((await tail.get()).data()?.state).toBe('round2');
    expect((await db.collection('tournamentRooms').doc('v4-life-00').get()).data()?.stateDeadlineAtMs)
      .toBe(nowMs - 1);
  });

  test('v4 finding 3: fill drains a due room beyond fifty already-ready rows', async () => {
    const prior = await db.collection('tournamentRooms').get();
    const cleanup = db.batch(); prior.docs.forEach((doc) => cleanup.delete(doc.ref)); await cleanup.commit();
    const nowMs = 2_000_000;
    const resources = fillResources(`v4-fill-page-${process.pid}`);
    const entrants = Array.from({ length: 8 }, (_, index) => player(`v4-fill-page-u${index}`));
    const batch = db.batch();
    for (let index = 0; index < 50; index += 1) {
      const id = `v4-fill-${String(index).padStart(2, '0')}`;
      batch.set(db.collection('tournamentRooms').doc(id), { slotId: 'daily', seed: id, state: 'lobby',
        startsAt: nowMs, stateDeadlineAtMs: nowMs, players: entrants, rounds: [round(1), round(2), round(3), round(4)],
        ready: true, version: 1, createdAtMs: 1 });
    }
    const tail = db.collection('tournamentRooms').doc('v4-fill-zz-tail');
    batch.set(tail, { slotId: 'daily', seed: tail.id, state: 'lobby', startsAt: nowMs + 1,
      stateDeadlineAtMs: nowMs + 1, players: entrants, rounds: [], ready: false, version: 0, createdAtMs: 1 });
    await batch.commit();
    await runtime.processTournamentFillRooms({ db, nowMs, resources });
    expect((await tail.get()).data()?.ready).toBe(true);
  });

  test('v4 finding 4: auth_links anchor wins and transaction rejects a mismatched stable identity', async () => {
    const authUid = `v4-provider-${process.pid}`;
    const stableUid = `v4-stable-${process.pid}`;
    await Promise.all([
      db.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
      db.collection('users').doc(stableUid).set({ name: 'Stable', shards: 0 }),
    ]);
    await expect(runtime.resolveStableUid(db, authUid)).resolves.toBe(stableUid);
    const roomId = `v4-anchor-room-${process.pid}`;
    await db.collection('tournamentRooms').doc(roomId).set({ slotId: 'daily', seed: roomId, state: 'lobby',
      startsAt: Date.now() + 60_000, players: [], rounds: [], version: 0, createdAtMs: 1 });
    await expect(runtime.tournamentJoinTransaction(db, {
      authUid, stableUid: authUid, roomId, nowMs: Date.now(),
    })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('v4 finding 5: cancellation deletes orphan taskSecrets not present in rounds', async () => {
    const roomId = `v4-orphan-secret-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
      stateDeadlineAtMs: 2, players: [], rounds: [round(1)], version: 0, createdAtMs: 1 });
    await Promise.all([
      roomRef.collection('taskSecrets').doc('lifecycle-task-1').set({ marker: true }),
      roomRef.collection('taskSecrets').doc('orphan-not-in-rounds').set({ marker: true }),
    ]);
    await runtime.tournamentCancelTransaction(db, roomRef, 'legacy_gameplay_unverifiable', 3);
    expect((await roomRef.collection('taskSecrets').get()).size).toBe(0);
  });

  test('v5 finding 1: lobby hides every task payload and only the active round is hydrated', async () => {
    const startsAt = 3_000_000;
    const roomId = `v5-private-rounds-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const entrants = Array.from({ length: 8 }, (_, index) => player(`v5-private-u${index}`));
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'lobby', startsAt,
      stateStartedAtMs: 1, stateDeadlineAtMs: startsAt, players: entrants, rounds: [], ready: false,
      version: 0, createdAtMs: 1 });
    await runtime.tournamentFillRoomTransaction(db, roomRef, fillResources(`v5-private-${process.pid}`), {
      nowMs: () => startsAt - 90_000,
    });
    const lobby = (await roomRef.get()).data()!;
    expect(lobby.rounds.every((entry: Record<string, unknown>) => entry.tasks === undefined)).toBe(true);
    expect(JSON.stringify(lobby.rounds)).not.toMatch(/phrase|prompt|options|wordBank/);

    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => startsAt });
    const round1 = (await roomRef.get()).data()!;
    expect(round1.state).toBe('round1');
    expect(round1.rounds[0].tasks).toHaveLength(round1.rounds[0].taskIds.length);
    expect(round1.rounds.slice(1).every((entry: Record<string, unknown>) => entry.tasks === undefined)).toBe(true);
    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => round1.stateDeadlineAtMs });
    const table1 = (await roomRef.get()).data()!;
    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => table1.stateDeadlineAtMs });
    const round2 = (await roomRef.get()).data()!;
    expect(round2.state).toBe('round2');
    expect(round2.rounds[0].tasks).toBeDefined();
    expect(round2.rounds[1].tasks).toHaveLength(round2.rounds[1].taskIds.length);
    expect(round2.rounds.slice(2).every((entry: Record<string, unknown>) => entry.tasks === undefined)).toBe(true);
  });

  test('v5/v6 finding 2/4: public bot players and results expose no bot markers while simulation still runs', async () => {
    const startsAt = 4_000_000;
    const roomId = `v5-private-bots-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    const entrants = Array.from({ length: 8 }, (_, index) => player(`v5-human-${index}`));
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'lobby', startsAt,
      stateStartedAtMs: 1, stateDeadlineAtMs: startsAt, players: entrants, rounds: [], ready: false,
      version: 0, createdAtMs: 1 });
    await runtime.tournamentFillRoomTransaction(db, roomRef, fillResources(`v5-bots-${process.pid}`), {
      nowMs: () => startsAt - 90_000,
    });
    const filled = (await roomRef.get()).data()!;
    expect(filled.players).toHaveLength(16);
    for (const publicPlayer of filled.players) {
      expect(publicPlayer).not.toHaveProperty('isBot');
      expect(publicPlayer).not.toHaveProperty('botWinRate');
      expect(String(publicPlayer.id)).not.toMatch(/bot/i);
    }
    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => startsAt });
    const active = (await roomRef.get()).data()!;
    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => active.stateDeadlineAtMs });
    const completed = (await roomRef.get()).data()!;
    expect(Object.keys(completed.rounds[0].results)).toHaveLength(16);
    const publicResults = Object.values(completed.rounds[0].results) as any[];
    expect(publicResults.filter((result) => result.submissionStatus === 'simulated')).toHaveLength(0);
    expect(publicResults.filter((result) => result.submissionStatus === 'submitted')).toHaveLength(8);
    expect(publicResults.filter((result) => result.submissionStatus === 'timed_out')).toHaveLength(8);
  });

  test('v5 finding 3: persisted lifecycle cursor reaches room 501 across scheduler ticks', async () => {
    const prior = await db.collection('tournamentRooms').get();
    for (let offset = 0; offset < prior.docs.length; offset += 400) {
      const cleanup = db.batch(); prior.docs.slice(offset, offset + 400).forEach((doc) => cleanup.delete(doc.ref));
      await cleanup.commit();
    }
    const nowMs = 10_000_000_000_000;
    for (let offset = 0; offset < 500; offset += 250) {
      const batch = db.batch();
      for (let index = offset; index < offset + 250; index += 1) {
        const id = `v5-poison-${String(index).padStart(3, '0')}`;
        batch.set(db.collection('tournamentRooms').doc(id), { slotId: 'daily', seed: id, state: 'table1',
          startsAt: 1, stateStartedAtMs: 1, stateDeadlineAtMs: nowMs - 1,
          lifecycleRetryAtMs: nowMs + 60_000, players: [], rounds: [round(1), round(2)],
          version: 0, createdAtMs: 1 });
      }
      await batch.commit();
    }
    const tail = db.collection('tournamentRooms').doc('v5-poison-zzz-501');
    await tail.set({ slotId: 'daily', seed: tail.id, state: 'table1', startsAt: 1,
      stateStartedAtMs: 1, stateDeadlineAtMs: nowMs - 1, players: [], rounds: [round(1), round(2)],
      version: 0, createdAtMs: 1 });
    await tail.collection('taskSecrets').doc('lifecycle-task-2').set({
      mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'tail', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    });
    await runtime.processDueTournamentRooms({ db, nowMs });
    expect((await tail.get()).data()?.state).toBe('table1');
    await runtime.processDueTournamentRooms({ db, nowMs });
    expect((await tail.get()).data()?.state).toBe('round2');
    expect((await db.collection('tournamentRooms').doc('v5-poison-000').get()).data()?.stateDeadlineAtMs)
      .toBe(nowMs - 1);
  });

  test('v5 finding 4: cancellation token blocks lifecycle change injected before cancel transaction', async () => {
    const roomId = `v5-cancel-token-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await roomRef.set({ slotId: 'daily', seed: roomId, state: 'round1', startsAt: 1,
      stateStartedAtMs: 1, stateDeadlineAtMs: 2, players: [],
      rounds: [{ ...round(1), roundNo: 2 }], version: 1, createdAtMs: 1 });
    await runtime.settleAdvanceOutcome(db, roomRef, 'cancel_resources', {
      nowMs: () => 2,
      beforeCancelTransaction: async () => {
        await roomRef.update({ state: 'round2', version: 2, stateDeadlineAtMs: 50_000 });
      },
    });
    expect((await roomRef.get()).data()).toMatchObject({ state: 'round2', version: 2 });
  });

  test('v5 finding 5: submit, advance and claim reject link or ban changes inside their transactions', async () => {
    expect(typeof runtime.assertTransactionalTournamentAccess).toBe('function');
    const missing = { exists: false, data: () => undefined };
    const linked = (stable: string) => ({ exists: true, data: () => ({ stable_id: stable }) });
    expect(() => runtime.assertTransactionalTournamentAccess('auth', 'stable', linked('other'), missing, missing))
      .toThrow('stable_identity_changed');
    expect(() => runtime.assertTransactionalTournamentAccess('auth', 'stable', linked('stable'), missing,
      { exists: true, data: () => ({}) })).toThrow('user_banned');
  });

  test('v5 finding 5b: real submit, advance and claim transactions reject mid-flight access drift', async () => {
    const racingDb = (beforeTransaction: () => Promise<void>) => ({
      collection: (...args: Parameters<Firestore['collection']>) => db.collection(...args),
      runTransaction: async (handler: Parameters<Firestore['runTransaction']>[0]) => {
        await beforeTransaction();
        return db.runTransaction(handler);
      },
    });

    const submitStableUid = `v5-submit-access-stable-${process.pid}`;
    const submitAuthUid = `v5-submit-access-auth-${process.pid}`;
    const submitRoomRef = db.collection('tournamentRooms').doc(`v5-submit-access-${process.pid}`);
    const submitTaskId = `v5-submit-access-task-${process.pid}`;
    await Promise.all([
      submitRoomRef.set({ slotId: 'daily', seed: submitRoomRef.id, state: 'round1', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: 10_000, players: [player(submitStableUid)],
        rounds: [{ roundNo: 1, mode: 'choice', taskIds: [submitTaskId], results: {} }],
        version: 0, createdAtMs: 1 }),
      submitRoomRef.collection('taskSecrets').doc(submitTaskId).set({
        mode: 'choice', isVoice: false, difficulty: 1,
        payload: { phrase: 'submit', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
      }),
      db.collection('auth_links').doc(submitAuthUid).set({ stable_id: submitStableUid }),
      db.collection('users').doc(submitStableUid).set({ shards: 0 }),
    ]);
    await expect(runtime.tournamentSubmitTransaction(racingDb(async () => {
      await db.collection('auth_links').doc(submitAuthUid).set({ stable_id: 'v5-other-account' });
    }), {
      authUid: submitAuthUid, stableUid: submitStableUid, roomId: submitRoomRef.id, roundNo: 1,
      rawAnswers: [{ taskId: submitTaskId, answer: { selectedIndex: 0 } }], receivedAtMs: 100,
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'stable_identity_changed' });
    expect((await submitRoomRef.get()).data()?.rounds[0].results).toEqual({});

    const advanceStableUid = `v5-advance-access-stable-${process.pid}`;
    const advanceAuthUid = `v5-advance-access-auth-${process.pid}`;
    const advanceRoomRef = db.collection('tournamentRooms').doc(`v5-advance-access-${process.pid}`);
    await Promise.all([
      advanceRoomRef.set({ slotId: 'daily', seed: advanceRoomRef.id, state: 'scheduled', startsAt: 2,
        stateStartedAtMs: 1, stateDeadlineAtMs: 2, players: [], rounds: [],
        participantAuthUids: [advanceAuthUid], version: 0, createdAtMs: 1 }),
      db.collection('auth_links').doc(advanceAuthUid).set({ stable_id: advanceStableUid }),
      db.collection('users').doc(advanceStableUid).set({ shards: 0 }),
    ]);
    await expect(runtime.advanceRoomAtDeadline(racingDb(async () => {
      await db.collection('banned_users').doc(advanceStableUid).set({ reason: 'race' });
    }), advanceRoomRef, {
      nowMs: () => 2, requesterAuthUid: advanceAuthUid, requesterStableUid: advanceStableUid,
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'user_banned' });
    expect((await advanceRoomRef.get()).data()?.state).toBe('scheduled');

    const claimStableUid = `v5-claim-access-stable-${process.pid}`;
    const claimAuthUid = `v5-claim-access-auth-${process.pid}`;
    const claimRoomRef = db.collection('tournamentRooms').doc(`v5-claim-access-${process.pid}`);
    const claimUserRef = db.collection('users').doc(claimStableUid);
    const claimReceiptRef = claimUserRef.collection('tournament_receipts').doc(`reward_${claimRoomRef.id}`);
    await Promise.all([
      claimRoomRef.set({ slotId: 'daily', seed: claimRoomRef.id, state: 'rewards', startsAt: 1,
        players: [], rounds: [], version: 1, createdAtMs: 1 }),
      claimUserRef.set({ shards: 0 }),
      db.collection('auth_links').doc(claimAuthUid).set({ stable_id: claimStableUid }),
      claimReceiptRef.set({ kind: 'tournament_reward', uid: claimStableUid, roomId: claimRoomRef.id,
        place: 1, reward: { gems: 100, tickets: 1 }, claimed: false }),
    ]);
    await expect(runtime.tournamentClaimTransaction(racingDb(async () => {
      await db.collection('auth_links').doc(claimAuthUid).set({ stable_id: 'v5-other-account' });
    }), claimStableUid, claimRoomRef.id, 100, claimAuthUid))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'stable_identity_changed' });
    expect((await claimUserRef.get()).data()?.shards).toBe(0);
    expect((await claimReceiptRef.get()).data()?.claimed).toBe(false);
  });

  test('v5 finding 6: elapsed results reaches closed with timestamps and zero private secrets', async () => {
    const nowMs = 6_000_000;
    const roomId = `v5-close-cleanup-${process.pid}`;
    const roomRef = db.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({ slotId: 'daily', seed: roomId, state: 'results', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: nowMs, players: [], rounds: [round(1)],
        version: 1, createdAtMs: 1 }),
      roomRef.collection('taskSecrets').doc('lifecycle-task-1').set({ marker: true }),
      roomRef.collection('taskSecrets').doc('orphan-private').set({ marker: true }),
    ]);
    await runtime.tournamentFinalizeTransaction(db, roomId, nowMs);
    const rewards = (await roomRef.get()).data()!;
    await runtime.advanceRoomAtDeadline(db, roomRef, { nowMs: () => rewards.stateDeadlineAtMs });
    const closed = (await roomRef.get()).data()!;
    expect(closed.state).toBe('closed');
    expect(closed.closedAtMs).toBe(rewards.stateDeadlineAtMs);
    expect(closed.expireAt.toMillis()).toBeGreaterThan(closed.closedAtMs);
    expect((await roomRef.collection('taskSecrets').get()).size).toBe(0);
  });

  test('v6 finding 3: missing or partial bot metadata fails closed without rewards or lifecycle mutation', async () => {
    const prior = await db.collection('tournamentRooms').get();
    for (let offset = 0; offset < prior.docs.length; offset += 400) {
      const cleanup = db.batch(); prior.docs.slice(offset, offset + 400).forEach((doc) => cleanup.delete(doc.ref));
      await cleanup.commit();
    }
    const nowMs = 11_000_000_000_000;
    const missingUid = `v6-missing-meta-user-${process.pid}`;
    const missingRoomRef = db.collection('tournamentRooms').doc(`v6-missing-meta-${process.pid}`);
    const partialHumanId = `v6-partial-human-${process.pid}`;
    const partialBotOne = `v6-partial-p1-${process.pid}`;
    const partialBotTwo = `v6-partial-p2-${process.pid}`;
    const partialRoomRef = db.collection('tournamentRooms').doc(`v6-partial-meta-${process.pid}`);
    const publicPlayer = (id: string) => {
      const { isBot: _isBot, ...publicFields } = player(id);
      return publicFields;
    };
    await Promise.all([
      missingRoomRef.set({ slotId: 'daily', seed: missingRoomRef.id, state: 'results', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: nowMs - 1, ready: true,
        players: [publicPlayer(missingUid)], rounds: [round(1)], version: 1, createdAtMs: 1 }),
      db.collection('users').doc(missingUid).set({ shards: 0 }),
      partialRoomRef.set({ slotId: 'daily', seed: partialRoomRef.id, state: 'round1', startsAt: 1,
        stateStartedAtMs: 1, stateDeadlineAtMs: nowMs - 1, ready: true,
        players: [publicPlayer(partialHumanId), publicPlayer(partialBotOne), publicPlayer(partialBotTwo)],
        rounds: [round(1)], version: 1, createdAtMs: 1 }),
      partialRoomRef.collection('taskSecrets').doc('lifecycle-task-1').set({
        mode: 'choice', isVoice: false, difficulty: 1,
        payload: { phrase: 'partial', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
      }),
      partialRoomRef.collection('taskSecrets').doc('__bot_simulation_v1').set({
        kind: 'bot_simulation_v1', expectedBotCount: 2,
        bots: [{ playerId: partialBotOne, winRate: 0.5 }],
      }),
    ]);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(runtime.processDueTournamentRooms({ db, nowMs }))
        .resolves.toEqual({ scanned: 2, advanced: 0, failed: 2 });
    } finally {
      errorSpy.mockRestore();
    }
    expect((await missingRoomRef.get()).data()).toMatchObject({ state: 'results', version: 1 });
    expect((await partialRoomRef.get()).data()).toMatchObject({ state: 'round1', version: 1 });
    expect((await db.collection('users').doc(missingUid).collection('tournament_receipts').get()).size).toBe(0);
  });

  test('v6 finding 5: persisted fill cursor reaches room 501 without moving earlier deadlines', async () => {
    const prior = await db.collection('tournamentRooms').get();
    for (let offset = 0; offset < prior.docs.length; offset += 400) {
      const cleanup = db.batch(); prior.docs.slice(offset, offset + 400).forEach((doc) => cleanup.delete(doc.ref));
      await cleanup.commit();
    }
    await db.collection('tournamentSchedule').doc('_fill_due_cursor_v1').delete();
    const nowMs = 12_000_000_000_000;
    const deadlineAtMs = nowMs + 777;
    for (let offset = 0; offset < 500; offset += 250) {
      const batch = db.batch();
      for (let index = offset; index < offset + 250; index += 1) {
        const id = `v6-fill-ready-${String(index).padStart(3, '0')}`;
        batch.set(db.collection('tournamentRooms').doc(id), {
          slotId: 'daily', seed: id, state: 'lobby', startsAt: nowMs - 1,
          stateDeadlineAtMs: deadlineAtMs, players: [], rounds: [], ready: true, version: 1, createdAtMs: 1,
        });
      }
      await batch.commit();
    }
    const tail = db.collection('tournamentRooms').doc('v6-fill-ready-zzz-501');
    await tail.set({ slotId: 'daily', seed: tail.id, state: 'lobby', startsAt: nowMs,
      stateDeadlineAtMs: deadlineAtMs, players: [], rounds: [], ready: false, version: 0, createdAtMs: 1 });
    const fillRoom = async (_db: Firestore, roomRef: FirebaseFirestore.DocumentReference) => {
      const snap = await roomRef.get();
      if (snap.data()?.ready === true) return 'filled';
      await roomRef.update({ ready: true, version: 1 });
      return 'filled';
    };
    await runtime.processTournamentFillRooms({ db, nowMs, resources: { bots: [], tasks: [] }, fillRoom });
    expect((await tail.get()).data()?.ready).toBe(false);
    await runtime.processTournamentFillRooms({ db, nowMs, resources: { bots: [], tasks: [] }, fillRoom });
    expect((await tail.get()).data()?.ready).toBe(true);
    expect((await db.collection('tournamentRooms').doc('v6-fill-ready-000').get()).data()?.stateDeadlineAtMs)
      .toBe(deadlineAtMs);
  });
});
