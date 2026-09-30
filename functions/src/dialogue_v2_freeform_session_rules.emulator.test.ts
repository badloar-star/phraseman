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

const PROJECT_ID = 'demo-phraseman-dialogue-v2-freeform-session-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const RULES = readFileSync(RULES_PATH, 'utf8');

describe('Dialogue V2 freeform session ledger is server-only (emulator)', () => {
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
      await setDoc(doc(context.firestore(), 'dialogue_v2_freeform_sessions', 'existing'), {
        schemaVersion: 1,
        kind: 'dialogue_v2_plus_freeform',
        ownerBinding: 'private-opaque-owner-binding',
        turns: [{ userMessage: 'private learner text' }],
      });
    });
  }, 30_000);

  it('has an explicit deny-only root and excludes it from overlapping admin access', () => {
    const block = RULES.match(
      /match \/dialogue_v2_freeform_sessions\/\{sessionId\} \{[\s\S]*?\n    \}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read, write: if false;');
    expect(block![0]).not.toContain('isAdmin()');
    expect(RULES).toContain("collection != 'dialogue_v2_freeform_sessions'");
  });

  it.each([
    ['unauthenticated client', () => environment.unauthenticatedContext().firestore()],
    ['authenticated owner', () => environment.authenticatedContext('auth-a').firestore()],
    [
      'browser admin',
      () => environment.authenticatedContext('admin-auth', { admin: true }).firestore(),
    ],
  ] as const)('%s cannot get/list/create/update/delete freeform sessions', async (_label, dbFactory) => {
    const db = dbFactory();
    const sessions = collection(db, 'dialogue_v2_freeform_sessions');
    const existing = doc(sessions, 'existing');

    await assertFails(getDoc(existing));
    await assertFails(getDocs(sessions));
    await assertFails(setDoc(doc(sessions, 'forged'), {
      ownerBinding: 'forged',
      clientPath: 'users/victim',
    }));
    await assertFails(updateDoc(existing, { ownerBinding: 'forged' }));
    await assertFails(deleteDoc(existing));
  });
});
