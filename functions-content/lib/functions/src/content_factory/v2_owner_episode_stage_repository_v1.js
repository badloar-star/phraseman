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
exports.adminImportV2OwnerEpisodeStage = exports.V2_OWNER_EPISODE_STAGE_SCHEMA_V2 = exports.V2_OWNER_EPISODE_STAGE_SCHEMA_V1 = exports.V2_OWNER_EPISODE_STAGE_COLLECTION_V1 = void 0;
exports.importV2OwnerEpisodeStageV1 = importV2OwnerEpisodeStageV1;
exports.createFirebaseAdminV2OwnerEpisodeStageImporterV1 = createFirebaseAdminV2OwnerEpisodeStageImporterV1;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("../callable_options");
const content_stage_object_identity_v1_1 = require("./content_stage_object_identity_v1");
const v2_canonical_generation_plan_v2_1 = require("./v2_canonical_generation_plan_v2");
const v2_firebase_admin_repository_io_v1_1 = require("./v2_firebase_admin_repository_io_v1");
const v2_firebase_repository_persistence_v1_1 = require("./v2_firebase_repository_persistence_v1");
const v2_owner_authored_episode_input_v1_1 = require("./v2_owner_authored_episode_input_v1");
const v2_owner_authored_episode_input_v2_1 = require("./v2_owner_authored_episode_input_v2");
const v2_root_owner_identity_v1_1 = require("./v2_root_owner_identity_v1");
const v2_generation_stage_repository_v2_1 = require("./v2_generation_stage_repository_v2");
exports.V2_OWNER_EPISODE_STAGE_COLLECTION_V1 = v2_generation_stage_repository_v2_1.V2_GENERATION_STAGE_COLLECTION_V2;
exports.V2_OWNER_EPISODE_STAGE_SCHEMA_V1 = "v2-owner-authored-episode-stage.v1";
exports.V2_OWNER_EPISODE_STAGE_SCHEMA_V2 = "v2-owner-authored-episode-stage.v2";
const REQUEST_KEYS = ["planRequestRaw", "stageId", "ownerInputRaw"];
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseRequest(value) {
    if (!isRecord(value) ||
        Object.keys(value).length !== REQUEST_KEYS.length ||
        !REQUEST_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key)) ||
        typeof value.planRequestRaw !== "string" ||
        value.planRequestRaw.length < 1 ||
        value.planRequestRaw.length > 1024 * 1024 ||
        typeof value.stageId !== "string" ||
        !STAGE_ID_RE.test(value.stageId) ||
        typeof value.ownerInputRaw !== "string" ||
        value.ownerInputRaw.length < 1 ||
        value.ownerInputRaw.length > v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2) {
        fail("v2_owner_episode_stage_import_request_invalid");
    }
    return Object.freeze({
        planRequestRaw: value.planRequestRaw,
        stageId: value.stageId,
        ownerInputRaw: value.ownerInputRaw,
    });
}
function sha256(value) {
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
}
function materializeStage(summary, pin, planPin, actorUid, workspaceId, createdAt, artifactLeaseTokenHash) {
    const hasIntros = "introCount" in summary;
    return Object.freeze({
        schemaVersion: hasIntros
            ? exports.V2_OWNER_EPISODE_STAGE_SCHEMA_V2
            : exports.V2_OWNER_EPISODE_STAGE_SCHEMA_V1,
        stageId: summary.stageId,
        requestId: workspaceId,
        kind: "v2_activity_instances",
        scopeId: summary.episodeId,
        studyTarget: summary.targetLanguage,
        sourceLocale: "owner-authored",
        state: "needs_review",
        revision: summary.authoringRevision,
        artifactId: `artifact:${summary.stageId}`,
        artifactAttempt: 1,
        artifactLeaseTokenHash,
        objectPath: pin.objectPath,
        objectGeneration: pin.objectGeneration,
        contentHash: pin.contentHash,
        byteSize: pin.byteSize,
        contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        planRequestObjectPath: planPin.objectPath,
        planRequestObjectGeneration: planPin.objectGeneration,
        planRequestRawHash: planPin.contentHash,
        planRequestByteSize: planPin.byteSize,
        planRequestContentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentClass: summary.contentClass,
        ...(hasIntros
            ? {
                ownerInputSchemaVersion: v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
                introCount: 12,
                introQuestionCount: 36,
                introAggregateFingerprint: summary.introAggregateFingerprint,
            }
            : {}),
        ownerInputFingerprint: summary.inputFingerprint,
        activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
        planFingerprint: summary.planFingerprint,
        courseContractFingerprint: summary.courseContractFingerprint,
        qaReceipt: Object.freeze({
            status: "passed",
            policyVersion: "v2-owner-episode-import-v1",
            sessionCount: 12,
            taskCount: 144,
            ownerInputFingerprint: summary.inputFingerprint,
            activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
            validationAuthority: "structural_checks_only",
        }),
        createdBy: actorUid,
        createdAt,
        ownerAuthenticationAuthority: "firebase_auth_explicit_owner_role_and_server_configured_uid_hash",
        ownerInputOriginAuthority: "unverified_canonical_input_claim",
        artifactStorageEvidence: "exact_generation_matched_readback",
        repositoryAuthority: "none",
        humanApprovalAuthority: "none",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
}
async function importV2OwnerEpisodeStageV1(request, dependencies) {
    const actor = (dependencies.authenticateOwner ?? v2_root_owner_identity_v1_1.requireV2ConfiguredRootOwnerV1)(request.auth);
    const input = parseRequest(request.data);
    const resolved = dependencies.resolveOwnerInput(input);
    if (resolved.summary.stageId !== input.stageId ||
        resolved.raw !== input.ownerInputRaw ||
        resolved.planRequestRaw !== input.planRequestRaw) {
        fail("v2_owner_episode_stage_resolver_mismatch");
    }
    const artifactLeaseTokenHash = sha256(`v2-owner-episode-import-v1\n${resolved.summary.stageId}\n${resolved.summary.inputFingerprint}`);
    const objectPath = (0, content_stage_object_identity_v1_1.contentStageObjectPathFromHashV1)(resolved.summary.stageId, resolved.summary.authoringRevision, 1, artifactLeaseTokenHash);
    const planBytes = new TextEncoder().encode(resolved.planRequestRaw);
    const planRequestRawHash = sha256(resolved.planRequestRaw);
    const planPersisted = await (0, v2_firebase_repository_persistence_v1_1.persistV2ImmutableRepositoryObjectV1)({
        storage: dependencies.storage,
        objectPath: (0, content_stage_object_identity_v1_1.contentStagePlanObjectPathV1)(resolved.summary.stageId, planRequestRawHash),
        bytes: planBytes,
        maximumBytes: 1024 * 1024,
        contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: planRequestRawHash,
    });
    const bytes = new TextEncoder().encode(resolved.raw);
    const persisted = await (0, v2_firebase_repository_persistence_v1_1.persistV2ImmutableRepositoryObjectV1)({
        storage: dependencies.storage,
        objectPath,
        bytes,
        maximumBytes: v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
        contentType: v2_firebase_repository_persistence_v1_1.V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: sha256(resolved.raw),
    });
    const createdAt = dependencies.now();
    const document = materializeStage(resolved.summary, persisted.pin, planPersisted.pin, actor.actorUid, resolved.workspaceId, createdAt, artifactLeaseTokenHash);
    const auditId = sha256(`v2-owner-episode-stage-import-v1\n${document.stageId}\n${document.ownerInputFingerprint}`);
    const committed = await dependencies.stages.commitExact({
        stageId: document.stageId,
        document,
        auditId,
        audit: Object.freeze({
            schemaVersion: "admin-audit.v1",
            action: "learning_v2.owner_episode.import",
            actorUid: actor.actorUid,
            role: actor.role,
            entity: Object.freeze({
                collection: exports.V2_OWNER_EPISODE_STAGE_COLLECTION_V1,
                id: document.stageId,
            }),
            operationId: auditId,
            ownerInputFingerprint: document.ownerInputFingerprint,
            planFingerprint: document.planFingerprint,
            timestamp: createdAt,
        }),
    });
    return Object.freeze({
        ok: true,
        stageId: document.stageId,
        state: "needs_review",
        replayed: committed === "exact_replay",
        ownerInputFingerprint: document.ownerInputFingerprint,
        activityAssemblyFingerprint: document.activityAssemblyFingerprint,
        sessionCount: 12,
        taskCount: 144,
        humanApprovalAuthority: "none",
        releaseEligible: false,
        releaseAuthority: false,
    });
}
function firebaseStagePort(db) {
    const port = {
        async commitExact(input) {
            const stageRef = db
                .collection(exports.V2_OWNER_EPISODE_STAGE_COLLECTION_V1)
                .doc(input.stageId);
            const auditRef = db.collection("admin_log").doc(input.auditId);
            return db.runTransaction(async (transaction) => {
                const [stageSnapshot, auditSnapshot] = await Promise.all([
                    transaction.get(stageRef),
                    transaction.get(auditRef),
                ]);
                if (stageSnapshot.exists) {
                    const current = stageSnapshot.data() ?? {};
                    const reservedCanonicalStage = current.schemaVersion === "v2-generation-stage.v2" &&
                        current.stageId === input.document.stageId &&
                        current.kind === input.document.kind &&
                        current.state === "queued" &&
                        current.planFingerprint === input.document.planFingerprint &&
                        current.courseContractFingerprint ===
                            input.document.courseContractFingerprint &&
                        current.episodeId === input.document.scopeId &&
                        current.requestId === input.document.requestId &&
                        current.studyTarget === input.document.studyTarget &&
                        current.revision === input.document.revision;
                    if (reservedCanonicalStage && !auditSnapshot.exists) {
                        transaction.set(stageRef, input.document);
                        transaction.create(auditRef, input.audit);
                        return "materialized_reserved";
                    }
                    if (current.schemaVersion !== input.document.schemaVersion ||
                        current.ownerInputFingerprint !==
                            input.document.ownerInputFingerprint ||
                        current.planFingerprint !== input.document.planFingerprint ||
                        current.contentHash !== input.document.contentHash ||
                        current.objectGeneration !== input.document.objectGeneration ||
                        current.objectPath !== input.document.objectPath ||
                        current.planRequestObjectPath !==
                            input.document.planRequestObjectPath ||
                        current.planRequestObjectGeneration !==
                            input.document.planRequestObjectGeneration ||
                        current.planRequestRawHash !== input.document.planRequestRawHash ||
                        current.introCount !== input.document.introCount ||
                        current.introQuestionCount !== input.document.introQuestionCount ||
                        current.introAggregateFingerprint !==
                            input.document.introAggregateFingerprint ||
                        !auditSnapshot.exists) {
                        fail("v2_owner_episode_stage_commit_conflict");
                    }
                    return "exact_replay";
                }
                if (auditSnapshot.exists)
                    fail("v2_owner_episode_stage_commit_conflict");
                transaction.create(stageRef, input.document);
                transaction.create(auditRef, input.audit);
                return "created";
            });
        },
    };
    return Object.freeze(port);
}
function createFirebaseAdminV2OwnerEpisodeStageImporterV1() {
    const io = (0, v2_firebase_admin_repository_io_v1_1.createV2FirebaseAdminRepositoryIoV1)();
    const db = admin.firestore();
    const stages = firebaseStagePort(db);
    const importer = {
        import(request) {
            return importV2OwnerEpisodeStageV1(request, {
                storage: io.storage,
                stages,
                now: () => new Date().toISOString(),
                resolveOwnerInput(input) {
                    const plan = (0, v2_canonical_generation_plan_v2_1.buildV2CanonicalSeasonPlanV2)((0, v2_canonical_generation_plan_v2_1.parseV2CanonicalPlanRequestV2)(input.planRequestRaw));
                    let schemaVersion = "";
                    try {
                        const candidate = JSON.parse(input.ownerInputRaw);
                        schemaVersion = isRecord(candidate)
                            ? String(candidate.schemaVersion ?? "")
                            : "";
                    }
                    catch {
                        fail("v2_owner_episode_stage_import_request_invalid");
                    }
                    if (schemaVersion === v2_owner_authored_episode_input_v2_1.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2) {
                        const handle = (0, v2_owner_authored_episode_input_v2_1.parseV2OwnerAuthoredEpisodeInputV2)(input.ownerInputRaw, plan, input.stageId);
                        return Object.freeze({
                            summary: (0, v2_owner_authored_episode_input_v2_1.getV2OwnerAuthoredEpisodeInputSummaryV2)(handle),
                            raw: (0, v2_owner_authored_episode_input_v2_1.resolveV2OwnerAuthoredEpisodeInputMaterialV2)(handle).raw,
                            planRequestRaw: input.planRequestRaw,
                            workspaceId: plan.workspaceId,
                        });
                    }
                    const handle = (0, v2_owner_authored_episode_input_v1_1.parseV2OwnerAuthoredEpisodeInputV1)(input.ownerInputRaw, plan, input.stageId);
                    return Object.freeze({
                        summary: (0, v2_owner_authored_episode_input_v1_1.getV2OwnerAuthoredEpisodeInputSummaryV1)(handle),
                        raw: (0, v2_owner_authored_episode_input_v1_1.resolveV2OwnerAuthoredEpisodeInputMaterialV1)(handle).raw,
                        planRequestRaw: input.planRequestRaw,
                        workspaceId: plan.workspaceId,
                    });
                },
            });
        },
    };
    return Object.freeze(importer);
}
function callableError(error) {
    if (error instanceof https_1.HttpsError)
        return error;
    const message = error instanceof Error ? error.message : "";
    const safe = /^v2_owner_episode_[a-z0-9_]+$/u.test(message)
        ? message
        : "v2_owner_episode_stage_import_failed";
    return new https_1.HttpsError("failed-precondition", safe);
}
exports.adminImportV2OwnerEpisodeStage = (0, https_1.onCall)({ region: "us-central1", enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_ADMIN }, async (request) => {
    try {
        return await createFirebaseAdminV2OwnerEpisodeStageImporterV1().import(request);
    }
    catch (error) {
        throw callableError(error);
    }
});
//# sourceMappingURL=v2_owner_episode_stage_repository_v1.js.map