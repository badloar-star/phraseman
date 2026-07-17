import { HttpsError } from 'firebase-functions/v2/https';
import { parseManagerTaskResult, type ManagerTaskResult } from './contracts';
import type { LocalRunnerCredential } from './local_runner_transport';

export const LOCAL_RUNNER_MAX_BODY_BYTES = 16 * 1024;

export type LocalRunnerExchangeRequest = Readonly<{ pairingId: string; code: string }>;
export type LocalRunnerClaimRequest = Readonly<{ capability: LocalRunnerCredential }>;
export type LocalRunnerSubmitRequest = Readonly<{ capability: LocalRunnerCredential; jobId: string; leaseToken: string; result: ManagerTaskResult }>;
export type OwnerLocalRunnerRevokeRequest = Readonly<{ capabilityId: string }>;

function fail(message: string): never { throw new HttpsError('invalid-argument', message); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('local runner request is invalid'); return value as Record<string, unknown>; }
function exact(input: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(input).length !== keys.length || keys.some((key) => !(key in input)) || Object.keys(input).some((key) => !keys.includes(key))) fail('local runner request fields are invalid');
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value)) fail(`${label} is invalid`);
  return value;
}
function secret(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label} is invalid`);
  return value;
}
function header(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  return typeof value === 'string' ? value : undefined;
}
function capabilityFromHeaders(headers: Record<string, string | string[] | undefined>): LocalRunnerCredential | null {
  const capabilityId = header(headers, 'x-agent-manager-capability-id');
  const token = header(headers, 'x-agent-manager-capability-token');
  if (capabilityId === undefined && token === undefined) return null;
  if (!capabilityId || !token) fail('local runner capability is invalid');
  return Object.freeze({ capabilityId: identifier(capabilityId, 'capabilityId'), token: secret(token, 'capability token') });
}
function capabilityFromBody(input: Record<string, unknown>): LocalRunnerCredential {
  return Object.freeze({ capabilityId: identifier(input.capabilityId, 'capabilityId'), token: secret(input.token, 'capability token') });
}

export function assertLocalRunnerJsonRequest(method: unknown, contentType: unknown, rawBody: unknown): void {
  if (method !== 'POST') throw new HttpsError('invalid-argument', 'local runner method is invalid');
  if (typeof contentType !== 'string' || !/^application\/json(?:;|$)/i.test(contentType)) fail('local runner content type is invalid');
  const size = Buffer.isBuffer(rawBody) ? rawBody.length : typeof rawBody === 'string' ? Buffer.byteLength(rawBody, 'utf8') : -1;
  if (size < 0 || size > LOCAL_RUNNER_MAX_BODY_BYTES) fail('local runner body is too large');
}

export function parseLocalRunnerExchangeRequest(value: unknown): LocalRunnerExchangeRequest {
  const input = object(value); exact(input, ['pairingId', 'code']);
  return Object.freeze({ pairingId: identifier(input.pairingId, 'pairingId'), code: secret(input.code, 'pairing code') });
}

export function parseLocalRunnerClaimRequest(value: unknown, headers: Record<string, string | string[] | undefined>): LocalRunnerClaimRequest {
  const input = object(value); const fromHeaders = capabilityFromHeaders(headers);
  if (fromHeaders) {
    if ('capabilityId' in input || 'token' in input) fail('local runner capability is invalid');
    exact(input, []); return Object.freeze({ capability: fromHeaders });
  }
  exact(input, ['capabilityId', 'token']);
  return Object.freeze({ capability: capabilityFromBody(input) });
}

export function parseLocalRunnerSubmitRequest(value: unknown, headers: Record<string, string | string[] | undefined>): LocalRunnerSubmitRequest {
  const input = object(value); const fromHeaders = capabilityFromHeaders(headers);
  if (fromHeaders) {
    if ('capabilityId' in input || 'token' in input) fail('local runner capability is invalid');
    exact(input, ['jobId', 'leaseToken', 'result']);
  } else exact(input, ['capabilityId', 'token', 'jobId', 'leaseToken', 'result']);
  const result = parseManagerTaskResult(input.result);
  if (result.outcome !== 'needs_review') fail('local runner result must require review');
  return Object.freeze({ capability: fromHeaders ?? capabilityFromBody(input), jobId: identifier(input.jobId, 'jobId'), leaseToken: secret(input.leaseToken, 'lease token'), result });
}

export function parseOwnerLocalRunnerPairingRequest(value: unknown): Readonly<Record<never, never>> {
  exact(object(value), []);
  return Object.freeze({});
}

export function parseOwnerLocalRunnerRevokeRequest(value: unknown): OwnerLocalRunnerRevokeRequest {
  const input = object(value); exact(input, ['capabilityId']);
  return Object.freeze({ capabilityId: identifier(input.capabilityId, 'capabilityId') });
}
