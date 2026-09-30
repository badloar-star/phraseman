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

const PROJECT_ID = 'demo-phraseman-dialogue-v2-session-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('Dialogue V2 raw session context is callable-only (emulator)', () => {
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
      await setDoc(doc(context.firestore(), 'dialogue_v2_sessions', 'existing'), {
        ownerBinding: 'private-owner-binding',
        turns: [{ userText: 'private learner text' }],
      });
      await setDoc(doc(context.firestore(), 'dialogue_v2_session_terminals', 'existing'), {
        ownerBinding: 'private-owner-binding',
        state: 'completed',
        assessmentRaw: 'private generated assessment',
      });
    });
  }, 30_000);

  it.each([
    ['unauthenticated client', () => environment.unauthenticatedContext().firestore()],
    ['authenticated client', () => environment.authenticatedContext('auth-a').firestore()],
    [
      'browser admin',
      () => environment.authenticatedContext('admin-auth', { admin: true }).firestore(),
    ],
  ] as const)('%s cannot get/list/create/update/delete raw sessions', async (_label, dbFactory) => {
    const db = dbFactory();
    const existing = doc(db, 'dialogue_v2_sessions', 'existing');

    await assertFails(getDoc(existing));
    await assertFails(getDocs(collection(db, 'dialogue_v2_sessions')));
    await assertFails(setDoc(doc(db, 'dialogue_v2_sessions', 'new'), { forged: true }));
    await assertFails(updateDoc(existing, { forged: true }));
    await assertFails(deleteDoc(existing));

    const terminal = doc(db, 'dialogue_v2_session_terminals', 'existing');
    await assertFails(getDoc(terminal));
    await assertFails(getDocs(collection(db, 'dialogue_v2_session_terminals')));
    await assertFails(setDoc(doc(db, 'dialogue_v2_session_terminals', 'new'), { forged: true }));
    await assertFails(updateDoc(terminal, { forged: true }));
    await assertFails(deleteDoc(terminal));
  });
});
