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

process.env.PHRASEMAN_TOURNAMENT_TEST_MODE_RELEASE = '1';
const runtime = require('./tournaments') as Record<string, (...args: any[]) => Promise<any>>;
const core = require('./tournament_core') as Record<string, any>;
const { tournamentWeekId } = core as { tournamentWeekId: (ms: number) => string };

const PROJECT_ID = 'demo-phraseman-tournament-runtime';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

const approvedTextTasks = (prefix: string) => core.TOURNAMENT_ROUND_MODE_PLAN.flatMap(
  (modes: string[], roundIndex: number) => modes.map((mode, modeIndex) => {
    const taskId = `${prefix}-r${roundIndex + 1}-${modeIndex}-${mode}`;
    const difficulty = roundIndex === 0 ? 1 : roundIndex === 1 ? 1 : roundIndex === 2 ? 2 : 3;
    if (mode === 'translate_build') {
      return {
        taskId, mode, isVoice: false, difficulty,
        payload: {
          phrase: `Собери фразу ${taskId}`,
          wordBank: ['I', 'am', 'ready', 'now'],
          correctTokens: ['I', 'am', 'ready'],
          correctAnswer: 'I am ready',
        },
        explanation: {
          ruleNote: 'Use subject + be + adjective.',
          example: 'I am ready. — Я готов.',
          wrongOptionReasons: [],
        },
        tags: [], verified: true,
      };
    }
    if (mode === 'speed_match') {
      const rightOptions = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
      return {
        taskId, mode, isVoice: false, difficulty,
        payload: {
          prompt: 'Соедини пары',
          rightOptions,
          items: rightOptions.map((rightOption, itemIndex) => ({
            prompt: `word-${itemIndex + 1}`,
            options: rightOptions,
            correctIndex: itemIndex,
            explanation: {
              ruleNote: `word-${itemIndex + 1} has one exact match.`,
              example: `word-${itemIndex + 1} — ${rightOption}.`,
              wrongOptionReasons: rightOptions.map((_, optionIndex) => (
                optionIndex === itemIndex ? '' : 'This is another pair.'
              )),
            },
          })),
        },
        explanation: {
          ruleNote: 'Match every English item to its Russian meaning.',
          example: 'one — один.',
          wrongOptionReasons: [],
        },
        tags: [], verified: true,
      };
    }
    return {
      taskId, mode, isVoice: false, difficulty,
      payload: {
        phrase: `phrase ${taskId}`,
        options: [`answer ${taskId}`, `near ${taskId}`, `third ${taskId}`, `fourth ${taskId}`],
        correctIndex: 0,
        correctAnswer: `answer ${taskId}`,
      },
      explanation: {
        ruleNote: 'Use the phrase that matches the situation.',
        example: 'I am ready. — Я готов.',
        wrongOptionReasons: ['', 'Wrong meaning.', 'Wrong grammar.', 'Wrong context.'],
      },
      tags: [], verified: true,
    };
  }),
);

