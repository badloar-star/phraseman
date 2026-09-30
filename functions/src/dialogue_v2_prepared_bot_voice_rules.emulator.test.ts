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

const PROJECT_ID = 'demo-phraseman-dialogue-v2-bot-voice-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const RULES = readFileSync(RULES_PATH, 'utf8');

describe('Dialogue V2 prepared bot voice state is server-only (emulator)', () => {
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
        doc(context.firestore(), 'users/stable-a/dialogue_v2_bot_voice_claims', 'daily'),
        { schemaVersion: 1, state: { dayKey: '2026-09-27' } },
      );
      await setDoc(
        doc(context.firestore(), 'users/stable-a/dialogue_v2_bot_voice_claims', 'turn_hash'),
        { schemaVersion: 1, selection: { preparedResponseId: 'server-only' } },
      );
    });
  }, 30_000);

  it('keeps an explicit deny-only nested rule without owner/admin exceptions', () => {
    const block = RULES.match(
      /match \/dialogue_v2_bot_voice_claims\/\{claimId\} \{[\s\S]*?\n      \}/,
    );

    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read, write: if false;');
    expect(block![0]).not.toContain('userDocOwnerMatchesAuth');
    expect(block![0]).not.toContain('isAdmin()');
  });

  it.each([
    ['owner', () => environment.authenticatedContext('auth-a').firestore()],
    ['browser admin', () => environment.authenticatedContext('admin-a', { admin: true }).firestore()],
  ] as const)('%s cannot get/list/create/update/delete claim or selection state', async (_label, dbFactory) => {
    const db = dbFactory();
    const claims = collection(db, 'users/stable-a/dialogue_v2_bot_voice_claims');
    const daily = doc(claims, 'daily');
    const turn = doc(claims, 'turn_hash');

    await assertFails(getDoc(daily));
    await assertFails(getDoc(turn));
    await assertFails(getDocs(claims));
    await assertFails(setDoc(doc(claims, 'turn_forged'), { selection: { forged: true } }));
    await assertFails(updateDoc(daily, { state: { dayKey: '2099-01-01' } }));
    await assertFails(deleteDoc(turn));
  });
});
