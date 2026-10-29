import {
  ADMIN_STAFF_ISOLATED_MEMBERS_COLLECTION,
  isolatedStaffPrincipalKey,
  parseIsolatedStaffConfig,
  parseIsolatedStaffPrincipalKey,
  parseStoredIsolatedStaffMembership,
} from './admin_staff_isolated_core';

const projectId = 'phraseman-staff-auth';
const ownerUid = 'Owner_Exact-1';
const principalKey = isolatedStaffPrincipalKey(projectId, 'staff-1');
const ownerPrincipalKey = isolatedStaffPrincipalKey(projectId, ownerUid);

const member = {
  schemaVersion: 2,
  identityNamespace: 'isolated_staff_v1',
  principalKey,
  authProjectId: projectId,
  authUid: 'staff-1',
  active: true,
  revision: 1,
  badge: 'Редактор',
  sections: { workspace: 'view' },
  updatedAtMs: 1000,
  updatedByPrincipalKey: ownerPrincipalKey,
};

describe('isolated staff identity and membership core', () => {
  test('builds a canonical project-namespaced principal without normalizing the UID', () => {
    expect(ADMIN_STAFF_ISOLATED_MEMBERS_COLLECTION).toBe('admin_staff_members_v2');
    const key = isolatedStaffPrincipalKey(projectId, 'Ä-Exact_UID');
    expect(key).toMatch(/^fa1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(parseIsolatedStaffPrincipalKey(key)).toEqual({ authProjectId: projectId, authUid: 'Ä-Exact_UID' });
    expect(isolatedStaffPrincipalKey(projectId, 'SameUid')).not.toBe(isolatedStaffPrincipalKey('other-staff-project', 'SameUid'));
    expect(isolatedStaffPrincipalKey(projectId, 'SameUid')).not.toBe(isolatedStaffPrincipalKey(projectId, 'sameuid'));
  });

  test('rejects bare, noncanonical, padded, whitespace-normalized, and malformed principals', () => {
    for (const value of ['staff-1', `fa1:${Buffer.from(projectId).toString('base64')}:${Buffer.from('staff-1').toString('base64')}`,
      `${principalKey}=`, principalKey.replace('fa1:', 'fa2:'), 'fa1:not+base64:uid']) {
      expect(() => parseIsolatedStaffPrincipalKey(value)).toThrow('invalid_isolated_principal');
    }
    expect(() => isolatedStaffPrincipalKey(projectId, ' staff-1')).toThrow('invalid_isolated_uid');
    expect(() => isolatedStaffPrincipalKey(projectId, '\uD800')).toThrow('invalid_isolated_uid');
    expect(() => isolatedStaffPrincipalKey(projectId, '\uD801')).toThrow('invalid_isolated_uid');
    expect(() => isolatedStaffPrincipalKey(` ${projectId}`, 'staff-1')).toThrow('invalid_isolated_project');
  });

  test('parses only exact, separate isolated configuration and derives issuer and owner principal', () => {
    expect(parseIsolatedStaffConfig({ authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'https://staff.example.com' }))
      .toEqual({ authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, ownerPrincipalKey,
        issuer: `https://securetoken.google.com/${projectId}`, allowedOrigin: 'https://staff.example.com' });
    for (const value of [{}, { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid: '', allowedOrigin: 'https://staff.example.com' },
      { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: '*' },
      { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'https://staff.example.com/path' },
      { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'http://staff.example.com' },
      { authProjectId: 'phraseman-ea0b3', mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'https://staff.example.com' },
      { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'https://staff.example.com', ADMIN_STAFF_OWNER_UID: 'legacy' }]) {
      expect(() => parseIsolatedStaffConfig(value)).toThrow('isolated_staff_not_configured');
    }
  });

  test('accepts one strict v2 membership whose document key, embedded identity, and updater namespace agree', () => {
    expect(parseStoredIsolatedStaffMembership(member, principalKey)).toEqual(member);
  });

  test('fails closed for cross-project collisions, mismatched embedded identity, extra or inherited fields, and unsupported access', () => {
    const cases: unknown[] = [
      { ...member, principalKey: isolatedStaffPrincipalKey('other-staff-project', 'staff-1') },
      { ...member, authProjectId: 'other-staff-project' },
      { ...member, authUid: 'Staff-1' },
      { ...member, updatedByPrincipalKey: isolatedStaffPrincipalKey('other-staff-project', ownerUid) },
      { ...member, sections: { users: 'view' } },
      { ...member, sections: { workspace: 'request' } },
      { ...member, active: false, sections: { workspace: 'view' } },
      { ...member, unexpected: true },
    ];
    const inherited = Object.create(member);
    cases.push(inherited);
    for (const value of cases) expect(() => parseStoredIsolatedStaffMembership(value, principalKey)).toThrow('invalid_isolated_membership');
  });

  test('accepts a revoked record only with no visible sections', () => {
    expect(parseStoredIsolatedStaffMembership({ ...member, active: false, revision: 2, sections: {} }, principalKey))
      .toEqual(expect.objectContaining({ active: false, revision: 2, sections: {} }));
  });
});
