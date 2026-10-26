import {
  ADMIN_STAFF_IDENTITY_NAMESPACE,
  isolatedStaffPrincipalKey,
  parseIsolatedStaffConfig,
  parseStoredIsolatedStaffMembership,
} from './admin_staff_isolated_core';

export interface IsolatedStaffSessionRequest {
  readonly method: unknown;
  readonly origin: unknown;
  readonly authorization: unknown;
  readonly body: unknown;
}

export interface VerifiedIsolatedStaffIdentity {
  readonly authProjectId: string;
  readonly decodedToken: unknown;
  readonly currentUser: Readonly<{ uid: string; disabled: boolean; emailVerified: boolean }>;
}

export interface IsolatedStaffGatewayDependencies {
  readonly verifyToken: (token: string, checkRevoked: true) => Promise<VerifiedIsolatedStaffIdentity>;
  readonly consumeRateLimit: (scope: string, principalKey: string, limit: number, windowMs: number) => Promise<void>;
  readonly loadMembershipV2: (principalKey: string) => Promise<unknown | null>;
}

export class IsolatedStaffGatewayError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  constructor(code: string, httpStatus: number) {
    super(code);
    this.name = 'IsolatedStaffGatewayError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function fail(code: string, httpStatus: number): never { throw new IsolatedStaffGatewayError(code, httpStatus); }
function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function exact(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === keys.length && actual.every(key => keys.includes(key)) &&
    keys.every(key => Object.prototype.hasOwnProperty.call(record, key));
}
function bearer(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) fail('isolated_staff_authentication_required', 401);
  const token = value.slice(7);
  if (token.length < 16 || token.length > 8192 || /\s|[\u0000-\u001f\u007f]/.test(token)) {
    fail('isolated_staff_authentication_required', 401);
  }
  return token;
}

function authenticatedPrincipal(raw: unknown, authProjectId: string, issuer: string): string {
  if (!isPlain(raw) || !exact(raw, ['authProjectId', 'decodedToken', 'currentUser']) ||
      raw.authProjectId !== authProjectId || !isPlain(raw.decodedToken) || !isPlain(raw.currentUser) ||
      !exact(raw.currentUser, ['uid', 'disabled', 'emailVerified'])) fail('isolated_staff_authentication_required', 401);
  const token = raw.decodedToken;
  const current = raw.currentUser;
  if (token.aud !== authProjectId || token.iss !== issuer || typeof token.sub !== 'string' || token.sub.length < 1 ||
      token.uid !== token.sub || token.email_verified !== true || !isPlain(token.firebase) ||
      Object.prototype.hasOwnProperty.call(token.firebase, 'tenant') || Object.prototype.hasOwnProperty.call(token, 'tenant_id') ||
      current.uid !== token.sub || current.disabled !== false || current.emailVerified !== true) {
    fail('isolated_staff_authentication_required', 401);
  }
  try { return isolatedStaffPrincipalKey(authProjectId, token.sub); }
  catch { return fail('isolated_staff_authentication_required', 401); }
}

export async function handleIsolatedStaffSession(
  request: unknown,
  rawConfig: unknown,
  deps: IsolatedStaffGatewayDependencies,
): Promise<Readonly<{
  schemaVersion: 1;
  identityNamespace: typeof ADMIN_STAFF_IDENTITY_NAMESPACE;
  principalKey: string;
  role: 'owner' | 'staff';
  revision?: number;
  badge: string;
  sections: Readonly<{ workspace: 'view' }>;
}>> {
  let config;
  try { config = parseIsolatedStaffConfig(rawConfig); }
  catch { return fail('isolated_staff_not_configured', 503); }
  if (!isPlain(request) || !exact(request, ['method', 'origin', 'authorization', 'body']) || request.method !== 'POST' ||
      !isPlain(request.body) || Object.keys(request.body).length !== 0) fail('isolated_staff_invalid_request', 400);
  if (request.origin !== config.allowedOrigin) fail('isolated_staff_invalid_request', 403);
  const token = bearer(request.authorization);
  let verified: VerifiedIsolatedStaffIdentity;
  try { verified = await deps.verifyToken(token, true); }
  catch { return fail('isolated_staff_authentication_required', 401); }
  const principalKey = authenticatedPrincipal(verified, config.authProjectId, config.issuer);
  try { await deps.consumeRateLimit('isolated-session-read', principalKey, 30, 60_000); }
  catch (error) {
    if (error instanceof Error && error.message === 'rate_limited') return fail('isolated_staff_rate_limited', 429);
    return fail('isolated_staff_internal', 500);
  }
  if (principalKey === config.ownerPrincipalKey) {
    return Object.freeze({ schemaVersion: 1, identityNamespace: ADMIN_STAFF_IDENTITY_NAMESPACE, principalKey,
      role: 'owner', badge: 'Владелец', sections: Object.freeze({ workspace: 'view' }) });
  }
  let rawMembership: unknown | null;
  try { rawMembership = await deps.loadMembershipV2(principalKey); }
  catch { return fail('isolated_staff_internal', 500); }
  if (rawMembership === null) fail('isolated_staff_membership_required', 403);
  let membership;
  try { membership = parseStoredIsolatedStaffMembership(rawMembership, principalKey); }
  catch { return fail('isolated_staff_membership_required', 403); }
  if (!membership.active || membership.sections.workspace !== 'view') fail('isolated_staff_membership_required', 403);
  return Object.freeze({ schemaVersion: 1, identityNamespace: ADMIN_STAFF_IDENTITY_NAMESPACE, principalKey,
    role: 'staff', revision: membership.revision, badge: membership.badge,
    sections: Object.freeze({ workspace: 'view' }) });
}
