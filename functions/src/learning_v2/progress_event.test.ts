import { applyProgressEvent, assertEpisodeRevisionPinnedToSeason, assertProgressAccountScope, assertResolvedProgressPins, parseProgressEventRequest, type ProgressEventStore } from "./progress_event";
import { buildCanonicalAttemptRef, sanitizeAttemptBody } from "../../../modules/learning-v2/contracts/attempt";
import { deriveProgressProjectionFromServerScore } from "./progress_event_projection";
import { resolveServerScore } from "./server_score_resolver";
import { prepareProgressTransactionPlan } from "./progress_event_transaction_plan";
import { ingestDelayedProbeTerminal, materializeDelayedTerminalEvidence, type DelayedProbeTerminalRecord } from "./delayed_probe_ingestion";
import { buildLearningEvidenceTupleKey } from "../../../modules/learning-v2/contracts/evidence";

const body = { schemaVersion: "v2-attempt-body.v1", opId: "attempt-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "encounter_build" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [{ nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "encounter_build", targetKind: "objective", targetId: "t1", terminalDisposition: "no_record", reasonCode: "skipped_by_learner" }] } as const;
const request = () => { const attemptRef = buildCanonicalAttemptRef(body); return ({ accountScopeHash: "a".repeat(16), seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "season-1-r1", episodeRevisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" as const }, idempotencyKey: "progress-op-1", attemptBody: body, attemptRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1" as const, attemptRef, evidenceBodies: [], nonAssessmentBodies: [] }, projection: { starSlotId: "slot-1", previousBestStars: 0, candidateStars: 2, activityId: "activity-1", progressCompatibilityKey: "compat-1" } }); };
const requiredSessionTaskRef = () => ({
  schemaVersion: "learning-v2-required-session-task-slot-ref.v1" as const,
  courseId: "english-core",
  courseReleaseId: "release-1",
  sessionSetId: "session-set-1",
  sessionSetHash: "d".repeat(64),
  requiredSessionOrdinal: 1,
  sessionId: "session-1",
  sessionRunId: "session-run-1",
  runKindClaim: "initial" as const,
  taskOrdinal: 1,
  taskId: "slot-1",
  activityId: "activity-1",
});
const requiredSessionAnswerResponse = () => ({
  schemaVersion: "learning-v2-required-session-task-answer-response.v1" as const,
  taskId: "slot-1",
  activityId: "activity-1",
  family: "phrase_builder" as const,
  submittedAnswer: "I am ready",
});
const requiredRequest = () => ({
  ...request(),
  requiredSessionTaskRef: requiredSessionTaskRef(),
  requiredSessionAnswerResponse: requiredSessionAnswerResponse(),
});
const fakeStore = (events: string[] = []): ProgressEventStore => { const ops = new Map<string, any>(); const attempts = new Map<string, any>(); const store: any = { runTransaction: async (work: any) => work(store), resolveDelayedEvidence: async () => undefined, validatePinnedScope: async () => { events.push("validate"); }, reconcileReplay: async () => { events.push("reconcile"); }, prepareTransactionPlan: async () => { events.push("prepare"); }, writeEvidenceMaterialization: async () => { events.push("evidence"); }, writeProgressProjection: async () => { events.push("projection"); }, readOperation: async (key: string) => { events.push("readOperation"); return ops.get(key); }, createOperation: async (key: string, value: any) => { events.push("operation"); ops.set(key, value); }, readAttempt: async (scope: string, op: string) => { events.push("readAttempt"); return attempts.get(`${scope}:${op}`); }, writeAttempt: async (scope: string, op: string, attempt: any) => { events.push("attempt"); attempts.set(`${scope}:${op}`, attempt); } }; return store; };

