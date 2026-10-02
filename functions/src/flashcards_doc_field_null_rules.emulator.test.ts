import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, FieldPath, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/*
 * Account V2, Пакет 8H-2 — правила users/{id} пропускают обнуление выгруженных ключей карточек.
 *
 * зачем: клиент после успешной записи flashcard_pages ставит progress.<ключ> = null точечным
 * update по FieldPath (app/cloud_sync.ts doSyncToCloud). Если правила отклонят такой update,
 * упадёт ВЕСЬ патч прогресса вместе с ним. Сторож доказывает на эмуляторе: null проходит
 * для обоих выгружаемых ключей, а заблокированный ключ в том же патче по-прежнему режется.
 */

const PROJECT_ID = 'demo-phraseman-flashcards-doc-field-null';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const EN = 'flashcards_v1';
const FR = 'flashcards_v2::fr::flashcards_v1';

describe('8H-2: progress.<flashcards key> = null (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  }, 30_000);

  afterAll(async () => environment?.cleanup(), 30_000);

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'auth_links', 'auth-a'), { stable_id: 'stable-a' });
      await setDoc(doc(db, 'users', 'stable-a'), {
        firebaseAuthUid: 'auth-a',
        progress: {
          [EN]: JSON.stringify([{ id: 'stale-card' }]),
          [FR]: JSON.stringify([{ id: 'stale-fr' }]),
          user_name: 'A',
          user_total_xp: '100',
        },
      });
    });
  });

  it('владелец обнуляет оба выгружаемых ключа точечным update; остальной progress цел', async () => {
    const db = environment.authenticatedContext('auth-a').firestore();
    const ref = doc(db, 'users', 'stable-a');
    await assertSucceeds(updateDoc(ref, new FieldPath('progress', EN), null, new FieldPath('progress', FR), null));
    await environment.withSecurityRulesDisabled(async (context) => {
      const snap = await getDoc(doc(context.firestore(), 'users', 'stable-a'));
      const progress = (snap.data()?.progress ?? {}) as Record<string, unknown>;
      expect(progress[EN]).toBeNull();
      expect(progress[FR]).toBeNull();
      expect(progress.user_name).toBe('A');
      expect(progress.user_total_xp).toBe('100');
    });
  });

  it('null вместе с обычным ключом прогресса в одном патче проходит', async () => {
    const db = environment.authenticatedContext('auth-a').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'stable-a'),
      new FieldPath('progress', EN), null,
      new FieldPath('progress', 'user_name'), 'B'));
  });

  it('контроль: заблокированный ключ в том же патче режет весь update (правила реально исполняются)', async () => {
    const db = environment.authenticatedContext('auth-a').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'stable-a'),
      new FieldPath('progress', EN), null,
      new FieldPath('progress', 'user_total_xp'), null));
  });

  it('чужой аккаунт обнулить не может', async () => {
    const db = environment.authenticatedContext('auth-b').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'stable-a'), new FieldPath('progress', EN), null));
  });
});
