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
const firestore_1 = require("firebase/firestore");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const episode_revision_resolver_1 = require("../content_studio/episode_revision_resolver");
const season_revision_1 = require("../../../modules/learning-v2/authoring/season_revision");
const progress_event_1 = require("./progress_event");
const firestore_progress_event_store_1 = require("./firestore_progress_event_store");
const season_revision_resolver_1 = require("../content_studio/season_revision_resolver");
const firestore_authoring_store_1 = require("../content_studio/firestore_authoring_store");
const server_score_policy_catalog_1 = require("./server_score_policy_catalog");
const PROJECT_ID = "demo-phraseman-progress";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../firestore.rules");
const PILOT_TEMPLATE_BODY = { templateId: "template-positive", version: 1, policies: { scoring: { kind: "scoring", key: server_score_policy_catalog_1.PILOT_SCORING_POLICY_BODY.key, version: server_score_policy_catalog_1.PILOT_SCORING_POLICY_BODY.version, contentHash: (0, decision_registry_1.hashCanonicalBody)(server_score_policy_catalog_1.PILOT_SCORING_POLICY_BODY) } } };
const PILOT_TEMPLATE_HASH = (0, decision_registry_1.hashCanonicalBody)(PILOT_TEMPLATE_BODY);
const episodeBody = () => {
    return {
        schemaVersion: "episode-authoring-body.v1", draftId: "emulator-progress-episode-draft", episodeId: "emulator-progress-episode", revision: 1,
        seasonId: "emulator-progress-season", ordinal: 1, chapterId: "chapter-1", studyTarget: "en", learnerSourceLocale: "ru",
        title: [], canDoOutcome: [], scenario: {}, phraseFrames: [], semanticSlots: [], contentUnits: {},
        activityInstances: [{ schemaVersion: "v2-activity-instance-body.v1", activityId: "activity-1", revision: 1, episodeId: "emulator-progress-episode", progressCompatibilityKey: "activity-1", templateRef: { templateId: "template-1", version: 1, contentHash: "a".repeat(64) }, family: "visual_discovery", estimatedSeconds: 10, payload: {}, payloadHash: (0, decision_registry_1.hashCanonicalBody)({}), contentUnitIds: [], overrides: {}, tags: { skillIds: [], grammar: [], vocabulary: [], scenario: [], modalities: ["reading"] }, localization: { studyTarget: "en", learnerSourceLocale: "ru", requiredLocales: ["en", "ru"], fieldSourceHashes: {} }, assets: [] }],
        delayedProbeDefinitions: [], graph: { startNodeId: "node-1", capstoneNodeId: "node-1", nodes: [{ nodeId: "node-1", activityId: "activity-1", position: 1, visible: true, requiredForCore: true, voiceEvidenceOptional: true, phase: "encounter_build", evidenceDeclarations: [], gateEligible: false, maxStars: 0 }], edges: [] }, starSlots: [], requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
        assessmentNodes: { independentProbeNodeIds: [] }, capstoneContract: { objectiveIds: [], requiredSemanticSlotIds: [], criticalConstraintIds: [], primaryNodeIds: [], deterministicAlternateNodeIds: [] }, masteryContract: { requirements: [] },
        learningDesign: { primaryOutcomeId: "outcome-1", objectiveIds: ["objective-1"], prerequisiteEdges: [], supportPlan: [{ objectiveId: "objective-1", initialSupport: "partial_cue", fadeRuleId: "fade-1", escalationRuleId: "escalate-1" }], independentProbeRef: "probe-1", delayedProbeRef: { probeId: "probe-1", contentHash: "a".repeat(64) }, delayedWindowPolicyId: "window-1" }, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: [],
        minAppVersion: "1.0.0",
    };
};
describe("Learning V2 progress event against Firestore/Storage emulators", () => {
    jest.setTimeout(120000);
    let environment;
    let app;
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST)
            throw new Error("Firestore and Storage emulators are required");
        app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({ projectId: PROJECT_ID, firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") } });
    });
    afterAll(async () => { await environment?.cleanup(); await app?.delete(); });
    it("resolves canonical Season/Episode bytes, writes scoped projection/evidence, and isolates accounts", async () => {
        const db = app.firestore();
        const bucket = app.storage().bucket();
        const body = episodeBody();
        body.activityInstances[0].templateRef = { templateId: PILOT_TEMPLATE_BODY.templateId, version: PILOT_TEMPLATE_BODY.version, contentHash: PILOT_TEMPLATE_HASH };
        body.graph.nodes[0].starSlotId = "slot-1";
        body.graph.nodes[0].maxStars = 3;
        body.graph.nodes[0].gateEligible = true;
        body.starSlots = [{ starSlotId: "slot-1", acceptedNodeIds: ["node-1"], maxStars: 3 }];
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const episodeRef = { draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)(body.draftId, 1, contentHash), contentHash, ordinal: 1, chapterId: body.chapterId, approvalStatus: "approved" };
        const episodePath = (0, episode_revision_resolver_1.episodeRevisionObjectPath)(body.draftId, 1, contentHash);
        const episodeFile = bucket.file(episodePath);
        const episodeBytes = (0, decision_registry_1.canonicalJsonV1)(body);
        await episodeFile.save(Buffer.from(episodeBytes), { resumable: false, metadata: { metadata: { contentHash } } });
        const [episodeMeta] = await episodeFile.getMetadata();
        const now = new Date().toISOString();
        await db.doc(`content_episode_revisions/${body.draftId}__r1`).set({ record: { schemaVersion: "episode-authoring-record.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, contentHash, revisionFingerprint: episodeRef.revisionFingerprint, object: { objectPath: episodePath, contentHash, objectGeneration: String(episodeMeta.generation), byteSize: Buffer.byteLength(episodeBytes) }, provenance: { createdBy: "emulator", createdAt: now }, createdAt: now }, lifecycle: { schemaVersion: "episode-lifecycle.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: episodeRef.revisionFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 } });
        const seasonBody = { schemaVersion: "season-authoring-body.v1", draftId: "emulator-progress-season-draft", seasonId: body.seasonId, releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [episodeRef], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "a".repeat(64) } };
        const seasonHash = (0, decision_registry_1.hashCanonicalBody)(seasonBody);
        const seasonPath = (0, season_revision_1.seasonRevisionObjectPath)(seasonBody.draftId, 1, seasonHash);
        const seasonFile = bucket.file(seasonPath);
        const seasonBytes = (0, decision_registry_1.canonicalJsonV1)(seasonBody);
        await seasonFile.save(Buffer.from(seasonBytes), { resumable: false, metadata: { metadata: { contentHash: seasonHash } } });
        const [seasonMeta] = await seasonFile.getMetadata();
        const seasonFingerprint = (0, season_revision_1.seasonRevisionFingerprint)(seasonBody.draftId, 1, seasonHash);
        await db.doc("content_season_revisions/emulator-progress-season-r1").set({ record: { schemaVersion: "season-authoring-record.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, contentHash: seasonHash, revisionFingerprint: seasonFingerprint, object: { objectPath: seasonPath, contentHash: seasonHash, objectGeneration: String(seasonMeta.generation), byteSize: Buffer.byteLength(seasonBytes) }, provenance: { createdBy: "emulator" }, createdAt: now } });
        await db.doc("content_season_lifecycle/emulator-progress-season-r1").set({ schemaVersion: "season-lifecycle.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, revisionFingerprint: seasonFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 });
        expect((await db.doc("content_season_revisions/emulator-progress-season-r1").get()).exists).toBe(true);
        expect((await db.doc("content_season_lifecycle/emulator-progress-season-r1").get()).exists).toBe(true);
        const attemptBody = { schemaVersion: "v2-attempt-body.v1", opId: "emulator-progress-attempt", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] };
        const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
        const base = { seasonId: body.seasonId, studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "emulator-progress-season-r1", episodeRevisionRef: episodeRef, attemptBody, attemptRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] }, projection: { starSlotId: "slot-1", previousBestStars: 0, candidateStars: 0, activityId: "activity-1", progressCompatibilityKey: "activity-1" } };
        const seasonObjectReader = (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(bucket);
        const episodeResolverBase = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, async (templateRef) => ({ templateRef, allowedOverridePaths: [] }));
        const episodeResolver = { ...episodeResolverBase, validateBody: episode_revision_resolver_1.validateEpisodeRevisionArtifactBody };
        await db.doc("auth_links/progress-auth-a").set({ stable_id: "progress-user-a" });
        await db.doc("users/progress-user-a").set({ accountGeneration: 1 });
        await db.doc("auth_links/progress-auth-b").set({ stable_id: "progress-user-b" });
        await db.doc("users/progress-user-b").set({ accountGeneration: 1 });
        await db.doc("auth_links/progress-auth-positive").set({ stable_id: "progress-positive-user" });
        await db.doc("users/progress-positive-user").set({ accountGeneration: 1 });
        const first = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)({ db, authUid: "progress-auth-a", stableUid: "progress-user-a", accountGeneration: 1, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-a", 1), seasonObjectReader, episodeResolver });
        const second = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)({ db, authUid: "progress-auth-b", stableUid: "progress-user-b", accountGeneration: 1, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-b", 1), seasonObjectReader, episodeResolver });
        await expect((0, progress_event_1.applyProgressEvent)(first, { ...base, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-a", 1), idempotencyKey: "emulator-progress-op-a" })).resolves.toMatchObject({ accepted: true, duplicate: false });
        const secondAttemptBody = { ...attemptBody, opId: "emulator-progress-attempt-b" };
        const secondAttemptRef = (0, attempt_1.buildCanonicalAttemptRef)(secondAttemptBody);
        await expect((0, progress_event_1.applyProgressEvent)(second, { ...base, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-b", 1), idempotencyKey: "emulator-progress-op-b", attemptBody: secondAttemptBody, attemptRef: secondAttemptRef, evidenceBundle: { ...base.evidenceBundle, attemptRef: secondAttemptRef } })).resolves.toMatchObject({ accepted: true, duplicate: false });
        const snapshots = await db.getAll(db.doc(`users/${(0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-a", 1)}/v2_progress/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`), db.doc(`users/${(0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-b", 1)}/v2_progress/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`));
        expect(snapshots.every((snapshot) => snapshot.exists)).toBe(true);
        expect(snapshots[0].data()?.projection.performanceStars).toBe(0);
        expect(snapshots[0].ref.path).not.toBe(snapshots[1].ref.path);
        const positive = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)({
            db,
            authUid: "progress-auth-positive",
            stableUid: "progress-positive-user",
            accountGeneration: 1,
            accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-positive-user", 1),
            seasonObjectReader,
            episodeResolver,
            scoringTemplates: { read: async (ref) => ref.contentHash === PILOT_TEMPLATE_HASH ? { body: PILOT_TEMPLATE_BODY } : undefined },
            scoringPolicies: (0, server_score_policy_catalog_1.createCodeOwnedScoringPolicyCatalog)([server_score_policy_catalog_1.PILOT_SCORING_POLICY_BODY]),
        });
        const scoreRequest = (opId, resultCode, idempotencyKey) => {
            const scoredAttemptBody = { ...attemptBody, opId, outcome: { resultCode } };
            const scoredAttemptRef = (0, attempt_1.buildCanonicalAttemptRef)(scoredAttemptBody);
            return { ...base, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-positive-user", 1), idempotencyKey, attemptBody: scoredAttemptBody, attemptRef: scoredAttemptRef, evidenceBundle: { ...base.evidenceBundle, attemptRef: scoredAttemptRef }, projection: { ...base.projection, candidateStars: 3 } };
        };
        await expect((0, progress_event_1.applyProgressEvent)(positive, scoreRequest("score-attempt-1", "NEEDS_WORK_CONFIDENT", "score-op-1"))).resolves.toMatchObject({ accepted: true, duplicate: false });
        const positiveSlotPath = `users/${(0, progress_event_1.deriveProgressAccountScopeHash)("progress-positive-user", 1)}/v2_progress/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`;
        expect((await db.doc(positiveSlotPath).get()).data()?.projection).toMatchObject({ performanceStars: 1, performanceStarsDelta: 1 });
        await expect((0, progress_event_1.applyProgressEvent)(positive, scoreRequest("score-attempt-2", "CORRECT", "score-op-2"))).resolves.toMatchObject({ accepted: true, duplicate: false });
        expect((await db.doc(positiveSlotPath).get()).data()?.projection).toMatchObject({ performanceStars: 3, performanceStarsDelta: 2 });
        await expect((0, progress_event_1.applyProgressEvent)(positive, scoreRequest("score-attempt-2", "CORRECT", "score-op-2"))).resolves.toMatchObject({ duplicate: true });
        await (0, progress_event_1.applyProgressEvent)(positive, scoreRequest("score-attempt-3", "WRONG", "score-op-3"));
        expect((await db.doc(positiveSlotPath).get()).data()?.projection.performanceStars).toBe(3);
        const raceStableUid = "progress-race-user";
        const raceAuthUid = "progress-auth-race";
        const raceScope = (0, progress_event_1.deriveProgressAccountScopeHash)(raceStableUid, 1);
        const raceAttemptBody = { ...attemptBody, opId: "emulator-progress-attempt-race" };
        const raceAttemptRef = (0, attempt_1.buildCanonicalAttemptRef)(raceAttemptBody);
        const raceRequest = {
            ...base,
            accountScopeHash: raceScope,
            idempotencyKey: "emulator-progress-op-race",
            attemptBody: raceAttemptBody,
            attemptRef: raceAttemptRef,
            evidenceBundle: { ...base.evidenceBundle, attemptRef: raceAttemptRef },
        };
        await db.doc(`auth_links/${raceAuthUid}`).set({ stable_id: raceStableUid });
        await db.doc(`users/${raceStableUid}`).set({ accountGeneration: 1 });
        let bindingReadAttempts = 0;
        let signalFirstBindingReads;
        const firstBindingReads = new Promise((resolve) => { signalFirstBindingReads = resolve; });
        let releaseFirstAttempt;
        const firstAttemptMayContinue = new Promise((resolve) => { releaseFirstAttempt = resolve; });
        await environment.withSecurityRulesDisabled(async (context) => {
            const clientDb = context.firestore();
            const optimisticDb = {
                doc: (documentPath) => (0, firestore_1.doc)(clientDb, documentPath),
                runTransaction: (work) => (0, firestore_1.runTransaction)(clientDb, async (transaction) => work({
                    get: async (ref) => {
                        const snapshot = await transaction.get(ref);
                        return { exists: snapshot.exists(), data: () => snapshot.data() };
                    },
                    create: (ref, value) => transaction.set(ref, value),
                    set: (ref, value, options) => options ? transaction.set(ref, value, options) : transaction.set(ref, value),
                })),
            };
            const racing = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)({
                db: optimisticDb,
                authUid: raceAuthUid,
                stableUid: raceStableUid,
                accountGeneration: 1,
                accountScopeHash: raceScope,
                seasonObjectReader,
                episodeResolver,
                testHooks: {
                    afterBindingReads: async () => {
                        bindingReadAttempts += 1;
                        if (bindingReadAttempts === 1) {
                            signalFirstBindingReads();
                            await firstAttemptMayContinue;
                        }
                    },
                },
            });
            const raceResult = (0, progress_event_1.applyProgressEvent)(racing, raceRequest);
            await firstBindingReads;
            try {
                await db.doc(`users/${raceStableUid}`).update({ accountGeneration: 2 });
            }
            finally {
                releaseFirstAttempt();
            }
            await expect(raceResult).rejects.toThrow("account_generation_mismatch");
        });
        expect(bindingReadAttempts).toBe(2);
        const raceOperationPath = `learning_v2_progress_operations/${raceScope}__emulator-progress-season-r1__emulator-progress-op-race`;
        const raceAttemptPath = `learning_v2_progress_attempts/${raceScope}__emulator-progress-season-r1__emulator-progress-episode__emulator-progress-attempt-race`;
        const raceProjectionPath = `users/${raceScope}/v2_progress/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`;
        const raceArtifacts = await db.getAll(db.doc(raceOperationPath), db.doc(raceAttemptPath), db.doc(raceProjectionPath));
        expect(raceArtifacts.every((snapshot) => !snapshot.exists)).toBe(true);
        expect((await db.collection(`users/${raceScope}/v2_progress/emulator-progress-season-r1/episodes/emulator-progress-episode/evidence`).get()).empty).toBe(true);
        await db.doc("content_season_lifecycle/emulator-progress-season-r1").update({ status: "archived", lifecycleRevision: 2 });
        const archivedAttemptBody = { ...attemptBody, opId: "emulator-progress-attempt-archived" };
        const archivedAttemptRef = (0, attempt_1.buildCanonicalAttemptRef)(archivedAttemptBody);
        await expect((0, progress_event_1.applyProgressEvent)(first, { ...base, idempotencyKey: "emulator-progress-op-archived", attemptBody: archivedAttemptBody, attemptRef: archivedAttemptRef, evidenceBundle: { ...base.evidenceBundle, attemptRef: archivedAttemptRef }, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-a", 1) })).rejects.toThrow("v2_progress_season_not_approved_or_stale");
        expect((await db.doc(`learning_v2_progress_operations/${(0, progress_event_1.deriveProgressAccountScopeHash)("progress-user-a", 1)}__emulator-progress-season-r1__emulator-progress-op-archived`).get()).exists).toBe(false);
    });
    it("denies direct client writes to the server-owned progress subtree", async () => {
        const context = environment.authenticatedContext("progress-client");
        const target = (0, firestore_1.doc)(context.firestore(), "users/progress-client/v2_progress/season-r1/episodes/episode-1/evidence/client-tuple");
        await (0, rules_unit_testing_1.assertFails)((0, firestore_1.setDoc)(target, { forged: true }));
    });
});
//# sourceMappingURL=progress_event.emulator.test.js.map