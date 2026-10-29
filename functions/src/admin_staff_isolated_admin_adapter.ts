import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
  type Credential,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import {
  isolatedStaffPrincipalKey,
  parseIsolatedStaffConfig,
} from './admin_staff_isolated_core';
import type {
  IsolatedStaffGatewayDependencies,
  VerifiedIsolatedStaffIdentity,
} from './admin_staff_isolated_gateway_core';

export const ISOLATED_STAFF_ADMIN_APP_NAME = 'phraseman-staff-isolated-auth-v1' as const;

interface AdminAppLike {
  readonly name: string;
  readonly options: Readonly<{ readonly projectId?: string }>;
}

interface AdminAuthLike {
  readonly verifyIdToken: (token: string, checkRevoked: boolean) => Promise<unknown>;
  readonly getUser: (uid: string) => Promise<unknown>;
}

export interface IsolatedStaffAdminSdk {
  readonly applicationDefault: () => Credential;
  readonly getApps: () => readonly AdminAppLike[];
  readonly initializeApp: (
    options: Readonly<{ credential: Credential; projectId: string }>,
    name: string,
  ) => AdminAppLike;
  readonly getAuth: (app: AdminAppLike) => AdminAuthLike;
}

type RuntimeEnvironment = Readonly<Record<string, unknown>>;
type VerifyToken = IsolatedStaffGatewayDependencies['verifyToken'];

const REAL_ADMIN_SDK: IsolatedStaffAdminSdk = Object.freeze({
  applicationDefault,
  getApps,
  initializeApp: (options: Readonly<{ credential: Credential; projectId: string }>, name: string): AdminAppLike =>
    initializeApp(options, name),
  getAuth: (app: AdminAppLike): AdminAuthLike => getAuth(app as App),
});
const OWNED_APPS = new WeakMap<IsolatedStaffAdminSdk, AdminAppLike>();

function fail(code: string): never { throw new Error(code); }
function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function own(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function validRuntimeEnvironment(value: unknown, mainProjectId: string): value is RuntimeEnvironment {
  if (!isRecordLike(value) || own(value, 'FIREBASE_AUTH_EMULATOR_HOST')) return false;
  const projectValues = ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']
    .filter(key => own(value, key))
    .map(key => value[key]);
  return projectValues.length >= 1 && projectValues.every(project => project === mainProjectId);
}
function assertRuntimeEnvironment(value: unknown, mainProjectId: string): asserts value is RuntimeEnvironment {
  if (!isRecordLike(value)) fail('isolated_staff_not_configured');
  if (own(value, 'FIREBASE_AUTH_EMULATOR_HOST') || own(process.env, 'FIREBASE_AUTH_EMULATOR_HOST')) {
    fail('isolated_staff_emulator_forbidden');
  }
  if (!validRuntimeEnvironment(value, mainProjectId)) fail('isolated_staff_not_configured');
}
function verifiedUid(decoded: Record<string, unknown>, authProjectId: string, issuer: string): string {
  if (decoded.aud !== authProjectId || decoded.iss !== issuer || typeof decoded.uid !== 'string' ||
      decoded.sub !== decoded.uid || decoded.email_verified !== true || !isPlain(decoded.firebase) ||
      own(decoded.firebase, 'tenant') || own(decoded, 'tenant_id')) fail('isolated_staff_authentication_required');
  try { isolatedStaffPrincipalKey(authProjectId, decoded.uid); }
  catch { return fail('isolated_staff_authentication_required'); }
  return decoded.uid;
}
function currentUserProjection(raw: unknown, expectedUid: string): VerifiedIsolatedStaffIdentity['currentUser'] {
  if (!isRecordLike(raw) || raw.uid !== expectedUid || raw.disabled !== false || raw.emailVerified !== true) {
    fail('isolated_staff_authentication_required');
  }
  return Object.freeze({ uid: expectedUid, disabled: false, emailVerified: true });
}

export function createIsolatedStaffAdminVerifier(
  rawConfig: unknown,
  runtimeEnvironment: unknown,
  sdk: IsolatedStaffAdminSdk = REAL_ADMIN_SDK,
): VerifyToken {
  let config;
  try { config = parseIsolatedStaffConfig(rawConfig); }
  catch { return fail('isolated_staff_not_configured'); }
  assertRuntimeEnvironment(runtimeEnvironment, config.mainProjectId);

  let app: AdminAppLike;
  try {
    const owned = OWNED_APPS.get(sdk);
    const registered = sdk.getApps().find(candidate => candidate.name === ISOLATED_STAFF_ADMIN_APP_NAME);
    if (owned) {
      if (owned.name !== ISOLATED_STAFF_ADMIN_APP_NAME || owned.options.projectId !== config.authProjectId ||
          (registered !== undefined && registered !== owned)) fail('isolated_staff_not_configured');
      app = owned;
    } else {
      if (registered !== undefined) fail('isolated_staff_not_configured');
      app = sdk.initializeApp({ credential: sdk.applicationDefault(), projectId: config.authProjectId },
        ISOLATED_STAFF_ADMIN_APP_NAME);
      if (app.name !== ISOLATED_STAFF_ADMIN_APP_NAME || app.options.projectId !== config.authProjectId) {
        fail('isolated_staff_not_configured');
      }
      OWNED_APPS.set(sdk, app);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'isolated_staff_not_configured') throw error;
    return fail('isolated_staff_not_configured');
  }

  let auth: AdminAuthLike;
  try { auth = sdk.getAuth(app); }
  catch { return fail('isolated_staff_not_configured'); }

  return async (token: string, checkRevoked: true): Promise<VerifiedIsolatedStaffIdentity> => {
    assertRuntimeEnvironment(runtimeEnvironment, config.mainProjectId);
    if (checkRevoked !== true || typeof token !== 'string' || token.length < 16 || token.length > 8192 ||
        /\s|[\u0000-\u001f\u007f]/.test(token)) fail('isolated_staff_authentication_required');
    let decodedToken: unknown;
    try { decodedToken = await auth.verifyIdToken(token, true); }
    catch { return fail('isolated_staff_authentication_required'); }
    if (!isPlain(decodedToken)) fail('isolated_staff_authentication_required');
    const uid = verifiedUid(decodedToken, config.authProjectId, config.issuer);
    let rawCurrentUser: unknown;
    try { rawCurrentUser = await auth.getUser(uid); }
    catch { return fail('isolated_staff_authentication_required'); }
    return Object.freeze({ authProjectId: config.authProjectId, decodedToken,
      currentUser: currentUserProjection(rawCurrentUser, uid) });
  };
}
