"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_RUNNER_MAX_BODY_BYTES = void 0;
exports.assertLocalRunnerJsonRequest = assertLocalRunnerJsonRequest;
exports.parseLocalRunnerExchangeRequest = parseLocalRunnerExchangeRequest;
exports.parseLocalRunnerClaimRequest = parseLocalRunnerClaimRequest;
exports.parseLocalRunnerSubmitRequest = parseLocalRunnerSubmitRequest;
exports.parseOwnerLocalRunnerPairingRequest = parseOwnerLocalRunnerPairingRequest;
exports.parseOwnerLocalRunnerRevokeRequest = parseOwnerLocalRunnerRevokeRequest;
const https_1 = require("firebase-functions/v2/https");
const contracts_1 = require("./contracts");
exports.LOCAL_RUNNER_MAX_BODY_BYTES = 16 * 1024;
function fail(message) { throw new https_1.HttpsError('invalid-argument', message); }
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('local runner request is invalid'); return value; }
function exact(input, keys) {
    if (Object.keys(input).length !== keys.length || keys.some((key) => !(key in input)) || Object.keys(input).some((key) => !keys.includes(key)))
        fail('local runner request fields are invalid');
}
function identifier(value, label) {
    if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value))
        fail(`${label} is invalid`);
    return value;
}
function secret(value, label) {
    if (typeof value !== 'string' || value.length < 8 || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value))
        fail(`${label} is invalid`);
    return value;
}
function header(headers, name) {
    const value = headers[name.toLowerCase()] ?? headers[name];
    return typeof value === 'string' ? value : undefined;
}
function capabilityFromHeaders(headers) {
    const capabilityId = header(headers, 'x-agent-manager-capability-id');
    const token = header(headers, 'x-agent-manager-capability-token');
    if (capabilityId === undefined && token === undefined)
        return null;
    if (!capabilityId || !token)
        fail('local runner capability is invalid');
    return Object.freeze({ capabilityId: identifier(capabilityId, 'capabilityId'), token: secret(token, 'capability token') });
}
function capabilityFromBody(input) {
    return Object.freeze({ capabilityId: identifier(input.capabilityId, 'capabilityId'), token: secret(input.token, 'capability token') });
}
function assertLocalRunnerJsonRequest(method, contentType, rawBody) {
    if (method !== 'POST')
        throw new https_1.HttpsError('invalid-argument', 'local runner method is invalid');
    if (typeof contentType !== 'string' || !/^application\/json(?:;|$)/i.test(contentType))
        fail('local runner content type is invalid');
    const size = Buffer.isBuffer(rawBody) ? rawBody.length : typeof rawBody === 'string' ? Buffer.byteLength(rawBody, 'utf8') : -1;
    if (size < 0 || size > exports.LOCAL_RUNNER_MAX_BODY_BYTES)
        fail('local runner body is too large');
}
function parseLocalRunnerExchangeRequest(value) {
    const input = object(value);
    exact(input, ['pairingId', 'code']);
    return Object.freeze({ pairingId: identifier(input.pairingId, 'pairingId'), code: secret(input.code, 'pairing code') });
}
function parseLocalRunnerClaimRequest(value, headers) {
    const input = object(value);
    const fromHeaders = capabilityFromHeaders(headers);
    if (fromHeaders) {
        if ('capabilityId' in input || 'token' in input)
            fail('local runner capability is invalid');
        exact(input, []);
        return Object.freeze({ capability: fromHeaders });
    }
    exact(input, ['capabilityId', 'token']);
    return Object.freeze({ capability: capabilityFromBody(input) });
}
function parseLocalRunnerSubmitRequest(value, headers) {
    const input = object(value);
    const fromHeaders = capabilityFromHeaders(headers);
    if (fromHeaders) {
        if ('capabilityId' in input || 'token' in input)
            fail('local runner capability is invalid');
        exact(input, ['jobId', 'leaseToken', 'result']);
    }
    else
        exact(input, ['capabilityId', 'token', 'jobId', 'leaseToken', 'result']);
    const result = (0, contracts_1.parseManagerTaskResult)(input.result);
    if (result.outcome !== 'needs_review')
        fail('local runner result must require review');
    return Object.freeze({ capability: fromHeaders ?? capabilityFromBody(input), jobId: identifier(input.jobId, 'jobId'), leaseToken: secret(input.leaseToken, 'lease token'), result });
}
function parseOwnerLocalRunnerPairingRequest(value) {
    exact(object(value), []);
    return Object.freeze({});
}
function parseOwnerLocalRunnerRevokeRequest(value) {
    const input = object(value);
    exact(input, ['capabilityId']);
    return Object.freeze({ capabilityId: identifier(input.capabilityId, 'capabilityId') });
}
//# sourceMappingURL=local_runner_http_contracts.js.map