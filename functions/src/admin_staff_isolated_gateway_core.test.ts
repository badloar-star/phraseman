import {
  IsolatedStaffGatewayError,
  handleIsolatedStaffSession,
  type IsolatedStaffGatewayDependencies,
  type IsolatedStaffSessionRequest,
} from './admin_staff_isolated_gateway_core';
import { isolatedStaffPrincipalKey } from './admin_staff_isolated_core';

const projectId = 'phraseman-staff-auth';
const ownerUid = 'isolated-owner-1';
const config = { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'https://staff.example.com' };
const issuer = `https://securetoken.google.com/${projectId}`;
const staffPrincipal = isolatedStaffPrincipalKey(projectId, 'staff-1');
const ownerPrincipal = isolatedStaffPrincipalKey(projectId, ownerUid);
const request: IsolatedStaffSessionRequest = {
  method: 'POST', origin: 'https://staff.example.com', authorization: `Bearer ${'x'.repeat(32)}`, body: {},
};
const decoded = { aud: projectId, iss: issuer, sub: 'staff-1', uid: 'staff-1', email_verified: true,
  firebase: { sign_in_provider: 'password' }, admin: true, email: 'same@example.com' };
const member = { schemaVersion: 2, identityNamespace: 'isolated_staff_v1', principalKey: staffPrincipal,
  authProjectId: projectId, authUid: 'staff-1', active: true, revision: 3, badge: 'Редактор',
  sections: { workspace: 'view' }, updatedAtMs: 1000, updatedByPrincipalKey: ownerPrincipal };

function deps(overrides: Partial<IsolatedStaffGatewayDependencies> = {}): IsolatedStaffGatewayDependencies {
  return {
    verifyToken: jest.fn(async (_token: string, _checkRevoked: true) => ({ authProjectId: projectId, decodedToken: decoded,
      currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } })),
    consumeRateLimit: jest.fn(async () => undefined),
    loadMembershipV2: jest.fn(async () => member),
    ...overrides,
  };
}

async function expectCode(run: Promise<unknown>, code: string): Promise<void> {
  await expect(run).rejects.toMatchObject({ name: 'IsolatedStaffGatewayError', code });
}

