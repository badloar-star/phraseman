import {
  ADMIN_STAFF_CALLABLE_OPTIONS,
  handleAdminStaffGetSession,
  handleAdminStaffListMemberships,
  handleAdminStaffResolveIdentity,
  handleAdminStaffSetMembership,
  type StaffMembershipDependencies,
} from './admin_staff_membership';

const member = { schemaVersion: 1 as const, uid: 'staff-1', active: true, revision: 1,
  badge: 'Редактор', sections: { workspace: 'view' as const }, updatedAtMs: 1000, updatedByUid: 'owner-1' };

function deps(overrides: Partial<StaffMembershipDependencies> = {}): StaffMembershipDependencies {
  return {
    ownerUid: 'owner-1',
    now: () => 2000,
    consumeRateLimit: jest.fn(async () => undefined),
    loadMember: jest.fn(async () => member),
    listMemberRows: jest.fn(async () => [{ uid: member.uid, data: member }]),
    loadAuthIdentityByEmail: jest.fn(async (email: string) => ({ uid: 'staff-1', email, emailVerified: true, disabled: false })),
    loadAuthIdentityByUid: jest.fn(async (uid: string) => ({ uid, email: 'staff@example.com', emailVerified: true, disabled: false })),
    loadAuthIdentitiesByUid: jest.fn(async (uids: readonly string[]) => new Map(uids.map(uid => [uid, { uid, email: `${uid}@example.com`, emailVerified: true, disabled: false }]))),
    loadMutationReplay: jest.fn(async () => null),
    mutateMembership: jest.fn(async () => ({ revision: 1, active: true, replayed: false })),
    ...overrides,
  };
}

const verified = (uid: string) => ({ auth: { uid, token: { email_verified: true } }, data: {} });

