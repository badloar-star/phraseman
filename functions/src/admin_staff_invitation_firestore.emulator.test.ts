import * as admin from 'firebase-admin';
import { createStaffInvitationFirestoreDependencies } from './admin_staff_invitation';
import { invitationCreateDigest, invitationReservationId, parseCreateInvitationInput, parseRevokeInvitationInput } from './admin_staff_invitation_core';

const PROJECT_ID = 'demo-phraseman-staff-invitation-store';
const ownerUid = 'owner-1';
const create = parseCreateInvitationInput({ operationId: 'staff-invite-create-1', email: 'employee@example.com',
  badge: 'Редактор', expiresInHours: 72, reasonCode: 'staff_onboarding' });
const reservationId = invitationReservationId(create.email);

describe('staff invitation Firestore transaction adapter', () => {
  let app: admin.app.App;
  let db: admin.firestore.Firestore;
  beforeAll(() => {
    app = admin.initializeApp({ projectId: PROJECT_ID }, `staff-invitation-${Date.now()}`);
    db = app.firestore();
  });
  afterAll(async () => app.delete());
  beforeEach(async () => {
    for (const root of ['admin_staff_invitations', 'admin_staff_invitation_audit', 'admin_staff_rate_limits']) {
      const rows = await db.collection(root).get();
      await Promise.all(rows.docs.map(row => row.ref.delete()));
    }
  });

  test('reserve is atomic, exact retry replays, and audit excludes email and badge', async () => {
    const deps = createStaffInvitationFirestoreDependencies(db, ownerUid);
    const args = { actorUid: ownerUid, ownerUid, reservationId, input: create, nowMs: 1_000 };
    await expect(deps.reserveInvitation(args)).resolves.toMatchObject({ replayed: false, revision: 1, status: 'pending' });
    await expect(deps.reserveInvitation({ ...args, nowMs: 2_000 })).resolves.toMatchObject({ replayed: true, revision: 1 });
    const invitation = await db.collection('admin_staff_invitations').doc(reservationId).get();
    expect(invitation.data()).toEqual(expect.objectContaining({ email: 'employee@example.com', emailMasked: 'e***@example.com' }));
    const audit = await db.collection('admin_staff_invitation_audit').doc(create.operationId).get();
    expect(audit.exists).toBe(true);
    expect(JSON.stringify(audit.data())).not.toContain('employee@example.com');
    expect(JSON.stringify(audit.data())).not.toContain('Редактор');
    expect(JSON.stringify(invitation.data())).not.toMatch(/password|token|inviteUrl|secret/i);
  });

  test('same email cannot have two pending reservations; expired or revoked reservation can be renewed', async () => {
    const deps = createStaffInvitationFirestoreDependencies(db, ownerUid);
    await deps.reserveInvitation({ actorUid: ownerUid, ownerUid, reservationId, input: create, nowMs: 1_000 });
    await expect(deps.reserveInvitation({ actorUid: ownerUid, ownerUid, reservationId,
      input: { ...create, operationId: 'staff-invite-create-2' }, nowMs: 2_000 })).rejects.toThrow('invitation_already_pending');
    const afterExpiry = create.expiresInHours * 60 * 60 * 1000 + 1_001;
    await expect(deps.reserveInvitation({ actorUid: ownerUid, ownerUid, reservationId,
      input: { ...create, operationId: 'staff-invite-create-3' }, nowMs: afterExpiry }))
      .resolves.toMatchObject({ replayed: false, revision: 2, status: 'pending' });
  });

  test('revoke uses expected revision and exact retry cannot duplicate audit', async () => {
    const deps = createStaffInvitationFirestoreDependencies(db, ownerUid);
    await deps.reserveInvitation({ actorUid: ownerUid, ownerUid, reservationId, input: create, nowMs: 1_000 });
    const input = parseRevokeInvitationInput({ operationId: 'staff-invite-revoke-1', reservationId,
      expectedRevision: 1, reasonCode: 'access_revoked' });
    await expect(deps.revokeInvitation({ actorUid: ownerUid, ownerUid, input, nowMs: 2_000 }))
      .resolves.toMatchObject({ replayed: false, revision: 2, status: 'revoked' });
    await expect(deps.revokeInvitation({ actorUid: ownerUid, ownerUid, input, nowMs: 3_000 }))
      .resolves.toMatchObject({ replayed: true, revision: 2, status: 'revoked' });
    await expect(deps.loadMutationReplay({ actorUid: ownerUid, operationId: create.operationId, action: 'reserve',
      requestDigest: invitationCreateDigest(ownerUid, create) }))
      .resolves.toMatchObject({ replayed: true, revision: 1, status: 'pending' });
    const audits = await db.collection('admin_staff_invitation_audit').get();
    expect(audits.size).toBe(2);
  });
});
