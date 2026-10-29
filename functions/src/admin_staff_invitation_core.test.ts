import {
  buildInvitationCreate,
  buildInvitationRevoke,
  invitationCreateDigest,
  maskInvitationEmail,
  parseCreateInvitationInput,
  parseRevokeInvitationInput,
  parseStoredInvitation,
  parseStaffInvitationAudit,
} from './admin_staff_invitation_core';

const createInput = {
  operationId: 'staff-invite-create-1',
  email: ' Employee@Example.com ',
  badge: 'Редактор',
  expiresInHours: 72,
  reasonCode: 'staff_onboarding',
} as const;

describe('staff invitation reservation core', () => {
  test('normalizes an exact bounded create request and rejects extra or unsafe fields', () => {
    expect(parseCreateInvitationInput(createInput)).toEqual({ ...createInput, email: 'employee@example.com' });
    for (const invalid of [
      { ...createInput, password: 'dummy-owner-must-never-see-this' },
      { ...createInput, email: 'bad' },
      { ...createInput, expiresInHours: 0 },
      { ...createInput, expiresInHours: 169 },
      { ...createInput, expiresInHours: 1.5 },
      { ...createInput, reasonCode: 'free-form' },
    ]) expect(() => parseCreateInvitationInput(invalid)).toThrow();
  });

  test('creates a pending reservation without a token, password, URL, membership, or admin claim', () => {
    const result = buildInvitationCreate({
      actorUid: 'owner-1', ownerUid: 'owner-1', reservationId: 'reservation-123',
      input: createInput, nowMs: 1_000,
    });
    expect(result.invitation).toEqual({
      schemaVersion: 1, reservationId: 'reservation-123', revision: 1,
      status: 'pending', email: 'employee@example.com', emailMasked: 'e***@example.com',
      badge: 'Редактор', sections: { workspace: 'view' },
      createdAtMs: 1_000, expiresAtMs: 259_201_000, createdByUid: 'owner-1',
      revokedAtMs: null, revokedByUid: null,
    });
    const serialized = JSON.stringify(result);
    for (const forbidden of ['password', 'inviteUrl', 'tokenHash', 'secret', 'adminRole', 'admin":true']) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(result.audit).toEqual(expect.objectContaining({ action: 'reserve', actorUid: 'owner-1', reservationId: 'reservation-123' }));
    expect(JSON.stringify(result.audit)).not.toContain('employee@example.com');
    expect(JSON.stringify(result.audit)).not.toContain('Редактор');
  });

  test('parses storage strictly and derives expiry without mutating a persisted status', () => {
    const stored = buildInvitationCreate({ actorUid: 'owner-1', ownerUid: 'owner-1', reservationId: 'reservation-123', input: createInput, nowMs: 1_000 }).invitation;
    expect(parseStoredInvitation(stored, 'reservation-123', 2_000).effectiveStatus).toBe('pending');
    expect(parseStoredInvitation(stored, 'reservation-123', stored.expiresAtMs).effectiveStatus).toBe('expired');
    expect(() => parseStoredInvitation({ ...stored, extra: true }, 'reservation-123', 2_000)).toThrow('invalid_invitation');
    expect(() => parseStoredInvitation({ ...stored, sections: { billing: 'view' } }, 'reservation-123', 2_000)).toThrow('invalid_invitation');
  });

  test('revokes pending reservation with CAS and immutable PII-free audit', () => {
    const current = buildInvitationCreate({ actorUid: 'owner-1', ownerUid: 'owner-1', reservationId: 'reservation-123', input: createInput, nowMs: 1_000 }).invitation;
    const input = parseRevokeInvitationInput({ operationId: 'staff-invite-revoke-1', reservationId: 'reservation-123', expectedRevision: 1, reasonCode: 'access_revoked' });
    const result = buildInvitationRevoke({ actorUid: 'owner-1', ownerUid: 'owner-1', current, input, nowMs: 2_000 });
    expect(result.invitation).toEqual(expect.objectContaining({ status: 'revoked', revision: 2, revokedAtMs: 2_000, revokedByUid: 'owner-1' }));
    expect(result.audit).toEqual(expect.objectContaining({ action: 'revoke', resultRevision: 2 }));
    expect(JSON.stringify(result.audit)).not.toContain('employee@example.com');
    expect(() => buildInvitationRevoke({ actorUid: 'owner-1', ownerUid: 'owner-1', current, input: { ...input, expectedRevision: 2 }, nowMs: 2_000 })).toThrow('revision_conflict');
    expect(() => buildInvitationRevoke({ actorUid: 'owner-1', ownerUid: 'owner-1', current, input, nowMs: current.expiresAtMs })).toThrow('invitation_expired');
  });

  test('digest is deterministic and email display is minimized', () => {
    expect(invitationCreateDigest('owner-1', parseCreateInvitationInput(createInput)))
      .toBe(invitationCreateDigest('owner-1', parseCreateInvitationInput({ ...createInput, email: 'employee@example.com' })));
    expect(maskInvitationEmail('employee@example.com')).toBe('e***@example.com');
    expect(maskInvitationEmail('a@example.com')).toBe('a***@example.com');
  });

  test('audit parser requires exact own PII-free fields and valid types', () => {
    const audit = buildInvitationCreate({ actorUid: 'owner-1', ownerUid: 'owner-1', reservationId: 'reservation-123', input: createInput, nowMs: 1_000 }).audit;
    expect(parseStaffInvitationAudit(audit, audit.operationId)).toEqual(audit);
    for (const invalid of [{ ...audit, email: 'employee@example.com' }, { ...audit, requestDigest: 'bad' },
      { ...audit, operationId: 'other' }, { ...audit, createdAtMs: '1000' }]) {
      expect(() => parseStaffInvitationAudit(invalid, audit.operationId)).toThrow('invalid_audit');
    }
    const inherited = Object.create({ email: 'employee@example.com' });
    Object.assign(inherited, audit);
    expect(() => parseStaffInvitationAudit(inherited, audit.operationId)).toThrow('invalid_audit');
  });
});