describe('staff membership callable boundary', () => {
  test('keeps App Check disabled and bounds instances/concurrency', () => {
    expect(ADMIN_STAFF_CALLABLE_OPTIONS).toEqual(expect.objectContaining({
      enforceAppCheck: false, maxInstances: 1, concurrency: 1,
    }));
  });

  test.each([
    [{ auth: null, data: {} }, 'unauthenticated'],
    [{ auth: { uid: 'staff-1', token: { email_verified: false } }, data: {} }, 'permission-denied'],
  ])('rejects unknown or unverified identity before rate limit and database', async (request, code) => {
    const dependencies = deps();
    await expect(handleAdminStaffGetSession(request as never, dependencies)).rejects.toMatchObject({ code });
    expect(dependencies.consumeRateLimit).not.toHaveBeenCalled();
    expect(dependencies.loadMember).not.toHaveBeenCalled();
  });

  test('session can load only caller membership and revoked membership fails closed', async () => {
    const dependencies = deps();
    await expect(handleAdminStaffGetSession(verified('staff-1') as never, dependencies))
      .resolves.toEqual({ schemaVersion: 1, uid: 'staff-1', active: true, revision: 1, badge: 'Редактор', sections: { workspace: 'view' } });
    expect(dependencies.loadMember).toHaveBeenCalledWith('staff-1');
    expect(dependencies.loadAuthIdentityByUid).toHaveBeenCalledWith('staff-1');
    const revoked = deps({ loadMember: jest.fn(async () => ({ ...member, active: false, sections: {} })) });
    await expect(handleAdminStaffGetSession(verified('staff-1') as never, revoked)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('session rechecks the current Auth account after rate limit and denies missing, disabled, or unverified users', async () => {
    for (const currentIdentity of [
      null,
      { uid: 'staff-1', email: 'staff@example.com', emailVerified: true, disabled: true },
      { uid: 'staff-1', email: 'staff@example.com', emailVerified: false, disabled: false },
      { uid: 'other-user', email: 'staff@example.com', emailVerified: true, disabled: false },
    ]) {
      const dependencies = deps({ loadAuthIdentityByUid: jest.fn(async () => currentIdentity) });
      await expect(handleAdminStaffGetSession(verified('staff-1') as never, dependencies))
        .rejects.toMatchObject({ code: 'permission-denied' });
      expect(dependencies.consumeRateLimit).toHaveBeenCalledWith('session-read', 'staff-1', 30, 60_000, 2000);
      expect(dependencies.loadAuthIdentityByUid).toHaveBeenCalledWith('staff-1');
      expect(dependencies.loadMember).not.toHaveBeenCalled();
    }
  });

  test('all authenticated endpoint inputs are rate-limited before strict payload parsing', async () => {
    const session = deps();
    await expect(handleAdminStaffGetSession({ ...verified('staff-1'), data: { extra: true } } as never, session))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(session.consumeRateLimit).toHaveBeenCalledWith('session-read', 'staff-1', 30, 60_000, 2000);
    expect(session.loadMember).not.toHaveBeenCalled();

    const set = deps();
    await expect(handleAdminStaffSetMembership({ ...verified('owner-1'), data: { malformed: true } } as never, set))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(set.consumeRateLimit).toHaveBeenCalledWith('membership-write', 'owner-1', 10, 60_000, 2000);
    expect(set.loadMutationReplay).not.toHaveBeenCalled();
    expect(set.mutateMembership).not.toHaveBeenCalled();

    const resolve = deps();
    await expect(handleAdminStaffResolveIdentity({ ...verified('owner-1'), data: { email: 'a@example.com', extra: true } } as never, resolve))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(resolve.consumeRateLimit).toHaveBeenCalledWith('identity-lookup', 'owner-1', 10, 60_000, 2000);
    expect(resolve.loadAuthIdentityByEmail).not.toHaveBeenCalled();

    const list = deps();
    await expect(handleAdminStaffListMemberships({ ...verified('owner-1'), data: { extra: true } } as never, list))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(list.consumeRateLimit).toHaveBeenCalledWith('membership-list', 'owner-1', 10, 60_000, 2000);
    expect(list.listMemberRows).not.toHaveBeenCalled();
  });

  test('malformed membership from storage is denied', async () => {
    const dependencies = deps({ loadMember: jest.fn(async () => ({ ...member, uid: 'attacker' })) });
    await expect(handleAdminStaffGetSession(verified('staff-1') as never, dependencies)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('missing owner config and foreign caller fail before rate limit/database mutation', async () => {
    const missing = deps({ ownerUid: '' });
    await expect(handleAdminStaffSetMembership({ ...verified('owner-1'), data: {} } as never, missing)).rejects.toMatchObject({ code: 'failed-precondition' });
    const foreign = deps();
    await expect(handleAdminStaffSetMembership({ ...verified('attacker'), data: {} } as never, foreign)).rejects.toMatchObject({ code: 'permission-denied' });
    for (const dependencies of [missing, foreign]) {
      expect(dependencies.consumeRateLimit).not.toHaveBeenCalled();
      expect(dependencies.mutateMembership).not.toHaveBeenCalled();
    }
  });

  test('session fails closed before storage when owner config is missing, malformed, or caller is owner', async () => {
    for (const dependencies of [deps({ ownerUid: '' }), deps({ ownerUid: 'not a uid!' }), deps()]) {
      const uid = dependencies.ownerUid === 'owner-1' ? 'owner-1' : 'staff-1';
      await expect(handleAdminStaffGetSession(verified(uid) as never, dependencies)).rejects.toMatchObject({
        code: dependencies.ownerUid === 'owner-1' ? 'permission-denied' : 'failed-precondition',
      });
      expect(dependencies.consumeRateLimit).not.toHaveBeenCalled();
      expect(dependencies.loadMember).not.toHaveBeenCalled();
    }
  });

  test('only exact verified owner may send a validated revocation to transactional storage', async () => {
    const dependencies = deps({ mutateMembership: jest.fn(async () => ({ revision: 2, active: false, replayed: false })) });
    const data = { operationId: 'staff-op-1', targetUid: 'staff-1', expectedRevision: 1,
      active: false, badge: 'Редактор', sections: {}, reasonCode: 'access_revoked' };
    await expect(handleAdminStaffSetMembership({ ...verified('owner-1'), data } as never, dependencies))
      .resolves.toEqual({ schemaVersion: 1, revision: 2, active: false, replayed: false });
    expect(dependencies.consumeRateLimit).toHaveBeenCalledWith('membership-write', 'owner-1', 10, 60_000, 2000);
    expect(dependencies.loadMutationReplay).toHaveBeenCalledWith(expect.objectContaining({ actorUid: 'owner-1', input: data }));
    expect(dependencies.mutateMembership).toHaveBeenCalledWith(expect.objectContaining({ actorUid: 'owner-1', ownerUid: 'owner-1', input: data, nowMs: 2000 }));
  });

  test('exact committed activation retry replays its immutable receipt before live Auth eligibility', async () => {
    const data = { operationId: 'staff-op-replay', targetUid: 'staff-deleted', expectedRevision: 0,
      active: true, badge: 'Редактор', sections: { workspace: 'view' }, reasonCode: 'staff_onboarding' };
    const dependencies = deps({
      loadMutationReplay: jest.fn(async () => ({ revision: 1, active: true, replayed: true as const })),
      loadAuthIdentityByUid: jest.fn(async () => null),
    });
    await expect(handleAdminStaffSetMembership({ ...verified('owner-1'), data } as never, dependencies))
      .resolves.toEqual({ schemaVersion: 1, revision: 1, active: true, replayed: true });
    expect(dependencies.loadMutationReplay).toHaveBeenCalledWith(expect.objectContaining({ actorUid: 'owner-1', input: data }));
    expect(dependencies.loadAuthIdentityByUid).not.toHaveBeenCalled();
    expect(dependencies.mutateMembership).not.toHaveBeenCalled();
  });

  test('new activation is blocked by identity isolation while revocation remains possible after account deletion', async () => {
    const data = { operationId: 'staff-op-1', targetUid: 'staff-1', expectedRevision: 0,
      active: true, badge: 'Редактор', sections: { workspace: 'view' }, reasonCode: 'staff_onboarding' };
    const blocked = deps();
    await expect(handleAdminStaffSetMembership({ ...verified('owner-1'), data } as never, blocked))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'staff_activation_blocked_identity_isolation' });
    expect(blocked.loadMutationReplay).toHaveBeenCalled();
    expect(blocked.loadAuthIdentityByUid).not.toHaveBeenCalled();
    expect(blocked.mutateMembership).not.toHaveBeenCalled();
    const revoked = deps({ loadAuthIdentityByUid: jest.fn(async () => null),
      mutateMembership: jest.fn(async () => ({ revision: 2, active: false, replayed: false })) });
    await expect(handleAdminStaffSetMembership({ ...verified('owner-1'), data: {
      ...data, operationId: 'staff-op-2', active: false, expectedRevision: 1, reasonCode: 'access_revoked',
    } } as never, revoked)).resolves.toMatchObject({ active: false, revision: 2 });
    expect(revoked.loadAuthIdentityByUid).not.toHaveBeenCalled();
  });

  test('owner can resolve an exact account by email but cannot resolve self as a staff target', async () => {
    const dependencies = deps();
    await expect(handleAdminStaffResolveIdentity({ ...verified('owner-1'), data: { email: ' Staff@Example.com ' } } as never, dependencies))
      .resolves.toEqual({ schemaVersion: 1, uid: 'staff-1', email: 'staff@example.com', emailVerified: true, disabled: false });
    expect(dependencies.loadAuthIdentityByEmail).toHaveBeenCalledWith('staff@example.com');
    const owner = deps({ loadAuthIdentityByEmail: jest.fn(async () => ({ uid: 'owner-1', email: 'badloar@gmail.com', emailVerified: true, disabled: false })) });
    await expect(handleAdminStaffResolveIdentity({ ...verified('owner-1'), data: { email: 'badloar@gmail.com' } } as never, owner))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('owner list is bounded, validates stored rows, and enriches identities without granting access', async () => {
    const dependencies = deps();
    await expect(handleAdminStaffListMemberships({ ...verified('owner-1'), data: {} } as never, dependencies))
      .resolves.toEqual({ schemaVersion: 1, truncated: false, members: [{
        uid: 'staff-1', email: 'staff-1@example.com', emailVerified: true, disabled: false,
        active: true, revision: 1, badge: 'Редактор', sections: { workspace: 'view' }, updatedAtMs: 1000,
      }] });
    expect(dependencies.listMemberRows).toHaveBeenCalledWith(101);
    expect(dependencies.loadAuthIdentitiesByUid).toHaveBeenCalledWith(['staff-1']);
  });

  test('foreign caller is rejected before list and identity lookup storage', async () => {
    const dependencies = deps();
    await expect(handleAdminStaffListMemberships({ ...verified('attacker'), data: {} } as never, dependencies))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(handleAdminStaffResolveIdentity({ ...verified('attacker'), data: { email: 'staff@example.com' } } as never, dependencies))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(dependencies.listMemberRows).not.toHaveBeenCalled();
    expect(dependencies.loadAuthIdentityByEmail).not.toHaveBeenCalled();
  });
});
