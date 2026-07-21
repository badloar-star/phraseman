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
const admin_content_studio_callables_1 = require("../../admin_content_studio_callables");
const decision_registry_1 = require("../../../../modules/learning-v2/policies/decision_registry");
const episode_revision_resolver_1 = require("../episode_revision_resolver");
const season_draft_1 = require("../../../../modules/learning-v2/authoring/season_draft");
const season_revision_resolver_1 = require("../season_revision_resolver");
const season_revision_1 = require("../../../../modules/learning-v2/authoring/season_revision");
const season_pin_index_paths_1 = require("../season_pin_index_paths");
const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const makeBody = () => {
    const episode = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, "../../../../tests/fixtures/learning-v2/episode-01.valid.json"), "utf8")).episode;
    return {
        schemaVersion: "episode-authoring-body.v1", draftId: "lifecycle-draft-1", episodeId: "lifecycle-episode-1", revision: 1, seasonId: episode.seasonId, ordinal: episode.ordinal, chapterId: episode.chapterId,
        studyTarget: "en", learnerSourceLocale: "ru", title: episode.title, canDoOutcome: episode.canDoOutcome, scenario: episode.scenario, phraseFrames: episode.phraseFrames, semanticSlots: episode.semanticSlots, criticalConstraints: episode.criticalConstraints, contentUnits: {}, activityInstances: episode.activities, delayedProbeDefinitions: episode.delayedProbeDefinitions, graph: episode.graph, starSlots: episode.starSlots, requiredLoops: episode.requiredLoops, assessmentNodes: episode.assessmentNodes, capstoneContract: episode.capstoneContract, masteryContract: episode.masteryContract, learningDesign: episode.learningDesign, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: episode.reviewLinks, minAppVersion: "1.0.0", episodeKind: episode.episodeKind, estimatedMinutes: episode.estimatedMinutes, objectiveIds: episode.objectiveIds, skillIds: episode.skillIds, grammarDistinctionIds: episode.grammarDistinctionIds, soundFocusIds: episode.soundFocusIds, assetIds: episode.assetIds, accessibilityRoutes: episode.accessibilityRoutes,
    };
};
describe("Episode lifecycle callable emulator", () => {
    jest.setTimeout(30000);
    let environment;
    let app;
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST)
            throw new Error("Firestore and Storage emulators are required");
        process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO = "false";
        app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({ projectId: PROJECT_ID, firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") } });
    });
    afterAll(async () => { delete process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO; await environment?.cleanup(); await app?.delete(); });
    it("submits, issues evidence, rejects self-approval, then approves and archives", async () => {
        const body = makeBody();
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = { draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)(body.draftId, 1, contentHash), contentHash, ordinal: Number(body.ordinal), chapterId: String(body.chapterId) };
        const serialized = (0, decision_registry_1.canonicalJsonV1)(body);
        const file = app.storage().bucket().file((0, episode_revision_resolver_1.episodeRevisionObjectPath)(body.draftId, 1, contentHash));
        await file.save(Buffer.from(serialized, "utf8"), { resumable: false, metadata: { metadata: { contentHash } } });
        const [metadata] = await file.getMetadata();
        await environment.withSecurityRulesDisabled(async (context) => (0, firestore_1.setDoc)((0, firestore_1.doc)(context.firestore(), `content_episode_revisions/${body.draftId}__r1`), { record: { schemaVersion: "episode-authoring-record.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, contentHash, revisionFingerprint: ref.revisionFingerprint, object: { objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(body.draftId, 1, contentHash), contentHash, objectGeneration: String(metadata.generation), byteSize: Buffer.byteLength(serialized, "utf8") }, provenance: { createdBy: "fixture", createdAt: new Date().toISOString() }, createdAt: new Date().toISOString() } }));
        const call = (fn, data, uid, role) => fn.run({ data, auth: { uid, token: { admin: true, adminRole: role } }, app: { appId: "emulator-app" } });
        await expect(call(admin_content_studio_callables_1.adminSubmitV2EpisodeRevision, { revisionRef: ref, reason: "submit", idempotencyKey: "submit-1" }, "author-1", "content_editor")).resolves.toMatchObject({ ok: true, lifecycle: { status: "needs_review" } });
        const lifecycleAfterSubmit = await app.firestore().doc(`content_episode_lifecycle/${body.draftId}__r1`).get();
        expect(lifecycleAfterSubmit.exists).toBe(true);
        const validation = await call(admin_content_studio_callables_1.adminIssueV2EpisodeValidationReceipt, { revisionRef: ref, reason: "validate", idempotencyKey: "validation-1" }, "reviewer-1", "content_reviewer");
        const localization = await call(admin_content_studio_callables_1.adminIssueV2EpisodeLocalizationReceipt, { revisionRef: ref, reason: "localize", idempotencyKey: "localization-1" }, "reviewer-1", "content_reviewer");
        const review = await call(admin_content_studio_callables_1.adminReviewV2EpisodeRevision, { revisionRef: ref, status: "approved", reason: "review", idempotencyKey: "review-1" }, "reviewer-1", "content_reviewer");
        const gate = await call(admin_content_studio_callables_1.adminIssueV2ContentGate, { subject: { entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash }, receiptIds: { validationReceiptId: `validation__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__validation-1`, localizationReceiptId: `localization__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__localization-1`, reviewReceiptId: `review__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__review-1` }, reason: "gate", idempotencyKey: "gate-1" }, "publisher-1", "owner");
        const gateId = `episode__${ref.episodeId}__r${ref.revision}__${ref.contentHash}`;
        const persistedGate = await app.firestore().doc(`content_studio_gate_receipts/${gateId}`).get();
        expect(persistedGate.exists).toBe(true);
        const receiptIds = { validationReceiptId: validation.receiptId ?? `validation__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__validation-1`, localizationReceiptId: localization.receiptId ?? `localization__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__localization-1`, reviewReceiptId: review.receiptId ?? `review__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__review-1`, gateReceiptId: gate.gateId ?? `episode__${ref.episodeId}__r${ref.revision}__${ref.contentHash}` };
        await expect(call(admin_content_studio_callables_1.adminApproveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 1, receiptIds, reason: "approve", idempotencyKey: "approve-self" }, "reviewer-1", "content_reviewer")).rejects.toThrow("episode_maker_checker_self_review");
        const contenders = await Promise.allSettled([
            call(admin_content_studio_callables_1.adminApproveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 1, receiptIds, reason: "approve", idempotencyKey: "approve-1" }, "approver-1", "content_reviewer"),
            call(admin_content_studio_callables_1.adminApproveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 1, receiptIds, reason: "approve", idempotencyKey: "approve-2" }, "approver-2", "content_reviewer"),
        ]);
        expect(contenders.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        expect(contenders.filter((result) => result.status === "rejected")).toHaveLength(1);
        const seasonDraft = (0, season_draft_1.pinApprovedEpisodeRevisions)((0, season_draft_1.createSeasonDraft)({
            draftId: "season-pin-draft-1",
            seasonId: "season-1",
            scope: "vertical_slice",
            decisionRegistryRef: { id: "phraseman-v2-product-decisions", version: 1, contentHash: "c".repeat(64) },
        }), [{ ...ref, approvalStatus: "approved" }], { version: "v2-gates-1" });
        await app.firestore().doc("content_season_revisions/active-pin-1").set({ body: seasonDraft.body, record: { ...seasonDraft.record, status: "approved" } });
        await app.firestore().doc("content_season_lifecycle/active-pin-1").set({ status: "approved" });
        await expect(call(admin_content_studio_callables_1.adminArchiveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 2, reason: "archive-pinned", idempotencyKey: "archive-pinned" }, "approver-1", "content_reviewer")).rejects.toThrow("episode_archive_pinned");
        await app.firestore().doc("content_season_lifecycle/active-pin-1").delete();
        await app.firestore().doc("content_season_revisions/active-pin-1").delete();
        const canonicalSeasonBody = { schemaVersion: "season-authoring-body.v1", draftId: "season-canonical-1", seasonId: "season-1", releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [{ ...ref, approvalStatus: "approved" }], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "c".repeat(64) } };
        const canonicalSeasonHash = (0, decision_registry_1.hashCanonicalBody)(canonicalSeasonBody);
        const canonicalSeasonPath = (0, season_revision_1.seasonRevisionObjectPath)(canonicalSeasonBody.draftId, 1, canonicalSeasonHash);
        const canonicalSeasonFile = app.storage().bucket().file(canonicalSeasonPath);
        await canonicalSeasonFile.save(Buffer.from((0, decision_registry_1.canonicalJsonV1)(canonicalSeasonBody), "utf8"), { resumable: false, metadata: { metadata: { contentHash: canonicalSeasonHash } } });
        const [canonicalSeasonMetadata] = await canonicalSeasonFile.getMetadata();
        const canonicalSeasonFingerprint = (0, decision_registry_1.hashCanonicalBody)({ draftId: canonicalSeasonBody.draftId, revision: 1, contentHash: canonicalSeasonHash });
        await app.firestore().doc("content_season_revisions/canonical-pin-1").set({ record: { schemaVersion: "season-authoring-record.v1", draftId: canonicalSeasonBody.draftId, seasonId: canonicalSeasonBody.seasonId, revision: 1, contentHash: canonicalSeasonHash, revisionFingerprint: canonicalSeasonFingerprint, object: { objectPath: canonicalSeasonPath, contentHash: canonicalSeasonHash, objectGeneration: String(canonicalSeasonMetadata.generation), byteSize: Buffer.byteLength((0, decision_registry_1.canonicalJsonV1)(canonicalSeasonBody), "utf8") }, provenance: {}, createdAt: new Date().toISOString() } });
        await app.firestore().doc("content_season_lifecycle/canonical-pin-1").set({ schemaVersion: "season-lifecycle.v1", draftId: canonicalSeasonBody.draftId, seasonId: canonicalSeasonBody.seasonId, revision: 1, revisionFingerprint: canonicalSeasonFingerprint, status: "needs_review", changedBy: "author-1", changedAt: new Date().toISOString(), lifecycleRevision: 1 });
        const seasonApproval = { seasonRevisionId: "canonical-pin-1", expectedLifecycleRevision: 1, idempotencyKey: "season-approve-001", reason: "reviewed canonical season" };
        await expect(call(admin_content_studio_callables_1.adminApproveV2SeasonRevision, seasonApproval, "editor-1", "content_editor")).rejects.toThrow("Role cannot review V2 content");
        await expect(call(admin_content_studio_callables_1.adminApproveV2SeasonRevision, seasonApproval, "author-1", "content_reviewer")).rejects.toThrow("season_maker_checker_self_review");
        await expect(call(admin_content_studio_callables_1.adminApproveV2SeasonRevision, seasonApproval, "reviewer-2", "content_reviewer")).resolves.toMatchObject({ ok: true, lifecycle: { status: "approved", lifecycleRevision: 2 } });
        await expect((0, season_revision_resolver_1.resolveImmutableSeasonRevision)({ revisionPath: "content_season_revisions/canonical-pin-1", lifecyclePath: "content_season_lifecycle/canonical-pin-1", objectReader: (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(app.storage().bucket()), documentReader: { read: async (path) => { const snapshot = await app.firestore().doc(path).get(); return { exists: snapshot.exists, data: () => snapshot.data() }; } } })).resolves.toBeTruthy();
        await expect(call(admin_content_studio_callables_1.adminArchiveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 2, reason: "archive-canonical-pinned", idempotencyKey: "archive-canonical-pinned" }, "approver-1", "content_reviewer")).rejects.toThrow("episode_archive_pinned");
        const staleOrphanRef = { episodeId: "orphan-episode", revision: 1, revisionFingerprint: "1".repeat(64), contentHash: "2".repeat(64) };
        const staleOrphanPath = (0, season_pin_index_paths_1.seasonEpisodePinIndexDocumentPath)(staleOrphanRef);
        await app.firestore().doc("content_season_lifecycle/old-season-1").set({ schemaVersion: "season-lifecycle.v1", draftId: "old-season-draft", seasonId: "season-1", revision: 1, revisionFingerprint: "3".repeat(64), status: "approved", changedBy: "old-reviewer", changedAt: new Date().toISOString(), lifecycleRevision: 1 });
        await app.firestore().doc(staleOrphanPath).set({ schemaVersion: "season-episode-pin-index.v1", documentPath: staleOrphanPath, seasonRevisionId: "old-season-1", seasonRevisionFingerprint: "3".repeat(64), episodeId: staleOrphanRef.episodeId, revision: staleOrphanRef.revision, revisionFingerprint: staleOrphanRef.revisionFingerprint, contentHash: staleOrphanRef.contentHash, status: "approved", lifecycleRevision: 1 });
        const unrelatedRef = { episodeId: "unrelated-episode", revision: 1, revisionFingerprint: "4".repeat(64), contentHash: "5".repeat(64) };
        const unrelatedPath = (0, season_pin_index_paths_1.seasonEpisodePinIndexDocumentPath)(unrelatedRef);
        await app.firestore().doc("content_season_lifecycle/other-season-1").set({ schemaVersion: "season-lifecycle.v1", draftId: "other-season-draft", seasonId: "season-2", revision: 1, revisionFingerprint: "6".repeat(64), status: "approved", changedBy: "other-reviewer", changedAt: new Date().toISOString(), lifecycleRevision: 1 });
        await app.firestore().doc(unrelatedPath).set({ schemaVersion: "season-episode-pin-index.v1", documentPath: unrelatedPath, seasonRevisionId: "other-season-1", seasonRevisionFingerprint: "6".repeat(64), episodeId: unrelatedRef.episodeId, revision: unrelatedRef.revision, revisionFingerprint: unrelatedRef.revisionFingerprint, contentHash: unrelatedRef.contentHash, status: "approved", lifecycleRevision: 1 });
        await expect(call(admin_content_studio_callables_1.adminArchiveV2SeasonRevision, { seasonRevisionId: "canonical-pin-1", expectedLifecycleRevision: 1, idempotencyKey: "season-archive-stale", reason: "stale archive" }, "reviewer-2", "content_reviewer")).rejects.toThrow("season_lifecycle_stale");
        await expect(call(admin_content_studio_callables_1.adminArchiveV2SeasonRevision, { seasonRevisionId: "canonical-pin-1", expectedLifecycleRevision: 2, idempotencyKey: "season-archive-001", reason: "archived after replacement" }, "reviewer-2", "content_reviewer")).resolves.toMatchObject({ ok: true, lifecycle: { status: "archived", lifecycleRevision: 3 } });
        expect((await app.firestore().doc(staleOrphanPath).get()).exists).toBe(false);
        expect((await app.firestore().doc(unrelatedPath).get()).exists).toBe(true);
        await app.firestore().doc("content_season_lifecycle/canonical-pin-1").delete();
        await app.firestore().doc("content_season_revisions/canonical-pin-1").delete();
        await canonicalSeasonFile.delete();
        await app.firestore().doc("content_episode_lifecycle_operations/malformed-op").set({ requestFingerprint: "fingerprint", lifecycle: { status: "approved" }, unexpected: true });
        await expect(call(admin_content_studio_callables_1.adminArchiveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 2, reason: "malformed", idempotencyKey: "malformed-op" }, "approver-1", "content_reviewer")).rejects.toThrow("episode_lifecycle_operation_invalid");
        await expect(call(admin_content_studio_callables_1.adminArchiveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 2, reason: "archive", idempotencyKey: "archive-1" }, "approver-1", "content_reviewer")).resolves.toMatchObject({ ok: true, lifecycle: { status: "archived" } });
        await expect(call(admin_content_studio_callables_1.adminArchiveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 2, reason: "different", idempotencyKey: "archive-1" }, "approver-1", "content_reviewer")).rejects.toThrow("idempotency_key_reused");
        await expect(call(admin_content_studio_callables_1.adminArchiveV2EpisodeRevision, { revisionRef: ref, expectedLifecycleRevision: 1, reason: "stale", idempotencyKey: "archive-stale" }, "approver-1", "content_reviewer")).rejects.toThrow("episode_lifecycle_stale");
    });
});
//# sourceMappingURL=v2_episode_lifecycle.emulator.test.js.map