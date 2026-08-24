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

const PROJECT_ID = 'demo-phraseman-tournament-semantic';
const RULES_PATH = process.env.TOURNAMENT_SEMANTIC_RULES_PATH
  ? path.resolve(process.env.TOURNAMENT_SEMANTIC_RULES_PATH)
  : path.resolve(__dirname, '../../firestore.rules');
const ROOTS = [
  'tournament_semantic_jobs',
  'tournament_semantic_review_receipts',
  'tournament_pool_v11_bundles',
] as const;
type RulesClientFirestore = ReturnType<
  ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore']
>;

jest.setTimeout(60_000);

describe('Tournament semantic v11 Firestore rules (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host, port: Number(port), rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => { await environment?.cleanup(); });

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      for (const root of ROOTS) {
        await setDoc(doc(db, root, 'existing'), { value: 1 });
        await setDoc(doc(db, root, 'existing', 'private', 'nested'), { value: 1 });
      }
    });
  });

  async function expectEverythingDenied(
    db: RulesClientFirestore,
    root: typeof ROOTS[number],
  ): Promise<void> {
    const existing = doc(db, root, 'existing');
    const nested = doc(db, root, 'existing', 'private', 'nested');
    await assertFails(getDoc(existing));
    await assertFails(getDocs(collection(db, root)));
    await assertFails(setDoc(doc(db, root, 'new'), { value: 2 }));
    await assertFails(updateDoc(existing, { value: 2 }));
    await assertFails(deleteDoc(existing));
    await assertFails(getDoc(nested));
    await assertFails(setDoc(doc(db, root, 'existing', 'private', 'new'), { value: 2 }));
    await assertFails(updateDoc(nested, { value: 2 }));
    await assertFails(deleteDoc(nested));
  }

  test.each([
    ['unauthenticated', () => environment.unauthenticatedContext().firestore()],
    ['ordinary authenticated', () => environment.authenticatedContext('user-1').firestore()],
    ['browser admin', () => environment.authenticatedContext('admin-1', { admin: true }).firestore()],
  ] as const)('%s clients cannot access roots or nested subcollections', async (_label, context) => {
    const db = context();
    for (const root of ROOTS) await expectEverythingDenied(db, root);
  });
});
