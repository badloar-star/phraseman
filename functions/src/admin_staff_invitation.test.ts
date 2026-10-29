import {
  ADMIN_STAFF_INVITATION_OPTIONS,
  handleAdminStaffCreateInvitation,
  handleAdminStaffListInvitations,
  handleAdminStaffRevokeInvitation,
  type StaffInvitationDependencies,
} from './admin_staff_invitation';

const pending = {
  schemaVersion: 1 as const, reservationId: 'reservation-123', revision: 1 as const,
  status: 'pending' as const, email: 'employee@example.com', emailMasked: 'e***@example.com', badge: 'Редактор',
  sections: { workspace: 'view' as const }, createdAtMs: 1_000, expiresAtMs: 259_201_000,
  createdByUid: 'owner-1', revokedAtMs: null, revokedByUid: null,
};

function deps(overrides: Partial<StaffInvitationDependencies> = {}): StaffInvitationDependencies {
  return {
    ownerUid: 'owner-1', now: () => 2_000,
    consumeRateLimit: jest.fn(async () => undefined),
    loadAuthIdentityByUid: jest.fn(async (uid: string) => ({ uid, email: 'badloar@gmail.com', emailVerified: true, disabled: false })),
    authIdentityExistsByEmail: jest.fn(async () => false),
    loadMutationReplay: jest.fn(async () => null),
    reserveInvitation: jest.fn(async () => ({ reservationId: pending.reservationId, revision: 1, status: 'pending' as const, createdAtMs: 1_000, replayed: false })),
    revokeInvitation: jest.fn(async () => ({ reservationId: pending.reservationId, revision: 2, status: 'revoked' as const, createdAtMs: 2_000, replayed: false })),
    listInvitations: jest.fn(async () => [{ id: pending.reservationId, data: pending }]),
    ...overrides,
  };
}

const owner = (data: unknown) => ({ auth: { uid: 'owner-1', token: { email_verified: true } }, data });

