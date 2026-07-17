import { randomBytes } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { requireAgentOfficeOwner, type AgentOfficeAuth } from '../agent_office/auth';
import {
  assertLocalRunnerJsonRequest,
  parseLocalRunnerClaimRequest,
  parseLocalRunnerExchangeRequest,
  parseLocalRunnerSubmitRequest,
  parseOwnerLocalRunnerPairingRequest,
  parseOwnerLocalRunnerRevokeRequest,
} from './local_runner_http_contracts';
import { FirestoreLocalRunnerRepository } from './local_runner_firestore_repository';
import {
  claimOneLocalRunnerJob,
  createLocalRunnerPairing,
  exchangeLocalRunnerPairing,
  revokeLocalRunnerCapability,
  submitLocalRunnerReview,
} from './local_runner_transport';

const REGION = 'us-central1';
const CALLABLE_OPTIONS = Object.freeze({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '256MiB' as const });
const REQUEST_OPTIONS = Object.freeze({ region: REGION, timeoutSeconds: 20, memory: '256MiB' as const, maxInstances: 3, cors: false });

function repository(): FirestoreLocalRunnerRepository { return new FirestoreLocalRunnerRepository(admin.firestore()); }
function auth(request: { auth?: { uid?: string; token?: Record<string, unknown> } | null }): AgentOfficeAuth | null {
  return request.auth ? { uid: request.auth.uid, token: request.auth.token } : null;
}
function random(prefix: string): () => string { return () => `${prefix}${randomBytes(32).toString('base64url')}`; }
function rawBody(request: unknown): unknown { return request && typeof request === 'object' && 'rawBody' in request ? (request as { rawBody?: unknown }).rawBody : undefined; }
function errorStatus(error: unknown): number {
  if (error instanceof HttpsError) return error.code === 'permission-denied' ? 403 : 400;
  if (error instanceof Error && /capability|lease/i.test(error.message)) return 401;
  return 400;
}
function sendFailure(response: { status(code: number): { json(value: unknown): void } }, error: unknown): void {
  response.status(errorStatus(error)).json({ ok: false, error: 'local_runner_request_rejected' });
}
function headers(request: { headers: Record<string, string | string[] | undefined> }): Record<string, string | string[] | undefined> { return request.headers; }

/** Owner-only: returns a one-time pairing code. The raw code is never stored in Firestore. */
export const agentManagerLocalRunnerCreatePairing = onCall(CALLABLE_OPTIONS, async (request) => {
  const actor = requireAgentOfficeOwner(auth(request));
  parseOwnerLocalRunnerPairingRequest(request.data);
  return createLocalRunnerPairing(repository(), { ownerUid: actor.actorUid }, Date.now(), random('pair-'));
});

/** Owner-only: immediately disables a runner capability; it cannot claim or submit more work. */
export const agentManagerLocalRunnerRevokeCapability = onCall(CALLABLE_OPTIONS, async (request) => {
  const actor = requireAgentOfficeOwner(auth(request));
  const input = parseOwnerLocalRunnerRevokeRequest(request.data);
  await revokeLocalRunnerCapability(repository(), { ownerUid: actor.actorUid, capabilityId: input.capabilityId }, Date.now());
  return Object.freeze({ revoked: true });
});

/** Local computer only: trades a short-lived pairing code for a revocable runner capability. */
export const agentManagerLocalRunnerExchangePairing = onRequest(REQUEST_OPTIONS, async (request, response) => {
  try {
    assertLocalRunnerJsonRequest(request.method, request.get('content-type'), rawBody(request));
    const input = parseLocalRunnerExchangeRequest(request.body);
    const capability = await exchangeLocalRunnerPairing(repository(), input, Date.now(), random('cap-'));
    response.status(200).json({ ok: true, capability });
  } catch (error) { sendFailure(response, error); }
});

/** Local computer only: claims at most one approved code_prepare task and returns a short lease. */
export const agentManagerLocalRunnerClaim = onRequest(REQUEST_OPTIONS, async (request, response) => {
  try {
    assertLocalRunnerJsonRequest(request.method, request.get('content-type'), rawBody(request));
    const input = parseLocalRunnerClaimRequest(request.body, headers(request));
    const claim = await claimOneLocalRunnerJob(repository(), input.capability, Date.now(), random('lease-'));
    response.status(200).json({ ok: true, claim });
  } catch (error) { sendFailure(response, error); }
});

/** Local computer only: records an evidence-bounded, owner-review-required result for its lease. */
export const agentManagerLocalRunnerSubmit = onRequest(REQUEST_OPTIONS, async (request, response) => {
  try {
    assertLocalRunnerJsonRequest(request.method, request.get('content-type'), rawBody(request));
    const input = parseLocalRunnerSubmitRequest(request.body, headers(request));
    const outcome = await submitLocalRunnerReview(repository(), input, Date.now());
    response.status(200).json({ ok: true, outcome });
  } catch (error) { sendFailure(response, error); }
});
