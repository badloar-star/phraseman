"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentOfficeObservation = runAgentOfficeObservation;
const https_1 = require("firebase-functions/v2/https");
const contracts_1 = require("./contracts");
const observation_1 = require("./observation");
function canonicalJson(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value))
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(',')}]`;
    if ((0, contracts_1.isRecord)(value)) {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
    }
    throw new https_1.HttpsError('invalid-argument', 'observation receipt contains a non-JSON value');
}
function controlState(document) {
    if (!document)
        return Object.freeze({ state: 'missing', revision: null });
    try {
        const control = (0, contracts_1.parseAgentOfficeControl)(document.data);
        return Object.freeze({ state: control.killSwitchEnabled ? 'enabled' : 'disabled', revision: control.revision });
    }
    catch {
        return Object.freeze({ state: 'invalid', revision: null });
    }
}
function safeNow(now) {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0)
        throw new https_1.HttpsError('internal', 'observation clock is invalid');
    return value;
}
/**
 * Trusted server-only runner. It consumes sanitized inputs and has no live-read or
 * external-effect dependency; the repository transaction is its only persistence seam.
 */
async function runAgentOfficeObservation(repository, input, now = Date.now) {
    const observation = (0, observation_1.observeAgentOffice)(input);
    const observationHash = (0, contracts_1.sha256)(canonicalJson(observation));
    return repository.runTransaction(async (transaction) => {
        // The control is deliberately re-read inside every transaction attempt.
        const control = controlState(await transaction.get('agent_office_control/global'));
        const recommendation = observation.digest.recommendation;
        const draftAllowed = control.state === 'disabled'
            && observation.evidenceSufficient
            && recommendation !== null;
        const reason = control.state !== 'disabled'
            ? `control_${control.state}`
            : !observation.evidenceSufficient
                ? 'insufficient_evidence'
                : recommendation === null
                    ? 'no_observation'
                    : 'sufficient_evidence';
        const identity = Object.freeze({
            schemaVersion: contracts_1.AGENT_OFFICE_SCHEMA_VERSION,
            receiptType: 'observation',
            outcome: draftAllowed ? 'draft_prepared' : 'no_action',
            reason,
            scope: contracts_1.AGENT_OFFICE_SCOPE,
            piiClass: 'none',
            externalEffect: 'none',
            controlRevision: control.revision,
            observedAtMs: observation.observedAtMs,
            sourceHealth: Object.freeze(observation.sourceHealth.map((source) => Object.freeze({
                source: source.source,
                state: source.state,
                observedAtMs: source.observedAtMs,
            }))),
            draft: draftAllowed && recommendation ? Object.freeze({
                signal: recommendation.signal,
                summary: recommendation.summary,
                actionType: recommendation.actionType,
                scope: contracts_1.AGENT_OFFICE_SCOPE,
                cost: observation.digest.cost,
            }) : null,
        });
        const contentHash = (0, contracts_1.sha256)(canonicalJson(identity));
        const receiptId = `observation_${(0, contracts_1.sha256)(canonicalJson({ observationHash, controlState: control.state, controlRevision: control.revision, contentHash }))}`;
        const path = `agent_observation_receipts/${receiptId}`;
        const existing = await transaction.get(path);
        if (existing) {
            const existingCreatedAtMs = existing.data.createdAtMs;
            if (typeof existingCreatedAtMs !== 'number' || !Number.isSafeInteger(existingCreatedAtMs) || existingCreatedAtMs < 0) {
                throw new https_1.HttpsError('data-loss', 'immutable observation receipt timestamp is invalid');
            }
            const receipt = Object.freeze({
                ...identity,
                receiptId,
                createdAtMs: existingCreatedAtMs,
                contentHash,
            });
            if (canonicalJson(existing.data) !== canonicalJson(receipt)) {
                throw new https_1.HttpsError('data-loss', 'immutable observation receipt mismatch');
            }
            return Object.freeze({ receipt, idempotent: true });
        }
        const receipt = Object.freeze({
            ...identity,
            receiptId,
            createdAtMs: safeNow(now),
            contentHash,
        });
        transaction.create(path, receipt);
        return Object.freeze({ receipt, idempotent: false });
    });
}
//# sourceMappingURL=observation_runner.js.map