"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const progress_event_1 = require("./progress_event");
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const progress_event_projection_1 = require("./progress_event_projection");
const server_score_resolver_1 = require("./server_score_resolver");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const body = { schemaVersion: "v2-attempt-body.v1", opId: "attempt-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "encounter_build" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [{ nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "encounter_build", targetKind: "objective", targetId: "t1", terminalDisposition: "no_record", reasonCode: "skipped_by_learner" }] };
const request = () => { const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(body); return ({ accountScopeHash: "a".repeat(16), seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "season-1-r1", episodeRevisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" }, idempotencyKey: "progress-op-1", attemptBody: body, attemptRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] }, projection: { starSlotId: "slot-1", previousBestStars: 0, candidateStars: 2, activityId: "activity-1", progressCompatibilityKey: "compat-1" } }); };
const fakeStore = (events = []) => { const ops = new Map(); const attempts = new Map(); const store = { runTransaction: async (work) => work(store), validatePinnedScope: async () => { events.push("validate"); }, prepareTransactionPlan: async () => { events.push("prepare"); }, writeEvidenceMaterialization: async () => { events.push("evidence"); }, writeProgressProjection: async () => { events.push("projection"); }, readOperation: async (key) => { events.push("readOperation"); return ops.get(key); }, createOperation: async (key, value) => { events.push("operation"); ops.set(key, value); }, readAttempt: async (scope, op) => { events.push("readAttempt"); return attempts.get(`${scope}:${op}`); }, writeAttempt: async (scope, op, hash) => { events.push("attempt"); attempts.set(`${scope}:${op}`, hash); } }; return store; };
describe("V2 server progress event contract", () => {
    it("accepts a canonical attempt and replays idempotently", async () => {
        const store = fakeStore();
        const first = await (0, progress_event_1.applyProgressEvent)(store, request());
        const second = await (0, progress_event_1.applyProgressEvent)(store, request());
        expect(first).toMatchObject({ accepted: true, duplicate: false });
        expect(second).toMatchObject({ accepted: true, duplicate: true });
    });
    it("rejects forged refs, post-hash fields, and conflicting op reuse", async () => {
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), attemptRef: { ...request().attemptRef, attemptBodyHash: "b".repeat(64) } })).toThrow("v2_progress_attempt_ref_mismatch");
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), attemptBody: { ...body, attemptBodyHash: "c".repeat(64) } })).toThrow("attempt_body_post_hash_field_forbidden");
        const store = fakeStore();
        await (0, progress_event_1.applyProgressEvent)(store, request());
        const changedBody = { ...body, opId: "attempt-2" };
        const changedRef = (0, attempt_1.buildCanonicalAttemptRef)(changedBody);
        await expect((0, progress_event_1.applyProgressEvent)(store, { ...request(), idempotencyKey: "progress-op-1", attemptBody: changedBody, attemptRef: changedRef, evidenceBundle: { ...request().evidenceBundle, attemptRef: changedRef } })).rejects.toThrow("v2_progress_idempotency_key_reused");
    });
    it("requires immutable approved Episode pin fields before server resolution", () => {
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), seasonRevisionId: "" })).toThrow("v2_progress_event_request_invalid");
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), episodeRevisionRef: { ...request().episodeRevisionRef, approvalStatus: "released" } })).toThrow("v2_progress_event_request_invalid");
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), episodeRevisionRef: { ...request().episodeRevisionRef, contentHash: "not-a-hash" } })).toThrow("v2_progress_event_request_invalid");
    });
    it("rejects an Episode revision that is not the exact Season member", () => {
        const ref = request().episodeRevisionRef;
        expect(() => (0, progress_event_1.assertEpisodeRevisionPinnedToSeason)([ref], { ...ref, contentHash: "d".repeat(64) })).toThrow("v2_progress_episode_not_pinned");
        expect(() => (0, progress_event_1.assertEpisodeRevisionPinnedToSeason)([ref], { ...ref, episodeId: "episode-other" })).toThrow("v2_progress_episode_not_pinned");
    });
    it("requires the client scope hash to match the server-derived account scope", () => {
        const serverHash = "f".repeat(64);
        expect(() => (0, progress_event_1.assertProgressAccountScope)(serverHash, serverHash)).not.toThrow();
        expect(() => (0, progress_event_1.assertProgressAccountScope)("a".repeat(16), serverHash)).toThrow("v2_progress_account_scope_mismatch");
        expect(() => (0, progress_event_1.assertProgressAccountScope)(serverHash, "not-a-hash")).toThrow("v2_progress_account_scope_mismatch");
    });
    it("requires resolved Season and Episode records to remain canonical", () => {
        const req = request();
        const season = { record: { seasonId: req.seasonId }, lifecycle: { status: "approved" }, body: { episodeRevisionRefs: [req.episodeRevisionRef] } };
        const episode = { approvalStatus: "approved", episodeId: req.episodeRevisionRef.episodeId, revision: 1, contentHash: req.episodeRevisionRef.contentHash, revisionFingerprint: req.episodeRevisionRef.revisionFingerprint };
        expect(() => (0, progress_event_1.assertResolvedProgressPins)(req, season, episode)).not.toThrow();
        expect(() => (0, progress_event_1.assertResolvedProgressPins)(req, { ...season, lifecycle: { status: "archived" } }, episode)).toThrow("v2_progress_season_not_approved_or_stale");
        expect(() => (0, progress_event_1.assertResolvedProgressPins)(req, season, { ...episode, contentHash: "d".repeat(64) })).toThrow("v2_progress_episode_not_canonical");
    });
    it("rejects a malformed stored operation instead of replaying it", async () => {
        const base = fakeStore();
        const malformed = { ...base, runTransaction: async (work) => work(malformed), readOperation: async () => ({ schemaVersion: "v2-progress-event-operation.v1" }) };
        await expect((0, progress_event_1.applyProgressEvent)(malformed, request())).rejects.toThrow("v2_progress_operation_invalid");
    });
    it("accepts a positive score only from the server resolver, never from the client projection", async () => {
        const secure = fakeStore();
        secure.prepareTransactionPlan = async (req, materialized, projection, trusted) => {
            (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: {}, existingBestStars: undefined, materialized, projection, trustedScoreResolution: trusted });
        };
        await expect((0, progress_event_1.applyProgressEvent)(secure, request())).rejects.toThrow("v2_progress_projection_untrusted");
        secure.resolveServerProjection = async (req, materialized) => {
            const resolution = (0, server_score_resolver_1.resolveServerScore)({ attemptRef: req.attemptRef, activityId: req.projection.activityId, starSlotId: req.projection.starSlotId, progressCompatibilityKey: req.projection.progressCompatibilityKey, scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) }, resultCode: "CORRECT", evidenceComponentFingerprint: materialized.componentFingerprint }, () => 2);
            return { resolution, projection: (0, progress_event_projection_1.deriveProgressProjectionFromServerScore)({ previousBestStars: 0, resolution }) };
        };
        await expect((0, progress_event_1.applyProgressEvent)(secure, request())).resolves.toMatchObject({ accepted: true, duplicate: false });
    });
    it("suppresses a same-opId same-hash submission under a different idempotency key", async () => {
        const store = fakeStore();
        await expect((0, progress_event_1.applyProgressEvent)(store, request())).resolves.toMatchObject({ duplicate: false });
        await expect((0, progress_event_1.applyProgressEvent)(store, { ...request(), idempotencyKey: "progress-op-2" })).resolves.toMatchObject({ duplicate: true });
    });
    it("prepares before entering the write set", async () => {
        const events = [];
        await (0, progress_event_1.applyProgressEvent)(fakeStore(events), request());
        expect(events.indexOf("prepare")).toBeGreaterThan(events.indexOf("readAttempt"));
        expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("projection"));
        expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("attempt"));
        expect(events.indexOf("prepare")).toBeLessThan(events.indexOf("evidence"));
    });
    it("bounds request payloads and resolver path identifiers", () => {
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), seasonRevisionId: "../escape" })).toThrow("v2_progress_event_request_invalid");
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), attemptBody: { ...body, evidence: { hintsUsed: 0, transcript: "x".repeat(70000) } } })).toThrow("attempt_body_too_large");
    });
    it("does not materialize delayed learning evidence before a terminal receipt", () => {
        const delayedBody = (0, attempt_1.sanitizeAttemptBody)({ schemaVersion: "v2-attempt-body.v1", opId: "delayed-before-receipt", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "c1", binding: { nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "o1" }, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
        const delayedRef = (0, attempt_1.buildCanonicalAttemptRef)(delayedBody);
        const nonAssessment = { schemaVersion: "learning-non-assessment-body.v1", nonAssessmentId: "na-1", nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "o1", sourceAttempt: delayedRef, occurredAt: "2026-07-17T00:00:00.000Z", assessmentStatus: "not_assessed_system", reasonCode: "assignment_missing", failureReceiptRef: "failure-1" };
        expect(() => (0, progress_event_1.parseProgressEventRequest)({ ...request(), attemptBody: delayedBody, attemptRef: delayedRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: delayedRef, evidenceBodies: [], nonAssessmentBodies: [nonAssessment] } })).toThrow("delayed_evidence_requires_terminal_receipt");
    });
});
//# sourceMappingURL=progress_event.test.js.map