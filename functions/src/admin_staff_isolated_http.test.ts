import fs from 'node:fs';
import path from 'node:path';

import {
  createIsolatedStaffHttpHandler,
  type IsolatedStaffHttpIntegration,
  type IsolatedStaffHttpRequest,
} from './admin_staff_isolated_http';
import { isolatedStaffPrincipalKey } from './admin_staff_isolated_core';
import {
  IsolatedStaffGatewayError,
  type IsolatedStaffGatewayDependencies,
} from './admin_staff_isolated_gateway_core';

const authProjectId = 'phraseman-staff-auth';
const mainProjectId = 'phraseman-ea0b3';
const ownerUid = 'isolated-owner-1';
const staffUid = 'staff-1';
const allowedOrigin = 'https://staff.example.com';
const ownerPrincipal = isolatedStaffPrincipalKey(authProjectId, ownerUid);
const staffPrincipal = isolatedStaffPrincipalKey(authProjectId, staffUid);
const rawToken = 'x'.repeat(32);
const config = { authProjectId, mainProjectId, ownerUid, allowedOrigin };

class ResponseRecorder {
  readonly headers = new Map<string, string>();
  statusCode = 0;
  body: unknown = undefined;
  ended = false;
  setHeader(name: string, value: string): void { this.headers.set(name.toLowerCase(), value); }
  status(code: number): this { this.statusCode = code; return this; }
  json(value: unknown): this { this.body = value; this.ended = true; return this; }
  end(): this { this.ended = true; return this; }
}

function request(overrides: Partial<IsolatedStaffHttpRequest> = {}): IsolatedStaffHttpRequest {
  return {
    method: 'POST',
    headers: {
      origin: allowedOrigin,
      authorization: `Bearer ${rawToken}`,
      'content-type': 'application/json',
    },
    body: {},
    ...overrides,
  };
}

function identity(uid: string) {
  return {
    authProjectId,
    decodedToken: { aud: authProjectId, iss: `https://securetoken.google.com/${authProjectId}`,
      sub: uid, uid, email_verified: true, firebase: { sign_in_provider: 'password' } },
    currentUser: { uid, disabled: false, emailVerified: true },
  };
}

function dependencies(uid = ownerUid, membership: unknown | null = null): IsolatedStaffGatewayDependencies {
  return {
    verifyToken: jest.fn(async () => identity(uid)),
    consumeRateLimit: jest.fn(async () => undefined),
    loadMembershipV2: jest.fn(async () => membership),
  };
}

function integration(deps: IsolatedStaffGatewayDependencies): IsolatedStaffHttpIntegration & { buildDependencies: jest.Mock } {
  return { buildDependencies: jest.fn(() => deps) };
}

async function run(
  req: IsolatedStaffHttpRequest,
  rawConfig: unknown,
  adapter: IsolatedStaffHttpIntegration,
): Promise<ResponseRecorder> {
  const response = new ResponseRecorder();
  const handler = createIsolatedStaffHttpHandler(rawConfig, { GCLOUD_PROJECT: mainProjectId }, adapter);
  await handler(req, response);
  return response;
}

