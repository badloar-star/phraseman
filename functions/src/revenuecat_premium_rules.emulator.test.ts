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
const ROOTS = [
  'revenuecat_premium_lineages',
  'revenuecat_premium_denials',
  'revenuecat_premium_lineage_owners',
  'revenuecat_restore_operations',
] as const;

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
    it.each([
      ['unauthenticated', () => environment.unauthenticatedContext().firestore()],
      ['authenticated non-admin', () => environment.authenticatedContext('ordinary-auth').firestore()],
      ['browser admin', () => environment.authenticatedContext('admin-auth', { admin: true }).firestore()],
    ])(`${root}: %s cannot get/list/create/update/delete`, async (_label, firestore) => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), root, 'existing'), { ownerUid: 'owner-a', value: 1 });
      });
      const db = firestore();
      await assertFails(getDoc(doc(db, root, 'existing')));
      await assertFails(getDocs(collection(db, root)));
      await assertFails(setDoc(doc(db, root, 'new'), { ownerUid: 'owner-a' }));
      await assertFails(updateDoc(doc(db, root, 'existing'), { value: 2 }));
      await assertFails(deleteDoc(doc(db, root, 'existing')));
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
