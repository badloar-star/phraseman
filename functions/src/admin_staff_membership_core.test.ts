import {
  buildMembershipMutation,
  consumeRateWindow,
  parseStoredMembership,
  type MembershipMutationInput,
} from './admin_staff_membership_core';

const baseInput: MembershipMutationInput = {
  operationId: 'staff-op-1',
  targetUid: 'staff-1',
  expectedRevision: 0,
  active: true,
  badge: 'Редактор',
  sections: { workspace: 'view' },
  reasonCode: 'staff_onboarding',
};

describe('staff membership core', () => {
  test('creates one versioned membership and redacted immutable audit plan', () => {
    const result = buildMembershipMutation({
      actorUid: 'owner-1', ownerUid: 'owner-1', input: baseInput, current: null, nowMs: 1000,
    });
    expect(result.member).toEqual(expect.objectContaining({
      schemaVersion: 1, uid: 'staff-1', active: true, revision: 1,
      badge: 'Редактор', sections: { workspace: 'view' },
    }));
    expect(result.audit).toEqual(expect.objectContaining({
      schemaVersion: 1, operationId: 'staff-op-1', actorUid: 'owner-1', targetUid: 'staff-1',
      expectedRevision: 0, resultRevision: 1, action: 'activate', reasonCode: 'staff_onboarding',
    }));
    expect(JSON.stringify(result.audit)).not.toContain('Редактор');
    expect(JSON.stringify(result.audit)).not.toContain('email');
  });

  test('rejects free-form or unsupported immutable audit reasons', () => {
    expect(() => buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1',
      input: { ...baseInput, reasonCode: 'employee@example.com' as never }, current: null, nowMs: 1000 }))
      .toThrow('invalid_reason_code');
    expect(() => buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1',
      input: { ...baseInput, reasonCode: 'medical_leave' as never }, current: null, nowMs: 1000 }))
      .toThrow('invalid_reason_code');
  });

  test('rejects stale concurrent update and cannot mutate the trusted owner membership', () => {
    const current = { schemaVersion: 1 as const, uid: 'staff-1', active: true, revision: 2,
      badge: 'Редактор', sections: { workspace: 'view' as const }, updatedAtMs: 900, updatedByUid: 'owner-1' };
    expect(() => buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1', input: baseInput, current, nowMs: 1000 }))
      .toThrow('revision_conflict');
    expect(() => buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1', input: { ...baseInput, targetUid: 'owner-1' }, current: null, nowMs: 1000 }))
      .toThrow('owner_membership_forbidden');
  });

  test('only implemented adapter modes are accepted and hidden is stored as absence', () => {
    expect(() => buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1', input: { ...baseInput, sections: { users: 'view' } }, current: null, nowMs: 1000 }))
      .toThrow('unsupported_section');
    expect(() => buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1', input: { ...baseInput, sections: { workspace: 'request' } }, current: null, nowMs: 1000 }))
      .toThrow('unsupported_mode');
    const hidden = buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1', input: { ...baseInput, sections: { workspace: 'hidden' } }, current: null, nowMs: 1000 });
    expect(hidden.member.sections).toEqual({});
  });

  test('revocation clears all modes and advances the expected revision', () => {
    const current = { schemaVersion: 1 as const, uid: 'staff-1', active: true, revision: 1,
      badge: 'Редактор', sections: { workspace: 'view' as const }, updatedAtMs: 900, updatedByUid: 'owner-1' };
    const revoked = buildMembershipMutation({ actorUid: 'owner-1', ownerUid: 'owner-1',
      input: { ...baseInput, operationId: 'staff-op-2', expectedRevision: 1, active: false }, current, nowMs: 1000 });
    expect(revoked.member).toEqual(expect.objectContaining({ active: false, revision: 2, sections: {} }));
    expect(revoked.audit.action).toBe('revoke');
  });

  test('stored membership validation fails closed for malformed and inherited fields', () => {
    expect(() => parseStoredMembership({ schemaVersion: 1, uid: 'staff-1', active: true, revision: 1,
      badge: 'Редактор', sections: { workspace: 'view' }, updatedAtMs: 1, updatedByUid: 'owner-1' }, 'staff-1')).not.toThrow();
    expect(() => parseStoredMembership({ schemaVersion: 1, uid: 'other', active: true, revision: 1,
      badge: 'Редактор', sections: { workspace: 'view' }, updatedAtMs: 1, updatedByUid: 'owner-1' }, 'staff-1')).toThrow('invalid_membership');
    const inheritedSections = Object.create({ workspace: 'view' });
    expect(() => parseStoredMembership({ schemaVersion: 1, uid: 'staff-1', active: true, revision: 1,
      badge: 'Редактор', sections: inheritedSections, updatedAtMs: 1, updatedByUid: 'owner-1' }, 'staff-1')).toThrow('invalid_membership');
    const inheritedMember = Object.create({ schemaVersion: 1, uid: 'staff-1', active: true, revision: 1,
      badge: 'Редактор', sections: {}, updatedAtMs: 1, updatedByUid: 'owner-1' });
    expect(() => parseStoredMembership(inheritedMember, 'staff-1')).toThrow('invalid_membership');
  });

  test('rate window is bounded and rejects the next call without extending the window', () => {
    expect(consumeRateWindow(null, 1000, 2, 60_000)).toEqual({ windowStartedAtMs: 1000, count: 1 });
    expect(consumeRateWindow({ windowStartedAtMs: 1000, count: 1 }, 1001, 2, 60_000)).toEqual({ windowStartedAtMs: 1000, count: 2 });
    expect(() => consumeRateWindow({ windowStartedAtMs: 1000, count: 2 }, 1002, 2, 60_000)).toThrow('rate_limited');
    expect(consumeRateWindow({ windowStartedAtMs: 1000, count: 2 }, 61_000, 2, 60_000)).toEqual({ windowStartedAtMs: 61_000, count: 1 });
  });
});