describe('isolated staff session gateway core', () => {
  test('fails closed on missing or mixed configuration before verifier and storage', async () => {
    for (const raw of [{}, { authProjectId: projectId, mainProjectId: 'phraseman-ea0b3', ownerUid: '', allowedOrigin: 'https://staff.example.com' },
      { authProjectId: 'phraseman-ea0b3', mainProjectId: 'phraseman-ea0b3', ownerUid, allowedOrigin: 'https://staff.example.com' },
      { ...config, ADMIN_STAFF_OWNER_UID: 'main-owner' }]) {
      const d = deps();
      await expectCode(handleIsolatedStaffSession(request, raw, d), 'isolated_staff_not_configured');
      expect(d.verifyToken).not.toHaveBeenCalled();
      expect(d.loadMembershipV2).not.toHaveBeenCalled();
    }
  });

  test('rejects method, origin, body, and bearer token before verification', async () => {
    const bad: unknown[] = [null, [],
      { ...request, method: 'GET' }, { ...request, origin: 'https://evil.example.com' },
      { ...request, origin: 'https://staff.example.com/' }, { ...request, body: { extra: true } },
      { ...request, authorization: undefined }, { ...request, authorization: 'bearer token' },
    ];
    for (const value of bad) {
      const d = deps();
      await expect(handleIsolatedStaffSession(value, config, d)).rejects.toBeInstanceOf(IsolatedStaffGatewayError);
      expect(d.verifyToken).not.toHaveBeenCalled();
      expect(d.loadMembershipV2).not.toHaveBeenCalled();
    }
  });

  test('requires revocation-aware verification and rejects verifier failure before rate or storage', async () => {
    const d = deps({ verifyToken: jest.fn(async () => { throw new Error('revoked'); }) });
    await expectCode(handleIsolatedStaffSession(request, config, d), 'isolated_staff_authentication_required');
    expect(d.verifyToken).toHaveBeenCalledWith('x'.repeat(32), true);
    expect(d.consumeRateLimit).not.toHaveBeenCalled();
    expect(d.loadMembershipV2).not.toHaveBeenCalled();
  });

  test('rejects wrong project claims, tenant, UID mismatch, and non-current users before storage', async () => {
    const identities = [
      { authProjectId: 'other-staff-project', decodedToken: decoded, currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, aud: 'phraseman-ea0b3' }, currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, iss: 'https://securetoken.google.com/phraseman-ea0b3' }, currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, sub: '' }, currentUser: { uid: '', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, uid: 'other' }, currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, email_verified: false }, currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, firebase: { tenant: 'tenant-1' } }, currentUser: { uid: 'staff-1', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: { ...decoded, sub: '\uD800', uid: '\uD800' }, currentUser: { uid: '\uD800', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: decoded, currentUser: { uid: 'other', disabled: false, emailVerified: true } },
      { authProjectId: projectId, decodedToken: decoded, currentUser: { uid: 'staff-1', disabled: true, emailVerified: true } },
      { authProjectId: projectId, decodedToken: decoded, currentUser: { uid: 'staff-1', disabled: false, emailVerified: false } },
    ];
    for (const identity of identities) {
      const d = deps({ verifyToken: jest.fn(async () => identity) });
      await expectCode(handleIsolatedStaffSession(request, config, d), 'isolated_staff_authentication_required');
      expect(d.consumeRateLimit).not.toHaveBeenCalled();
      expect(d.loadMembershipV2).not.toHaveBeenCalled();
    }
  });

  test('authorizes isolated owner by separate project binding without membership lookup', async () => {
    const ownerDecoded = { ...decoded, sub: ownerUid, uid: ownerUid };
    const d = deps({ verifyToken: jest.fn(async () => ({ authProjectId: projectId, decodedToken: ownerDecoded,
      currentUser: { uid: ownerUid, disabled: false, emailVerified: true } })) });
    await expect(handleIsolatedStaffSession(request, config, d)).resolves.toEqual({ schemaVersion: 1,
      identityNamespace: 'isolated_staff_v1', principalKey: ownerPrincipal, role: 'owner', badge: 'Владелец',
      sections: { workspace: 'view' } });
    expect(d.consumeRateLimit).toHaveBeenCalledWith('isolated-session-read', ownerPrincipal, 30, 60_000);
    expect(d.loadMembershipV2).not.toHaveBeenCalled();
  });

  test('returns only an active exact v2 membership and ignores email collision or admin claim as authority', async () => {
    const d = deps();
    await expect(handleIsolatedStaffSession(request, config, d)).resolves.toEqual({ schemaVersion: 1,
      identityNamespace: 'isolated_staff_v1', principalKey: staffPrincipal, role: 'staff', revision: 3,
      badge: 'Редактор', sections: { workspace: 'view' } });
    expect(d.verifyToken).toHaveBeenCalledWith('x'.repeat(32), true);
    expect(d.loadMembershipV2).toHaveBeenCalledWith(staffPrincipal);

    const noMember = deps({ loadMembershipV2: jest.fn(async () => null) });
    await expectCode(handleIsolatedStaffSession(request, config, noMember), 'isolated_staff_membership_required');
  });

  test('rate limit precedes the sole membership read and malformed, revoked, or colliding rows fail closed', async () => {
    const limited = deps({ consumeRateLimit: jest.fn(async () => { throw new Error('rate_limited'); }) });
    await expectCode(handleIsolatedStaffSession(request, config, limited), 'isolated_staff_rate_limited');
    expect(limited.loadMembershipV2).not.toHaveBeenCalled();

    for (const raw of [null, { ...member, active: false, sections: {} },
      { ...member, authProjectId: 'other-staff-project' }, { ...member, principalKey: isolatedStaffPrincipalKey('other-staff-project', 'staff-1') },
      Object.create(member)]) {
      const d = deps({ loadMembershipV2: jest.fn(async () => raw) });
      await expectCode(handleIsolatedStaffSession(request, config, d), 'isolated_staff_membership_required');
    }
  });
});
