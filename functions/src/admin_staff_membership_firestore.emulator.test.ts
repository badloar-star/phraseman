import * as admin from 'firebase-admin';
import { createStaffMembershipFirestoreDependencies } from './admin_staff_membership';

const PROJECT_ID = 'demo-phraseman-staff-membership-store';
const ownerUid = 'owner-1';
const mutation = {
  operationId: 'staff-op-1', targetUid: 'staff-1', expectedRevision: 0, active: true,
  badge: 'Редактор', sections: { workspace: 'view' as const }, reasonCode: 'staff_onboarding' as const,
};

describe('staff membership Firestore transaction adapter', () => {
  let app: admin.app.App;
  let db: admin.firestore.Firestore;
  beforeAll(() => {
    app = admin.initializeApp({ projectId: PROJECT_ID }, `staff-membership-${Date.now()}`);
    db = app.firestore();
  });
  afterAll(async () => app.delete());
  beforeEach(async () => {
    for (const root of ['admin_staff_members', 'admin_staff_audit', 'admin_staff_rate_limits']) {
      const rows = await db.collection(root).get();
      await Promise.all(rows.docs.map(row => row.ref.delete()));
    }
  });

  test('membership and fresh audit commit atomically; exact retry replays', async () => {
    const deps = createStaffMembershipFirestoreDependencies(db, ownerUid);
    await expect(deps.mutateMembership({ actorUid: ownerUid, ownerUid, input: mutation, nowMs: 1000 }))
      .resolves.toEqual({ revision: 1, active: true, replayed: false });
    await expect(deps.mutateMembership({ actorUid: ownerUid, ownerUid, input: mutation, nowMs: 2000 }))
      .resolves.toEqual({ revision: 1, active: true, replayed: true });
    await expect(deps.loadMutationReplay({ actorUid: ownerUid, ownerUid, input: mutation }))
      .resolves.toEqual({ revision: 1, active: true, replayed: true });
    await expect(deps.loadMutationReplay({ actorUid: ownerUid, ownerUid, input: { ...mutation, badge: 'Другой' } }))
      .rejects.toThrow('idempotency_conflict');
    await expect(deps.loadMutationReplay({ actorUid: 'other-owner', ownerUid, input: mutation }))
      .rejects.toThrow('invalid_audit');
    const member = await db.collection('admin_staff_members').doc('staff-1').get();
    const audit = await db.collection('admin_staff_audit').doc('staff-op-1').get();
    expect(member.data()).toEqual(expect.objectContaining({ revision: 1, active: true }));
    expect(audit.exists).toBe(true);
    expect(audit.data()).toEqual(expect.objectContaining({ resultRevision: 1, requestDigest: expect.any(String) }));
    expect(JSON.stringify(audit.data())).not.toContain('Редактор');
    expect(JSON.stringify(audit.data())).not.toContain('email');
  });

  test('two concurrent mutations at one expected revision cannot both commit', async () => {
    const deps = createStaffMembershipFirestoreDependencies(db, ownerUid);
    await deps.mutateMembership({ actorUid: ownerUid, ownerUid, input: mutation, nowMs: 1000 });
    const results = await Promise.allSettled([
      deps.mutateMembership({ actorUid: ownerUid, ownerUid, input: { ...mutation, operationId: 'staff-op-2', expectedRevision: 1, badge: 'A' }, nowMs: 2000 }),
      deps.mutateMembership({ actorUid: ownerUid, ownerUid, input: { ...mutation, operationId: 'staff-op-3', expectedRevision: 1, badge: 'B' }, nowMs: 2000 }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const audit = await db.collection('admin_staff_audit').get();
    expect(audit.size).toBe(2);
    const member = await db.collection('admin_staff_members').doc('staff-1').get();
    expect(member.data()?.revision).toBe(2);
  });

  test('rate limit state is enforced transactionally', async () => {
    const deps = createStaffMembershipFirestoreDependencies(db, ownerUid);
    await deps.consumeRateLimit('test', 'staff-1', 2, 60_000, 1000);
    await deps.consumeRateLimit('test', 'staff-1', 2, 60_000, 1001);
    await expect(deps.consumeRateLimit('test', 'staff-1', 2, 60_000, 1002)).rejects.toThrow('rate_limited');
  });

  test('owner list reads only the bounded membership projection', async () => {
    const deps = createStaffMembershipFirestoreDependencies(db, ownerUid);
    await deps.mutateMembership({ actorUid: ownerUid, ownerUid, input: mutation, nowMs: 1000 });
    await expect(deps.listMemberRows(101)).resolves.toEqual([{ uid: 'staff-1', data: expect.objectContaining({
      schemaVersion: 1, uid: 'staff-1', active: true, revision: 1,
    }) }]);
  });
});
