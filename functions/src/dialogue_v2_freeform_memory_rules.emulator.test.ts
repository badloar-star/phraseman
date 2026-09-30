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

const PROJECT_ID = 'demo-phraseman-dialogue-v2-freeform-memory-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const RULES = readFileSync(RULES_PATH, 'utf8');

describe('Dialogue V2 Plus freeform permanent memory is server-only (emulator)', () => {
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
      await setDoc(doc(
        context.firestore(),
        'users/stable-user/dialogue_v2_freeform_memory/en',
      ), {
        schemaVersion: 1,
        kind: 'dialogue_v2_plus_freeform_memory',
        studyTarget: 'en',
        revision: 1,
        updatedAt: new Date(),
      });
    });
  }, 30_000);

  it('has an explicit deny-only nested collection', () => {
    const block = RULES.match(
      /match \/dialogue_v2_freeform_memory\/\{studyTarget\} \{[\s\S]*?\n      \}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow get, list, create, update, delete: if false;');
  });

  it.each([
    ['unauthenticated client', () => environment.unauthenticatedContext().firestore()],
    ['authenticated owner', () => environment.authenticatedContext('auth-user').firestore()],
    ['browser admin', () => environment.authenticatedContext('admin', { admin: true }).firestore()],
  ] as const)('%s cannot access freeform memory directly', async (_label, dbFactory) => {
    const db = dbFactory();
    const memory = collection(db, 'users/stable-user/dialogue_v2_freeform_memory');
    const existing = doc(memory, 'en');

    await assertFails(getDoc(existing));
    await assertFails(getDocs(memory));
    await assertFails(setDoc(doc(memory, 'fr'), { recentTopics: ['private'] }));
    await assertFails(updateDoc(existing, { revision: 2 }));
    await assertFails(deleteDoc(existing));
  });
});
