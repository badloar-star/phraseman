import { onRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp, type App } from 'firebase-admin/app';

import {
  buildRealIsolatedStaffHttpDependencies,
  createIsolatedStaffHttpHandler,
  type IsolatedStaffHttpIntegration,
  type IsolatedStaffHttpRequest,
  type IsolatedStaffHttpResponse,
} from './admin_staff_isolated_http';
import { parseIsolatedStaffConfig } from './admin_staff_isolated_core';

export const ADMIN_STAFF_ISOLATED_RELEASE_ENABLED = true as const;
export const ADMIN_STAFF_ISOLATED_HTTP_OPTIONS = Object.freeze({
  region: 'us-central1',
  cors: false,
  invoker: 'public' as const,
  memory: '256MiB' as const,
  cpu: 'gcf_gen1' as const,
  timeoutSeconds: 15,
  maxInstances: 1,
  concurrency: 1,
  serviceAccount: 'phraseman-staff-gateway@phraseman-ea0b3.iam.gserviceaccount.com',
});

export type AdminStaffIsolatedEndpointRequest = IsolatedStaffHttpRequest;
export type AdminStaffIsolatedEndpointResponse = IsolatedStaffHttpResponse;
type EndpointHandler = (
  request: AdminStaffIsolatedEndpointRequest,
  response: AdminStaffIsolatedEndpointResponse,
) => Promise<void>;
type EndpointBuilder = (rawConfig: unknown, runtimeEnvironment: unknown) => EndpointHandler;
type DependencyBuilder = IsolatedStaffHttpIntegration['buildDependencies'];
interface MainAppLike {
  readonly name: string;
  readonly options: Readonly<{ readonly projectId?: string }>;
}
export interface IsolatedStaffMainAppSdk {
  readonly getApps: () => readonly MainAppLike[];
  readonly initializeApp: (options: Readonly<{ readonly projectId: string }>) => MainAppLike;
}
const REAL_MAIN_APP_SDK: IsolatedStaffMainAppSdk = Object.freeze({
  getApps,
  initializeApp: (options: Readonly<{ readonly projectId: string }>): MainAppLike => initializeApp(options) as App,
});

export function prepareIsolatedStaffEndpointConfig(value: unknown): Readonly<{
  rawConfig: Readonly<{ authProjectId: string; mainProjectId: string; ownerUid: string; allowedOrigin: string }>;
  mainProjectId: string;
}> {
  const parsed = parseIsolatedStaffConfig(value);
  const rawConfig = Object.freeze({ authProjectId: parsed.authProjectId, mainProjectId: parsed.mainProjectId,
    ownerUid: parsed.ownerUid, allowedOrigin: parsed.allowedOrigin });
  return Object.freeze({ rawConfig, mainProjectId: parsed.mainProjectId });
}

export function ensureIsolatedStaffMainApp(
  expectedMainProjectId: string,
  sdk: IsolatedStaffMainAppSdk = REAL_MAIN_APP_SDK,
): MainAppLike {
  const existing = sdk.getApps().find(app => app.name === '[DEFAULT]');
  if (existing !== undefined) {
    if (existing.options.projectId !== expectedMainProjectId) throw new Error('isolated_staff_not_configured');
    return existing;
  }
  const initialized = sdk.initializeApp({ projectId: expectedMainProjectId });
  if (initialized.name !== '[DEFAULT]' || initialized.options.projectId !== expectedMainProjectId) {
    throw new Error('isolated_staff_not_configured');
  }
  return initialized;
}

export function createAdminStaffIsolatedReleaseHttpHandler(
  rawConfig: unknown,
  runtimeEnvironment: unknown,
  sdk: IsolatedStaffMainAppSdk = REAL_MAIN_APP_SDK,
  buildDependencies: DependencyBuilder = buildRealIsolatedStaffHttpDependencies,
): EndpointHandler {
  return createIsolatedStaffHttpHandler(rawConfig, runtimeEnvironment, Object.freeze({
    buildDependencies(configSnapshot: unknown, environmentSnapshot: unknown) {
      const config = parseIsolatedStaffConfig(configSnapshot);
      ensureIsolatedStaffMainApp(config.mainProjectId, sdk);
      return buildDependencies(configSnapshot, environmentSnapshot);
    },
  }));
}

function setDisabledHeaders(response: AdminStaffIsolatedEndpointResponse): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

export function createAdminStaffIsolatedEndpointHandler(
  enabled: boolean,
  resolveConfig: () => unknown,
  resolveEnvironment: () => unknown,
  buildHandler: EndpointBuilder = createIsolatedStaffHttpHandler,
): EndpointHandler {
  let delegate: EndpointHandler | undefined;
  return async (request, response): Promise<void> => {
    if (!enabled) {
      setDisabledHeaders(response);
      response.status(503).json(Object.freeze({
        schemaVersion: 1,
        error: Object.freeze({ code: 'isolated_staff_release_disabled' }),
      }));
      return;
    }
    delegate ??= buildHandler(resolveConfig(), resolveEnvironment());
    await delegate(request, response);
  };
}

const releaseHandler = createAdminStaffIsolatedEndpointHandler(
  ADMIN_STAFF_ISOLATED_RELEASE_ENABLED,
  () => Object.freeze({
    authProjectId: process.env.ADMIN_STAFF_ISOLATED_AUTH_PROJECT_ID ?? '',
    mainProjectId: process.env.ADMIN_STAFF_ISOLATED_MAIN_PROJECT_ID ?? '',
    ownerUid: process.env.ADMIN_STAFF_ISOLATED_OWNER_UID ?? '',
    allowedOrigin: process.env.STAFF_ADMIN_ALLOWED_ORIGIN ?? '',
  }),
  () => process.env,
  createAdminStaffIsolatedReleaseHttpHandler,
);

export const adminStaffIsolatedSession = onRequest(
  ADMIN_STAFF_ISOLATED_HTTP_OPTIONS,
  async (request, response) => releaseHandler(request, response),
);
