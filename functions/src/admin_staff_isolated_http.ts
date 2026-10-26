import { getApp } from 'firebase-admin/app';

import { createIsolatedStaffAdminVerifier } from './admin_staff_isolated_admin_adapter';
import { parseIsolatedStaffConfig, type IsolatedStaffConfig } from './admin_staff_isolated_core';
import { createIsolatedStaffFirestoreDependencies } from './admin_staff_isolated_firestore';
import {
  handleIsolatedStaffSession,
  IsolatedStaffGatewayError,
  type IsolatedStaffGatewayDependencies,
} from './admin_staff_isolated_gateway_core';

export interface IsolatedStaffHttpRequest {
  readonly method: unknown;
  readonly headers: unknown;
  readonly body: unknown;
}

export interface IsolatedStaffHttpResponse {
  setHeader(name: string, value: string): void;
  status(code: number): IsolatedStaffHttpResponse;
  json(value: unknown): IsolatedStaffHttpResponse;
  end(): IsolatedStaffHttpResponse;
}

export interface IsolatedStaffHttpIntegration {
  readonly buildDependencies: (
    rawConfig: unknown,
    runtimeEnvironment: unknown,
  ) => IsolatedStaffGatewayDependencies;
}

type HeaderRecord = Readonly<Record<string, unknown>>;

const ALLOWED_PREFLIGHT_HEADERS = Object.freeze(['authorization', 'content-type']);
export function buildRealIsolatedStaffHttpDependencies(
  rawConfig: unknown,
  runtimeEnvironment: unknown,
): IsolatedStaffGatewayDependencies {
  const config = parseIsolatedStaffConfig(rawConfig);
  const mainApp = getApp();
  if (mainApp.options.projectId !== config.mainProjectId) throw new Error('isolated_staff_not_configured');
  const verifier = createIsolatedStaffAdminVerifier(rawConfig, runtimeEnvironment);
  const store = createIsolatedStaffFirestoreDependencies(mainApp, config.mainProjectId);
  return Object.freeze({ verifyToken: verifier, ...store });
}
const REAL_INTEGRATION: IsolatedStaffHttpIntegration = Object.freeze({
  buildDependencies: buildRealIsolatedStaffHttpDependencies,
});

function isRecordLike(value: unknown): value is HeaderRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isPlainEmptyBody(value: unknown): value is Record<string, never> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === 0;
}
function readHeader(headers: unknown, expectedName: string): string | null {
  if (!isRecordLike(headers)) return null;
  const values = Object.keys(headers)
    .filter(name => name.toLowerCase() === expectedName)
    .map(name => headers[name]);
  return values.length === 1 && typeof values[0] === 'string' ? values[0] : null;
}
function validContentType(value: string | null): boolean {
  return value !== null && /^application\/json(?:\s*;\s*charset\s*=\s*utf-8\s*)?$/i.test(value);
}
function validBearer(value: string | null): boolean {
  if (value === null || !value.startsWith('Bearer ')) return false;
  const token = value.slice(7);
  return token.length >= 16 && token.length <= 8192 && !/\s|[\u0000-\u001f\u007f]/.test(token);
}
function validPreflight(headers: unknown): boolean {
  const method = readHeader(headers, 'access-control-request-method');
  const requestedHeaders = readHeader(headers, 'access-control-request-headers');
  if (method === null || method.toUpperCase() !== 'POST' || requestedHeaders === null) return false;
  const tokens = requestedHeaders.split(',').map(value => value.trim().toLowerCase());
  if (tokens.some(value => value.length === 0) || new Set(tokens).size !== tokens.length ||
      tokens.length !== ALLOWED_PREFLIGHT_HEADERS.length) return false;
  return ALLOWED_PREFLIGHT_HEADERS.every(value => tokens.includes(value));
}
function setSecurityHeaders(response: IsolatedStaffHttpResponse): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}
function setCorsHeaders(response: IsolatedStaffHttpResponse, config: IsolatedStaffConfig): void {
  response.setHeader('Access-Control-Allow-Origin', config.allowedOrigin);
  response.setHeader('Vary', 'Origin');
}
function sendError(response: IsolatedStaffHttpResponse, status: number, code: string): void {
  response.status(status).json(Object.freeze({ schemaVersion: 1, error: Object.freeze({ code }) }));
}
function parseConfig(rawConfig: unknown): IsolatedStaffConfig | null {
  try { return parseIsolatedStaffConfig(rawConfig); }
  catch { return null; }
}
const GATEWAY_ERROR_TUPLES = new Set([
  '503:isolated_staff_not_configured',
  '400:isolated_staff_invalid_request',
  '403:isolated_staff_invalid_request',
  '401:isolated_staff_authentication_required',
  '429:isolated_staff_rate_limited',
  '500:isolated_staff_internal',
  '403:isolated_staff_membership_required',
]);
function mappedGatewayError(error: unknown): Readonly<{ status: number; code: string }> {
  if (error instanceof Error && error.message === 'isolated_staff_not_configured') {
    return Object.freeze({ status: 503, code: 'isolated_staff_not_configured' });
  }
  if (error instanceof IsolatedStaffGatewayError &&
      GATEWAY_ERROR_TUPLES.has(`${error.httpStatus}:${error.code}`)) {
    return Object.freeze({ status: error.httpStatus, code: error.code });
  }
  return Object.freeze({ status: 500, code: 'isolated_staff_internal' });
}

