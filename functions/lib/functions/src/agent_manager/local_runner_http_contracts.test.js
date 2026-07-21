"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const local_runner_http_contracts_1 = require("./local_runner_http_contracts");
describe('local runner HTTP contracts', () => {
    test('accepts an exchange request only with its exact small JSON shape', () => {
        expect((0, local_runner_http_contracts_1.parseLocalRunnerExchangeRequest)({ pairingId: 'pair-001', code: 'pairing-code' }))
            .toEqual({ pairingId: 'pair-001', code: 'pairing-code' });
        expect(() => (0, local_runner_http_contracts_1.parseLocalRunnerExchangeRequest)({ pairingId: 'pair-001', code: 'pairing-code', extra: true }))
            .toThrow('local runner request fields are invalid');
    });
    test('allows runner capability credentials in headers or body but never both', () => {
        expect((0, local_runner_http_contracts_1.parseLocalRunnerClaimRequest)({}, { 'x-agent-manager-capability-id': 'cap-001', 'x-agent-manager-capability-token': 'capability-token' }))
            .toEqual({ capability: { capabilityId: 'cap-001', token: 'capability-token' } });
        expect((0, local_runner_http_contracts_1.parseLocalRunnerClaimRequest)({ capabilityId: 'cap-001', token: 'capability-token' }, {}))
            .toEqual({ capability: { capabilityId: 'cap-001', token: 'capability-token' } });
        expect(() => (0, local_runner_http_contracts_1.parseLocalRunnerClaimRequest)({ capabilityId: 'cap-001', token: 'capability-token' }, { 'x-agent-manager-capability-id': 'cap-001', 'x-agent-manager-capability-token': 'capability-token' }))
            .toThrow('local runner capability is invalid');
    });
    test('requires an exact bounded review submission and owner revoke request', () => {
        expect((0, local_runner_http_contracts_1.parseLocalRunnerSubmitRequest)({
            capabilityId: 'cap-001', token: 'capability-token', jobId: 'task-001__r3', leaseToken: 'lease-token',
            result: { summary: 'Prepared change for manual review.', outcome: 'needs_review' },
        }, {})).toEqual(expect.objectContaining({ jobId: 'task-001__r3', leaseToken: 'lease-token' }));
        expect(() => (0, local_runner_http_contracts_1.parseLocalRunnerSubmitRequest)({ jobId: 'task-001__r3', leaseToken: 'lease-token', result: { summary: 'Prepared change for manual review.', outcome: 'completed' } }, {
            'x-agent-manager-capability-id': 'cap-001', 'x-agent-manager-capability-token': 'capability-token',
        })).toThrow('local runner result must require review');
        expect((0, local_runner_http_contracts_1.parseOwnerLocalRunnerPairingRequest)({})).toEqual({});
        expect(() => (0, local_runner_http_contracts_1.parseOwnerLocalRunnerPairingRequest)({ surprise: true })).toThrow('local runner request fields are invalid');
        expect((0, local_runner_http_contracts_1.parseOwnerLocalRunnerRevokeRequest)({ capabilityId: 'cap-001' })).toEqual({ capabilityId: 'cap-001' });
        expect(() => (0, local_runner_http_contracts_1.parseOwnerLocalRunnerRevokeRequest)({ capabilityId: 'cap-001', nope: true })).toThrow('local runner request fields are invalid');
    });
    test('rejects oversized, non-JSON, and bodyless runner requests before capabilities are read', () => {
        expect(() => (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)('POST', 'application/json', Buffer.from('{}'))).not.toThrow();
        expect(() => (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)('GET', 'application/json', Buffer.from('{}'))).toThrow('local runner method is invalid');
        expect(() => (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)('POST', 'text/plain', Buffer.from('{}'))).toThrow('local runner content type is invalid');
        expect(() => (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)('POST', 'application/json', undefined)).toThrow('local runner body is too large');
        expect(() => (0, local_runner_http_contracts_1.assertLocalRunnerJsonRequest)('POST', 'application/json', Buffer.alloc(16 * 1024 + 1))).toThrow('local runner body is too large');
    });
});
//# sourceMappingURL=local_runner_http_contracts.test.js.map