describe('staff invitation reservation callable boundary', () => {
  test('keeps App Check unchanged, singleton execution, and no activation endpoint', () => {
    expect(ADMIN_STAFF_INVITATION_OPTIONS).toEqual(expect.objectContaining({ enforceAppCheck: false, maxInstances: 1, concurrency: 1 }));
  });

  test('rejects unauthenticated, unverified, foreign, or unconfigured callers before storage', async () => {
    for (const [request, overrides, code] of [
      [{ auth: null, data: {} }, {}, 'unauthenticated'],
      [{ auth: { uid: 'owner-1', token: { email_verified: false } }, data: {} }, {}, 'permission-denied'],
      [{ auth: { uid: 'attacker', token: { email_verified: true } }, data: {} }, {}, 'permission-denied'],
      [owner({}), { ownerUid: '' }, 'failed-precondition'],
    ] as const) {
      const d = deps(overrides);
      await expect(handleAdminStaffCreateInvitation(request as never, d)).rejects.toMatchObject({ code });
      expect(d.consumeRateLimit).not.toHaveBeenCalled();
      expect(d.loadAuthIdentityByUid).not.toHaveBeenCalled();
      expect(d.reserveInvitation).not.toHaveBeenCalled();
    }
  });

  test('reserves only an unregistered email and never returns a credential or URL', async () => {
    const d = deps();
    const data = { operationId: 'staff-invite-create-1', email: 'employee@example.com', badge: 'Редактор', expiresInHours: 72, reasonCode: 'staff_onboarding' };
    const response = await handleAdminStaffCreateInvitation(owner(data) as never, d);
    expect(response).toEqual({ schemaVersion: 1, reservationId: 'reservation-123', reservationCode: 'RESERVAT', revision: 1, status: 'pending',
      emailMasked: 'e***@example.com', badge: 'Редактор', createdAtMs: 1_000, expiresAtMs: 259_201_000, replayed: false,
      activation: 'blocked_identity_isolation_required' });
    expect(JSON.stringify(response)).not.toContain('employee@example.com');
    expect(JSON.stringify(response)).not.toMatch(/token|password|url/i);
    expect(d.authIdentityExistsByEmail).toHaveBeenCalledWith('employee@example.com');
    expect(d.loadMutationReplay).toHaveBeenCalled();
    expect(d.reserveInvitation).toHaveBeenCalled();

    const existing = deps({ authIdentityExistsByEmail: jest.fn(async () => true) });
    await expect(handleAdminStaffCreateInvitation(owner(data) as never, existing)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(existing.reserveInvitation).not.toHaveBeenCalled();
  });

  test('exact create replay resolves immutable audit before changed Auth eligibility', async () => {
    const d = deps({
      authIdentityExistsByEmail: jest.fn(async () => true),
      loadMutationReplay: jest.fn(async () => ({ reservationId: 'reservation-123', revision: 1, status: 'pending' as const, createdAtMs: 1_000, replayed: true })),
    });
    const data = { operationId: 'staff-invite-create-1', email: 'employee@example.com', badge: 'Редактор', expiresInHours: 72, reasonCode: 'staff_onboarding' };
    await expect(handleAdminStaffCreateInvitation(owner(data) as never, d)).resolves.toMatchObject({ replayed: true, revision: 1, status: 'pending' });
    expect(d.authIdentityExistsByEmail).not.toHaveBeenCalled();
    expect(d.reserveInvitation).not.toHaveBeenCalled();
  });

  test('rate limits before parsing and mutation, then lists a bounded masked projection', async () => {
    const malformed = deps();
    await expect(handleAdminStaffCreateInvitation(owner({ extra: true }) as never, malformed)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(malformed.consumeRateLimit).toHaveBeenCalled();
    expect(malformed.loadAuthIdentityByUid).toHaveBeenCalledWith('owner-1');
    expect(malformed.authIdentityExistsByEmail).not.toHaveBeenCalled();

    const listed = await handleAdminStaffListInvitations(owner({}) as never, deps());
    expect(listed).toEqual({ schemaVersion: 1, truncated: false, invitations: [{ reservationId: 'reservation-123', reservationCode: 'RESERVAT', revision: 1,
      status: 'pending', emailMasked: 'e***@example.com', badge: 'Редактор', createdAtMs: 1_000,
      expiresAtMs: 259_201_000, activation: 'blocked_identity_isolation_required' }] });
    expect(JSON.stringify(listed)).not.toContain('employee@example.com');
  });

  test('list rejects a stored reservation whose embedded id does not match its Firestore document id', async () => {
    const mismatched = deps({
      listInvitations: jest.fn(async () => [{
        id: 'reservation-document',
        data: { ...pending, reservationId: 'reservation-embedded' },
      }]),
    });
    await expect(handleAdminStaffListInvitations(owner({}) as never, mismatched))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('all handlers recheck current owner Auth and fail closed for disabled, deleted, or unverified owner', async () => {
    const requests = [
      [handleAdminStaffCreateInvitation, { operationId: 'staff-invite-create-1', email: 'employee@example.com', badge: 'Редактор', expiresInHours: 72, reasonCode: 'staff_onboarding' }],
      [handleAdminStaffListInvitations, {}],
      [handleAdminStaffRevokeInvitation, { operationId: 'staff-invite-revoke-1', reservationId: 'reservation-123', expectedRevision: 1, reasonCode: 'access_revoked' }],
    ] as const;
    for (const identity of [null,
      { uid: 'owner-1', email: 'badloar@gmail.com', emailVerified: true, disabled: true },
      { uid: 'owner-1', email: 'badloar@gmail.com', emailVerified: false, disabled: false },
      { uid: 'other', email: 'badloar@gmail.com', emailVerified: true, disabled: false }]) {
      for (const [handler, data] of requests) {
        const d = deps({ loadAuthIdentityByUid: jest.fn(async () => identity) });
        await expect(handler(owner(data) as never, d)).rejects.toMatchObject({ code: 'permission-denied' });
        expect(d.reserveInvitation).not.toHaveBeenCalled();
        expect(d.revokeInvitation).not.toHaveBeenCalled();
        expect(d.listInvitations).not.toHaveBeenCalled();
      }
    }
  });

  test('list and revoke reject unknown request fields after rate and current-owner checks', async () => {
    const list = deps();
    await expect(handleAdminStaffListInvitations(owner({ extra: true }) as never, list)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(list.listInvitations).not.toHaveBeenCalled();
    const revoke = deps();
    await expect(handleAdminStaffRevokeInvitation(owner({ operationId: 'staff-invite-revoke-1', reservationId: 'reservation-123', expectedRevision: 1,
      reasonCode: 'access_revoked', extra: true }) as never, revoke)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(revoke.revokeInvitation).not.toHaveBeenCalled();
  });

  test('revoke uses owner-only CAS and returns no activation material', async () => {
    const d = deps();
    const result = await handleAdminStaffRevokeInvitation(owner({ operationId: 'staff-invite-revoke-1', reservationId: 'reservation-123', expectedRevision: 1, reasonCode: 'access_revoked' }) as never, d);
    expect(result).toEqual({ schemaVersion: 1, reservationId: 'reservation-123', revision: 2, status: 'revoked', replayed: false });
    expect(d.revokeInvitation).toHaveBeenCalled();
  });
});
