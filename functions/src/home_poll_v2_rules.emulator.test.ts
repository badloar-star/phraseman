import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-home-polls-v2';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
jest.setTimeout(30_000);

describe('Home Polls v2 aggregate-only rules (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, 'utf8') } });
  });
  afterAll(async () => { if (environment) await environment.cleanup(); });
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'home_polls_v2', 'p2-001'), { counts: { q1: { a: 1, b: 2 } } });
      await setDoc(doc(context.firestore(), 'home_polls_v2/p2-001/votes', 'user-1'), { userId: 'user-1', answered: { q1: true } });
    });
  });

  it('lets an admin read aggregate parent results but denies parent writes', async () => {
    const db = environment.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'home_polls_v2', 'p2-001')));
    await assertFails(updateDoc(doc(db, 'home_polls_v2', 'p2-001'), { 'counts.q1.a': 99 }));
  });

  it('denies vote-document reads and writes even to an admin', async () => {
    const db = environment.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertFails(getDoc(doc(db, 'home_polls_v2/p2-001/votes', 'user-1')));
    await assertFails(setDoc(doc(db, 'home_polls_v2/p2-001/votes', 'forged'), { answered: { q1: true } }));
  });
});
