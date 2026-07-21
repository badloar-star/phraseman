import { buildCanonicalAttemptRef, sanitizeAttemptBody } from "../../../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../../../modules/learning-v2/contracts/evidence";
import { ingestDelayedProbeTerminal, materializeDelayedTerminalEvidence, type DelayedProbeTerminalRecord } from "./delayed_probe_ingestion";
import { materializeProgressEvidenceBundle } from "./progress_event_evidence";

const binding = { nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic" as const, phase: "delayed_probe" as const, targetKind: "objective" as const, targetId: "o1" };
const body = sanitizeAttemptBody({ schemaVersion: "v2-attempt-body.v1", opId: "ingest-delayed-1", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "c1", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: body, attemptRef: buildCanonicalAttemptRef(body) };
const context = {
  candidate, expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
  assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) }, probeRef: { probeId: "p1", contentHash: "c".repeat(64) }, timingReceiptId: "timing-1", failureReceiptId: "failure-1", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 20, windowPolicyId: "w1",
};
const scope = "delayed-ingest-user";
const request = (mutationId = "delayed-ingest-1", candidateOverride = candidate) => ({ stableUid: scope, accountGeneration: 1, accountScopeHash: "", mutationId, candidate: candidateOverride, context: { ...context, candidate } });

const memoryStore = () => { const records = new Map<string, DelayedProbeTerminalRecord>(); return { records, read: async (id: string) => records.get(id), create: async (record: DelayedProbeTerminalRecord) => { if (records.has(record.mutationId)) throw new Error("already_exists"); records.set(record.mutationId, record); } }; };

describe("server-authoritative delayed probe ingestion", () => {
  test("creates one timing receipt and replays the same terminal record", async () => {
    const store = memoryStore();
    const input = { ...request(), accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash(scope, 1) };
    const deps = { resolveDecision: () => ({ kind: "timed" as const, window: "inside_pinned_window" as const }) };
    const first = await ingestDelayedProbeTerminal(store, input, deps);
    const second = await ingestDelayedProbeTerminal(store, input, deps);
    expect(first.duplicate).toBe(false); expect(second.duplicate).toBe(true);
    expect(first.record.terminalStatus).toBe("timed_finalized");
    expect(store.records.size).toBe(1);
  });

  test("server failure/out-of-window are terminal non-assessment and substitution is rejected", async () => {
    const store = memoryStore();
    const input = { ...request("delayed-ingest-2"), accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash(scope, 1) };
    const result = await ingestDelayedProbeTerminal(store, input, { resolveDecision: () => ({ kind: "system_failure" as const, reasonCode: "launch_expired" as const }) });
    expect(result.record.terminalStatus).toBe("system_non_assessment_finalized");
    const substitutedBody = sanitizeAttemptBody({ ...body, opId: "substituted-op" });
    const substituted = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: substitutedBody, attemptRef: buildCanonicalAttemptRef(substitutedBody) };
    await expect(ingestDelayedProbeTerminal(store, { ...input, mutationId: "delayed-ingest-3", candidate: substituted }, { resolveDecision: () => ({ kind: "timed" as const, window: "outside_pinned_window" as const }) })).rejects.toThrow("delayed_candidate_substitution");
  });

  test("materializes exactly the terminal receipt mapping and keeps skipped ref-free", async () => {
    const store = memoryStore();
    const input = { ...request("delayed-ingest-materialize"), accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash(scope, 1) };
    const terminal = await ingestDelayedProbeTerminal(store, input, { resolveDecision: () => ({ kind: "timed" as const, window: "inside_pinned_window" as const }) });
    const bundle = materializeDelayedTerminalEvidence(body as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, terminal.record);
    const materialized = materializeProgressEvidenceBundle(bundle);
    expect(bundle.evidenceBodies).toHaveLength(1);
    expect(bundle.nonAssessmentBodies).toHaveLength(0);
    expect(materialized.refs).toHaveLength(1);
    expect(materialized.refs[0].tupleKey).toBe(buildLearningEvidenceTupleKey(binding));
    expect(materialized.refs[0]).toMatchObject({ sourceAttempt: candidate.attemptRef });

    const skippedBody = sanitizeAttemptBody({ ...(body as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody), opId: "ingest-skipped", delayedCandidates: [{ ...(body as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody).delayedCandidates[0], candidateOutcome: { resultCode: "SKIPPED" } }] });
    const skippedCandidate = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: skippedBody, attemptRef: buildCanonicalAttemptRef(skippedBody) };
    const skippedInput = { ...input, mutationId: "delayed-ingest-skipped", candidate: skippedCandidate, context: { ...context, candidate: skippedCandidate, expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)] } };
    const skipped = await ingestDelayedProbeTerminal(store, skippedInput, { resolveDecision: () => ({ kind: "timed" as const, window: "inside_pinned_window" as const }) });
    const skippedBundle = materializeDelayedTerminalEvidence(skippedBody as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, skipped.record);
    expect(skippedBundle.evidenceBodies).toHaveLength(0);
    expect(skippedBundle.nonAssessmentBodies).toHaveLength(0);
  });
});
