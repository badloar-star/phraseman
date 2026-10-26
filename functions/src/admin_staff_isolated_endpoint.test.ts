import fs from 'node:fs';
import path from 'node:path';

import {
  ADMIN_STAFF_ISOLATED_HTTP_OPTIONS,
  ADMIN_STAFF_ISOLATED_RELEASE_ENABLED,
  createAdminStaffIsolatedEndpointHandler,
  createAdminStaffIsolatedReleaseHttpHandler,
  ensureIsolatedStaffMainApp,
  prepareIsolatedStaffEndpointConfig,
  type AdminStaffIsolatedEndpointResponse,
} from './admin_staff_isolated_endpoint';

class ResponseRecorder implements AdminStaffIsolatedEndpointResponse {
  readonly headers = new Map<string, string>();
  statusCode = 0;
  body: unknown;
  setHeader(name: string, value: string): void { this.headers.set(name.toLowerCase(), value); }
  status(value: number): this { this.statusCode = value; return this; }
  json(value: unknown): this { this.body = value; return this; }
  end(): this { return this; }
}

describe('isolated staff release endpoint', () => {
  test('release-disabled guard returns fixed 503 before config, environment, or handler construction', async () => {
    const resolveConfig = jest.fn(() => { throw new Error('config_must_not_be_read'); });
    const resolveEnvironment = jest.fn(() => { throw new Error('environment_must_not_be_read'); });
    const buildHandler = jest.fn(() => { throw new Error('dependencies_must_not_be_built'); });
    const handler = createAdminStaffIsolatedEndpointHandler(false, resolveConfig, resolveEnvironment, buildHandler);
    const response = new ResponseRecorder();
    await handler({ method: 'POST', headers: { origin: 'https://evil.example.com' }, body: {} }, response);
    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ schemaVersion: 1, error: { code: 'isolated_staff_release_disabled' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
    expect(resolveConfig).not.toHaveBeenCalled();
    expect(resolveEnvironment).not.toHaveBeenCalled();
    expect(buildHandler).not.toHaveBeenCalled();
  });

  test('source release switch is immutable true for the reviewed activation and resource options remain bounded', () => {
    expect(ADMIN_STAFF_ISOLATED_RELEASE_ENABLED).toBe(true);
    expect(ADMIN_STAFF_ISOLATED_HTTP_OPTIONS).toEqual({
      region: 'us-central1',
      cors: false,
      invoker: 'public',
      memory: '256MiB',
      cpu: 'gcf_gen1',
      timeoutSeconds: 15,
      maxInstances: 1,
      concurrency: 1,
      serviceAccount: 'phraseman-staff-gateway@phraseman-ea0b3.iam.gserviceaccount.com',
    });
  });

  test('enabled composition resolves and snapshots dependencies only once for local contract tests', async () => {
    const resolveConfig = jest.fn(() => ({ marker: 'config' }));
    const resolveEnvironment = jest.fn(() => ({ marker: 'environment' }));
    const delegated = jest.fn(async (_request: unknown, response: AdminStaffIsolatedEndpointResponse) => {
      response.status(200).json({ schemaVersion: 1, role: 'owner' });
    });
    const buildHandler = jest.fn(() => delegated);
    const handler = createAdminStaffIsolatedEndpointHandler(true, resolveConfig, resolveEnvironment, buildHandler);
    const first = new ResponseRecorder();
    const second = new ResponseRecorder();
    await handler({ method: 'POST', headers: {}, body: {} }, first);
    await handler({ method: 'POST', headers: {}, body: {} }, second);
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(resolveConfig).toHaveBeenCalledTimes(1);
    expect(resolveEnvironment).toHaveBeenCalledTimes(1);
    expect(buildHandler).toHaveBeenCalledTimes(1);
    expect(delegated).toHaveBeenCalledTimes(2);
  });

  test('main app is initialized with the exact project only when absent', () => {
    const initialized = Object.freeze({ name: '[DEFAULT]', options: Object.freeze({ projectId: 'phraseman-ea0b3' }) });
    const sdk = {
      getApps: jest.fn(() => [] as ReadonlyArray<typeof initialized>),
      initializeApp: jest.fn(() => initialized),
    };
    expect(ensureIsolatedStaffMainApp('phraseman-ea0b3', sdk)).toBe(initialized);
    expect(sdk.initializeApp).toHaveBeenCalledWith({ projectId: 'phraseman-ea0b3' });
  });

  test('main app binding fails closed when the existing default app is missing an explicit exact project', () => {
    for (const projectId of [undefined, 'other-project']) {
      const existing = Object.freeze({ name: '[DEFAULT]', options: Object.freeze({ projectId }) });
      const sdk = { getApps: jest.fn(() => [existing]), initializeApp: jest.fn() };
      expect(() => ensureIsolatedStaffMainApp('phraseman-ea0b3', sdk)).toThrow('isolated_staff_not_configured');
      expect(sdk.initializeApp).not.toHaveBeenCalled();
    }
  });

  test('enabled release rejects invalid config and transport-only requests before main App or dependencies', async () => {
    const initialized = Object.freeze({ name: '[DEFAULT]', options: Object.freeze({ projectId: 'phraseman-ea0b3' }) });
    const sdk = { getApps: jest.fn(() => [] as ReadonlyArray<typeof initialized>), initializeApp: jest.fn(() => initialized) };
    const buildDependencies = jest.fn(() => { throw new Error('dependencies_must_not_be_built'); });
    const validConfig = {
      authProjectId: 'phraseman-staff-auth', mainProjectId: 'phraseman-ea0b3', ownerUid: 'owner-uid',
      allowedOrigin: 'https://phraseman-staff-auth.firebaseapp.com',
    };
    const cases = [
      {
        handler: createAdminStaffIsolatedReleaseHttpHandler({ ...validConfig, ownerUid: '' },
          { GCLOUD_PROJECT: 'phraseman-ea0b3' }, sdk, buildDependencies),
        request: { method: 'POST', headers: {}, body: {} }, expectedStatus: 503,
      },
      {
        handler: createAdminStaffIsolatedReleaseHttpHandler(validConfig,
          { GCLOUD_PROJECT: 'phraseman-ea0b3' }, sdk, buildDependencies),
        request: { method: 'POST', headers: { origin: 'https://evil.example.com' }, body: {} }, expectedStatus: 403,
      },
      {
        handler: createAdminStaffIsolatedReleaseHttpHandler(validConfig,
          { GCLOUD_PROJECT: 'phraseman-ea0b3' }, sdk, buildDependencies),
        request: { method: 'OPTIONS', headers: { origin: validConfig.allowedOrigin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Content-Type, Authorization' }, body: undefined }, expectedStatus: 204,
      },
      {
        handler: createAdminStaffIsolatedReleaseHttpHandler(validConfig,
          { GCLOUD_PROJECT: 'phraseman-ea0b3' }, sdk, buildDependencies),
        request: { method: 'POST', headers: { origin: validConfig.allowedOrigin,
          'content-type': 'application/json' }, body: {} }, expectedStatus: 401,
      },
    ];
    for (const value of cases) {
      const response = new ResponseRecorder();
      await value.handler(value.request, response);
      expect(response.statusCode).toBe(value.expectedStatus);
    }
    expect(sdk.getApps).not.toHaveBeenCalled();
    expect(sdk.initializeApp).not.toHaveBeenCalled();
    expect(buildDependencies).not.toHaveBeenCalled();
  });

  test('enabled release maps main App binding failure to fixed 503 after valid transport gates', async () => {
    const wrong = Object.freeze({ name: '[DEFAULT]', options: Object.freeze({ projectId: 'other-project' }) });
    const sdk = { getApps: jest.fn(() => [wrong]), initializeApp: jest.fn() };
    const buildDependencies = jest.fn(() => { throw new Error('dependencies_must_not_be_built'); });
    const handler = createAdminStaffIsolatedReleaseHttpHandler({
      authProjectId: 'phraseman-staff-auth', mainProjectId: 'phraseman-ea0b3', ownerUid: 'owner-uid',
      allowedOrigin: 'https://phraseman-staff-auth.firebaseapp.com',
    }, { GCLOUD_PROJECT: 'phraseman-ea0b3' }, sdk, buildDependencies);
    const response = new ResponseRecorder();
    await handler({ method: 'POST', headers: {
      origin: 'https://phraseman-staff-auth.firebaseapp.com', 'content-type': 'application/json',
      authorization: 'Bearer abcdefghijklmnop',
    }, body: {} }, response);
    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ schemaVersion: 1, error: { code: 'isolated_staff_not_configured' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(sdk.getApps).toHaveBeenCalledTimes(1);
    expect(sdk.initializeApp).not.toHaveBeenCalled();
    expect(buildDependencies).not.toHaveBeenCalled();
  });

  test('full isolated config is validated before main app initialization can be selected', () => {
    expect(() => prepareIsolatedStaffEndpointConfig({
      authProjectId: 'phraseman-staff-auth',
      mainProjectId: 'phraseman-ea0b3',
      ownerUid: '',
      allowedOrigin: '',
    })).toThrow('isolated_staff_not_configured');
    expect(prepareIsolatedStaffEndpointConfig({
      authProjectId: 'phraseman-staff-auth',
      mainProjectId: 'phraseman-ea0b3',
      ownerUid: 'owner-uid',
      allowedOrigin: 'https://phraseman-ea0b3.web.app',
    })).toEqual({
      rawConfig: {
        authProjectId: 'phraseman-staff-auth',
        mainProjectId: 'phraseman-ea0b3',
        ownerUid: 'owner-uid',
        allowedOrigin: 'https://phraseman-ea0b3.web.app',
      },
      mainProjectId: 'phraseman-ea0b3',
    });
  });

  test('canonical source exports only the endpoint and has no secret, IAM, account, or product hooks', () => {
    const functionsRoot = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(functionsRoot, 'src', 'admin_staff_isolated_endpoint.ts'), 'utf8');
    const index = fs.readFileSync(path.join(functionsRoot, 'src', 'index.ts'), 'utf8');
    expect(index).toContain('export { adminStaffIsolatedSession } from "./admin_staff_isolated_endpoint";');
    expect(source).toContain('ADMIN_STAFF_ISOLATED_RELEASE_ENABLED = true as const');
    expect(source).not.toContain('defineString');
    expect(source).toContain("process.env.ADMIN_STAFF_ISOLATED_OWNER_UID ?? ''");
    expect(source).toContain("process.env.STAFF_ADMIN_ALLOWED_ORIGIN ?? ''");
    expect(source).toContain("process.env.ADMIN_STAFF_ISOLATED_AUTH_PROJECT_ID ?? ''");
    expect(source).toContain("process.env.ADMIN_STAFF_ISOLATED_MAIN_PROJECT_ID ?? ''");
    expect(source).not.toContain("?? 'phraseman-staff-auth'");
    expect(source).not.toContain("?? 'phraseman-ea0b3'");
    expect(source).toContain("serviceAccount: 'phraseman-staff-gateway@phraseman-ea0b3.iam.gserviceaccount.com'");
    for (const forbidden of ['defineSecret', 'setIamPolicy', 'createUser(', 'public_profiles',
      "collection('users')", 'sendMail', 'onCall(', 'enforceAppCheck: true']) {
      expect(source).not.toContain(forbidden);
    }
  });
});
