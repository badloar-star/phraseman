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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminConfirmV2OwnerEpisode = exports.V2_OWNER_EPISODE_CONFIRMATION_PREFIX_V1 = exports.V2_OWNER_EPISODE_CONFIRMATION_COLLECTION_V1 = void 0;
exports.coldResolveV2OwnerEpisodeStageV1 = coldResolveV2OwnerEpisodeStageV1;
exports.confirmV2OwnerEpisodeV1 = confirmV2OwnerEpisodeV1;
exports.createFirebaseAdminV2OwnerEpisodeConfirmationAdapterV1 = createFirebaseAdminV2OwnerEpisodeConfirmationAdapterV1;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const callable_options_1 = require("../callable_options");
const review_fingerprint_1 = require("./review_fingerprint");
const v2_canonical_generation_plan_v2_1 = require("./v2_canonical_generation_plan_v2");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_owner_authored_episode_input_v1_1 = require("./v2_owner_authored_episode_input_v1");
const v2_owner_authored_episode_input_v2_1 = require("./v2_owner_authored_episode_input_v2");
const v2_owner_episode_confirmation_v1_1 = require("./v2_owner_episode_confirmation_v1");
const v2_owner_episode_stage_repository_v1_1 = require("./v2_owner_episode_stage_repository_v1");
const v2_root_owner_identity_v1_1 = require("./v2_root_owner_identity_v1");
exports.V2_OWNER_EPISODE_CONFIRMATION_COLLECTION_V1 = "content_v2_owner_episode_confirmations";
exports.V2_OWNER_EPISODE_CONFIRMATION_PREFIX_V1 = "learning-v2/owner-episode-confirmations";
const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/u;
const decoder = new TextDecoder("utf-8", { fatal: true });
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseRequest(value) {
    if (!isRecord(value) ||
        Object.keys(value).sort().join("|") !==
            "expectedReviewFingerprint|reason|stageId" ||
        typeof value.stageId !== "string" ||
        !STAGE_ID_RE.test(value.stageId) ||
        typeof value.expectedReviewFingerprint !== "string" ||
        !HASH_RE.test(value.expectedReviewFingerprint) ||
        typeof value.reason !== "string" ||
        value.reason.length < 5 ||
        value.reason.length > 500 ||
        value.reason !== value.reason.trim() ||
        value.reason.normalize("NFC") !== value.reason)
        fail("v2_owner_episode_confirmation_request_invalid");
    return Object.freeze({
        stageId: value.stageId,
        expectedReviewFingerprint: value.expectedReviewFingerprint,
        reason: value.reason,
    });
}
function stringField(stage, key) {
    const value = stage[key];
    if (typeof value !== "string" || value.length < 1)
        fail("v2_owner_episode_confirmation_stage_invalid");
    return value;
}
function sizeField(stage, key, max) {
    const value = stage[key];
    if (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > max)
        fail("v2_owner_episode_confirmation_stage_invalid");
    return value;
}
async function readPinnedRaw(input) {
    const metadata = await input.storage.readMetadataExact(input.objectPath);
    if (!metadata ||
        metadata.generation !== input.objectGeneration ||
        metadata.contentHash !== input.contentHash ||
        metadata.byteSize !== input.byteSize ||
        metadata.contentType !== v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1)
        fail("v2_owner_episode_confirmation_readback_invalid");
    const downloaded = await input.storage.downloadGenerationExact({
        objectPath: input.objectPath,
        ifGenerationMatch: input.objectGeneration,
        maximumBytes: input.maximumBytes,
    });
    if (downloaded.kind !== "downloaded" ||
        downloaded.bytes.byteLength !== input.byteSize ||
        (0, node_crypto_1.createHash)("sha256").update(downloaded.bytes).digest("hex") !==
            input.contentHash)
        fail("v2_owner_episode_confirmation_readback_invalid");
    try {
        return decoder.decode(downloaded.bytes);
    }
    catch {
        fail("v2_owner_episode_confirmation_readback_invalid");
    }
}
async function coldResolveV2OwnerEpisodeStageV1(input) {
    const planRaw = await readPinnedRaw({
        storage: input.storage,
        objectPath: stringField(input.stage, "planRequestObjectPath"),
        objectGeneration: stringField(input.stage, "planRequestObjectGeneration"),
        contentHash: stringField(input.stage, "planRequestRawHash"),
        byteSize: sizeField(input.stage, "planRequestByteSize", 1024 * 1024),
        maximumBytes: 1024 * 1024,
    });
    const ownerInputRaw = await readPinnedRaw({
        storage: input.storage,
        objectPath: stringField(input.stage, "objectPath"),
        objectGeneration: stringField(input.stage, "objectGeneration"),
        contentHash: stringField(input.stage, "contentHash"),
        byteSize: sizeField(input.stage, "byteSize", v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2),
        maximumBytes: v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
    });
    const plan = (0, v2_canonical_generation_plan_v2_1.buildV2CanonicalSeasonPlanV2)((0, v2_canonical_generation_plan_v2_1.parseV2CanonicalPlanRequestV2)(planRaw));
    let schemaVersion = "";
    try {
        const candidate = JSON.parse(ownerInputRaw);
        schemaVersion = isRecord(candidate)
            ? String(candidate.schemaVersion ?? "")
            : "";
    }
    catch {
        fail("v2_owner_episode_confirmation_readback_invalid");
    }
    if (schemaVersion === v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2) {
        return (0, v2_owner_authored_episode_input_v2_1.getV2OwnerAuthoredEpisodeInputSummaryV2)((0, v2_owner_authored_episode_input_v2_1.parseV2OwnerAuthoredEpisodeInputV2)(ownerInputRaw, plan, input.stageId));
    }
    return (0, v2_owner_authored_episode_input_v1_1.getV2OwnerAuthoredEpisodeInputSummaryV1)((0, v2_owner_authored_episode_input_v1_1.parseV2OwnerAuthoredEpisodeInputV1)(ownerInputRaw, plan, input.stageId));
}
async function confirmV2OwnerEpisodeV1(request, dependencies) {
    const owner = (dependencies.authenticateOwner ?? v2_root_owner_identity_v1_1.requireV2ConfiguredRootOwnerV1)(request.auth);
    const input = parseRequest(request.data);
    const stored = await dependencies.repository.readStage(input.stageId);
    if (!stored)
        fail("v2_owner_episode_confirmation_stage_missing");
    const stage = stored.data;
    if ((stage.schemaVersion !== v2_owner_episode_stage_repository_v1_1.V2_OWNER_EPISODE_STAGE_SCHEMA_V1 &&
        stage.schemaVersion !== v2_owner_episode_stage_repository_v1_1.V2_OWNER_EPISODE_STAGE_SCHEMA_V2) ||
        (stage.state !== "needs_review" && stage.state !== "owner_confirmed") ||
        stage.kind !== "v2_activity_instances" ||
        stage.contentClass !== "production_candidate" ||
        (0, review_fingerprint_1.contentStageReviewFingerprint)(stored.id, stage) !==
            input.expectedReviewFingerprint)
        fail("v2_owner_episode_confirmation_stage_invalid");
    const summary = await (dependencies.resolveVerifiedStage ?? coldResolveV2OwnerEpisodeStageV1)({
        stage,
        stageId: input.stageId,
        storage: dependencies.storage,
    });
    if (summary.planFingerprint !== stage.planFingerprint ||
        summary.courseContractFingerprint !== stage.courseContractFingerprint ||
        summary.inputFingerprint !== stage.ownerInputFingerprint ||
        summary.activityAssemblyFingerprint !== stage.activityAssemblyFingerprint ||
        summary.episodeId !== stage.scopeId ||
        summary.contentClass !== "production_candidate")
        fail("v2_owner_episode_confirmation_subject_mismatch");
    if ("introCount" in summary &&
        (stage.introCount !== 12 ||
            stage.introQuestionCount !== 36 ||
            stage.introAggregateFingerprint !== summary.introAggregateFingerprint))
        fail("v2_owner_episode_confirmation_subject_mismatch");
    if (stage.state === "owner_confirmed") {
        const confirmationFingerprint = stringField(stage, "ownerConfirmationFingerprint");
        const ownerConfirmedBy = stringField(stage, "ownerConfirmedBy");
        const ownerConfirmedAt = stringField(stage, "ownerConfirmedAt");
        const ownerConfirmationReason = stringField(stage, "ownerConfirmationReason");
        const ownerIdentityFingerprint = stringField(stage, "ownerIdentityFingerprint");
        const pin = stage.ownerConfirmationPin;
        if (!HASH_RE.test(confirmationFingerprint) ||
            ownerConfirmedBy !== owner.actorUid ||
            !isRecord(pin) ||
            typeof pin.objectPath !== "string" ||
            typeof pin.contentHash !== "string" ||
            typeof pin.objectGeneration !== "string" ||
            typeof pin.byteSize !== "number" ||
            stage.ownerConfirmationMode !==
                "single_owner_explicit_two_step_confirmation")
            fail("v2_owner_episode_confirmation_stage_invalid");
        const raw = await readPinnedRaw({
            storage: dependencies.storage,
            objectPath: pin.objectPath,
            objectGeneration: pin.objectGeneration,
            contentHash: pin.contentHash,
            byteSize: pin.byteSize,
            maximumBytes: v2_owner_episode_confirmation_v1_1.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
        });
        const existing = (0, v2_owner_episode_confirmation_v1_1.parseV2OwnerEpisodeConfirmationV1)(raw, {
            planFingerprint: stringField(stage, "planFingerprint"),
            courseContractFingerprint: stringField(stage, "courseContractFingerprint"),
            stageId: input.stageId,
            episodeId: stringField(stage, "scopeId"),
            ownerInputFingerprint: stringField(stage, "ownerInputFingerprint"),
            activityAssemblyFingerprint: stringField(stage, "activityAssemblyFingerprint"),
            stageReviewFingerprint: input.expectedReviewFingerprint,
            ownerIdentityFingerprint,
            confirmedAtIso: ownerConfirmedAt,
            reason: ownerConfirmationReason,
            contentClass: "production_candidate",
        });
        if (existing.confirmationFingerprint !== confirmationFingerprint)
            fail("v2_owner_episode_confirmation_readback_invalid");
        return Object.freeze({
            ok: true,
            stageId: input.stageId,
            state: "owner_confirmed",
            replayed: true,
            confirmationFingerprint,
            confirmationMode: "single_owner_explicit_two_step_confirmation",
            humanConfirmationAuthority: "firebase_admin_exact_single_owner_confirmation",
            makerCheckerAuthority: "none_single_owner_mode",
            publicationDecisionAuthority: "none",
            releaseEligible: false,
            releaseAuthority: false,
        });
    }
    const confirmation = (0, v2_owner_episode_confirmation_v1_1.materializeV2OwnerEpisodeConfirmationV1)({
        planFingerprint: summary.planFingerprint,
        courseContractFingerprint: summary.courseContractFingerprint,
        stageId: summary.stageId,
        episodeId: summary.episodeId,
        ownerInputFingerprint: summary.inputFingerprint,
        activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
        stageReviewFingerprint: input.expectedReviewFingerprint,
        ownerIdentityFingerprint: owner.ownerIdentityFingerprint,
        confirmedAtIso: dependencies.now(),
        reason: input.reason,
        contentClass: summary.contentClass,
    });
    const raw = (0, decision_registry_1.canonicalJsonV1)(confirmation);
    const rawHash = (0, node_crypto_1.createHash)("sha256").update(raw).digest("hex");
    const persisted = await (0, v2_firebase_repository_persistence_v1_1.persistV2ImmutableRepositoryObjectV1)({
        storage: dependencies.storage,
        objectPath: `${exports.V2_OWNER_EPISODE_CONFIRMATION_PREFIX_V1}/${summary.planFingerprint}/${(0, decision_registry_1.hashCanonicalBody)({ stageId: summary.stageId })}/${confirmation.confirmationFingerprint}/${rawHash}.json`,
        bytes: new TextEncoder().encode(raw),
        maximumBytes: v2_owner_episode_confirmation_v1_1.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
        contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
    });
    const outcome = await dependencies.repository.commitExact({
        stageId: input.stageId,
        expectedReviewFingerprint: input.expectedReviewFingerprint,
        confirmation,
        confirmationPin: persisted.pin,
        actorUid: owner.actorUid,
        reason: input.reason,
    });
    return Object.freeze({
        ok: true,
        stageId: input.stageId,
        state: "owner_confirmed",
        replayed: outcome === "exact_replay",
        confirmationFingerprint: confirmation.confirmationFingerprint,
        confirmationMode: confirmation.confirmationMode,
        humanConfirmationAuthority: "firebase_admin_exact_single_owner_confirmation",
        makerCheckerAuthority: "none_single_owner_mode",
        publicationDecisionAuthority: "none",
        releaseEligible: false,
        releaseAuthority: false,
    });
}
function firebaseRepository(db) {
    const repository = {
        async readStage(stageId) {
            const snapshot = await db
                .collection(v2_owner_episode_stage_repository_v1_1.V2_OWNER_EPISODE_STAGE_COLLECTION_V1)
                .doc(stageId)
                .get();
            return snapshot.exists
                ? Object.freeze({
                    id: snapshot.id,
                    data: Object.freeze(snapshot.data() ?? {}),
                })
                : null;
        },
        async commitExact(input) {
            const stageRef = db
                .collection(v2_owner_episode_stage_repository_v1_1.V2_OWNER_EPISODE_STAGE_COLLECTION_V1)
                .doc(input.stageId);
            const confirmationRef = db
                .collection(exports.V2_OWNER_EPISODE_CONFIRMATION_COLLECTION_V1)
                .doc(input.confirmation.confirmationFingerprint);
            const auditRef = db
                .collection("admin_log")
                .doc(input.confirmation.confirmationFingerprint);
            return db.runTransaction(async (tx) => {
                const [stageSnapshot, confirmationSnapshot, auditSnapshot] = await Promise.all([
                    tx.get(stageRef),
                    tx.get(confirmationRef),
                    tx.get(auditRef),
                ]);
                if (!stageSnapshot.exists)
                    fail("v2_owner_episode_confirmation_stage_missing");
                const stage = stageSnapshot.data() ?? {};
                if (stage.state === "owner_confirmed" &&
                    stage.ownerConfirmationFingerprint ===
                        input.confirmation.confirmationFingerprint &&
                    confirmationSnapshot.exists &&
                    auditSnapshot.exists)
                    return "exact_replay";
                if (stage.state !== "needs_review" ||
                    (0, review_fingerprint_1.contentStageReviewFingerprint)(input.stageId, stage) !==
                        input.expectedReviewFingerprint ||
                    confirmationSnapshot.exists ||
                    auditSnapshot.exists)
                    fail("v2_owner_episode_confirmation_commit_conflict");
                tx.create(confirmationRef, {
                    ...input.confirmation,
                    confirmationPin: input.confirmationPin,
                });
                tx.update(stageRef, {
                    state: "owner_confirmed",
                    ownerConfirmationFingerprint: input.confirmation.confirmationFingerprint,
                    ownerConfirmationPin: input.confirmationPin,
                    ownerConfirmedBy: input.actorUid,
                    ownerConfirmedAt: input.confirmation.confirmedAtIso,
                    ownerConfirmationReason: input.confirmation.reason,
                    ownerIdentityFingerprint: input.confirmation.ownerIdentityFingerprint,
                    ownerConfirmationMode: input.confirmation.confirmationMode,
                    humanApprovalAuthority: "single_owner_exact_confirmation_only",
                    publicationPolicy: "draft_only_no_consumer",
                    releaseEligible: false,
                    releaseAuthority: false,
                });
                tx.create(auditRef, {
                    schemaVersion: "admin-audit.v1",
                    action: "learning_v2.owner_episode.confirm",
                    actorUid: input.actorUid,
                    role: "owner",
                    entity: {
                        collection: v2_owner_episode_stage_repository_v1_1.V2_OWNER_EPISODE_STAGE_COLLECTION_V1,
                        id: input.stageId,
                    },
                    operationId: input.confirmation.confirmationFingerprint,
                    reason: input.reason,
                    before: { state: "needs_review" },
                    after: {
                        state: "owner_confirmed",
                        confirmationFingerprint: input.confirmation.confirmationFingerprint,
                    },
                    timestamp: input.confirmation.confirmedAtIso,
                });
                return "created";
            });
        },
    };
    return Object.freeze(repository);
}
function createFirebaseAdminV2OwnerEpisodeConfirmationAdapterV1() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    const repository = firebaseRepository(admin.firestore());
    return Object.freeze({
        confirm(request) {
            return confirmV2OwnerEpisodeV1(request, {
                storage: io.storage,
                repository,
                now: () => new Date().toISOString(),
            });
        },
    });
}
function callableError(error) {
    if (error instanceof https_1.HttpsError)
        return error;
    const message = error instanceof Error ? error.message : "";
    return new https_1.HttpsError("failed-precondition", /^v2_owner_episode_confirmation_[a-z0-9_]+$/u.test(message)
        ? message
        : "v2_owner_episode_confirmation_failed");
}
exports.adminConfirmV2OwnerEpisode = (0, https_1.onCall)({ region: "us-central1", enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_ADMIN }, async (request) => {
    try {
        return await createFirebaseAdminV2OwnerEpisodeConfirmationAdapterV1().confirm(request);
    }
    catch (error) {
        throw callableError(error);
    }
});
//# sourceMappingURL=v2_owner_episode_confirmation_adapter_v1.js.map