const delayedBinding = { nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic" as const, phase: "delayed_probe" as const, targetKind: "objective" as const, targetId: "o1" };
const delayedBody = sanitizeAttemptBody({ schemaVersion: "v2-attempt-body.v1", opId: "delayed-before-receipt", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "c1", binding: delayedBinding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const delayedRef = buildCanonicalAttemptRef(delayedBody);
const delayedMutationId = "delayed-terminal-1";
const delayedRequest = () => ({ ...request(), attemptBody: delayedBody, attemptRef: delayedRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1" as const, attemptRef: delayedRef, evidenceBodies: [], nonAssessmentBodies: [] }, terminalRef: { schemaVersion: "v2-delayed-terminal-ref.v1" as const, mutationId: delayedMutationId } });
const terminalRecord = async (): Promise<DelayedProbeTerminalRecord> => {
  const records = new Map<string, DelayedProbeTerminalRecord>();
  const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: delayedBody, attemptRef: delayedRef };
  const result = await ingestDelayedProbeTerminal({ read: async (id) => records.get(id), create: async (record) => { records.set(record.mutationId, record); } }, {
    stableUid: "delayed-user",
    accountGeneration: 1,
    accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash("delayed-user", 1),
    mutationId: delayedMutationId,
    candidate,
    context: { candidate, expectedTupleKeys: [buildLearningEvidenceTupleKey(delayedBinding)], assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) }, probeRef: { probeId: "p1", contentHash: "c".repeat(64) }, timingReceiptId: "timing-1", failureReceiptId: "failure-1", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 20, windowPolicyId: "w1" },
  }, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
  return result.record;
};

describe("V2 server progress event contract", () => {
  it("accepts a canonical attempt and replays idempotently", async () => {
    const store = fakeStore(); const first = await applyProgressEvent(store, request()); const second = await applyProgressEvent(store, request());
    expect(first).toMatchObject({ accepted: true, duplicate: false }); expect(second).toMatchObject({ accepted: true, duplicate: true });
  });
  it("binds an optional required-session slot into parser and replay identity", async () => {
    const parsed = parseProgressEventRequest(requiredRequest());
    expect(parsed.requiredSessionTaskRef).toEqual(requiredSessionTaskRef());
    expect(parsed.requiredSessionAnswerResponse).toEqual(requiredSessionAnswerResponse());
    expect(Object.isFrozen(parsed.requiredSessionTaskRef)).toBe(true);

    expect(() => parseProgressEventRequest({
      ...requiredRequest(),
      requiredSessionTaskRef: { ...requiredSessionTaskRef(), activityId: "other-activity" },
    })).toThrow("required_session_task_slot_projection_mismatch");
    expect(() => parseProgressEventRequest({
      ...requiredRequest(),
      requiredSessionTaskRef: { ...requiredSessionTaskRef(), taskId: "other-slot" },
    })).toThrow("required_session_task_slot_projection_mismatch");

    const store = fakeStore();
    store.resolveServerProjection = async (submitted, materialized) => {
      const resolution = resolveServerScore({
        attemptRef: submitted.attemptRef,
        activityId: submitted.projection.activityId,
        starSlotId: submitted.projection.starSlotId,
        progressCompatibilityKey: submitted.projection.progressCompatibilityKey,
        scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
        resultCode: "CORRECT",
        evidenceComponentFingerprint: materialized.componentFingerprint,
      }, () => 3);
      return {
        resolution,
        projection: deriveProgressProjectionFromServerScore({
          previousBestStars: 0,
          resolution,
        }),
      };
    };
    store.applyRequiredSessionAttempt = async () => undefined;
    store.writeRequiredSessionProgress = async () => undefined;
    await expect(applyProgressEvent(store, requiredRequest()))
      .resolves.toMatchObject({ duplicate: false });
    await expect(applyProgressEvent(store, {
      ...requiredRequest(),
      idempotencyKey: "progress-op-2",
      requiredSessionTaskRef: { ...requiredSessionTaskRef(), taskOrdinal: 2 },
    })).rejects.toThrow("v2_progress_attempt_projection_conflict");
  });
  it("rejects forged refs, post-hash fields, and conflicting op reuse", async () => {
    expect(() => parseProgressEventRequest({ ...request(), attemptRef: { ...request().attemptRef, attemptBodyHash: "b".repeat(64) } })).toThrow("v2_progress_attempt_ref_mismatch");
    expect(() => parseProgressEventRequest({ ...request(), attemptBody: { ...body, attemptBodyHash: "c".repeat(64) } })).toThrow("attempt_body_post_hash_field_forbidden");
    const store = fakeStore(); await applyProgressEvent(store, request()); const changedBody = { ...body, opId: "attempt-2" } as const; const changedRef = buildCanonicalAttemptRef(changedBody); await expect(applyProgressEvent(store, { ...request(), idempotencyKey: "progress-op-1", attemptBody: changedBody, attemptRef: changedRef, evidenceBundle: { ...request().evidenceBundle, attemptRef: changedRef } })).rejects.toThrow("v2_progress_idempotency_key_reused");
  });
  it("requires immutable approved Episode pin fields before server resolution", () => {
    expect(() => parseProgressEventRequest({ ...request(), seasonRevisionId: "" })).toThrow("v2_progress_event_request_invalid");
    expect(() => parseProgressEventRequest({ ...request(), episodeRevisionRef: { ...request().episodeRevisionRef, approvalStatus: "released" } })).toThrow("v2_progress_event_request_invalid");
    expect(() => parseProgressEventRequest({ ...request(), episodeRevisionRef: { ...request().episodeRevisionRef, contentHash: "not-a-hash" } })).toThrow("v2_progress_event_request_invalid");
  });
  it("rejects an Episode revision that is not the exact Season member", () => {
    const ref = request().episodeRevisionRef;
    expect(() => assertEpisodeRevisionPinnedToSeason([ref], { ...ref, contentHash: "d".repeat(64) })).toThrow("v2_progress_episode_not_pinned");
    expect(() => assertEpisodeRevisionPinnedToSeason([ref], { ...ref, episodeId: "episode-other" })).toThrow("v2_progress_episode_not_pinned");
  });
  it("requires the client scope hash to match the server-derived account scope", () => {
    const serverHash = "f".repeat(64);
    expect(() => assertProgressAccountScope(serverHash, serverHash)).not.toThrow();
    expect(() => assertProgressAccountScope("a".repeat(16), serverHash)).toThrow("v2_progress_account_scope_mismatch");
    expect(() => assertProgressAccountScope(serverHash, "not-a-hash")).toThrow("v2_progress_account_scope_mismatch");
  });
  it("requires resolved Season and Episode records to remain canonical", () => {
    const req = request();
    const season = { record: { seasonId: req.seasonId }, lifecycle: { status: "approved" }, body: { episodeRevisionRefs: [req.episodeRevisionRef] } } as any;
    const episode = { approvalStatus: "approved", episodeId: req.episodeRevisionRef.episodeId, revision: 1, contentHash: req.episodeRevisionRef.contentHash, revisionFingerprint: req.episodeRevisionRef.revisionFingerprint } as any;
    expect(() => assertResolvedProgressPins(req, season, episode)).not.toThrow();
    expect(() => assertResolvedProgressPins(req, { ...season, lifecycle: { status: "archived" } }, episode)).toThrow("v2_progress_season_not_approved_or_stale");
    expect(() => assertResolvedProgressPins(req, season, { ...episode, contentHash: "d".repeat(64) })).toThrow("v2_progress_episode_not_canonical");
  });
  it("rejects a malformed stored operation instead of replaying it", async () => {
    const base = fakeStore();
    const malformed: ProgressEventStore = { ...base, runTransaction: async (work) => work(malformed), readOperation: async () => ({ schemaVersion: "v2-progress-event-operation.v1" } as any) };
    await expect(applyProgressEvent(malformed, request())).rejects.toThrow("v2_progress_operation_invalid");
  });
  it("accepts a positive score only from the server resolver, never from the client projection", async () => {
    const secure = fakeStore();
    secure.prepareTransactionPlan = async (req: any, materialized: any, projection: any, trusted: any) => {
      prepareProgressTransactionPlan({ existingEvidenceIndex: {}, existingBestStars: undefined, materialized, projection, trustedScoreResolution: trusted });
    };
    await expect(applyProgressEvent(secure, request())).rejects.toThrow("v2_progress_projection_untrusted");
    secure.resolveServerProjection = async (req: any, materialized: any) => {
      const resolution = resolveServerScore({ attemptRef: req.attemptRef, activityId: req.projection.activityId, starSlotId: req.projection.starSlotId, progressCompatibilityKey: req.projection.progressCompatibilityKey, scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) }, resultCode: "CORRECT", evidenceComponentFingerprint: materialized.componentFingerprint }, () => 2);
      return { resolution, projection: deriveProgressProjectionFromServerScore({ previousBestStars: 0, resolution }) };
    };
    await expect(applyProgressEvent(secure, request())).resolves.toMatchObject({ accepted: true, duplicate: false });
  });
  it("records a same-attempt replay under its new idempotency key and rejects later reuse", async () => {
    const base = fakeStore();
    const operations = new Map<string, any>();
    const store: ProgressEventStore = {
      ...base,
      readOperation: async (key) => operations.get(key),
      createOperation: async (key, operation) => { operations.set(key, operation); },
    };
    store.runTransaction = async (work) => work(store);
    await expect(applyProgressEvent(store, request())).resolves.toMatchObject({ duplicate: false });
    await expect(applyProgressEvent(store, { ...request(), idempotencyKey: "progress-op-2" })).resolves.toMatchObject({ duplicate: true });
    expect(operations.get("progress-op-2")).toMatchObject({ result: { canonicalAttemptRef: request().attemptRef } });

    const conflictingBody = { ...body, opId: "attempt-2" } as const;
    const conflictingRef = buildCanonicalAttemptRef(conflictingBody);
    await expect(applyProgressEvent(store, {
      ...request(),
      idempotencyKey: "progress-op-2",
      attemptBody: conflictingBody,
      attemptRef: conflictingRef,
      evidenceBundle: { ...request().evidenceBundle, attemptRef: conflictingRef },
    })).rejects.toThrow("v2_progress_idempotency_key_reused");
  });
  it("reuses the immutable effective projection for the same attempt under a new idempotency key", async () => {
    const base = fakeStore();
    const operations = new Map<string, any>();
    let resolutionCount = 0;
    const store: ProgressEventStore = {
      ...base,
      readOperation: async (key) => operations.get(key),
      createOperation: async (key, operation) => { operations.set(key, operation); },
      resolveServerProjection: async (submitted, materialized) => {
        resolutionCount += 1;
        const resolution = resolveServerScore({
          attemptRef: submitted.attemptRef,
          activityId: submitted.projection.activityId,
          starSlotId: submitted.projection.starSlotId,
          progressCompatibilityKey: submitted.projection.progressCompatibilityKey,
          scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
          resultCode: "CORRECT",
          evidenceComponentFingerprint: materialized.componentFingerprint,
        }, () => resolutionCount === 1 ? 1 : 3);
        return {
          resolution,
          projection: deriveProgressProjectionFromServerScore({
            previousBestStars: 0,
            resolution,
          }),
        };
      },
    };
    store.runTransaction = async (work) => work(store);

    await expect(applyProgressEvent(store, request())).resolves.toMatchObject({ duplicate: false });
    await expect(applyProgressEvent(store, { ...request(), idempotencyKey: "progress-op-2" }))
      .resolves.toMatchObject({ duplicate: true });

    expect(operations.get("progress-op-2")?.projection)
      .toEqual(operations.get("progress-op-1")?.projection);
  });
  it("fails closed when a normal replay operation has a malformed projection", async () => {
    const base = fakeStore();
    const operations = new Map<string, any>();
    const store: ProgressEventStore = {
      ...base,
      readOperation: async (key) => operations.get(key),
      createOperation: async (key, operation) => { operations.set(key, operation); },
    };
    store.runTransaction = async (work) => work(store);
    await applyProgressEvent(store, request());
    const recorded = operations.get("progress-op-1");
    operations.set("progress-op-1", { ...recorded, projection: { ...recorded.projection, performanceStars: "invalid" } });

    await expect(applyProgressEvent(store, request())).rejects.toThrow("v2_progress_operation_invalid");
  });
  it("prepares before entering the write set", async () => {
    const events: string[] = []; await applyProgressEvent(fakeStore(events), request());
    expect(events.indexOf("prepare")).toBeGreaterThan(events.indexOf("readAttempt"));
    expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("projection"));
    expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("attempt"));
    expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("evidence"));
  });
  it("bounds request payloads and resolver path identifiers", () => {
    expect(() => parseProgressEventRequest({ ...request(), seasonRevisionId: "../escape" })).toThrow("v2_progress_event_request_invalid");
    expect(() => parseProgressEventRequest({ ...request(), attemptBody: { ...body, evidence: { hintsUsed: 0, transcript: "x".repeat(70_000) } } })).toThrow("attempt_body_too_large");
  });
  it("requires an immutable terminal reference before accepting a delayed request", () => {
    const { terminalRef: _terminalRef, ...withoutTerminalRef } = delayedRequest();
    expect(() => parseProgressEventRequest(withoutTerminalRef)).toThrow("delayed_terminal_reference_required");
  });
  it("rejects client-supplied delayed evidence even when a terminal reference is present", () => {
    const nonAssessment = { schemaVersion: "learning-non-assessment-body.v1", nonAssessmentId: "na-1", nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "o1", sourceAttempt: delayedRef, occurredAt: "2026-07-17T00:00:00.000Z", assessmentStatus: "not_assessed_system", reasonCode: "assignment_missing", failureReceiptRef: "failure-1" };
    expect(() => parseProgressEventRequest({ ...delayedRequest(), evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: delayedRef, evidenceBodies: [], nonAssessmentBodies: [nonAssessment] } })).toThrow("delayed_client_evidence_forbidden");
  });
  it("rejects a fabricated full terminal receipt supplied by the client", async () => {
    const terminalReceipt = await terminalRecord();
    const { terminalRef: _terminalRef, ...withoutTerminalRef } = delayedRequest();
    expect(() => parseProgressEventRequest({ ...withoutTerminalRef, terminalReceipt, evidenceBundle: materializeDelayedTerminalEvidence(delayedBody as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, terminalReceipt) })).toThrow("v2_progress_event_request_invalid");
  });
  it("resolves trusted delayed evidence before replay lookup and every write", async () => {
    const events: string[] = [];
    const store = fakeStore(events);
    const terminal = await terminalRecord();
    store.resolveDelayedEvidence = async () => { events.push("terminal"); return materializeDelayedTerminalEvidence(delayedBody as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, terminal); };
    await expect(applyProgressEvent(store, delayedRequest() as any)).resolves.toMatchObject({ accepted: true, duplicate: false });
    expect(events[0]).toBe("terminal");
    expect(events.indexOf("terminal")).toBeLessThan(events.indexOf("readOperation"));
    expect(events.indexOf("terminal")).toBeLessThan(events.indexOf("attempt"));
    expect(events.indexOf("terminal")).toBeLessThan(events.indexOf("projection"));
    expect(events.indexOf("terminal")).toBeLessThan(events.indexOf("evidence"));
  });
  it("revalidates delayed pins and reconciles immutable artifacts before duplicate success", async () => {
    const events: string[] = [];
    const store = fakeStore(events);
    const terminal = await terminalRecord();
    store.resolveDelayedEvidence = async () => { events.push("terminal"); return materializeDelayedTerminalEvidence(delayedBody as import("../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, terminal); };
    await expect(applyProgressEvent(store, delayedRequest() as any)).resolves.toMatchObject({ accepted: true, duplicate: false });
    events.length = 0;
    await expect(applyProgressEvent(store, delayedRequest() as any)).resolves.toMatchObject({ accepted: true, duplicate: true });
    expect(events).toEqual(["terminal", "validate", "readOperation", "reconcile"]);
  });
  it("revalidates pins and reconciles normal durable artifacts before duplicate success", async () => {
    const events: string[] = [];
    const store = fakeStore(events);
    await applyProgressEvent(store, request());
    events.length = 0;
    await expect(applyProgressEvent(store, request())).resolves.toMatchObject({ accepted: true, duplicate: true });
    expect(events).toEqual(["validate", "readOperation", "reconcile"]);
  });
});
