import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { isolatedStaffPrincipalKey } from './admin_staff_isolated_core';
import { createIsolatedStaffFirestoreDependencies } from './admin_staff_isolated_firestore';

const PROJECT_ID = 'demo-staff-isolated-store';
const AUTH_PROJECT_ID = 'phraseman-staff-auth';
const PRINCIPAL_KEY = isolatedStaffPrincipalKey(AUTH_PROJECT_ID, 'staff-emulator-1');

describe('isolated staff narrow Firestore adapter', () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    app = initializeApp({ projectId: PROJECT_ID }, `isolated-staff-store-${process.pid}`);
    db = getFirestore(app);
  });

  afterAll(async () => deleteApp(app));

  beforeEach(async () => {
    for (const collection of ['admin_staff_members_v2', 'admin_staff_rate_limits']) {
      const rows = await db.collection(collection).get();
      await Promise.all(rows.docs.map(row => row.ref.delete()));
    }
  });

  test('reads only the exact namespaced membership document and rejects a mismatched main project', async () => {
    const membership = {
      schemaVersion: 2,
      identityNamespace: 'isolated_staff_v1',
      principalKey: PRINCIPAL_KEY,
      authProjectId: AUTH_PROJECT_ID,
      authUid: 'staff-emulator-1',
      active: true,
      revision: 1,
      badge: 'Редактор',
      sections: { workspace: 'view' },
      updatedAtMs: 1000,
      updatedByPrincipalKey: isolatedStaffPrincipalKey(AUTH_PROJECT_ID, 'owner-emulator-1'),
    };
    await db.collection('admin_staff_members_v2').doc(PRINCIPAL_KEY).set(membership);
    await db.collection('admin_staff_members_v2').doc('unqualified-staff-emulator-1').set({ marker: 'wrong' });

    expect(() => createIsolatedStaffFirestoreDependencies(app, 'different-main-project'))
      .toThrow('isolated_staff_not_configured');
    const deps = createIsolatedStaffFirestoreDependencies(app, PROJECT_ID, () => 1000);
    await expect(deps.loadMembershipV2(PRINCIPAL_KEY)).resolves.toEqual(membership);
  });

  test('serializes concurrent rate updates and allows exactly the configured window limit', async () => {
    const deps = createIsolatedStaffFirestoreDependencies(app, PROJECT_ID, () => 2000);
    const results = await Promise.allSettled([
      deps.consumeRateLimit('isolated-session-read', PRINCIPAL_KEY, 2, 60_000),
      deps.consumeRateLimit('isolated-session-read', PRINCIPAL_KEY, 2, 60_000),
      deps.consumeRateLimit('isolated-session-read', PRINCIPAL_KEY, 2, 60_000),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const rows = await db.collection('admin_staff_rate_limits').get();
    expect(rows.size).toBe(1);
    expect(rows.docs[0].id).toMatch(/^[a-f0-9]{64}$/);
    expect(rows.docs[0].id).not.toContain(PRINCIPAL_KEY);
    expect(rows.docs[0].data()).toEqual({
      schemaVersion: 1,
      scope: 'isolated-session-read',
      windowStartedAtMs: 2000,
      count: 2,
      updatedAtMs: 2000,
    });
  });
});
