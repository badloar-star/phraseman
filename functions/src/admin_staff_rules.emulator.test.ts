import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-staff-access-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
const ROOTS = ['admin_staff_members', 'admin_staff_members_v2', 'admin_staff_audit', 'admin_staff_rate_limits',
  'admin_staff_invitations', 'admin_staff_invitation_audit'] as const;

describe('staff authority collections are Admin-SDK-only', () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => {
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, 'utf8') } });
  });
  afterAll(async () => environment.cleanup());
  beforeEach(async () => environment.clearFirestore());

  for (const root of ROOTS) {
    test(`${root}: browser admin and staff cannot get/list/create/update/delete`, async () => {
      await environment.withSecurityRulesDisabled(async context => {
        await setDoc(doc(context.firestore(), root, 'existing'), { value: 1 });
      });
      for (const db of [
        environment.authenticatedContext('owner-auth', { admin: true }).firestore(),
        environment.authenticatedContext('staff-auth', { admin: false }).firestore(),
      ]) {
        await assertFails(getDoc(doc(db, root, 'existing')));
        await assertFails(getDocs(collection(db, root)));
        await assertFails(setDoc(doc(db, root, 'new'), { value: 1 }));
        await assertFails(updateDoc(doc(db, root, 'existing'), { value: 2 }));
        await assertFails(deleteDoc(doc(db, root, 'existing')));
      }
    });
  }
});
