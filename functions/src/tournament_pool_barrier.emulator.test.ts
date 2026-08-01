import { readFileSync } from 'node:fs';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const runtime = require('./tournaments') as Record<string, (...args: any[]) => Promise<any>>;
const core = require('./tournament_core') as Record<string, any>;

const PROJECT_ID = 'demo-phraseman-tournament-pool-barrier';

jest.setTimeout(30_000);

describe('tournament task-pool migration barrier', () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    app = initializeApp({ projectId: PROJECT_ID }, `tournament-pool-barrier-${process.pid}`);
    db = getFirestore(app);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  test('a room writer that read before acquisition cannot commit stale pool references', async () => {
    const barrierRef = db.collection(core.TOURNAMENT_PRIVATE_STATE_COLLECTION)
      .doc(core.TOURNAMENT_POOL_BARRIER_DOC);
    const roomRef = db.collection(core.TOURNAMENT_ROOMS_COLLECTION).doc(`stale-pool-room-${process.pid}`);
    await barrierRef.set({
      kind: core.TOURNAMENT_POOL_BARRIER_KIND,
      state: 'ready',
      generation: 'pool-generation-old',
      revision: 1,
    });

    // This is the generation captured by loadResourcePool before the migration
    // acquisition. The task query itself is intentionally outside the later
    // room transaction; the in-transaction barrier read closes that gap.
    const generationReadBeforeAcquisition = (await barrierRef.get()).get('generation');

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(barrierRef);
      expect(snapshot.get('state')).toBe('ready');
      tx.update(barrierRef, {
        state: 'migrating',
        targetGeneration: 'pool-generation-new',
        migrationId: 'migration-under-test',
        revision: 2,
      });
    });

    const writer = db.runTransaction(async (tx) => {
      const generation = await runtime.assertTournamentPoolCommitAllowed(
        tx, db, generationReadBeforeAcquisition,
      );
      tx.create(roomRef, {
        roomId: roomRef.id,
        state: 'lobby',
        rounds: [{ roundNo: 1, mode: 'mix', taskIds: ['old-task-id'], results: {} }],
        taskPoolGeneration: generation,
      });
    });

    await expect(writer).rejects.toThrow('tournament_pool_migrating');
    expect((await roomRef.get()).exists).toBe(false);
  });

  test('shard creation and scheduled-room fill create task secrets inside their barrier transaction', () => {
    const source = readFileSync(`${__dirname}/tournaments.ts`, 'utf8');
    const shardStart = source.indexOf('async function createTournamentShardRoom');
    const playableStart = source.indexOf('async function ensureRoomPlayable', shardStart);
    const joinStart = source.indexOf('export const tournamentJoin', playableStart);
    const shardWriter = source.slice(shardStart, playableStart);
    const playableWriter = source.slice(playableStart, joinStart);

    expect(shardStart).toBeGreaterThan(-1);
    expect(playableStart).toBeGreaterThan(shardStart);
    expect(joinStart).toBeGreaterThan(playableStart);
    expect(shardWriter).toContain(
      'createTournamentTaskSecretsInTransaction(tx, roomRef, selectedTasks);',
    );
    expect(playableWriter).toContain(
      'createTournamentTaskSecretsInTransaction(tx, roomRef, selectedTasks);',
    );
    expect(shardWriter).not.toContain('db.batch()');
    expect(playableWriter).not.toContain('db.batch()');
  });

  test('the shared room-secret writer leaves no room or partial secrets when its transaction aborts', async () => {
    const roomRef = db.collection(core.TOURNAMENT_ROOMS_COLLECTION)
      .doc(`atomic-room-secrets-${process.pid}`);
    const existingSecretRef = roomRef.collection(core.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
      .doc('task-existing');
    await existingSecretRef.set({ marker: 'pre-existing' });

    await expect(db.runTransaction(async (tx) => {
      tx.create(roomRef, { roomId: roomRef.id, state: 'lobby' });
      await runtime.createTournamentTaskSecretsInTransaction(tx, roomRef, [
        { taskId: 'task-new', payload: { phrase: 'new' } },
        { taskId: existingSecretRef.id, payload: { phrase: 'collision' } },
      ]);
    })).rejects.toThrow();

    expect((await roomRef.get()).exists).toBe(false);
    expect((await roomRef.collection(core.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
      .doc('task-new').get()).exists).toBe(false);
    expect((await existingSecretRef.get()).data()).toEqual({ marker: 'pre-existing' });
  });
});
