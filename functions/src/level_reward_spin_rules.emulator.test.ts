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

const PROJECT_ID = 'demo-phraseman-level-spin-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('Level Reward Spin server-owned state (emulator)', () => {
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
      await setDoc(doc(context.firestore(), 'users', 'stable-a'), {
        firebaseAuthUid: 'auth-a',
        progress: { user_total_xp: '100', level_reward_spin_balance: '1' },
        levelSpinServerState: { protocol: 'v1', levelBaseline: 2, balance: 1 },
        levelSpinMergePending: true,
      });
      await setDoc(doc(context.firestore(), 'users/stable-a/level_spin_credits', 'level_spin_v1_002'), { status: 'available' });
      await setDoc(doc(context.firestore(), 'users/stable-a/level_spin_results', 'request-1'), { level: 2 });
      await setDoc(doc(context.firestore(), 'users/stable-a/level_up_bonus_claims', 'level_bonus_v1_002'), { eventId: 'level_up:2:bonus' });
    });
  }, 30_000);

  for (const claims of [{}, { admin: true }]) {
    const label = 'admin' in claims ? 'browser admin' : 'owner';
    it(`${label} cannot mutate root Spin state or projected balance`, async () => {
      const db = environment.authenticatedContext('auth-a', claims).firestore();
      await assertFails(updateDoc(doc(db, 'users', 'stable-a'), {
        levelSpinServerState: { protocol: 'v1', levelBaseline: 60, balance: 59 },
      }));
      await assertFails(updateDoc(doc(db, 'users', 'stable-a'), {
        'progress.level_reward_spin_balance': '59',
      }));
      await assertFails(updateDoc(doc(db, 'users', 'stable-a'), {
        levelSpinMergePending: false,
      }));
    });

    for (const root of ['level_spin_credits', 'level_spin_results', 'level_up_bonus_claims']) {
      it(`${label} cannot read or write ${root}`, async () => {
        const db = environment.authenticatedContext('auth-a', claims).firestore();
        const existingId = root === 'level_spin_credits'
          ? 'level_spin_v1_002'
          : root === 'level_spin_results' ? 'request-1' : 'level_bonus_v1_002';
        const existing = doc(db, 'users', 'stable-a', root, existingId);
        await assertFails(getDoc(existing));
        await assertFails(getDocs(collection(db, 'users', 'stable-a', root)));
        await assertFails(setDoc(doc(db, 'users', 'stable-a', root, 'new'), { forged: true }));
        await assertFails(updateDoc(existing, { forged: true }));
        await assertFails(deleteDoc(existing));
      });
    }
  }
});
