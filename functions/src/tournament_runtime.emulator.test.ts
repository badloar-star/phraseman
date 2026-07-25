import { readFileSync } from 'node:fs';
import path from 'node:path';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

jest.setTimeout(60_000);

const runtime = require('./tournaments') as Record<string, (...args: any[]) => Promise<any>>;
const core = require('./tournament_core') as Record<string, any>;
const { tournamentWeekId } = core as { tournamentWeekId: (ms: number) => string };

const PROJECT_ID = 'demo-phraseman-tournament-runtime';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('tournament Firestore emulator runtime', () => {
  let environment: RulesTestEnvironment;
  let adminApp: App;
  let adminDb: Firestore;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
    adminApp = initializeApp({ projectId: PROJECT_ID }, `tournament-runtime-${Date.now()}`);
    adminDb = getFirestore(adminApp);
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await Promise.all([
        setDoc(doc(db, 'tournamentRooms', 'scheduled'), { state: 'scheduled', players: [], participantAuthUids: [] }),
        setDoc(doc(db, 'tournamentRooms', 'lobby'), { state: 'lobby', players: [], participantAuthUids: [] }),
        setDoc(doc(db, 'tournamentRooms', 'modern-active'), {
          state: 'round1', players: [{ id: 'stable-modern', isBot: false }],
          participantAuthUids: ['modern-auth'], participantAuthUidsComplete: true,
        }),
        setDoc(doc(db, 'tournamentRooms', 'legacy-active'), {
          state: 'round1', players: [{ id: 'legacy-auth', isBot: false }],
        }),
        setDoc(doc(db, 'tournamentRooms', 'legacy-linked-active'), {
          state: 'round2', players: [{ id: 'stable-linked', isBot: false }],
        }),
        setDoc(doc(db, 'auth_links', 'linked-auth'), { stable_id: 'stable-linked' }),
        setDoc(doc(db, 'tournamentRooms', 'legacy-partial-auth'), {
          state: 'round4',
          players: Array.from({ length: 16 }, (_, index) => ({ id: `legacy-stable-${index}`, isBot: false })),
          participantAuthUids: ['reauth-current'],
        }),
        ...Array.from({ length: 16 }, (_, index) => setDoc(
          doc(db, 'auth_links', `legacy-provider-${index}`),
          { stable_id: `legacy-stable-${index}` },
        )),
        setDoc(doc(db, 'tournamentRooms', 'modern-active', 'taskSecrets', 'q1'), { correctIndex: 0 }),
      ]);
    });
  });

  afterAll(async () => {
    await deleteApp(adminApp);
    await environment?.cleanup();
  });

  it('enforces lobby, participant, query and task-secret rules', async () => {
    const viewer = environment.authenticatedContext('viewer').firestore();
    const anonymous = environment.unauthenticatedContext().firestore();
    const modern = environment.authenticatedContext('modern-auth').firestore();
    const legacy = environment.authenticatedContext('legacy-auth').firestore();
    const linked = environment.authenticatedContext('linked-auth').firestore();
    const stranger = environment.authenticatedContext('stranger').firestore();
    await assertSucceeds(getDoc(doc(viewer, 'tournamentRooms', 'scheduled')));
    await assertSucceeds(getDoc(doc(viewer, 'tournamentRooms', 'lobby')));
    await assertFails(getDoc(doc(anonymous, 'tournamentRooms', 'lobby')));
    await assertSucceeds(getDoc(doc(modern, 'tournamentRooms', 'modern-active')));
    await assertSucceeds(getDoc(doc(legacy, 'tournamentRooms', 'legacy-active')));
    await assertSucceeds(getDoc(doc(linked, 'tournamentRooms', 'legacy-linked-active')));
    await assertFails(getDoc(doc(stranger, 'tournamentRooms', 'legacy-active')));
    await assertSucceeds(getDocs(query(collection(viewer, 'tournamentRooms'), where('state', '==', 'lobby'))));
    await assertSucceeds(getDocs(query(
      collection(modern, 'tournamentRooms'), where('participantAuthUids', 'array-contains', 'modern-auth'),
    )));
    await assertFails(getDocs(collection(stranger, 'tournamentRooms')));
    await assertFails(setDoc(doc(modern, 'tournamentRooms', 'new-room'), { state: 'lobby' }));
    await assertFails(getDoc(doc(modern, 'tournamentRooms', 'modern-active', 'taskSecrets', 'q1')));
  });

  it('keeps all legacy participants readable after one partial reauth backfill', async () => {
    for (let index = 0; index < 16; index += 1) {
      const participant = environment.authenticatedContext(`legacy-provider-${index}`).firestore();
      await assertSucceeds(getDoc(doc(participant, 'tournamentRooms', 'legacy-partial-auth')));
    }
    await assertSucceeds(getDoc(doc(
      environment.authenticatedContext('reauth-current').firestore(), 'tournamentRooms', 'legacy-partial-auth',
    )));
    const outsider = environment.authenticatedContext('legacy-outsider').firestore();
    await assertFails(getDoc(doc(outsider, 'tournamentRooms', 'legacy-partial-auth')));
    await assertFails(getDocs(collection(outsider, 'tournamentRooms')));
  });

  it('runs production join/cancel transactions with exact-once refund in both orders', async () => {
    const nowMs = Date.now();
    await adminDb.collection('tournamentSchedule').doc('config').set({
      slots: [{ slotId: 'runtime', localTime: '12:00', timezone: 'UTC', ticketsRequired: 1, enabled: true }],
      freeWeeklyEntry: false,
      ticketGemValue: 10,
    });
    const seedJoinable = async (roomId: string, uid: string) => Promise.all([
      adminDb.collection('tournamentRooms').doc(roomId).set({
        slotId: 'runtime', seed: roomId, state: 'lobby', startsAt: nowMs + 60_000,
        ticketsRequired: 1, players: [], participantAuthUids: [], participantAuthUidsComplete: true,
        rounds: [], version: 0, createdAtMs: nowMs,
      }),
      adminDb.collection('users').doc(uid).set({ name: uid, shards: 0 }),
      adminDb.collection('users').doc(uid).collection('inventory').doc('tickets').set({ count: 1 }),
      adminDb.collection('auth_links').doc(`auth-${uid}`).set({ stable_id: uid }),
    ]);

    await seedJoinable('prod-join-first', 'prod-u1');
    await runtime.tournamentJoinTransaction(adminDb, {
      roomId: 'prod-join-first', stableUid: 'prod-u1', authUid: 'auth-prod-u1', nowMs,
    });
    await Promise.all([
      runtime.tournamentCancelTransaction(adminDb, 'prod-join-first', 'legacy_gameplay_unverifiable', nowMs + 1),
      runtime.tournamentCancelTransaction(adminDb, 'prod-join-first', 'legacy_gameplay_unverifiable', nowMs + 2),
    ]);
    expect((await adminDb.collection('users').doc('prod-u1').collection('inventory').doc('tickets').get()).data()?.count).toBe(1);
    expect((await adminDb.collection('users').doc('prod-u1').get()).data()?.shards).toBe(3);
    expect((await adminDb.collection('users').doc('prod-u1').collection('tournament_receipts').doc('cancel_prod-join-first').get()).exists).toBe(true);

    await seedJoinable('prod-cancel-first', 'prod-u2');
    await runtime.tournamentCancelTransaction(adminDb, 'prod-cancel-first', 'legacy_gameplay_unverifiable', nowMs + 3);
    await expect(runtime.tournamentJoinTransaction(adminDb, {
      roomId: 'prod-cancel-first', stableUid: 'prod-u2', authUid: 'auth-prod-u2', nowMs: nowMs + 4,
    })).rejects.toThrow('room_not_joinable');
    expect((await adminDb.collection('users').doc('prod-u2').collection('inventory').doc('tickets').get()).data()?.count).toBe(1);
  });

  it('runs production submit/finalize/claim handlers concurrently and exactly once', async () => {
    const nowMs = Date.now();
    const task = {
      taskId: 'q1', mode: 'choice', isVoice: false, difficulty: 1,
      payload: { phrase: 'one', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, tags: [], verified: true,
    };
    const player = (id: string) => ({
      id, isBot: false, name: id, avatar: '🙂', color: '#000', score: 0, streak: 0,
      entry: { kind: 'ticket', ticketsSpent: 1, bankContributionGems: 2, weekId: '2026-W30' },
    });
    await adminDb.collection('tournamentRooms').doc('prod-submit').set({
      slotId: 'runtime', seed: 'prod-submit', state: 'round1', startsAt: nowMs - 1_000,
      stateStartedAtMs: nowMs - 500, stateDeadlineAtMs: nowMs + 60_000,
      players: [player('submit-u1'), player('submit-u2')],
      participantAuthUids: ['submit-auth-1', 'submit-auth-2'], participantAuthUidsComplete: true,
      rounds: [{ roundNo: 1, mode: 'choice', taskIds: ['q1'], results: {} }],
      version: 1, createdAtMs: nowMs - 10_000,
    });
    await adminDb.collection('tournamentRooms').doc('prod-submit').collection('taskSecrets').doc('q1').set(task);
    await Promise.all([
      runtime.tournamentSubmitTransaction(adminDb, {
        stableUid: 'submit-u1', roomId: 'prod-submit', roundNo: 1,
        rawAnswers: [{ taskId: 'q1', answer: { selectedIndex: 0 } }], receivedAtMs: nowMs,
      }),
      runtime.tournamentSubmitTransaction(adminDb, {
        stableUid: 'submit-u2', roomId: 'prod-submit', roundNo: 1,
        rawAnswers: [{ taskId: 'q1', answer: { selectedIndex: 0 } }], receivedAtMs: nowMs + 1,
      }),
    ]);
    const submitted = (await adminDb.collection('tournamentRooms').doc('prod-submit').get()).data();
    expect(Object.keys(submitted?.rounds[0].results).sort()).toEqual(['submit-u1', 'submit-u2']);
    const score = submitted?.players.find((entry: any) => entry.id === 'submit-u1').score;
    await runtime.tournamentSubmitTransaction(adminDb, {
      stableUid: 'submit-u1', roomId: 'prod-submit', roundNo: 1,
      rawAnswers: [{ taskId: 'q1', answer: { selectedIndex: 0 } }], receivedAtMs: nowMs + 2,
    });
    expect((await adminDb.collection('tournamentRooms').doc('prod-submit').get()).data()
      ?.players.find((entry: any) => entry.id === 'submit-u1').score).toBe(score);

    await Promise.all(['final-u1', 'final-u2'].map(async (uid) => {
      await adminDb.collection('users').doc(uid).set({ shards: 0 });
      await adminDb.collection('users').doc(uid).collection('inventory').doc('tickets').set({ count: 0 });
    }));
    const finalStartsAt = nowMs - 100_000;
    await adminDb.collection('tournamentRooms').doc('prod-final').set({
      slotId: 'runtime', seed: 'prod-final', state: 'results', startsAt: finalStartsAt,
      stateDeadlineAtMs: nowMs - 1,
      players: [{ ...player('final-u1'), score: 100 }, { ...player('final-u2'), score: 50 }],
      participantAuthUids: ['final-auth-1', 'final-auth-2'], participantAuthUidsComplete: true,
      rounds: [], version: 4, createdAtMs: nowMs - 200_000,
    });
    await Promise.all([
      runtime.tournamentFinalizeTransaction(adminDb, 'prod-final', nowMs),
      runtime.tournamentFinalizeTransaction(adminDb, 'prod-final', nowMs + 1),
    ]);
    const season = await adminDb.collection('tournamentSeasons').doc(tournamentWeekId(finalStartsAt))
      .collection('entries').doc('final-u1').get();
    expect(season.data()?.points).toBe(25);
    expect(season.data()?.tournamentsPlayed).toBe(1);
    await Promise.all([
      runtime.tournamentClaimTransaction(adminDb, 'final-u1', 'prod-final', nowMs + 2),
      runtime.tournamentClaimTransaction(adminDb, 'final-u1', 'prod-final', nowMs + 3),
    ]);
    expect((await adminDb.collection('users').doc('final-u1').get()).data()?.shards).toBe(50);
    expect((await adminDb.collection('users').doc('final-u1').collection('inventory').doc('tickets').get()).data()?.count).toBe(1);
  });

  it('propagates transient secret reads through production advance with zero writes', async () => {
    const nowMs = Date.now();
    const roomRef = adminDb.collection('tournamentRooms').doc('prod-transient-secret');
    await roomRef.set({
      slotId: 'runtime', seed: 'prod-transient-secret', state: 'round1', startsAt: nowMs - 100_000,
      stateStartedAtMs: nowMs - 20_000, stateDeadlineAtMs: nowMs - 1,
      players: [], participantAuthUids: [], participantAuthUidsComplete: true,
      rounds: [{ roundNo: 1, mode: 'choice', taskIds: ['q1'], results: {} }],
      version: 1, createdAtMs: nowMs - 200_000,
    });
    const before = (await roomRef.get()).data();
    const transient = new Error('firestore_unavailable');
    await expect(runtime.advanceRoomAtDeadline(adminDb, roomRef, {
      nowMs: () => nowMs,
      loadTasksByIds: async () => { throw transient; },
    })).rejects.toBe(transient);
    expect((await roomRef.get()).data()).toEqual(before);
  });

  it('atomically cancels and refunds an oversized production fill exactly once', async () => {
    const nowMs = Date.now();
    const weekId = tournamentWeekId(nowMs);
    const roomRef = adminDb.collection('tournamentRooms').doc('prod-oversized-fill');
    const entrant = (id: string) => ({
      id, isBot: false, name: id, avatar: '🙂', color: '#000', score: 0, streak: 0,
      profilePadding: 'x'.repeat(70_000),
      entry: { kind: 'ticket', ticketsSpent: 1, bankContributionGems: 2, weekId },
    });
    const entrants = Array.from({ length: 8 }, (_, index) => entrant(`oversize-u${index + 1}`));
    await Promise.all([
      roomRef.set({
        slotId: 'runtime', seed: 'prod-oversized-fill', state: 'lobby', startsAt: nowMs + 60_000,
        ticketsRequired: 1, players: entrants,
        participantAuthUids: entrants.map((_, index) => `oversize-auth-${index + 1}`), participantAuthUidsComplete: true,
        rounds: [], version: 2, createdAtMs: nowMs - 10_000,
      }),
      ...entrants.flatMap((candidate) => [
        adminDb.collection('users').doc(candidate.id).set({ shards: 0 }),
        adminDb.collection('users').doc(candidate.id).collection('inventory').doc('tickets').set({ count: 0 }),
      ]),
      adminDb.collection('tournamentBank').doc(weekId).set({ total: 16 }),
    ]);
    const limits = core.TOURNAMENT_TASK_LIMITS;
    const tasks = Array.from({ length: 24 }, (_, index) => ({
      taskId: `oversize-time-${index}`,
      mode: 'timeattack', isVoice: false, difficulty: 1 + Math.floor(index / 8),
      payload: {
        prompt: 'p'.repeat(limits.promptBytes),
        items: Array.from({ length: limits.maxTimeattackItems }, () => ({
          prompt: 'i'.repeat(limits.promptBytes),
          options: Array.from({ length: limits.maxTimeattackOptions }, () => 'o'.repeat(limits.optionBytes)),
          correctIndex: 0,
        })),
      },
      tags: Array.from({ length: limits.maxTags }, () => 't'.repeat(limits.tagBytes)),
      verified: true,
    }));
    const bots = Array.from({ length: 8 }, (_, index) => ({
      botId: `oversize-bot-${index}`, name: `Bot ${index}`, avatarEmoji: '🤖', color: '#123456',
      winRate: 0.5, rank: 'silver', titles: [],
    }));

    const outcomes = await Promise.all([
      runtime.tournamentFillRoomTransaction(adminDb, roomRef, { bots, tasks }, { nowMs: () => nowMs }),
      runtime.tournamentFillRoomTransaction(adminDb, roomRef, { bots, tasks }, { nowMs: () => nowMs + 1 }),
    ]);
    expect(outcomes).toContain('cancelled_resources');
    expect((await roomRef.get()).data()?.state).toBe('cancelled');
    for (const { id: uid } of entrants) {
      expect((await adminDb.collection('users').doc(uid).collection('inventory').doc('tickets').get()).data()?.count).toBe(1);
      expect((await adminDb.collection('users').doc(uid).get()).data()?.shards).toBe(3);
      expect((await adminDb.collection('users').doc(uid).collection('tournament_receipts')
        .doc('cancel_prod-oversized-fill').get()).exists).toBe(true);
    }
    expect((await adminDb.collection('tournamentBank').doc(weekId).get()).data()?.total).toBe(0);
  });

  it('propagates a transient production fill failure without room or economy writes and remains retryable', async () => {
    const nowMs = Date.now();
    const roomRef = adminDb.collection('tournamentRooms').doc('prod-transient-fill');
    const entrant = (id: string) => ({
      id, isBot: false, name: id, avatar: '🙂', color: '#000', score: 0, streak: 0,
      entry: { kind: 'ticket', ticketsSpent: 1, bankContributionGems: 0, weekId: tournamentWeekId(nowMs) },
    });
    const entrants = Array.from({ length: 8 }, (_, index) => entrant(`transient-fill-u${index + 1}`));
    await Promise.all([
      roomRef.set({
        slotId: 'runtime', seed: 'prod-transient-fill', state: 'lobby', startsAt: nowMs + 60_000,
        ticketsRequired: 1, players: entrants,
        participantAuthUids: entrants.map((_, index) => `transient-fill-auth-${index + 1}`), participantAuthUidsComplete: true,
        rounds: [], version: 2, createdAtMs: nowMs - 10_000,
      }),
      adminDb.collection('users').doc('transient-fill-u1').set({ shards: 0 }),
      adminDb.collection('users').doc('transient-fill-u2').set({ shards: 0 }),
      adminDb.collection('users').doc('transient-fill-u1').collection('inventory').doc('tickets').set({ count: 0 }),
      adminDb.collection('users').doc('transient-fill-u2').collection('inventory').doc('tickets').set({ count: 0 }),
    ]);
    const tasks = Array.from({ length: 24 }, (_, index) => ({
      taskId: `transient-choice-${index}`,
      mode: 'choice', isVoice: false, difficulty: 1 + Math.floor(index / 8),
      payload: { phrase: `phrase ${index}`, options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      tags: [], verified: true,
    }));
    const bots = Array.from({ length: 8 }, (_, index) => ({
      botId: `transient-bot-${index}`, name: `Bot ${index}`, avatarEmoji: '🤖', color: '#123456',
      winRate: 0.5, rank: 'silver', titles: [],
    }));
    const before = (await roomRef.get()).data();
    const transient = new Error('firestore_unavailable');
    await expect(runtime.tournamentFillRoomTransaction(adminDb, roomRef, { bots, tasks }, {
      nowMs: () => nowMs,
      beforeWrites: () => { throw transient; },
    })).rejects.toBe(transient);
    expect((await roomRef.get()).data()).toEqual(before);
    expect((await adminDb.collection('users').doc('transient-fill-u1').collection('inventory').doc('tickets').get()).data()?.count).toBe(0);
    expect((await adminDb.collection('users').doc('transient-fill-u1').collection('tournament_receipts')
      .doc('cancel_prod-transient-fill').get()).exists).toBe(false);

    await expect(runtime.tournamentFillRoomTransaction(
      adminDb, roomRef, { bots, tasks }, { nowMs: () => nowMs + 1 },
    )).resolves.toBe('filled');
    expect((await roomRef.get()).data()?.ready).toBe(true);
  });

  it('paginates the production legacy scan past more than 800 modern rooms', async () => {
    const nowMs = Date.now();
    await adminDb.collection('tournamentSchedule').doc('_legacy_recovery_cursor_v1').delete().catch(() => undefined);
    const writer = adminDb.bulkWriter();
    for (let index = 0; index < 805; index += 1) {
      writer.set(adminDb.collection('tournamentRooms').doc(`scan-modern-${String(index).padStart(4, '0')}`), {
        state: 'scheduled', startsAt: nowMs - 10_000 + index,
        stateDeadlineAtMs: nowMs + 60_000, players: [], rounds: [], version: 1,
      });
    }
    writer.set(adminDb.collection('tournamentRooms').doc('scan-legacy-target'), {
      state: 'scheduled', startsAt: nowMs - 9_000 + 900, players: [], rounds: [], version: 0,
    });
    await writer.close();
    const found = new Set<string>();
    for (let page = 0; page < 6; page += 1) {
      const docs = await runtime.scanLegacyTournamentRooms(adminDb, { nowMs, pageSize: 200 });
      docs.forEach((entry: any) => found.add(entry.id));
    }
    expect(found.has('scan-legacy-target')).toBe(true);
  });
});
