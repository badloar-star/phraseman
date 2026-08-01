import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

jest.setTimeout(60_000);

process.env.PHRASEMAN_TOURNAMENT_TEST_MODE_RELEASE = '1';

const runtime = require('./tournaments') as Record<string, any>;
const core = require('./tournament_core') as Record<string, any>;

const PROJECT_ID = 'demo-phraseman-tournament-start-now';

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
        const rightOptions = ['one', 'two', 'three', 'four', 'five', 'six'];
        return {
          taskId,
          mode,
          isVoice: false,
          difficulty,
          payload: {
            prompt: 'Match the pairs',
            rightOptions,
            items: rightOptions.map((rightOption, itemIndex) => ({
              prompt: `word-${itemIndex + 1}`,
              options: rightOptions,
              correctIndex: itemIndex,
              explanation: {
                ruleNote: `${rightOption} is the exact match.`,
                example: `word-${itemIndex + 1} means ${rightOption}.`,
                wrongOptionReasons: rightOptions.map((_, optionIndex) => (
                  optionIndex === itemIndex ? '' : 'This is another pair.'
                )),
              },
            })),
          },
          explanation: {
            ruleNote: 'Match every item to its exact meaning.',
            example: 'word-1 means one.',
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
    const tasks = publishedTasksWithRequiredExplanations('start-now');
    expect(tasks.flatMap((task) => {
      const { source: _source, ...runtimeTask } = task;
      const validation = core.validateTournamentTaskForNewRoom(runtimeTask);
      return validation.ok ? [] : [{ taskId: task.taskId, reason: validation.reason }];
    })).toEqual([]);

    const writes: Promise<unknown>[] = [
      db.collection('tournamentSchedule').doc('config').set({ slots: [] }),
      db.collection('tournamentSchedule').doc('economy').set({}),
      db.collection('users').doc('stable-start-now').set({
        firebaseAuthUid: 'auth-start-now',
        shards: 0,
      }),
      db.collection('auth_links').doc('auth-start-now').set({ stable_id: 'stable-start-now' }),
      db.collection('leaderboard').doc('stable-start-now').set({ name: 'Start Now Player' }),
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
    await db.terminate();
    await deleteApp(app);
  });

  it('creates and joins a room from the valid published task contract', async () => {
    await expect(runtime.tournamentStartNow.run({
      auth: { uid: 'auth-start-now', token: {} },
      data: {},
      rawRequest: { headers: {} },
      app: { appId: 'emulator-test' },
    })).resolves.toMatchObject({ ok: true, joined: true, roomId: expect.any(String) });
  });
});
