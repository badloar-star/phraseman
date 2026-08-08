import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

jest.setTimeout(60_000);

process.env.PHRASEMAN_TOURNAMENT_TEST_MODE_RELEASE = '1';

const runtime = require('./tournaments') as Record<string, any>;
const core = require('./tournament_core') as Record<string, any>;

const PROJECT_ID = 'demo-phraseman-tournament-start-now';
const FIXTURE_GENERATION = 'tournament-start-now-fixture-v1';

async function clearFixture(db: Firestore): Promise<void> {
  await Promise.all([
    'tournamentSchedule',
    'users',
    'auth_links',
    'banned_users',
    'leaderboard',
    'botProfiles',
    'tournamentTasks',
    'tournamentRooms',
    core.TOURNAMENT_PRIVATE_STATE_COLLECTION,
  ].map((collection) => db.recursiveDelete(db.collection(collection))));
}

function publishedTasksWithRequiredExplanations(prefix: string): Record<string, unknown>[] {
  return core.TOURNAMENT_ROUND_MODE_PLAN.flatMap(
    (modes: string[], roundIndex: number) => modes.map((mode, modeIndex) => {
      const taskId = `${prefix}-r${roundIndex + 1}-${modeIndex}-${mode}`;
      const difficulty = roundIndex < 2 ? 1 : roundIndex === 2 ? 2 : 3;
      if (mode === 'translate_build') {
        return {
          taskId,
          mode,
          isVoice: false,
          difficulty,
          payload: {
            phrase: `Build ${taskId}`,
            wordBank: ['I', 'am', 'ready', 'now'],
            correctTokenCount: 3,
            correctTokens: ['I', 'am', 'ready'],
            correctAnswer: 'I am ready',
          },
          explanation: {
            ruleNote: 'Use subject + be + adjective.',
            example: 'I am ready.',
            wrongOptionReasons: [],
          },
          tags: [],
          source: 'ai',
          verified: true,
        };
      }
      if (mode === 'speed_match') {
        const rightOptions = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
        const prompts = ['one', 'two', 'three', 'four', 'five', 'six'];
        return {
          taskId,
          mode,
          isVoice: false,
          difficulty,
          payload: {
            prompt: 'Match the pairs',
            rightOptions,
            items: rightOptions.map((rightOption, itemIndex) => ({
              prompt: prompts[itemIndex],
              options: rightOptions,
              correctIndex: itemIndex,
              explanation: {
                ruleNote: `${rightOption} is the exact match.`,
                example: `${prompts[itemIndex]} means ${rightOption}.`,
                wrongOptionReasons: rightOptions.map((_, optionIndex) => (
                  optionIndex === itemIndex ? '' : 'This is another pair.'
                )),
              },
            })),
          },
          explanation: {
            ruleNote: 'Match every item to its exact meaning.',
            example: 'one means один.',
            wrongOptionReasons: [],
          },
          tags: [],
          source: 'ai',
          verified: true,
        };
      }
      return {
        taskId,
        mode,
        isVoice: false,
        difficulty,
        payload: {
          phrase: `phrase ${taskId}`,
          options: [`answer ${taskId}`, `near ${taskId}`, `third ${taskId}`, `fourth ${taskId}`],
          correctIndex: 0,
          correctAnswer: `answer ${taskId}`,
        },
        explanation: {
          ruleNote: 'Choose the exact answer.',
          example: 'The first answer is correct.',
          wrongOptionReasons: ['', 'Wrong meaning.', 'Wrong grammar.', 'Wrong context.'],
        },
        tags: [],
        source: 'ai',
        verified: true,
      };
    }),
  );
}

