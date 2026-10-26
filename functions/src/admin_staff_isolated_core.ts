export const ADMIN_STAFF_ISOLATED_MEMBERS_COLLECTION = 'admin_staff_members_v2' as const;
export const ADMIN_STAFF_ISOLATED_SCHEMA_VERSION = 2 as const;
export const ADMIN_STAFF_IDENTITY_NAMESPACE = 'isolated_staff_v1' as const;

export interface IsolatedStaffConfig {
  readonly authProjectId: string;
  readonly mainProjectId: string;
  readonly ownerUid: string;
  readonly ownerPrincipalKey: string;
  readonly issuer: string;
  readonly allowedOrigin: string;
}

export interface IsolatedStaffPrincipal {
  readonly authProjectId: string;
  readonly authUid: string;
}

export interface StoredIsolatedStaffMembership {
  readonly schemaVersion: typeof ADMIN_STAFF_ISOLATED_SCHEMA_VERSION;
  readonly identityNamespace: typeof ADMIN_STAFF_IDENTITY_NAMESPACE;
  readonly principalKey: string;
  readonly authProjectId: string;
  readonly authUid: string;
  readonly active: boolean;
  readonly revision: number;
  readonly badge: string;
  readonly sections: Readonly<{ readonly workspace?: 'view' }>;
  readonly updatedAtMs: number;
  readonly updatedByPrincipalKey: string;
}

const PROJECT_ID_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const MEMBER_KEYS = ['schemaVersion', 'identityNamespace', 'principalKey', 'authProjectId', 'authUid',
  'active', 'revision', 'badge', 'sections', 'updatedAtMs', 'updatedByPrincipalKey'] as const;

function fail(code: string): never { throw new Error(code); }
function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function exact(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === keys.length && actual.every(key => keys.includes(key)) &&
    keys.every(key => Object.prototype.hasOwnProperty.call(record, key));
}
function validProjectId(value: unknown): value is string {
  return typeof value === 'string' && PROJECT_ID_RE.test(value);
}
function validUid(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 128 && Buffer.byteLength(value, 'utf8') <= 128 &&
    Buffer.from(value, 'utf8').toString('utf8') === value && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}
function encode(value: string): string { return Buffer.from(value, 'utf8').toString('base64url'); }
function decode(value: string): string {
  if (!BASE64URL_RE.test(value)) fail('invalid_isolated_principal');
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  if (encode(decoded) !== value) fail('invalid_isolated_principal');
  return decoded;
}

export function isolatedStaffPrincipalKey(authProjectId: string, authUid: string): string {
  if (!validProjectId(authProjectId)) fail('invalid_isolated_project');
  if (!validUid(authUid)) fail('invalid_isolated_uid');
  return `fa1:${encode(authProjectId)}:${encode(authUid)}`;
}

export function parseIsolatedStaffPrincipalKey(value: unknown): IsolatedStaffPrincipal {
  if (typeof value !== 'string' || value.length > 400) fail('invalid_isolated_principal');
  const parts = value.split(':');
  if (parts.length !== 3 || parts[0] !== 'fa1') fail('invalid_isolated_principal');
  const authProjectId = decode(parts[1]);
  const authUid = decode(parts[2]);
  if (isolatedStaffPrincipalKey(authProjectId, authUid) !== value) fail('invalid_isolated_principal');
  return Object.freeze({ authProjectId, authUid });
}

export function parseIsolatedStaffConfig(value: unknown): IsolatedStaffConfig {
  if (!isPlain(value) || !exact(value, ['authProjectId', 'mainProjectId', 'ownerUid', 'allowedOrigin']) ||
      !validProjectId(value.authProjectId) || !validProjectId(value.mainProjectId) ||
      value.authProjectId === value.mainProjectId || !validUid(value.ownerUid) || typeof value.allowedOrigin !== 'string') {
    fail('isolated_staff_not_configured');
  }
  let parsedOrigin: URL;
  try { parsedOrigin = new URL(value.allowedOrigin); }
  catch { fail('isolated_staff_not_configured'); }
  if (parsedOrigin.protocol !== 'https:' || parsedOrigin.username || parsedOrigin.password ||
      parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash || parsedOrigin.origin !== value.allowedOrigin) {
    fail('isolated_staff_not_configured');
  }
  return Object.freeze({ authProjectId: value.authProjectId, mainProjectId: value.mainProjectId, ownerUid: value.ownerUid,
    ownerPrincipalKey: isolatedStaffPrincipalKey(value.authProjectId, value.ownerUid),
    issuer: `https://securetoken.google.com/${value.authProjectId}`, allowedOrigin: value.allowedOrigin });
}

export function parseStoredIsolatedStaffMembership(value: unknown, expectedPrincipalKey: string): StoredIsolatedStaffMembership {
  let expected: IsolatedStaffPrincipal;
  try { expected = parseIsolatedStaffPrincipalKey(expectedPrincipalKey); }
  catch { return fail('invalid_isolated_membership'); }
  if (!isPlain(value) || !exact(value, MEMBER_KEYS) || value.schemaVersion !== ADMIN_STAFF_ISOLATED_SCHEMA_VERSION ||
      value.identityNamespace !== ADMIN_STAFF_IDENTITY_NAMESPACE || value.principalKey !== expectedPrincipalKey ||
      value.authProjectId !== expected.authProjectId || value.authUid !== expected.authUid || typeof value.active !== 'boolean' ||
      !Number.isSafeInteger(value.revision) || Number(value.revision) < 1 ||
      !Number.isSafeInteger(value.updatedAtMs) || Number(value.updatedAtMs) < 0 || typeof value.badge !== 'string' ||
      value.badge.length < 1 || value.badge.length > 80 || value.badge.trim() !== value.badge ||
      /[\u0000-\u001f\u007f]/.test(value.badge) || !isPlain(value.sections)) fail('invalid_isolated_membership');
  const sectionKeys = Object.keys(value.sections);
  if (value.active) {
    if (!exact(value.sections, ['workspace']) || value.sections.workspace !== 'view') fail('invalid_isolated_membership');
  } else if (sectionKeys.length !== 0) fail('invalid_isolated_membership');
  if (typeof value.updatedByPrincipalKey !== 'string') fail('invalid_isolated_membership');
  const updatedByPrincipalKey = value.updatedByPrincipalKey;
  let updater: IsolatedStaffPrincipal;
  try { updater = parseIsolatedStaffPrincipalKey(updatedByPrincipalKey); }
  catch { return fail('invalid_isolated_membership'); }
  if (updater.authProjectId !== expected.authProjectId) fail('invalid_isolated_membership');
  const sections = value.active ? Object.freeze({ workspace: 'view' as const }) : Object.freeze({});
  return Object.freeze({ schemaVersion: 2, identityNamespace: ADMIN_STAFF_IDENTITY_NAMESPACE,
    principalKey: expectedPrincipalKey, authProjectId: expected.authProjectId, authUid: expected.authUid,
    active: value.active, revision: value.revision as number, badge: value.badge, sections,
    updatedAtMs: value.updatedAtMs as number, updatedByPrincipalKey });
}
