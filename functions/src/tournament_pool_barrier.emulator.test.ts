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

  test('accepts a bucketed v8 barrier token so rooms can actually be created', async () => {
    // зачем 2026-08-02 (владелец: «турниры не работают»): это был ПРОДОВЫЙ
    // блокер. Пул хранил из токена только generation+revision, и все пять
    // вызовов assertTournamentPoolCommitAllowed собирали из них НЕПОЛНЫЙ токен.
    // Внутри сравнение идёт через sameTournamentPoolBarrierToken, которое
    // проверяет ещё exposureBucketCounts и exposureLayoutHash. У токена из базы
    // они есть, у собранного вручную — нет, поэтому сравнение всегда давало
    // false: крон createRooms падал каждые 5 минут с
    // tournament_pool_generation_changed, комнат не появлялось, а игрок видел
    // «Не удалось войти». Тест держит именно этот случай — bucketed-поколение.
    const barrierRef = db.collection(core.TOURNAMENT_PRIVATE_STATE_COLLECTION)
      .doc(core.TOURNAMENT_POOL_BARRIER_DOC);
    const roomRef = db.collection(core.TOURNAMENT_ROOMS_COLLECTION)
      .doc(`bucketed-pool-room-${process.pid}`);
    const exposureBucketCounts = {
      guess_phrase: 30,
      fill_gap: 13,
      find_oddity: 10,
      translate_build: 38,
      speed_match: 10,
    };
    const exposureLayoutHash = 'a'.repeat(64);
    await barrierRef.set({
      kind: core.TOURNAMENT_POOL_BARRIER_KIND,
      state: 'ready',
      generation: 'tpool_20260801_v8',
      revision: 10,
      exposureBucketCounts,
      exposureLayoutHash,
    });

    // Токен ровно в том виде, в каком его теперь несёт пул: целиком, а не
    // пересобранный из двух полей.
    const fullToken = {
      generation: 'tpool_20260801_v8',
      revision: 10,
      exposureBucketCounts,
      exposureLayoutHash,
    };

    await db.runTransaction(async (tx) => {
      const generation = await runtime.assertTournamentPoolCommitAllowed(tx, db, fullToken);
      expect(generation).toBe('tpool_20260801_v8');
      tx.create(roomRef, { roomId: roomRef.id, state: 'scheduled', taskPoolGeneration: generation });
    });
    expect((await roomRef.get()).exists).toBe(true);

    // Обратная граница: огрызок токена (то, что передавалось до правки) обязан
    // быть отвергнут — иначе защита от миграции перестала бы работать вовсе.
    const strippedRoomRef = db.collection(core.TOURNAMENT_ROOMS_COLLECTION)
      .doc(`bucketed-pool-room-stripped-${process.pid}`);
    await expect(db.runTransaction(async (tx) => {
      await runtime.assertTournamentPoolCommitAllowed(tx, db, {
        generation: 'tpool_20260801_v8',
        revision: 10,
      });
      tx.create(strippedRoomRef, { roomId: strippedRoomRef.id });
    })).rejects.toThrow('tournament_pool_generation_changed');
    expect((await strippedRoomRef.get()).exists).toBe(false);
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