describe('tournamentStartNow Firestore emulator regression', () => {
  let app: App;
  let db: Firestore;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    app = initializeApp({ projectId: PROJECT_ID });
    db = getFirestore(app);
    await clearFixture(db);
    const tasks = publishedTasksWithRequiredExplanations('start-now');
    expect(tasks.flatMap((task) => {
      const { source: _source, ...runtimeTask } = task;
      const validation = core.validateTournamentTaskForNewRoom(runtimeTask);
      return validation.ok ? [] : [{ taskId: task.taskId, reason: validation.reason }];
    })).toEqual([]);
    expect(runtime.buildTournamentRounds('start-now-preflight', tasks)).not.toBeNull();

    const writes: Promise<unknown>[] = [
      db.collection('tournamentSchedule').doc('config').set({ slots: [] }),
      db.collection('tournamentSchedule').doc('economy').set({
        entryGems: 9,
        botEntryGems: 7,
        weeklyBankRate: 0.33,
        prizeShares: [0.5, 0.3, 0.2],
        weeklyShares: [0.4, 0.35, 0.25],
      }),
      db.collection('users').doc('stable-start-now').set({
        firebaseAuthUid: 'auth-start-now',
        shards: 77,
      }),
      db.collection('auth_links').doc('auth-start-now').set({ stable_id: 'stable-start-now' }),
      db.collection('leaderboard').doc('stable-start-now').set({ name: 'Start Now Player' }),
      db.collection(core.TOURNAMENT_PRIVATE_STATE_COLLECTION)
        .doc(core.TOURNAMENT_POOL_BARRIER_DOC)
        .set({
          kind: core.TOURNAMENT_POOL_BARRIER_KIND,
          state: 'ready',
          generation: FIXTURE_GENERATION,
          revision: 1,
        }),
      ...Array.from({ length: core.TOURNAMENT_ROOM_SIZE * 2 }, (_, index) => (
        db.collection('botProfiles').doc(`start-now-bot-${index}`).set({
          name: `Bot ${index}`,
          avatarEmoji: '🤖',
          color: '#123456',
          winRate: 0.5,
          rank: 'silver',
          titles: [],
        })
      )),
      ...tasks.map((task) => {
        const { taskId, ...data } = task;
        return db.collection('tournamentTasks').doc(String(taskId)).set(data);
      }),
    ];
    await Promise.all(writes);
    for (const mode of new Set(core.TOURNAMENT_ROUND_MODE_PLAN.flat())) {
      const expected = tasks.filter((task) => task.mode === mode).length;
      const snapshot = await db.collection('tournamentTasks')
        .where('verified', '==', true)
        .where('source', '==', 'ai')
        .where('mode', '==', mode)
        .get();
      expect(snapshot.size).toBe(expected);
    }
  });

  afterAll(async () => {
    await clearFixture(db);
    await db.terminate();
    await deleteApp(app);
  });

  it('creates and joins a room from the valid published task contract', async () => {
    const result = await runtime.tournamentStartNow.run({
      auth: { uid: 'auth-start-now', token: {} },
      data: {},
      rawRequest: { headers: {} },
      app: { appId: 'emulator-test' },
    });
    expect(result).toMatchObject({
      ok: true,
      joined: true,
      roomId: expect.any(String),
      entryGems: 0,
      gemsLeft: 77,
    });

    const roomRef = db.collection(core.TOURNAMENT_ROOMS_COLLECTION).doc(result.roomId);
    const [roomSnap, secretsSnap, userSnap, recentSnap] = await Promise.all([
      roomRef.get(),
      roomRef.collection(core.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).get(),
      db.collection('users').doc('stable-start-now').get(),
      db.collection(core.TOURNAMENT_PRIVATE_STATE_COLLECTION)
        .doc('recent_bot_roster_v1').get(),
    ]);
    expect(roomSnap.exists).toBe(true);
    const room = roomSnap.data() || {};
    expect(room).toMatchObject({
      roomId: result.roomId,
      version: 1,
      ready: true,
      state: 'lobby',
      taskPoolGeneration: FIXTURE_GENERATION,
      participantAuthUids: ['auth-start-now'],
      participantAuthUidsComplete: true,
      economySnapshot: {
        entryGems: 0,
        botEntryGems: 0,
        weeklyBankRate: 0.33,
        prizeShares: [0.5, 0.3, 0.2],
        weeklyShares: [0.4, 0.35, 0.25],
      },
    });
    expect(room.players).toHaveLength(core.TOURNAMENT_ROOM_SIZE);
    expect(room.players.filter((player: Record<string, unknown>) => (
      player.id === 'stable-start-now'
    ))).toHaveLength(1);

    const metadataSnap = secretsSnap.docs.find((doc) => doc.id === '__bot_simulation_v1');
    expect(metadataSnap).toBeDefined();
    const metadata = metadataSnap!.data();
    expect(metadata).toMatchObject({
      kind: 'bot_simulation_v1',
      expectedBotCount: core.TOURNAMENT_ROOM_SIZE - 1,
    });
    expect(metadata.bots).toHaveLength(core.TOURNAMENT_ROOM_SIZE - 1);
    const botPlayerIds = new Set(metadata.bots.map((bot: Record<string, unknown>) => bot.playerId));
    expect(botPlayerIds.size).toBe(core.TOURNAMENT_ROOM_SIZE - 1);
    expect(room.players.filter((player: Record<string, unknown>) => (
      botPlayerIds.has(player.id)
    ))).toHaveLength(core.TOURNAMENT_ROOM_SIZE - 1);

    const selectedTaskIds = new Set(room.rounds.flatMap(
      (round: Record<string, any>) => round.taskIds,
    ));
    expect(secretsSnap.size).toBe(selectedTaskIds.size + 1);
    for (const taskId of selectedTaskIds) {
      const taskSnap = secretsSnap.docs.find((doc) => doc.id === taskId);
      expect(taskSnap).toBeDefined();
      expect(core.validateTournamentTaskForNewRoom(taskSnap!.data())).toMatchObject({ ok: true });
    }
    expect(recentSnap.data()).toMatchObject({
      kind: 'recent_tournament_bot_roster_v1',
      roomId: result.roomId,
    });
    expect(recentSnap.get('botProfileIds')).toHaveLength(core.TOURNAMENT_ROOM_SIZE - 1);
    expect(userSnap.get('shards')).toBe(77);
    expect(userSnap.get('tournament_last_slot_key')).toBeUndefined();
    expect(userSnap.get('tournament_last_slot_room_id')).toBeUndefined();
  });
});
