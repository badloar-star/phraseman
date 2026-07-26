import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
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

const PROJECT_ID = 'demo-phraseman-rc-lineage-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const ROOTS = ['revenuecat_premium_lineages', 'revenuecat_premium_denials'] as const;

describe('RevenueCat premium server-only roots (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => environment.cleanup());
  beforeEach(async () => environment.clearFirestore());

  for (const root of ROOTS) {
    it(`${root}: even browser admin cannot get/list/create/update/delete`, async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), root, 'existing'), { ownerUid: 'owner-a', value: 1 });
      });
      const adminDb = environment.authenticatedContext('admin-auth', { admin: true }).firestore();
      await assertFails(getDoc(doc(adminDb, root, 'existing')));
      await assertFails(getDocs(collection(adminDb, root)));
      await assertFails(setDoc(doc(adminDb, root, 'new'), { ownerUid: 'owner-a' }));
      await assertFails(updateDoc(doc(adminDb, root, 'existing'), { value: 2 }));
      await assertFails(deleteDoc(doc(adminDb, root, 'existing')));
    });
  }


  it('revenuecat_premium_events: browser admin may list but cannot create/update/delete receipts', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'revenuecat_premium_events', 'existing'), { value: 1 });
    });
    const adminDb = environment.authenticatedContext('admin-auth', { admin: true }).firestore();
    await assertSucceeds(getDocs(collection(adminDb, 'revenuecat_premium_events')));
    await assertFails(setDoc(doc(adminDb, 'revenuecat_premium_events', 'new'), { value: 1 }));
    await assertFails(updateDoc(doc(adminDb, 'revenuecat_premium_events', 'existing'), { value: 2 }));
    await assertFails(deleteDoc(doc(adminDb, 'revenuecat_premium_events', 'existing')));
  });
});
