"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentManagerLocalRunnerSubmit = exports.agentManagerLocalRunnerClaim = exports.agentManagerLocalRunnerExchangePairing = exports.agentManagerLocalRunnerRevokeCapability = exports.agentManagerLocalRunnerCreatePairing = void 0;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("../callable_options");
const auth_1 = require("../agent_office/auth");
const local_runner_http_contracts_1 = require("./local_runner_http_contracts");
const local_runner_firestore_repository_1 = require("./local_runner_firestore_repository");
const local_runner_transport_1 = require("./local_runner_transport");
const REGION = 'us-central1';
const CALLABLE_OPTIONS = Object.freeze({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '256MiB' });
const REQUEST_OPTIONS = Object.freeze({ region: REGION, timeoutSeconds: 20, memory: '256MiB', maxInstances: 3, cors: false });
function repository() { return new local_runner_firestore_repository_1.FirestoreLocalRunnerRepository(admin.firestore()); }
function auth(request) {
    return request.auth ? { uid: request.auth.uid, token: request.auth.token } : null;
}
function random(prefix) { return () => `${prefix}${(0, node_crypto_1.randomBytes)(32).toString('base64url')}`; }
function rawBody(request) { return request && typeof request === 'object' && 'rawBody' in request ? request.rawBody : undefined; }
function errorStatus(error) {
    if (error instanceof https_1.HttpsError)
        return error.code === 'permission-denied' ? 403 : 400;
    if (error instanceof Error && /capability|lease/i.test(error.message))
        return 401;
    return 400;
}
function sendFailure(response, error) {
    response.status(errorStatus(error)).json({ ok: false, error: 'local_runner_request_rejected' });
}
function headers(request) { return request.headers; }
/** Owner-only: returns a one-time pairing code. The raw code is never stored in Firestore. */
exports.agentManagerLocalRunnerCreatePairing = (0, https_1.onCall)(CALLABLE_OPTIONS, async (request) => {
    const actor = (0, auth_1.requireAgentOfficeOwner)(auth(request));
    (0, local_runner_http_contracts_1.parseOwnerLocalRunnerPairingRequest)(request.data);
    return (0, local_runner_transport_1.createLocalRunnerPairing)(repository(), { ownerUid: actor.actorUid }, Date.now(), random('pair-'));
});
/** Owner-only: immediately disables a runner capability; it cannot claim or submit more work. */
exports.agentManagerLocalRunnerRevokeCapability = (0, https_1.onCall)(CALLABLE_OPTIONS, async (request) => {
    const actor = (0, auth_1.requireAgentOfficeOwner)(auth(request));
    const input = (0, local_runner_http_contracts_1.parseOwnerLocalRunnerRevokeRequest)(request.data);
    await (0, local_runner_transport_1.revokeLocalRunnerCapability)(repository(), { ownerUid: actor.actorUid, capabilityId: input.capabilityId }, Date.now());
    return Object.freeze({ revoked: true });
});
/** Local computer only: trades a short-lived pairing code for a revocable runner capability. */
exports.agentManagerLocalRunnerExchangePairing = (0, https_1.onRequest)(REQUEST_OPTIONS, async (request, response) => {
    try {
        (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)(request.method, request.get('content-type'), rawBody(request));
        const input = (0, local_runner_http_contracts_1.parseLocalRunnerExchangeRequest)(request.body);
        const capability = await (0, local_runner_transport_1.exchangeLocalRunnerPairing)(repository(), input, Date.now(), random('cap-'));
        response.status(200).json({ ok: true, capability });
    }
    catch (error) {
        sendFailure(response, error);
    }
});
/** Local computer only: claims at most one approved code_prepare task and returns a short lease. */
exports.agentManagerLocalRunnerClaim = (0, https_1.onRequest)(REQUEST_OPTIONS, async (request, response) => {
    try {
        (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)(request.method, request.get('content-type'), rawBody(request));
        const input = (0, local_runner_http_contracts_1.parseLocalRunnerClaimRequest)(request.body, headers(request));
        const claim = await (0, local_runner_transport_1.claimOneLocalRunnerJob)(repository(), input.capability, Date.now(), random('lease-'));
        response.status(200).json({ ok: true, claim });
    }
    catch (error) {
        sendFailure(response, error);
    }
});
/** Local computer only: records an evidence-bounded, owner-review-required result for its lease. */
exports.agentManagerLocalRunnerSubmit = (0, https_1.onRequest)(REQUEST_OPTIONS, async (request, response) => {
    try {
        (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)(request.method, request.get('content-type'), rawBody(request));
        const input = (0, local_runner_http_contracts_1.parseLocalRunnerSubmitRequest)(request.body, headers(request));
        const outcome = await (0, local_runner_transport_1.submitLocalRunnerReview)(repository(), input, Date.now());
        response.status(200).json({ ok: true, outcome });
    }
    catch (error) {
        sendFailure(response, error);
    }
});
//# sourceMappingURL=local_runner_endpoints.js.map