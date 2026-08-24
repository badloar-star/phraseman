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
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-global-broadcast-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
jest.setTimeout(30_000);

describe('global broadcast callable-only writes (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => environment?.cleanup());
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'global_broadcast_modals', 'active-1'), {
        publicPayloadSchemaVersion: 1,
        publicPayloadValidatedV1: true,
        active: true,
        titleRu: 'safe',
      });
    });
  });

  it('denies browser reads for authenticated and anonymous clients', async () => {
    const userDb = environment.authenticatedContext('user-auth').firestore();
    const anonymousDb = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(userDb, 'global_broadcast_modals', 'active-1')));
    await assertFails(getDocs(query(
      collection(userDb, 'global_broadcast_modals'),
      where('publicPayloadSchemaVersion', '==', 1),
      where('publicPayloadValidatedV1', '==', true),
      where('active', '==', true),
    )));
    await assertFails(getDoc(doc(anonymousDb, 'global_broadcast_modals', 'active-1')));
  });

  it('rejects unsafe legacy gets and excludes forged version markers from the validated list', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'global_broadcast_modals', 'legacy-unsafe'), {
        publicPayloadSchemaVersion: 1,
        active: true,
        titleRu: 'legacy',
        createdBy: 'owner@example.com',
        adminOperationId: 'secret-operation',
      });
      await setDoc(doc(context.firestore(), 'global_broadcast_modals', 'forged-marker'), {
        publicPayloadSchemaVersion: 1,
        publicPayloadValidatedV1: true,
        active: true,
        titleRu: 'forged',
        internalAuthority: 'not-server-validated',
      });
    });
    const userDb = environment.authenticatedContext('user-auth').firestore();
    await assertFails(getDoc(doc(userDb, 'global_broadcast_modals', 'legacy-unsafe')));
    await assertFails(getDoc(doc(userDb, 'global_broadcast_modals', 'forged-marker')));
    await assertFails(getDocs(query(
      collection(userDb, 'global_broadcast_modals'),
      where('active', '==', true),
    )));
    await assertFails(getDocs(query(
      collection(userDb, 'global_broadcast_modals'),
      where('publicPayloadSchemaVersion', '==', 1),
      where('publicPayloadValidatedV1', '==', true),
      where('active', '==', true),
    )));
  });

  it('rejects create, update, and delete even for a browser admin claim', async () => {
    const adminDb = environment.authenticatedContext('admin-auth', { admin: true }).firestore();
    await assertFails(setDoc(doc(adminDb, 'global_broadcast_modals', 'new'), { active: true }));
    await assertFails(updateDoc(doc(adminDb, 'global_broadcast_modals', 'active-1'), { active: false }));
    await assertFails(deleteDoc(doc(adminDb, 'global_broadcast_modals', 'active-1')));
  });
});