export function createIsolatedStaffHttpHandler(
  rawConfig: unknown,
  runtimeEnvironment: unknown,
  integration: IsolatedStaffHttpIntegration = REAL_INTEGRATION,
): (request: IsolatedStaffHttpRequest, response: IsolatedStaffHttpResponse) => Promise<void> {
  const config = parseConfig(rawConfig);
  const configSnapshot = config === null ? null : Object.freeze({
    authProjectId: config.authProjectId,
    mainProjectId: config.mainProjectId,
    ownerUid: config.ownerUid,
    allowedOrigin: config.allowedOrigin,
  });
  let dependencies: IsolatedStaffGatewayDependencies | undefined;
  return async (request, response): Promise<void> => {
    setSecurityHeaders(response);
    if (config === null || configSnapshot === null) {
      sendError(response, 503, 'isolated_staff_not_configured');
      return;
    }
    if (!isRecordLike(request) || typeof request.method !== 'string') {
      sendError(response, 400, 'isolated_staff_invalid_request');
      return;
    }
    const origin = readHeader(request.headers, 'origin');
    if (origin !== config.allowedOrigin) {
      sendError(response, 403, 'isolated_staff_invalid_request');
      return;
    }
    setCorsHeaders(response, config);
    const method = request.method.toUpperCase();
    if (method === 'OPTIONS') {
      if (!validPreflight(request.headers)) {
        sendError(response, 400, 'isolated_staff_invalid_request');
        return;
      }
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Max-Age', '600');
      response.status(204).end();
      return;
    }
    if (method !== 'POST') {
      response.setHeader('Allow', 'POST, OPTIONS');
      sendError(response, 405, 'isolated_staff_method_not_allowed');
      return;
    }
    if (!validContentType(readHeader(request.headers, 'content-type'))) {
      sendError(response, 415, 'isolated_staff_unsupported_media_type');
      return;
    }
    if (!isPlainEmptyBody(request.body)) {
      sendError(response, 400, 'isolated_staff_invalid_request');
      return;
    }
    const authorization = readHeader(request.headers, 'authorization');
    if (!validBearer(authorization)) {
      sendError(response, 401, 'isolated_staff_authentication_required');
      return;
    }
    try {
      dependencies ??= integration.buildDependencies(configSnapshot, runtimeEnvironment);
      const result = await handleIsolatedStaffSession(
        { method: 'POST', origin, authorization, body: request.body },
        configSnapshot,
        dependencies,
      );
      response.status(200).json(result);
    } catch (error) {
      const mapped = mappedGatewayError(error);
      sendError(response, mapped.status, mapped.code);
    }
  };
}
