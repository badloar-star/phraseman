import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-dialogue-v2-memory-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const RULES = readFileSync(RULES_PATH, 'utf8');
const SERVER_ONLY_DENY = 'allow get, list, create, update, delete: if false;';

describe('Dialogue V2 memory is callable-only (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: RULES },
    });
  }, 30_000);

  afterAll(async () => environment?.cleanup(), 30_000);

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'stable-a'), {
        firebaseAuthUid: 'auth-a',
      });
      await setDoc(
        doc(context.firestore(), 'users/stable-a/dialogue_v2_memory', 'shared-a'),
        { summary: 'server-authored' },
      );
      await setDoc(
        doc(context.firestore(), 'users/stable-a/dialogue_v2_memory/shared-a/threads', 'thread-a'),
        { cursor: 1 },
      );
    });
  }, 30_000);

  it('contains explicit deny rules for the shared record and nested threads', () => {
    const memoryBlock = RULES.match(
      /match \/dialogue_v2_memory\/\{sharedId\} \{[\s\S]*?\n      \}/,
    );

    expect(memoryBlock).not.toBeNull();
    expect(memoryBlock![0]).toContain('match /threads/{threadId} {');
    expect(memoryBlock![0].split(SERVER_ONLY_DENY)).toHaveLength(3);
    expect(memoryBlock![0]).not.toContain('userDocOwnerMatchesAuth');
    expect(memoryBlock![0]).not.toContain('isAdmin()');
  });

  for (const claims of [{}, { admin: true }]) {
    const label = 'admin' in claims ? 'browser admin' : 'owner';

    it(`${label} cannot directly access shared dialogue memory`, async () => {
      const db = environment.authenticatedContext('auth-a', claims).firestore();
      const existing = doc(db, 'users/stable-a/dialogue_v2_memory', 'shared-a');

      await assertFails(getDoc(existing));
      await assertFails(getDocs(collection(db, 'users/stable-a/dialogue_v2_memory')));
      await assertFails(setDoc(doc(db, 'users/stable-a/dialogue_v2_memory', 'new'), { forged: true }));
      await assertFails(updateDoc(existing, { forged: true }));
      await assertFails(deleteDoc(existing));
    });

    it(`${label} cannot directly access dialogue thread state`, async () => {
      const db = environment.authenticatedContext('auth-a', claims).firestore();
      const threadCollection = collection(
        db,
        'users/stable-a/dialogue_v2_memory/shared-a/threads',
      );
      const existing = doc(threadCollection, 'thread-a');

      await assertFails(getDoc(existing));
      await assertFails(getDocs(threadCollection));
      await assertFails(setDoc(doc(threadCollection, 'new'), { forged: true }));
      await assertFails(updateDoc(existing, { forged: true }));
      await assertFails(deleteDoc(existing));
    });
  }
});
