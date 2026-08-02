/**
 * Правило чтения tournamentRooms — поведенческая проверка на эмуляторе.
 *
 * зачем 2026-08-02 (владелец: «при входе в турнир сразу — не удалось войти»):
 * режим был сломан наглухо. Клиент вычисляет id комнаты слота сам, по формуле,
 * НЕ читая базу, а документ комнаты создаётся сервером только в момент входа.
 * Подписка стартовала на ещё несуществующий документ, у него нет resource.data,
 * поэтому правило падало с PERMISSION_DENIED — и клиент показывал «Не удалось
 * войти», хотя вход даже не начинался.
 *
 * Снимок формулировок (tests/firestore_rules_security.test.ts) такую поломку
 * поймать не мог: текст правила был синтаксически корректен. Нужна проверка
 * ПОВЕДЕНИЯ, поэтому тест гоняет настоящие запросы против эмулятора.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

jest.setTimeout(60_000);

const PROJECT_ID = 'demo-phraseman-tournament-rules';
const ROOM_ID = 'day-1200_Europe_Moscow_2026-08-02';

describe('tournamentRooms read rule', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port: Number(port),
        rules: readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => { await env?.cleanup(); });
  beforeEach(async () => { await env.clearFirestore(); });

  test('lets a signed-in player subscribe to a room that does not exist yet', async () => {
    // Это и есть починенный сценарий: игрок открывает турнир, клиент считает id
    // слота и подписывается ДО того, как сервер создал комнату.
    const db = env.authenticatedContext('player-1').firestore();
    await assertSucceeds(db.collection('tournamentRooms').doc(ROOM_ID).get());
  });

  test('still lets anyone signed in read an open lobby', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('tournamentRooms').doc(ROOM_ID)
        .set({ state: 'lobby', players: [], participantAuthUids: [] });
    });
    const db = env.authenticatedContext('player-2').firestore();
    await assertSucceeds(db.collection('tournamentRooms').doc(ROOM_ID).get());
  });

  test('still hides a closed room from a non-participant', async () => {
    // Граница, которую правка НЕ должна была ослабить: закрытую комнату видит
    // только её участник. Если этот тест позеленеет для чужого — правило дырявое.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('tournamentRooms').doc(ROOM_ID).set({
        state: 'closed',
        players: [{ id: 'owner-uid' }],
        participantAuthUids: ['owner-uid'],
        participantAuthUidsComplete: true,
      });
    });
    const stranger = env.authenticatedContext('stranger').firestore();
    await assertFails(stranger.collection('tournamentRooms').doc(ROOM_ID).get());
  });

  test('still lets a participant read their own closed room', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('tournamentRooms').doc(ROOM_ID).set({
        state: 'closed',
        players: [{ id: 'owner-uid' }],
        participantAuthUids: ['owner-uid'],
        participantAuthUidsComplete: true,
      });
    });
    const owner = env.authenticatedContext('owner-uid').firestore();
    await assertSucceeds(owner.collection('tournamentRooms').doc(ROOM_ID).get());
  });

  test('still denies an unauthenticated read of a missing room', async () => {
    // resource == null не должно открывать дверь анонимам: request.auth != null
    // остаётся обязательным.
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(anon.collection('tournamentRooms').doc(ROOM_ID).get());
  });

  test('keeps taskSecrets closed even for a participant', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('tournamentRooms').doc(ROOM_ID)
        .collection('taskSecrets').doc('task-1').set({ correctIndex: 0 });
    });
    const owner = env.authenticatedContext('owner-uid').firestore();
    await assertFails(
      owner.collection('tournamentRooms').doc(ROOM_ID)
        .collection('taskSecrets').doc('task-1').get(),
    );
  });
});