const approvedCuratedRounds = (prefix: string) => new Map(core.TOURNAMENT_ROUND_MODE_PLAN.map(
  (modes: string[], roundIndex: number) => [
    roundIndex + 1,
    modes.map((mode, modeIndex) => `${prefix}-r${roundIndex + 1}-${modeIndex}-${mode}`),
  ],
));

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
        setDoc(doc(db, 'tournamentRooms', 'participant-only-closed'), {
          state: 'closed', players: [{ id: 'stable-modern', isBot: false }],
          participantAuthUids: ['modern-auth'], participantAuthUidsComplete: true,
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
    // Active scoreboards are intentionally spectator-readable to every signed-in user.
    await assertSucceeds(getDoc(doc(stranger, 'tournamentRooms', 'legacy-active')));
    // A non-spectator state remains participant-only.
    await assertSucceeds(getDoc(doc(modern, 'tournamentRooms', 'participant-only-closed')));
    await assertFails(getDoc(doc(stranger, 'tournamentRooms', 'participant-only-closed')));
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
    await assertSucceeds(getDoc(doc(outsider, 'tournamentRooms', 'legacy-partial-auth')));
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
      adminDb.collection('tournamentRooms').doc(roomId).collection('taskSecrets')
        .doc('__bot_simulation_v1').set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
      // Scheduled tournaments charge the immutable three-gem entry; tickets are retired.
      adminDb.collection('users').doc(uid).set({ name: uid, shards: 3 }),
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
    // Paid cancellation restores the three-gem entry and grants three compensation gems.
    expect((await adminDb.collection('users').doc('prod-u1').get()).data()?.shards).toBe(6);
    expect((await adminDb.collection('users').doc('prod-u1').collection('tournament_receipts').doc('cancel_prod-join-first').get()).exists).toBe(true);

    await seedJoinable('prod-cancel-first', 'prod-u2');
    await runtime.tournamentCancelTransaction(adminDb, 'prod-cancel-first', 'legacy_gameplay_unverifiable', nowMs + 3);
    await expect(runtime.tournamentJoinTransaction(adminDb, {
      roomId: 'prod-cancel-first', stableUid: 'prod-u2', authUid: 'auth-prod-u2', nowMs: nowMs + 4,
    })).rejects.toThrow('room_not_joinable');
    expect((await adminDb.collection('users').doc('prod-u2').collection('inventory').doc('tickets').get()).data()?.count).toBe(1);
  });

  it('admits anonymous Firebase owners without an auth-link in free and paid rooms idempotently', async () => {
    const nowMs = Date.now();
    await adminDb.collection('tournamentSchedule').doc('config').set({
      slots: [{ slotId: 'anon-paid', localTime: '12:00', timezone: 'UTC', ticketsRequired: 1, enabled: true }],
      freeWeeklyEntry: false,
      ticketGemValue: 10,
    });
    await adminDb.collection('tournamentSchedule').doc('economy').set({
      entryGems: 3,
      botEntryGems: 3,
      prizeShares: [0.5, 0.3, 0.2],
      weeklyBankShare: 0.1,
      weeklyBankTopN: 3,
    });

    const seedAnonymousRoom = async (
      roomId: string,
      stableUid: string,
      authUid: string,
      free: boolean,
    ) => Promise.all([
      adminDb.collection('tournamentRooms').doc(roomId).set({
        slotId: free ? 'anon-free' : 'anon-paid',
        seed: roomId,
        state: 'lobby',
        startsAt: nowMs + 60_000,
        ticketsRequired: free ? 0 : 1,
        testMode: free,
        economySnapshot: free
          ? { entryGems: 0, botEntryGems: 0, prizeShares: [0.5, 0.3, 0.2], weeklyBankShare: 0, weeklyBankTopN: 3 }
          : { entryGems: 3, botEntryGems: 3, prizeShares: [0.5, 0.3, 0.2], weeklyBankShare: 0.1, weeklyBankTopN: 3 },
        players: [],
        participantAuthUids: [],
        participantAuthUidsComplete: true,
        rounds: [],
        version: 0,
        createdAtMs: nowMs,
      }),
      adminDb.collection('tournamentRooms').doc(roomId).collection('taskSecrets')
        .doc('__bot_simulation_v1').set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
      adminDb.collection('users').doc(stableUid).set({
        firebaseAuthUid: authUid,
        name: stableUid,
        shards: free ? 0 : 6,
      }),
    ]);

    for (const free of [true, false]) {
      const suffix = free ? 'free' : 'paid';
      const roomId = `anon-entry-${suffix}`;
      const stableUid = `anon-stable-${suffix}`;
      const authUid = `anon-auth-${suffix}`;
      await seedAnonymousRoom(roomId, stableUid, authUid, free);

      await expect(runtime.resolveStableUid(adminDb, authUid)).resolves.toBe(stableUid);
      await expect(runtime.tournamentJoinTransaction(adminDb, {
        roomId, stableUid, authUid, nowMs,
      })).resolves.toMatchObject({ ok: true, joined: true, entryGems: free ? 0 : 3 });
      await expect(runtime.tournamentJoinTransaction(adminDb, {
        roomId, stableUid, authUid, nowMs: nowMs + 1,
      })).resolves.toMatchObject({ ok: true, joined: true, alreadyJoined: true });

      const user = (await adminDb.collection('users').doc(stableUid).get()).data();
      expect(user?.shards).toBe(free ? 0 : 3);
      const joinedRoom = (await adminDb.collection('tournamentRooms').doc(roomId).get()).data();
      expect(joinedRoom?.players.filter((player: { id?: string }) => player.id === stableUid)).toHaveLength(1);
      expect(joinedRoom?.participantAuthUids).toEqual([authUid]);
    }
  });

  it('uses distinct debit/refund events for join → leave → rejoin in the same room', async () => {
    const nowMs = Date.now();
    const roomId = 'leave-paid-lobby';
    const stableUid = 'leave-paid-user';
    const authUid = 'leave-paid-auth';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      adminDb.collection('tournamentSchedule').doc('config').set({
        slots: [{ slotId: 'leave-paid', localTime: '12:00', timezone: 'UTC', ticketsRequired: 1, enabled: true }],
        freeWeeklyEntry: false,
      }),
      adminDb.collection('tournamentSchedule').doc('economy').set({
        entryGems: 3, botEntryGems: 3, weeklyBankRate: 0.2,
        prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
      }),
      roomRef.set({
        slotId: 'leave-paid', seed: roomId, state: 'lobby', startsAt: nowMs + 60_000,
        stateDeadlineAtMs: nowMs + 60_000,
        economySnapshot: {
          entryGems: 3, botEntryGems: 3, weeklyBankRate: 0.2,
          prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
        },
        potGems: 0, players: [], participantAuthUids: [], participantAuthUidsComplete: true,
        rounds: [], version: 0, createdAtMs: nowMs,
      }),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1')
        .set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
      adminDb.collection('users').doc(stableUid).set({
        firebaseAuthUid: authUid, shards: 3,
        // Consume the weekly free-entry marker so both attempts are paid.
        tournament_free_entry_week_id: tournamentWeekId(nowMs + 60_000),
      }),
      adminDb.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
    ]);

    await runtime.tournamentJoinTransaction(adminDb, { roomId, stableUid, authUid, nowMs });

    const results = await Promise.all([
      runtime.tournamentLeaveTransaction(adminDb, { roomId, stableUid, authUid, nowMs: nowMs + 1 }),
      runtime.tournamentLeaveTransaction(adminDb, { roomId, stableUid, authUid, nowMs: nowMs + 1 }),
    ]);
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ ok: true, alreadyLeft: false, refundedGems: 5, potGems: 0 }),
      expect.objectContaining({ ok: true, alreadyLeft: true, refundedGems: 5, potGems: 0 }),
    ]));
    expect((await roomRef.get()).data()).toMatchObject({
      players: [], participantAuthUids: [], potGems: 0, version: 2,
    });
    await runtime.tournamentJoinTransaction(adminDb, { roomId, stableUid, authUid, nowMs: nowMs + 2 });
    await expect(runtime.tournamentLeaveTransaction(adminDb, {
      roomId, stableUid, authUid, nowMs: nowMs + 3,
    })).resolves.toMatchObject({ alreadyLeft: false, refundedGems: 5 });

    const eventDocs = await adminDb.collection('users').doc(stableUid)
      .collection('external_economy_events').get();
    const events = eventDocs.docs.map((snapshot) => snapshot.data());
    expect(events).toHaveLength(4);
    expect(events.filter((event) => event.source === 'tournament_entry').map((event) => event.delta)).toEqual([-5, -5]);
    expect(events.filter((event) => event.source === 'tournament_lobby_leave').map((event) => event.delta)).toEqual([5, 5]);
    expect(new Set(events.map((event) => event.eventId)).size).toBe(2);
    expect((await adminDb.collection('users').doc(stableUid).get()).data()?.shards).toBe(3);
  });

  it('removes a frozen test-mode entrant without charging or refunding gems', async () => {
    const nowMs = Date.now();
    const roomId = 'leave-test-lobby';
    const stableUid = 'leave-test-user';
    const authUid = 'leave-test-auth';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'leave-test', seed: roomId, state: 'lobby', startsAt: nowMs + 60_000,
        stateDeadlineAtMs: nowMs + 60_000, testMode: true,
        economySnapshot: {
          entryGems: 0, botEntryGems: 0, weeklyBankRate: 0,
          prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
        },
        potGems: 0,
        players: [{
          id: stableUid, name: stableUid, avatar: '🙂', color: '#000', score: 0, streak: 0,
          entry: { kind: 'ticket', ticketsSpent: 0, bankContributionGems: 0, weekId: '2026-W31' },
        }],
        participantAuthUids: [authUid], participantAuthUidsComplete: true,
        rounds: [], version: 1, createdAtMs: nowMs,
      }),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1')
        .set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
      adminDb.collection('users').doc(stableUid).set({ firebaseAuthUid: authUid, shards: 0 }),
      adminDb.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
    ]);

    await expect(runtime.tournamentLeaveTransaction(adminDb, {
      roomId, stableUid, authUid, nowMs,
    })).resolves.toMatchObject({ ok: true, alreadyLeft: false, refundedGems: 0, potGems: 0 });
    expect((await adminDb.collection('users').doc(stableUid).get()).data()?.shards).toBe(0);
    expect((await roomRef.get()).data()?.players).toEqual([]);
  });

  it('rejects lobby leave after the tournament has started without mutating economy', async () => {
    const nowMs = Date.now();
    const roomId = 'leave-active-room';
    const stableUid = 'leave-active-user';
    const authUid = 'leave-active-auth';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        slotId: 'leave-active', seed: roomId, state: 'round1', startsAt: nowMs - 1,
        economySnapshot: {
          entryGems: 3, botEntryGems: 3, weeklyBankRate: 0.2,
          prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
        },
        potGems: 3,
        players: [{
          id: stableUid, name: stableUid, avatar: '🙂', color: '#000', score: 0, streak: 0,
          entry: { kind: 'ticket', ticketsSpent: 0, bankContributionGems: 3, weekId: '2026-W31' },
        }],
        participantAuthUids: [authUid], participantAuthUidsComplete: true,
        rounds: [], version: 1, createdAtMs: nowMs,
      }),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1')
        .set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
      adminDb.collection('users').doc(stableUid).set({ firebaseAuthUid: authUid, shards: 3 }),
      adminDb.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
    ]);
    await expect(runtime.tournamentLeaveTransaction(adminDb, {
      roomId, stableUid, authUid, nowMs,
    })).rejects.toThrow('room_not_leaveable');
    expect((await roomRef.get()).data()).toMatchObject({ potGems: 3, version: 1 });
    expect((await adminDb.collection('users').doc(stableUid).get()).data()?.shards).toBe(3);
  });

  it('records an explicit active forfeit once without refunding or removing the fair-result participant', async () => {
    const nowMs = Date.now();
    const roomId = 'forfeit-active-room';
    const stableUid = 'forfeit-active-user';
    const authUid = 'forfeit-active-auth';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'forfeit-active', seed: roomId, state: 'round1', startsAt: nowMs - 10_000,
        stateStartedAtMs: nowMs - 10_000, stateDeadlineAtMs: nowMs + 20_000,
        economySnapshot: {
          entryGems: 3, botEntryGems: 3, weeklyBankRate: 0.2,
          prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
        },
        potGems: 6,
        players: [
          {
            id: stableUid, name: stableUid, avatar: '🙂', color: '#000', score: 9, streak: 2,
            entry: { kind: 'ticket', ticketsSpent: 0, bankContributionGems: 3, weekId: '2026-W31' },
          },
          { id: 'other-player', name: 'Other', avatar: '🙂', color: '#111', score: 1, streak: 0 },
        ],
        participantAuthUids: [authUid], participantAuthUidsComplete: true,
        rounds: [1, 2, 3, 4].map((roundNo) => ({
          roundNo, mode: 'guess_phrase', taskIds: [`forfeit-task-${roundNo}`], results: {},
        })),
        version: 1, createdAtMs: nowMs - 60_000,
      }),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1')
        .set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
      adminDb.collection('users').doc(stableUid).set({ firebaseAuthUid: authUid, shards: 3 }),
      adminDb.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
    ]);

    await expect(runtime.tournamentForfeitTransaction(adminDb, {
      roomId, stableUid, authUid, confirmed: false, nowMs,
    })).rejects.toThrow('forfeit_confirmation_required');
    const first = await runtime.tournamentForfeitTransaction(adminDb, {
      roomId, stableUid, authUid, confirmed: true, nowMs,
    });
    const replay = await runtime.tournamentForfeitTransaction(adminDb, {
      roomId, stableUid, authUid, confirmed: true, nowMs: nowMs + 1,
    });
    expect(first).toMatchObject({ ok: true, alreadyForfeited: false, refundedGems: 0, potGems: 6 });
    expect(replay).toMatchObject({ ok: true, alreadyForfeited: true, refundedGems: 0, potGems: 6 });
    const room = (await roomRef.get()).data();
    expect(room?.players.find((entry: { id: string }) => entry.id === stableUid)).toMatchObject({
      score: 9, forfeitedAtMs: nowMs, forfeitState: 'round1',
    });
    expect(room?.rounds.every((entry: { results: Record<string, unknown> }) => (
      entry.results[stableUid] !== undefined
    ))).toBe(true);
    expect((await adminDb.collection('users').doc(stableUid).get()).data()?.shards).toBe(3);
    expect((await adminDb.collection('users').doc(stableUid)
      .collection('tournament_receipts').doc(`forfeit_${roomId}`).get()).data()).toMatchObject({
      kind: 'tournament_active_forfeit_v1', refundedGems: 0, potGems: 6,
    });
  });

  it('expires public review after 24 hours while retaining private evidence for seven days', async () => {
    const nowMs = Date.now();
    const reviewRetentionMs = 24 * 60 * 60 * 1000;
    const evidenceRetentionMs = 7 * reviewRetentionMs;
    const finalizedAtMs = nowMs - 10_000;
    const reviewRetentionUntilMs = finalizedAtMs + reviewRetentionMs;
    const privateEvidenceRetentionUntilMs = finalizedAtMs + evidenceRetentionMs;
    const roomId = 'closed-review-retention';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await Promise.all([
      roomRef.set({
        roomId, slotId: 'retention', seed: roomId, state: 'rewards', startsAt: nowMs - 60_000,
        stateDeadlineAtMs: nowMs, players: [], participantAuthUids: [],
        finalizedAtMs, reviewRetentionUntilMs, privateEvidenceRetentionUntilMs,
        participantAuthUidsComplete: true, rounds: [], version: 4, createdAtMs: nowMs - 120_000,
      }),
      roomRef.collection('taskSecrets').doc('played-task').set({
        taskId: 'played-task', mode: 'choice', payload: { phrase: 'Private', correctIndex: 0 },
      }),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1')
        .set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
    ]);

    await expect(runtime.advanceRoomAtDeadline(adminDb, roomRef, { nowMs: () => nowMs }))
      .resolves.toBe('advanced');

    const [closed, secret, metadata] = await Promise.all([
      roomRef.get(),
      roomRef.collection('taskSecrets').doc('played-task').get(),
      roomRef.collection('taskSecrets').doc('__bot_simulation_v1').get(),
    ]);
    expect(closed.data()).toMatchObject({
      state: 'closed', finalizedAtMs, reviewRetentionUntilMs, privateEvidenceRetentionUntilMs,
    });
    expect(secret.exists).toBe(true);
    expect(secret.data()?.expireAt.toMillis()).toBe(privateEvidenceRetentionUntilMs);
    expect(metadata.exists).toBe(true);
    expect(metadata.data()?.expireAt.toMillis()).toBe(privateEvidenceRetentionUntilMs);

    const participant = environment.authenticatedContext('review-retention-participant').firestore();
    await assertFails(getDoc(doc(participant, 'tournamentRooms', roomId, 'taskSecrets', 'played-task')));

    await expect(runtime.cleanupExpiredTournamentReviewEvidence(adminDb, {
      nowMs: reviewRetentionUntilMs,
    })).resolves.toEqual({ scanned: 0, deleted: 0 });
    expect((await roomRef.collection('taskSecrets').doc('played-task').get()).exists).toBe(true);

    await expect(runtime.cleanupExpiredTournamentReviewEvidence(adminDb, {
      nowMs: privateEvidenceRetentionUntilMs,
    })).resolves.toEqual({ scanned: 2, deleted: 2 });
    expect((await roomRef.collection('taskSecrets').doc('played-task').get()).exists).toBe(false);
    expect((await roomRef.collection('taskSecrets').doc('__bot_simulation_v1').get()).exists).toBe(false);
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
    await Promise.all([
      adminDb.collection('tournamentRooms').doc('prod-final').set({
        slotId: 'runtime', seed: 'prod-final', state: 'results', startsAt: finalStartsAt,
        stateDeadlineAtMs: nowMs - 1,
        players: [{ ...player('final-u1'), score: 100 }, { ...player('final-u2'), score: 50 }],
        participantAuthUids: ['final-auth-1', 'final-auth-2'], participantAuthUidsComplete: true,
        rounds: [], version: 4, createdAtMs: nowMs - 200_000,
      }),
      adminDb.collection('tournamentRooms').doc('prod-final').collection('taskSecrets')
        .doc('__bot_simulation_v1').set({ kind: 'bot_simulation_v1', expectedBotCount: 0, bots: [] }),
    ]);
    await Promise.all([
      runtime.tournamentFinalizeTransaction(adminDb, 'prod-final', nowMs),
      runtime.tournamentFinalizeTransaction(adminDb, 'prod-final', nowMs + 1),
    ]);
    const finalizedRoom = (await adminDb.collection('tournamentRooms').doc('prod-final').get()).data()!;
    expect(finalizedRoom.players.map((entry: Record<string, unknown>) => ({
      id: entry.id, resultPlace: entry.resultPlace, rewardGems: entry.rewardGems,
    }))).toEqual([
      { id: 'final-u1', resultPlace: 1, rewardGems: 4 },
      { id: 'final-u2', resultPlace: 2, rewardGems: 1 },
    ]);
    expect([nowMs, nowMs + 1]).toContain(finalizedRoom.finalizedAtMs);
    expect(finalizedRoom.reviewRetentionUntilMs)
      .toBe(finalizedRoom.finalizedAtMs + 24 * 60 * 60 * 1000);
    expect(finalizedRoom.privateEvidenceRetentionUntilMs)
      .toBe(finalizedRoom.finalizedAtMs + 7 * 24 * 60 * 60 * 1000);
    const season = await adminDb.collection('tournamentSeasons').doc(tournamentWeekId(finalStartsAt))
      .collection('entries').doc('final-u1').get();
    expect(season.data()?.points).toBe(25);
    expect(season.data()?.tournamentsPlayed).toBe(1);
    // Finalization itself issues the reward: no results screen or claim callable
    // is required for the player's balance to become correct.
    expect((await adminDb.collection('users').doc('final-u1').get()).data()?.shards).toBe(4);
    const issuedReceipt = await adminDb.collection('users').doc('final-u1')
      .collection('tournament_receipts').doc('reward_prod-final').get();
    expect(issuedReceipt.data()).toMatchObject({ claimed: true, roomId: 'prod-final', place: 1 });
    const replayedClaims = await Promise.all([
      runtime.tournamentClaimTransaction(adminDb, 'final-u1', 'prod-final', nowMs + 2),
      runtime.tournamentClaimTransaction(adminDb, 'final-u1', 'prod-final', nowMs + 3),
    ]);
    expect(replayedClaims.every((claim) => claim.alreadyClaimed === true)).toBe(true);
    // Two entrants create a six-gem pot: one gem to the weekly bank, four to first place.
    expect((await adminDb.collection('users').doc('final-u1').get()).data()?.shards).toBe(4);
    expect((await adminDb.collection('users').doc('final-u1').collection('inventory').doc('tickets').get()).data()?.count).toBe(0);
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
      entry: { kind: 'ticket', ticketsSpent: 0, bankContributionGems: 3, weekId },
    });
    const entrants = Array.from({ length: 8 }, (_, index) => entrant(`oversize-u${index + 1}`));
    await Promise.all([
      roomRef.set({
        slotId: 'runtime', seed: 'prod-oversized-fill', state: 'lobby', startsAt: nowMs + 60_000,
        ticketsRequired: 1, players: entrants,
        participantAuthUids: entrants.map((_, index) => `oversize-auth-${index + 1}`), participantAuthUidsComplete: true,
        gatherStartedAtMs: nowMs - core.TOURNAMENT_ROOM_GATHER_MS - 1,
        rounds: [], version: 2, createdAtMs: nowMs - 10_000,
      }),
      ...entrants.flatMap((candidate) => [
        adminDb.collection('users').doc(candidate.id).set({ shards: 0 }),
        adminDb.collection('users').doc(candidate.id).collection('inventory').doc('tickets').set({ count: 0 }),
      ]),
      // Unrelated finalized weekly funds must not be debited by cancellation.
      adminDb.collection('tournamentBank').doc(weekId).set({ total: 17 }),
    ]);
    const tasks = approvedTextTasks('oversize-text');
    const curatedRounds = approvedCuratedRounds('oversize-text');
    const bots = Array.from({ length: 8 }, (_, index) => ({
      botId: `oversize-bot-${index}`, name: `Bot ${index}`, avatarEmoji: '🤖', color: '#123456',
      winRate: 0.5, rank: 'silver', titles: [],
    }));

    const outcomes = await Promise.all([
      runtime.tournamentFillRoomTransaction(adminDb, roomRef, { bots, tasks, curatedRounds }, { nowMs: () => nowMs }),
      runtime.tournamentFillRoomTransaction(adminDb, roomRef, { bots, tasks, curatedRounds }, { nowMs: () => nowMs + 1 }),
    ]);
    expect(outcomes).toContain('cancelled_resources');
    expect((await roomRef.get()).data()?.state).toBe('cancelled');
    for (const { id: uid } of entrants) {
      expect((await adminDb.collection('users').doc(uid).collection('inventory').doc('tickets').get()).data()?.count).toBe(0);
      expect((await adminDb.collection('users').doc(uid).get()).data()?.shards).toBe(6);
      expect((await adminDb.collection('users').doc(uid).collection('tournament_receipts')
        .doc('cancel_prod-oversized-fill').get()).exists).toBe(true);
    }
    expect((await adminDb.collection('tournamentBank').doc(weekId).get()).data()?.total).toBe(17);
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
        gatherStartedAtMs: nowMs - core.TOURNAMENT_ROOM_GATHER_MS - 1,
        rounds: [], version: 2, createdAtMs: nowMs - 10_000,
      }),
      adminDb.collection('users').doc('transient-fill-u1').set({ shards: 0 }),
      adminDb.collection('users').doc('transient-fill-u2').set({ shards: 0 }),
      adminDb.collection('users').doc('transient-fill-u1').collection('inventory').doc('tickets').set({ count: 0 }),
      adminDb.collection('users').doc('transient-fill-u2').collection('inventory').doc('tickets').set({ count: 0 }),
    ]);
    const tasks = approvedTextTasks('transient-text');
    const curatedRounds = approvedCuratedRounds('transient-text');
    const bots = Array.from({ length: 8 }, (_, index) => ({
      botId: `transient-bot-${index}`, name: `Bot ${index}`, avatarEmoji: '🤖', color: '#123456',
      winRate: 0.5, rank: 'silver', titles: [],
    }));
    const before = (await roomRef.get()).data();
    const transient = new Error('firestore_unavailable');
    await expect(runtime.tournamentFillRoomTransaction(adminDb, roomRef, { bots, tasks, curatedRounds }, {
      nowMs: () => nowMs,
      beforeWrites: () => { throw transient; },
    })).rejects.toBe(transient);
    expect((await roomRef.get()).data()).toEqual(before);
    expect((await adminDb.collection('users').doc('transient-fill-u1').collection('inventory').doc('tickets').get()).data()?.count).toBe(0);
    expect((await adminDb.collection('users').doc('transient-fill-u1').collection('tournament_receipts')
      .doc('cancel_prod-transient-fill').get()).exists).toBe(false);

    await expect(runtime.tournamentFillRoomTransaction(
      adminDb, roomRef, { bots, tasks, curatedRounds }, { nowMs: () => nowMs + 1 },
    )).resolves.toBe('filled');
    expect((await roomRef.get()).data()?.ready).toBe(true);
  });

  it('atomically funds bot arrivals without manufacturing reactions and preserves a human reaction', async () => {
    const nowMs = Date.now();
    const roomId = 'progressive-funded-bots';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      roomId, slotId: 'runtime', seed: roomId, state: 'lobby', startsAt: nowMs + 90_000,
      economySnapshot: {
        entryGems: 3, botEntryGems: 2, weeklyBankRate: 0.2,
        prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
      },
      potGems: 3,
      players: [{ id: 'funded-human', name: 'Human', avatar: '🙂', color: '#000', score: 0, streak: 0 }],
      participantAuthUids: ['funded-auth'], participantAuthUidsComplete: true,
      gatherStartedAtMs: nowMs - core.TOURNAMENT_ROOM_GATHER_MS - 1,
      rounds: [], version: 1, createdAtMs: nowMs - 60_000,
    });
    await roomRef.collection('reactions').doc('funded-auth').set({
      emoji: '👍', atMs: nowMs - 1, name: 'Human',
    });
    const tasks = approvedTextTasks('funded-bot-text');
    const curatedRounds = approvedCuratedRounds('funded-bot-text');
    const bots = Array.from({ length: 15 }, (_, index) => ({
      botId: `funded-bot-${index}`, name: `Bot ${index}`, avatarEmoji: '🤖', color: '#123456',
      winRate: 0.5, rank: 'silver', titles: [],
    }));

    await expect(runtime.tournamentFillRoomTransaction(
      adminDb, roomRef, { bots, tasks, curatedRounds }, { nowMs: () => nowMs },
    )).resolves.toBe('filled');
    const room = (await roomRef.get()).data();
    expect(room?.potGems).toBe(33);
    expect(room?.lobbyEvents).toHaveLength(15);
    expect(room?.lobbyEvents.map((event: Record<string, unknown>) => event.atMs))
      .toEqual(room?.lobbyEvents.map((event: Record<string, unknown>) => event.atMs).slice().sort((a: number, b: number) => a - b));
    expect(room?.lobbyEvents[0]).toMatchObject({ kind: 'bot_arrival', potDeltaGems: 2, potGemsAfter: 5 });
    expect(room?.lobbyEvents.at(-1)).toMatchObject({ kind: 'bot_arrival', potDeltaGems: 2, potGemsAfter: 33 });
    const reactions = await roomRef.collection('reactions').get();
    expect(reactions.docs.map((reaction) => reaction.id)).toEqual(['funded-auth']);
    expect(reactions.docs[0].data()).toEqual({ emoji: '👍', atMs: nowMs - 1, name: 'Human' });
    expect(reactions.docs.some((reaction) => reaction.id.startsWith('server_bot_'))).toBe(false);
  });

  it('keeps progressive bot pot events zero-value in immutable test mode', async () => {
    const nowMs = Date.now();
    const roomId = 'progressive-test-bots';
    const roomRef = adminDb.collection('tournamentRooms').doc(roomId);
    await roomRef.set({
      roomId, slotId: 'dev-test', seed: roomId, state: 'lobby', startsAt: nowMs + 90_000,
      testMode: true,
      economySnapshot: {
        entryGems: 0, botEntryGems: 0, weeklyBankRate: 0,
        prizeShares: [0.6, 0.25, 0.15], weeklyShares: [0.6, 0.25, 0.15],
      },
      potGems: 0,
      players: [{ id: 'test-human', name: 'Human', avatar: '🙂', color: '#000', score: 0, streak: 0 }],
      participantAuthUids: ['test-auth'], participantAuthUidsComplete: true,
      gatherStartedAtMs: nowMs - core.TOURNAMENT_ROOM_GATHER_MS - 1,
      rounds: [], version: 1, createdAtMs: nowMs - 60_000,
    });
    const tasks = approvedTextTasks('test-bot-text');
    const curatedRounds = approvedCuratedRounds('test-bot-text');
    const bots = Array.from({ length: 15 }, (_, index) => ({
      botId: `test-bot-${index}`, name: `Bot ${index}`, avatarEmoji: '🤖', color: '#123456',
      winRate: 0.5, rank: 'silver', titles: [],
    }));

    await expect(runtime.tournamentFillRoomTransaction(
      adminDb, roomRef, { bots, tasks, curatedRounds }, { nowMs: () => nowMs },
    )).resolves.toBe('filled');
    const room = (await roomRef.get()).data();
    expect(room?.potGems).toBe(0);
    expect(room?.lobbyEvents).toHaveLength(15);
    expect(room?.lobbyEvents.every((event: Record<string, unknown>) => (
      event.potDeltaGems === 0 && event.potGemsAfter === 0
    ))).toBe(true);
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