describe('isolated staff HTTP transport', () => {
  test('invalid config returns a fixed 503 before integration, auth, or storage', async () => {
    const deps = dependencies();
    const adapter = integration(deps);
    const response = await run(request(), {}, adapter);
    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ schemaVersion: 1, error: { code: 'isolated_staff_not_configured' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
    expect(adapter.buildDependencies).not.toHaveBeenCalled();
    expect(deps.verifyToken).not.toHaveBeenCalled();
    expect(deps.loadMembershipV2).not.toHaveBeenCalled();
  });

  test('valid standards-compatible preflight returns 204 with no dependency effects', async () => {
    const deps = dependencies();
    const adapter = integration(deps);
    const response = await run(request({ method: 'OPTIONS', headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'Content-Type, AUTHORIZATION',
    }, body: undefined }), config, adapter);
    expect(response.statusCode).toBe(204);
    expect(response.body).toBeUndefined();
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
    expect(response.headers.get('access-control-allow-methods')).toBe('POST');
    expect(response.headers.get('access-control-allow-headers')).toBe('Authorization, Content-Type');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(adapter.buildDependencies).not.toHaveBeenCalled();
  });

  test('rejects malformed preflight, absent origin, and foreign origin before dependencies', async () => {
    const cases: IsolatedStaffHttpRequest[] = [
      request({ method: 'OPTIONS', headers: { origin: 'https://evil.example.com',
        'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type' } }),
      request({ method: 'OPTIONS', headers: { origin: allowedOrigin,
        'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization, content-type' } }),
      request({ method: 'OPTIONS', headers: { origin: allowedOrigin,
        'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, x-extra' } }),
      request({ headers: { authorization: `Bearer ${rawToken}`, 'content-type': 'application/json' } }),
      request({ headers: { origin: 'https://evil.example.com', authorization: `Bearer ${rawToken}`,
        'content-type': 'application/json' } }),
    ];
    for (const value of cases) {
      const deps = dependencies();
      const adapter = integration(deps);
      const response = await run(value, config, adapter);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.body).toEqual({ schemaVersion: 1, error: { code: expect.stringMatching(/^isolated_staff_/) } });
      expect(adapter.buildDependencies).not.toHaveBeenCalled();
      expect(deps.verifyToken).not.toHaveBeenCalled();
      expect(deps.loadMembershipV2).not.toHaveBeenCalled();
    }
  });

  test('rejects method, ambiguous media type, nonempty body, and malformed bearer before dependencies', async () => {
    const cases: Array<Readonly<{ request: IsolatedStaffHttpRequest; status: number }>> = [
      { request: request({ method: 'GET' }), status: 405 },
      { request: request({ headers: { origin: allowedOrigin, authorization: `Bearer ${rawToken}`,
        'content-type': 'application/json; charset=utf-8; profile=x' } }), status: 415 },
      { request: request({ body: { extra: true } }), status: 400 },
      { request: request({ body: [] }), status: 400 },
      { request: request({ headers: { origin: allowedOrigin, authorization: 'bearer invalid',
        'content-type': 'application/json' } }), status: 401 },
    ];
    for (const value of cases) {
      const deps = dependencies();
      const adapter = integration(deps);
      const response = await run(value.request, config, adapter);
      expect(response.statusCode).toBe(value.status);
      expect(adapter.buildDependencies).not.toHaveBeenCalled();
      expect(deps.verifyToken).not.toHaveBeenCalled();
    }
  });

  test.each(['application/json', 'Application/JSON', 'application/json; charset=utf-8',
    'application/json ; CHARSET = UTF-8'])('accepts normal JSON media type %s', async contentType => {
    const deps = dependencies(ownerUid);
    const adapter = integration(deps);
    const response = await run(request({ headers: { origin: allowedOrigin,
      authorization: `Bearer ${rawToken}`, 'content-type': contentType } }), config, adapter);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ role: 'owner', principalKey: ownerPrincipal }));
  });

  test('valid owner and member requests wire through the existing gateway with narrow effects', async () => {
    const ownerDeps = dependencies(ownerUid);
    const ownerAdapter = integration(ownerDeps);
    const ownerResponse = await run(request(), config, ownerAdapter);
    expect(ownerResponse.statusCode).toBe(200);
    expect(ownerResponse.body).toEqual(expect.objectContaining({ role: 'owner', principalKey: ownerPrincipal }));
    expect(ownerDeps.consumeRateLimit).toHaveBeenCalledWith('isolated-session-read', ownerPrincipal, 30, 60_000);
    expect(ownerDeps.loadMembershipV2).not.toHaveBeenCalled();

    const member = { schemaVersion: 2, identityNamespace: 'isolated_staff_v1', principalKey: staffPrincipal,
      authProjectId, authUid: staffUid, active: true, revision: 4, badge: 'Редактор',
      sections: { workspace: 'view' }, updatedAtMs: 1000, updatedByPrincipalKey: ownerPrincipal };
    const memberDeps = dependencies(staffUid, member);
    const memberResponse = await run(request(), config, integration(memberDeps));
    expect(memberResponse.statusCode).toBe(200);
    expect(memberResponse.body).toEqual(expect.objectContaining({ role: 'staff', principalKey: staffPrincipal,
      revision: 4, sections: { workspace: 'view' } }));
    expect(memberDeps.loadMembershipV2).toHaveBeenCalledWith(staffPrincipal);
  });

  test('sanitizes dependency and gateway errors without token, PII, or stack leakage', async () => {
    const adapter: IsolatedStaffHttpIntegration = {
      buildDependencies: jest.fn(() => { throw new Error(`secret ${rawToken} employee@example.com`); }),
    };
    const response = await run(request(), config, adapter);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ schemaVersion: 1, error: { code: 'isolated_staff_internal' } });
    const encoded = JSON.stringify(response.body);
    expect(encoded).not.toContain(rawToken);
    expect(encoded).not.toContain('employee@example.com');
    expect(encoded).not.toContain('stack');
  });

  test('maps the exact fail-closed dependency configuration error to fixed 503', async () => {
    const adapter: IsolatedStaffHttpIntegration = {
      buildDependencies: jest.fn(() => { throw new Error('isolated_staff_not_configured'); }),
    };
    const response = await run(request(), config, adapter);
    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ schemaVersion: 1, error: { code: 'isolated_staff_not_configured' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  test('uses one immutable validated config snapshot after the caller mutates its input', async () => {
    const mutable = { ...config };
    const deps = dependencies(ownerUid);
    const adapter = integration(deps);
    const handler = createIsolatedStaffHttpHandler(mutable, { GCLOUD_PROJECT: mainProjectId }, adapter);
    mutable.authProjectId = mainProjectId;
    mutable.allowedOrigin = 'https://evil.example.com';
    const response = new ResponseRecorder();
    await handler(request(), response);
    expect(response.statusCode).toBe(200);
    expect(adapter.buildDependencies).toHaveBeenCalledWith(config, { GCLOUD_PROJECT: mainProjectId });
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
  });

  test('does not reflect a forged gateway code or status', async () => {
    const adapter: IsolatedStaffHttpIntegration = {
      buildDependencies: jest.fn(() => {
        throw new IsolatedStaffGatewayError('isolated_staff_attacker_chosen', 418);
      }),
    };
    const response = await run(request(), config, adapter);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ schemaVersion: 1, error: { code: 'isolated_staff_internal' } });
  });

  test('source stays unexported, log-free, and free of product collection references', () => {
    const functionsRoot = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(functionsRoot, 'src', 'admin_staff_isolated_http.ts'), 'utf8');
    const index = fs.readFileSync(path.join(functionsRoot, 'src', 'index.ts'), 'utf8');
    expect(index).not.toContain('admin_staff_isolated_http');
    for (const forbidden of ['public_profiles', "collection('users')", 'auth_links', 'console.', 'onRequest(']) {
      expect(source).not.toContain(forbidden);
    }
  });
});
