"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestDelayedProbeTerminal = exports.materializeDelayedTerminalEvidence = void 0;
const progress_event_1 = require("./progress_event");
const delayed_runtime_1 = require("../../../modules/learning-v2/contracts/delayed_runtime");
const delayed_probe_1 = require("../../../modules/learning-v2/contracts/delayed_probe");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const evidence_1 = require("../../../modules/learning-v2/contracts/evidence");
/**
 * Materializes the delayed candidate only after the immutable terminal receipt
 * exists.  The candidate is used solely to recover tuple identity and the
 * server receipt owns timing/disposition; SKIPPED/no_record never becomes a
 * LearningEvidence or non-assessment reference.
 */
const materializeDelayedTerminalEvidence = (attemptBody, terminal) => {
    const receipt = terminal.receipt;
    const resolutions = receipt.kind === "timing"
        ? receipt.body.terminalTupleResolutions
        : receipt.body.decision.kind === "system_non_assessment"
            ? receipt.body.decision.terminalTupleResolutions
            : [];
    const byTuple = new Map(attemptBody.delayedCandidates.map((candidate) => [
        (0, evidence_1.buildLearningEvidenceTupleKey)(candidate.binding), candidate,
    ]));
    const evidenceBodies = [];
    const nonAssessmentBodies = [];
    for (const resolution of resolutions) {
        const candidate = byTuple.get(resolution.tupleKey);
        if (!candidate)
            continue;
        const sourceAttempt = receipt.body.attemptRef;
        const candidateHash = (0, decision_registry_1.hashCanonicalBody)(candidate);
        const base = { ...candidate.binding, sourceAttempt, phase: "delayed_probe" };
        if (resolution.terminalDisposition === "assessed") {
            evidenceBodies.push({
                schemaVersion: "learning-evidence-body.v1",
                ...base,
                observationId: `${receipt.kind === "timing" ? receipt.body.timingReceiptId : receipt.body.failureReceiptId}:${candidate.candidateId}`,
                assessmentStatus: "assessed",
                outcome: ["CORRECT", "COMPLETED", "PASS_CONFIDENT"].includes(candidate.candidateOutcome.resultCode) ? "success" : "needs_work",
                policyId: "delayed-window.v1",
                policyVersion: 1,
                provenance: { phase: "delayed_probe", support: { hintsUsed: 0 }, context: { contextId: receipt.kind === "timing" ? receipt.body.assignmentRef.assignmentId : receipt.body.probeRef.probeId }, prompt: { promptId: candidate.candidateId } },
                route: attemptBody.inputBinding.source === "microphone"
                    ? { kind: "voice", input: { source: "microphone", runtimeEvidenceRef: { runtimeEvidenceHash: candidateHash, sourceAttempt } } }
                    : { kind: "non_voice", input: { source: attemptBody.inputBinding.source, runtimeEvidenceRef: { runtimeEvidenceHash: candidateHash, sourceAttempt } } },
                timing: receipt.kind === "timing" ? { occurredAtServer: receipt.body.acceptedAtServer, assignmentRef: receipt.body.assignmentRef.assignmentId, launchReceiptRef: receipt.body.launchReceiptRef.launchId, timingReceiptRef: receipt.body.timingReceiptId } : { occurredAt: receipt.body.rejectedAtServer },
            });
            continue;
        }
        const outside = resolution.terminalDisposition === "not_assessed_for_window";
        nonAssessmentBodies.push({
            schemaVersion: "learning-non-assessment-body.v1",
            ...base,
            nonAssessmentId: `${receipt.kind === "timing" ? receipt.body.timingReceiptId : receipt.body.failureReceiptId}:${candidate.candidateId}`,
            occurredAt: receipt.kind === "timing" ? receipt.body.acceptedAtServer : receipt.body.rejectedAtServer,
            assessmentStatus: outside ? "not_assessed_for_window" : receipt.kind === "failure" ? "not_assessed_system" : "invalid",
            reasonCode: outside ? "outside_pinned_assessment_window" : (receipt.kind === "failure" && receipt.body.decision.kind === "system_non_assessment" ? receipt.body.decision.reasonCode : "uncertain_measurement"),
            ...(outside && receipt.kind === "timing" ? { assignmentRef: receipt.body.assignmentRef.assignmentId, launchReceiptRef: receipt.body.launchReceiptRef.launchId, timingReceiptRef: receipt.body.timingReceiptId } : {}),
            ...(!outside && receipt.kind === "failure" ? { failureReceiptRef: receipt.body.failureReceiptId } : {}),
        });
    }
    return { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: receipt.body.attemptRef, evidenceBodies, nonAssessmentBodies };
};
exports.materializeDelayedTerminalEvidence = materializeDelayedTerminalEvidence;
const mutationIdValid = (value) => /^[A-Za-z0-9._:-]{8,160}$/.test(value);
const sameAttempt = (candidate, context) => {
    const candidateRef = candidate.attemptRef;
    const contextRef = context.candidate.attemptRef;
    return !!candidateRef && !!contextRef && candidateRef.schemaVersion === contextRef.schemaVersion && candidateRef.opId === contextRef.opId && candidateRef.attemptBodyHash === contextRef.attemptBodyHash;
};
/**
 * Server-only terminal ingestion. The caller resolves timing/assignment state;
 * clients provide only the hash-bound candidate. No evidence or projection is
 * accepted here; those can be materialized only after this receipt exists.
 */
const ingestDelayedProbeTerminal = async (store, request, dependencies) => {
    if (!mutationIdValid(request.mutationId))
        throw new Error("delayed_mutation_id_invalid");
    const expectedScope = (0, progress_event_1.deriveProgressAccountScopeHash)(request.stableUid, request.accountGeneration);
    if (request.accountScopeHash !== expectedScope)
        throw new Error("delayed_account_generation_mismatch");
    if (!(0, delayed_probe_1.validateDelayedAttemptCandidate)(request.candidate, request.context.expectedTupleKeys).ok)
        throw new Error("delayed_candidate_invalid");
    if (!sameAttempt(request.candidate, request.context))
        throw new Error("delayed_candidate_substitution");
    const existing = await store.read(request.mutationId);
    if (existing) {
        if (existing.accountScopeHash !== request.accountScopeHash || (0, decision_registry_1.hashCanonicalBody)(existing.receipt) !== existing.receiptHash)
            throw new Error("delayed_terminal_record_invalid");
        return { accepted: true, duplicate: true, record: existing };
    }
    const decision = await dependencies.resolveDecision(request);
    const receipt = (0, delayed_runtime_1.adjudicateDelayedCandidate)(request.context, decision);
    const terminalStatus = receipt.kind === "timing"
        ? "timed_finalized"
        : receipt.body.decision.kind === "system_non_assessment"
            ? "system_non_assessment_finalized"
            : "protocol_rejected";
    const record = Object.freeze({
        schemaVersion: "v2-delayed-probe-terminal.v1",
        mutationId: request.mutationId,
        accountScopeHash: request.accountScopeHash,
        accountGeneration: request.accountGeneration,
        receipt,
        receiptHash: (0, decision_registry_1.hashCanonicalBody)(receipt),
        terminalStatus,
    });
    await store.create(record);
    return { accepted: true, duplicate: false, record };
};
exports.ingestDelayedProbeTerminal = ingestDelayedProbeTerminal;
//# sourceMappingURL=delayed_probe_ingestion.js.map