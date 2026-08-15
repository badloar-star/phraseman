import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-personal-economy-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

const opening = {
  schemaVersion: 'client-economy-opening.v1',
  ownerStableId: 'stable-a',
  openingBalance: 10,
  createdAtMs: 1,
};

const operation = {
  schemaVersion: 'client-shard-operation.v1',
  operationId: 'operation-0001',
  ownerStableId: 'stable-a',
  authority: 'client',
  direction: 'debit',
  amount: 3,
  delta: -3,
  revision: 1,
  balanceBefore: 10,
  balanceAfter: 7,
  reason: 'test_purchase',
  grant: { kind: 'test_purchase', subjectId: 'item-1' },
  createdAtMs: 2,
  requestFingerprint: 'a'.repeat(64),
};

describe('personal economy journal ownership (emulator)', () => {
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
      await setDoc(doc(context.firestore(), 'users', 'stable-a'), { firebaseAuthUid: 'auth-a' });
    });
  });

  it('rejects browser-admin create for another user operation and opening', async () => {
    const db = environment.authenticatedContext('browser-admin', { admin: true }).firestore();
    await assertFails(setDoc(doc(db, 'users/stable-a/client_economy_operations', operation.operationId), operation));
    await assertFails(setDoc(doc(db, 'users/stable-a/client_economy_opening', 'v1'), opening));
  });

  it('allows the canonical owner even when its token also has an admin claim', async () => {
    const db = environment.authenticatedContext('auth-a', { admin: true }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/stable-a/client_economy_operations', operation.operationId), operation));
    await assertSucceeds(setDoc(doc(db, 'users/stable-a/client_economy_opening', 'v1'), opening));
  });
});
