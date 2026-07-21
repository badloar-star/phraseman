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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const admin = __importStar(require("firebase-admin"));
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const attempt_1 = require("../../../../modules/learning-v2/contracts/attempt");
const evidence_1 = require("../../../../modules/learning-v2/contracts/evidence");
const decision_registry_1 = require("../../../../modules/learning-v2/policies/decision_registry");
const episode_revision_resolver_1 = require("../../content_studio/episode_revision_resolver");
const firestore_authoring_store_1 = require("../../content_studio/firestore_authoring_store");
const season_revision_1 = require("../../../../modules/learning-v2/authoring/season_revision");
const season_revision_resolver_1 = require("../../content_studio/season_revision_resolver");
const progress_event_1 = require("../progress_event");
const firestore_progress_event_store_1 = require("../firestore_progress_event_store");
const delayed_probe_ingestion_1 = require("../delayed_probe_ingestion");
const progress_event_evidence_1 = require("../progress_event_evidence");
const PROJECT_ID = "demo-phraseman-delayed-progress";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const stableUid = "delayed-progress-user";
const accountGeneration = 1;
const accountScopeHash = (0, progress_event_1.deriveProgressAccountScopeHash)(stableUid, accountGeneration);
const binding = { nodeId: "delayed-node-1", objectiveId: "delayed-objective-1", skillId: "delayed-skill-1", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "delayed-objective-1" };
const episodeBody = () => ({
    schemaVersion: "episode-authoring-body.v1", draftId: "delayed-episode-draft", episodeId: "delayed-episode", revision: 1,
    seasonId: "delayed-season", ordinal: 1, chapterId: "delayed-chapter", studyTarget: "en", learnerSourceLocale: "ru",
    title: [], canDoOutcome: [], scenario: {}, phraseFrames: [], semanticSlots: [], contentUnits: {},
    activityInstances: [{ schemaVersion: "v2-activity-instance-body.v1", activityId: "delayed-activity", revision: 1, episodeId: "delayed-episode", progressCompatibilityKey: "delayed-activity", templateRef: { templateId: "delayed-template", version: 1, contentHash: "a".repeat(64) }, family: "visual_discovery", estimatedSeconds: 10, payload: {}, payloadHash: (0, decision_registry_1.hashCanonicalBody)({}), contentUnitIds: [], overrides: {}, tags: { skillIds: [], grammar: [], vocabulary: [], scenario: [], modalities: ["reading"] }, localization: { studyTarget: "en", learnerSourceLocale: "ru", requiredLocales: ["en", "ru"], fieldSourceHashes: {} }, assets: [] }],
    delayedProbeDefinitions: [], graph: { startNodeId: "delayed-node", capstoneNodeId: "delayed-node", nodes: [{ nodeId: "delayed-node", activityId: "delayed-activity", position: 1, visible: true, requiredForCore: true, voiceEvidenceOptional: true, phase: "encounter_build", evidenceDeclarations: [], gateEligible: false, maxStars: 0 }], edges: [] }, starSlots: [], requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
    assessmentNodes: { independentProbeNodeIds: [] }, capstoneContract: { objectiveIds: [], requiredSemanticSlotIds: [], criticalConstraintIds: [], primaryNodeIds: [], deterministicAlternateNodeIds: [] }, masteryContract: { requirements: [] },
    learningDesign: { primaryOutcomeId: "delayed-outcome", objectiveIds: ["delayed-objective-1"], prerequisiteEdges: [], supportPlan: [{ objectiveId: "delayed-objective-1", initialSupport: "partial_cue", fadeRuleId: "delayed-fade", escalationRuleId: "delayed-escalate" }], independentProbeRef: "delayed-probe", delayedProbeRef: { probeId: "delayed-probe", contentHash: "a".repeat(64) }, delayedWindowPolicyId: "delayed-window" }, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: [], minAppVersion: "1.0.0",
});
const delayedBody = (0, attempt_1.sanitizeAttemptBody)({ schemaVersion: "v2-attempt-body.v1", opId: "delayed-progress-attempt", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "delayed-candidate", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const delayedAttemptRef = (0, attempt_1.buildCanonicalAttemptRef)(delayedBody);
const tupleKey = (0, evidence_1.buildLearningEvidenceTupleKey)(binding);
describe("V2 delayed progress post-receipt materialization against Firestore emulator", () => {
    jest.setTimeout(45000);
    let environment;
    let app;
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST)
            throw new Error("Firestore and Storage emulators are required");
        app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({ projectId: PROJECT_ID, firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") } });
    });
    afterAll(async () => { await environment?.cleanup(); await app?.delete(); });
    test("does not materialize before receipt; post-receipt apply writes scoped evidence/index and replays idempotently", async () => {
        const db = app.firestore();
        const bucket = app.storage().bucket();
        const body = episodeBody();
        const episodeHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const episodeRef = { draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)(body.draftId, 1, episodeHash), contentHash: episodeHash, ordinal: 1, chapterId: body.chapterId, approvalStatus: "approved" };
        const episodePath = (0, episode_revision_resolver_1.episodeRevisionObjectPath)(body.draftId, 1, episodeHash);
        const episodeBytes = (0, decision_registry_1.canonicalJsonV1)(body);
        const episodeFile = bucket.file(episodePath);
        await episodeFile.save(Buffer.from(episodeBytes), { resumable: false, metadata: { metadata: { contentHash: episodeHash } } });
        const [episodeMeta] = await episodeFile.getMetadata();
        const now = new Date().toISOString();
        await db.doc(`content_episode_revisions/${body.draftId}__r1`).set({ record: { schemaVersion: "episode-authoring-record.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, contentHash: episodeHash, revisionFingerprint: episodeRef.revisionFingerprint, object: { objectPath: episodePath, contentHash: episodeHash, objectGeneration: String(episodeMeta.generation), byteSize: Buffer.byteLength(episodeBytes) }, provenance: { createdBy: "emulator", createdAt: now }, createdAt: now }, lifecycle: { schemaVersion: "episode-lifecycle.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: episodeRef.revisionFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 } });
        const seasonBody = { schemaVersion: "season-authoring-body.v1", draftId: "delayed-season-draft", seasonId: body.seasonId, releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [episodeRef], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "a".repeat(64) } };
        const seasonHash = (0, decision_registry_1.hashCanonicalBody)(seasonBody);
        const seasonPath = (0, season_revision_1.seasonRevisionObjectPath)(seasonBody.draftId, 1, seasonHash);
        const seasonBytes = (0, decision_registry_1.canonicalJsonV1)(seasonBody);
        const seasonFile = bucket.file(seasonPath);
        await seasonFile.save(Buffer.from(seasonBytes), { resumable: false, metadata: { metadata: { contentHash: seasonHash } } });
        const [seasonMeta] = await seasonFile.getMetadata();
        const seasonFingerprint = (0, season_revision_1.seasonRevisionFingerprint)(seasonBody.draftId, 1, seasonHash);
        await db.doc("content_season_revisions/delayed-season-r1").set({ record: { schemaVersion: "season-authoring-record.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, contentHash: seasonHash, revisionFingerprint: seasonFingerprint, object: { objectPath: seasonPath, contentHash: seasonHash, objectGeneration: String(seasonMeta.generation), byteSize: Buffer.byteLength(seasonBytes) }, provenance: { createdBy: "emulator" }, createdAt: now } });
        await db.doc("content_season_lifecycle/delayed-season-r1").set({ schemaVersion: "season-lifecycle.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, revisionFingerprint: seasonFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 });
        const seasonObjectReader = (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(bucket);
        const episodeResolverBase = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, async (templateRef) => ({ templateRef, allowedOverridePaths: [] }));
        const episodeResolver = { ...episodeResolverBase, validateBody: episode_revision_resolver_1.validateEpisodeRevisionArtifactBody };
        await db.doc("auth_links/delayed-progress-auth").set({ stable_id: stableUid });
        await db.doc(`users/${stableUid}`).set({ accountGeneration });
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)({ db, authUid: "delayed-progress-auth", stableUid, accountGeneration, accountScopeHash, seasonObjectReader, episodeResolver });
        const common = { accountScopeHash, seasonId: body.seasonId, studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "delayed-season-r1", episodeRevisionRef: episodeRef, attemptBody: delayedBody, attemptRef: delayedAttemptRef, projection: { starSlotId: "delayed-slot", previousBestStars: 0, candidateStars: 0, activityId: "delayed-activity", progressCompatibilityKey: "delayed-activity" } };
        const evidencePath = `users/${accountScopeHash}/v2_progress/delayed-season-r1/episodes/delayed-episode/evidence/${tupleKey}`;
        const projectionPath = `users/${accountScopeHash}/v2_progress/delayed-season-r1/episodes/delayed-episode/slots/delayed-slot`;
        expect((await db.doc(evidencePath).get()).exists).toBe(false);
        expect((await db.doc(projectionPath).get()).exists).toBe(false);
        const terminalStore = {
            read: async (mutationId) => { const snapshot = await db.doc(`learning_v2_delayed_terminals/${accountScopeHash}__${mutationId}`).get(); return snapshot.exists ? snapshot.data() : undefined; },
            create: async (record) => { await db.doc(`learning_v2_delayed_terminals/${accountScopeHash}__${record.mutationId}`).create(record); },
        };
        const delayedInput = { stableUid, accountGeneration, accountScopeHash, mutationId: "delayed-terminal-1", candidate: { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody: delayedBody, attemptRef: delayedAttemptRef }, context: { candidate: { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody: delayedBody, attemptRef: delayedAttemptRef }, expectedTupleKeys: [tupleKey], assignmentRef: { assignmentId: "delayed-assignment", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "delayed-launch", contentHash: "b".repeat(64) }, probeRef: { probeId: "delayed-probe", contentHash: "c".repeat(64) }, timingReceiptId: "delayed-timing-receipt", failureReceiptId: "delayed-failure-receipt", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 100, windowPolicyId: "delayed-window" } };
        const firstTerminal = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(terminalStore, delayedInput, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
        const replayTerminal = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(terminalStore, delayedInput, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
        expect(firstTerminal.duplicate).toBe(false);
        expect(replayTerminal.duplicate).toBe(true);
        expect((await db.doc(evidencePath).get()).exists).toBe(false);
        const forgedPreReceiptBundle = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(delayedBody, firstTerminal.record);
        await expect((0, progress_event_1.applyProgressEvent)(store, { ...common, idempotencyKey: "delayed-pre-receipt-op", evidenceBundle: forgedPreReceiptBundle })).rejects.toThrow("delayed_evidence_requires_terminal_receipt");
        expect((await db.doc(evidencePath).get()).exists).toBe(false);
        expect(firstTerminal.record.receipt.kind).toBe("timing");
        if (firstTerminal.record.receipt.kind !== "timing")
            throw new Error("expected_timing_receipt");
        await db.doc(`learning_v2_timing_receipts/${firstTerminal.record.receipt.body.timingReceiptId}`).create(firstTerminal.record.receipt);
        const postReceipt = (0, progress_event_1.buildPostReceiptProgressEventRequest)({ ...common, idempotencyKey: "delayed-progress-op-1", terminalReceipt: firstTerminal.record });
        expect((0, progress_event_evidence_1.materializeProgressEvidenceBundle)(postReceipt.evidenceBundle).refs).toHaveLength(1);
        await expect((0, progress_event_1.applyProgressEvent)(store, postReceipt)).resolves.toMatchObject({ accepted: true, duplicate: false });
        await expect((0, progress_event_1.applyProgressEvent)(store, postReceipt)).resolves.toMatchObject({ accepted: true, duplicate: true });
        const evidenceSnapshot = await db.doc(evidencePath).get();
        expect(evidenceSnapshot.exists).toBe(true);
        expect(evidenceSnapshot.data()).toMatchObject({ accountStableUid: stableUid, accountGeneration, accountScopeHash, tupleKey, ref: { sourceAttempt: delayedAttemptRef } });
        expect((await db.doc(projectionPath).get()).exists).toBe(true);
        expect((await db.doc(`learning_v2_progress_operations/${accountScopeHash}__delayed-season-r1__delayed-progress-op-1`).get()).exists).toBe(true);
        expect((await db.doc(`learning_v2_progress_attempts/${accountScopeHash}__delayed-season-r1__delayed-episode__delayed-progress-attempt`).get()).exists).toBe(true);
    });
});
//# sourceMappingURL=delayed_progress_event.emulator.test.js.map