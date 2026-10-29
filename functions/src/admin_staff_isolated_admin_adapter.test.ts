import fs from 'node:fs';
import path from 'node:path';
import { getApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

import {
  ISOLATED_STAFF_ADMIN_APP_NAME,
  createIsolatedStaffAdminVerifier,
} from './admin_staff_isolated_admin_adapter';

const authProjectId = 'phraseman-staff-auth';
const mainProjectId = 'phraseman-ea0b3';
const rawToken = 'x'.repeat(32);
const config = {
  authProjectId,
  mainProjectId,
  ownerUid: 'isolated-owner-1',
  allowedOrigin: 'https://staff.example.com',
};

function sdk(overrides: Record<string, unknown> = {}) {
  const namedApp = { name: ISOLATED_STAFF_ADMIN_APP_NAME, options: { projectId: authProjectId } };
  const credential = { getAccessToken: jest.fn(async () => ({ access_token: 'unused-test-token', expires_in: 60 })) };
  const auth = {
    verifyIdToken: jest.fn(async (): Promise<unknown> => ({
      aud: authProjectId,
      iss: `https://securetoken.google.com/${authProjectId}`,
      sub: 'staff-1',
      uid: 'staff-1',
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    })),
    getUser: jest.fn(async (): Promise<unknown> => ({ uid: 'staff-1', disabled: false, emailVerified: true })),
  };
  return {
    namedApp,
    credential,
    auth,
    dependency: {
      applicationDefault: jest.fn(() => credential),
      getApps: jest.fn((): Array<typeof namedApp> => []),
      initializeApp: jest.fn(() => namedApp),
      getAuth: jest.fn(() => auth),
      ...overrides,
    },
  };
}

describe('isolated staff Admin SDK adapter', () => {
  test('fails closed on absent/mixed config and runtime project before touching Admin SDK', () => {
    for (const [rawConfig, runtimeEnv] of [
      [{}, { GCLOUD_PROJECT: mainProjectId }],
      [{ ...config, authProjectId: mainProjectId }, { GCLOUD_PROJECT: mainProjectId }],
      [config, {}],
      [config, { GCLOUD_PROJECT: 'other-main-project' }],
      [config, { GCLOUD_PROJECT: mainProjectId, GOOGLE_CLOUD_PROJECT: 'other-main-project' }],
    ] as const) {
      const d = sdk();
      expect(() => createIsolatedStaffAdminVerifier(rawConfig, runtimeEnv, d.dependency))
        .toThrow('isolated_staff_not_configured');
      expect(d.dependency.applicationDefault).not.toHaveBeenCalled();
      expect(d.dependency.initializeApp).not.toHaveBeenCalled();
      expect(d.dependency.getAuth).not.toHaveBeenCalled();
    }
  });

  test('rejects every Auth emulator override before touching Admin SDK', () => {
    for (const value of ['127.0.0.1:9099', 'localhost:9099', ' ', '']) {
      const d = sdk();
      expect(() => createIsolatedStaffAdminVerifier(config, {
        GCLOUD_PROJECT: mainProjectId,
        FIREBASE_AUTH_EMULATOR_HOST: value,
      }, d.dependency)).toThrow('isolated_staff_emulator_forbidden');
      expect(d.dependency.applicationDefault).not.toHaveBeenCalled();
      expect(d.dependency.initializeApp).not.toHaveBeenCalled();
    }
  });

  test('creates one isolated named app with ADC and verifies revocation plus current user', async () => {
    const d = sdk();
    const verify = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, d.dependency);

    await expect(verify(rawToken, true)).resolves.toEqual({
      authProjectId,
      decodedToken: expect.objectContaining({ uid: 'staff-1', aud: authProjectId }),
      currentUser: { uid: 'staff-1', disabled: false, emailVerified: true },
    });
    expect(d.dependency.applicationDefault).toHaveBeenCalledTimes(1);
    expect(d.dependency.initializeApp).toHaveBeenCalledWith({
      credential: d.credential,
      projectId: authProjectId,
    }, ISOLATED_STAFF_ADMIN_APP_NAME);
    expect(d.dependency.getAuth).toHaveBeenCalledWith(d.namedApp);
    expect(d.auth.verifyIdToken).toHaveBeenCalledWith(rawToken, true);
    expect(d.auth.getUser).toHaveBeenCalledWith('staff-1');
  });

  test('accepts the actual process.env prototype without trusting inherited project fields', () => {
    const processEnvShaped = Object.assign(Object.create(Object.getPrototypeOf(process.env)), {
      GCLOUD_PROJECT: mainProjectId,
    });
    const d = sdk();
    createIsolatedStaffAdminVerifier(config, processEnvShaped, d.dependency);
    expect(d.dependency.initializeApp).toHaveBeenCalledTimes(1);
  });

  test('reuses only its own initialized app and rejects a foreign same-name same-project app', () => {
    const owned = sdk();
    createIsolatedStaffAdminVerifier(config, { GOOGLE_CLOUD_PROJECT: mainProjectId }, owned.dependency);
    createIsolatedStaffAdminVerifier(config, { GOOGLE_CLOUD_PROJECT: mainProjectId }, owned.dependency);
    expect(owned.dependency.applicationDefault).toHaveBeenCalledTimes(1);
    expect(owned.dependency.initializeApp).toHaveBeenCalledTimes(1);
    expect(owned.dependency.getAuth).toHaveBeenCalledTimes(2);

    const foreign = sdk();
    foreign.dependency.getApps = jest.fn(() => [{
      name: ISOLATED_STAFF_ADMIN_APP_NAME,
      options: { projectId: authProjectId },
    }]);
    expect(() => createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, foreign.dependency))
      .toThrow('isolated_staff_not_configured');
    expect(foreign.dependency.applicationDefault).not.toHaveBeenCalled();
    expect(foreign.dependency.initializeApp).not.toHaveBeenCalled();
    expect(foreign.dependency.getAuth).not.toHaveBeenCalled();
  });

  test('verification failure or malformed decoded UID never calls current-user lookup', async () => {
    const rejected = sdk();
    rejected.auth.verifyIdToken = jest.fn(async () => { throw new Error('revoked'); });
    const verifyRejected = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, rejected.dependency);
    await expect(verifyRejected(rawToken, true)).rejects.toThrow('isolated_staff_authentication_required');
    expect(rejected.auth.verifyIdToken).toHaveBeenCalledWith(rawToken, true);
    expect(rejected.auth.getUser).not.toHaveBeenCalled();

    const malformed = sdk();
    malformed.auth.verifyIdToken = jest.fn(async () => ({ uid: '', sub: '' }));
    const verifyMalformed = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, malformed.dependency);
    await expect(verifyMalformed(rawToken, true)).rejects.toThrow('isolated_staff_authentication_required');
    expect(malformed.auth.getUser).not.toHaveBeenCalled();
  });

  test('rechecks emulator override for every verification and makes zero Auth calls after mutation', async () => {
    const runtimeEnvironment: Record<string, unknown> = { GCLOUD_PROJECT: mainProjectId };
    const d = sdk();
    const verify = createIsolatedStaffAdminVerifier(config, runtimeEnvironment, d.dependency);
    runtimeEnvironment.FIREBASE_AUTH_EMULATOR_HOST = '';
    await expect(verify(rawToken, true)).rejects.toThrow('isolated_staff_emulator_forbidden');
    expect(d.auth.verifyIdToken).not.toHaveBeenCalled();
    expect(d.auth.getUser).not.toHaveBeenCalled();
  });

  test('real SDK path cannot mask the actual process Auth emulator with a clean supplied object', async () => {
    const key = 'FIREBASE_AUTH_EMULATOR_HOST';
    const hadOriginal = Object.prototype.hasOwnProperty.call(process.env, key);
    const original = process.env[key];
    try {
      process.env[key] = '';
      expect(() => createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }))
        .toThrow('isolated_staff_emulator_forbidden');
      delete process.env[key];
      const verify = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId });
      process.env[key] = '127.0.0.1:9099';
      await expect(verify(rawToken, true)).rejects.toThrow('isolated_staff_emulator_forbidden');
    } finally {
      if (hadOriginal && original !== undefined) process.env[key] = original;
      else delete process.env[key];
    }
  });

  test('an injected SDK wrapper cannot mask the actual process Auth emulator', async () => {
    const key = 'FIREBASE_AUTH_EMULATOR_HOST';
    const hadOriginal = Object.prototype.hasOwnProperty.call(process.env, key);
    const original = process.env[key];
    try {
      const factoryBlocked = sdk();
      process.env[key] = '';
      expect(() => createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, factoryBlocked.dependency))
        .toThrow('isolated_staff_emulator_forbidden');
      expect(factoryBlocked.dependency.initializeApp).not.toHaveBeenCalled();

      delete process.env[key];
      const invocationBlocked = sdk();
      const verify = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, invocationBlocked.dependency);
      process.env[key] = '127.0.0.1:9099';
      await expect(verify(rawToken, true)).rejects.toThrow('isolated_staff_emulator_forbidden');
      expect(invocationBlocked.auth.verifyIdToken).not.toHaveBeenCalled();
      expect(invocationBlocked.auth.getUser).not.toHaveBeenCalled();
    } finally {
      if (hadOriginal && original !== undefined) process.env[key] = original;
      else delete process.env[key];
    }
  });

  test('accepts the Firebase Admin UserRecord class shape while validating trusted scalar fields', async () => {
    class FirebaseUserRecordLike {
      constructor(
        readonly uid: string,
        readonly disabled: boolean,
        readonly emailVerified: boolean,
      ) {}
    }
    const d = sdk();
    d.auth.getUser = jest.fn(async () => new FirebaseUserRecordLike('staff-1', false, true));
    const verify = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId }, d.dependency);
    await expect(verify(rawToken, true)).resolves.toEqual(expect.objectContaining({
      currentUser: { uid: 'staff-1', disabled: false, emailVerified: true },
    }));
  });

  test('installed Admin SDK rejects an unsupported-algorithm token without an emulator or synthetic identity', async () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
    const unsupportedToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      aud: authProjectId,
      iss: `https://securetoken.google.com/${authProjectId}`,
      sub: 'staff-1',
      uid: 'staff-1',
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    })}.invalid`;
    const verify = createIsolatedStaffAdminVerifier(config, { GCLOUD_PROJECT: mainProjectId });
    await expect(getAdminAuth(getApp(ISOLATED_STAFF_ADMIN_APP_NAME)).verifyIdToken(unsupportedToken, true))
      .rejects.toMatchObject({ code: 'auth/argument-error' });
    await expect(verify(unsupportedToken, true)).rejects.toThrow('isolated_staff_authentication_required');
  });

  test('source remains unexported and contains no product collection references or service-account secret', () => {
    const root = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(root, 'src', 'admin_staff_isolated_admin_adapter.ts'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'src', 'index.ts'), 'utf8');
    expect(index).not.toContain('admin_staff_isolated_admin_adapter');
    for (const forbidden of ['public_profiles', "collection('users')", 'auth_links', 'serviceAccount', 'cert(']) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain('applicationDefault');
  });
});
