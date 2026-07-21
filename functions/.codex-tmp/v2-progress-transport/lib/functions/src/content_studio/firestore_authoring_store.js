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
exports.decisionRegistryDocumentPath = exports.seasonPinCleanupAuditDocumentPath = exports.seasonLifecycleOperationDocumentPath = exports.episodeLifecycleOperationDocumentPath = exports.episodeLifecycleAuditDocumentPath = exports.episodeLifecycleDocumentPath = exports.contentGateOperationDocumentPath = exports.episodeReviewOperationDocumentPath = exports.episodeReviewReceiptDocumentPath = exports.modeTemplateLifecycleOperationDocumentPath = exports.modeTemplateLifecycleAuditDocumentPath = exports.modeTemplateLifecycleDocumentPath = exports.modeTemplateVersionDocumentPath = exports.episodeRevisionDocumentPath = exports.seasonDraftDocumentPath = exports.episodeDraftDocumentPath = void 0;
exports.createFirestoreModeTemplateResolver = createFirestoreModeTemplateResolver;
exports.createFirestoreEpisodeDraftStore = createFirestoreEpisodeDraftStore;
exports.createFirestoreSeasonDraftStore = createFirestoreSeasonDraftStore;
exports.createFirestoreEpisodeRevisionResolver = createFirestoreEpisodeRevisionResolver;
exports.createFirestoreDecisionRegistryResolver = createFirestoreDecisionRegistryResolver;
exports.createFirestoreModeTemplateLifecycleStore = createFirestoreModeTemplateLifecycleStore;
exports.createFirestoreEpisodeLifecycleStore = createFirestoreEpisodeLifecycleStore;
exports.createFirestoreSeasonLifecycleTransitionStore = createFirestoreSeasonLifecycleTransitionStore;
exports.createFirestoreEpisodeReviewStore = createFirestoreEpisodeReviewStore;
exports.createFirestoreContentGateIssueStore = createFirestoreContentGateIssueStore;
exports.createFirestoreEpisodeValidationStore = createFirestoreEpisodeValidationStore;
exports.createFirestoreEpisodeVoiceStore = createFirestoreEpisodeVoiceStore;
const admin = __importStar(require("firebase-admin"));
const season_draft_1 = require("../../../modules/learning-v2/authoring/season_draft");
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const episode_revision_resolver_1 = require("./episode_revision_resolver");
const immutable_object_reader_1 = require("./immutable_object_reader");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const decision_registry_2 = require("../../../modules/learning-v2/policies/decision_registry");
const decision_registry_3 = require("../../../modules/learning-v2/policies/decision_registry");
const decision_registry_4 = require("../../../modules/learning-v2/policies/decision_registry");
const season_revision_resolver_1 = require("./season_revision_resolver");
const season_pin_index_paths_1 = require("./season_pin_index_paths");
const season_pin_index_repository_1 = require("./season_pin_index_repository");
const season_revision_1 = require("../../../modules/learning-v2/authoring/season_revision");
const season_lifecycle_transition_repository_1 = require("./season_lifecycle_transition_repository");
const episodeDraftDocumentPath = (draftId) => `content_episode_drafts/${draftId}`;
exports.episodeDraftDocumentPath = episodeDraftDocumentPath;
const seasonDraftDocumentPath = (draftId) => `content_season_drafts/${draftId}`;
exports.seasonDraftDocumentPath = seasonDraftDocumentPath;
const episodeRevisionDocumentPath = (draftId, revision) => `content_episode_revisions/${draftId}__r${revision}`;
exports.episodeRevisionDocumentPath = episodeRevisionDocumentPath;
const modeTemplateVersionDocumentPath = (templateId, version) => `content_mode_template_versions/${templateId}__v${version}`;
exports.modeTemplateVersionDocumentPath = modeTemplateVersionDocumentPath;
const modeTemplateLifecycleDocumentPath = (templateId, version) => `content_mode_template_lifecycle/${templateId}__v${version}`;
exports.modeTemplateLifecycleDocumentPath = modeTemplateLifecycleDocumentPath;
const modeTemplateLifecycleAuditDocumentPath = (templateId, version, lifecycleRevision) => `content_mode_template_lifecycle_audit/${templateId}__v${version}__r${lifecycleRevision}`;
exports.modeTemplateLifecycleAuditDocumentPath = modeTemplateLifecycleAuditDocumentPath;
const modeTemplateLifecycleOperationDocumentPath = (operationId) => `content_mode_template_lifecycle_operations/${operationId}`;
exports.modeTemplateLifecycleOperationDocumentPath = modeTemplateLifecycleOperationDocumentPath;
const episodeReviewReceiptDocumentPath = (episodeId, revision, contentHash) => `content_studio_review_receipts/${episodeId}__r${revision}__${contentHash}`;
exports.episodeReviewReceiptDocumentPath = episodeReviewReceiptDocumentPath;
const episodeReviewOperationDocumentPath = (operationId) => `content_studio_episode_review_operations/${operationId}`;
exports.episodeReviewOperationDocumentPath = episodeReviewOperationDocumentPath;
const contentGateOperationDocumentPath = (operationId) => `content_studio_gate_operations/${operationId}`;
exports.contentGateOperationDocumentPath = contentGateOperationDocumentPath;
const episodeLifecycleDocumentPath = (ref) => `content_episode_lifecycle/${ref.draftId}__r${ref.revision}`;
exports.episodeLifecycleDocumentPath = episodeLifecycleDocumentPath;
const episodeLifecycleAuditDocumentPath = (ref, lifecycleRevision) => `content_episode_lifecycle_audit/${ref.draftId}__r${ref.revision}__lr${lifecycleRevision}`;
exports.episodeLifecycleAuditDocumentPath = episodeLifecycleAuditDocumentPath;
const episodeLifecycleOperationDocumentPath = (operationId) => `content_episode_lifecycle_operations/${operationId}`;
exports.episodeLifecycleOperationDocumentPath = episodeLifecycleOperationDocumentPath;
const seasonLifecycleOperationDocumentPath = (operationId) => `content_season_lifecycle_operations/${operationId}`;
exports.seasonLifecycleOperationDocumentPath = seasonLifecycleOperationDocumentPath;
const seasonPinCleanupAuditDocumentPath = (auditId) => `content_season_pin_cleanup_audits/${auditId}`;
exports.seasonPinCleanupAuditDocumentPath = seasonPinCleanupAuditDocumentPath;
function createFirestoreModeTemplateResolver(db, objectReader = {
    read: async (objectPath, expectedHash, expectedGeneration, expectedByteSize) => (0, immutable_object_reader_1.readImmutableCanonicalObject)(admin.storage().bucket().file(objectPath), {
        expectedHash,
        expectedGeneration,
        expectedByteSize,
    }),
}, options = {}) {
    return async (templateRef, context) => {
        if (typeof templateRef.templateId !== "string" ||
            !Number.isSafeInteger(templateRef.version) ||
            typeof templateRef.contentHash !== "string")
            return undefined;
        const versionPath = (0, exports.modeTemplateVersionDocumentPath)(templateRef.templateId, Number(templateRef.version));
        const snap = context
            ? await context.get(versionPath)
            : await db.doc(versionPath).get();
        if (!snap.exists)
            return undefined;
        const lifecyclePath = (0, exports.modeTemplateLifecycleDocumentPath)(templateRef.templateId, Number(templateRef.version));
        const lifecycleSnap = context
            ? await context.get(lifecyclePath)
            : await db.doc(lifecyclePath).get();
        if (!lifecycleSnap.exists)
            return undefined;
        const record = snap.data();
        const object = record.object;
        const recordKeys = Object.keys(record).sort();
        const objectKeys = object && typeof object === "object" ? Object.keys(object).sort() : [];
        const provenance = record.provenance;
        const provenanceKeys = provenance && typeof provenance === "object" ? Object.keys(provenance).sort() : [];
        if (recordKeys.join("|") !== "contentHash|createdAt|object|provenance|schemaVersion|templateId|version" ||
            objectKeys.join("|") !== "byteSize|contentHash|objectGeneration|objectPath" ||
            provenanceKeys.some((key) => !["createdAt", "createdBy", "basedOn", "generator"].includes(key)) ||
            !["createdAt", "createdBy"].every((key) => Object.prototype.hasOwnProperty.call(provenance ?? {}, key)) ||
            record.schemaVersion !== "v2-mode-template-record.v1" ||
            record.templateId !== templateRef.templateId ||
            record.version !== templateRef.version ||
            record.contentHash !== templateRef.contentHash ||
            !object ||
            object.objectPath !==
                `content-studio/mode-templates/${(0, decision_registry_3.sha256Utf8)(templateRef.templateId)}/v${templateRef.version}/${templateRef.contentHash}.json` ||
            object.contentHash !== templateRef.contentHash ||
            typeof object.objectGeneration !== "string" ||
            typeof object.byteSize !== "number" ||
            !Number.isSafeInteger(object.byteSize) ||
            object.byteSize < 1 ||
            typeof record.createdAt !== "string" ||
            record.createdAt.length === 0 ||
            !provenance ||
            typeof provenance.createdBy !== "string" ||
            provenance.createdBy.length === 0 ||
            typeof provenance.createdAt !== "string" ||
            provenance.createdAt.length === 0)
            return undefined;
        const basedOn = provenance.basedOn;
        const generator = provenance.generator;
        if ((basedOn !== undefined &&
            (!basedOn ||
                typeof basedOn !== "object" ||
                Array.isArray(basedOn) ||
                Object.keys(basedOn).sort().join("|") !== "contentHash|entityId|entityType|versionOrRevision" ||
                typeof basedOn.entityType !== "string" ||
                typeof basedOn.entityId !== "string" ||
                !Number.isSafeInteger(basedOn.versionOrRevision) ||
                typeof basedOn.contentHash !== "string" ||
                !/^[a-f0-9]{64}$/.test(basedOn.contentHash))) ||
            (generator !== undefined &&
                (!generator ||
                    typeof generator !== "object" ||
                    Array.isArray(generator) ||
                    Object.keys(generator).sort().join("|") !==
                        "artifactId|promptVersion|schemaVersion|stageId" ||
                    typeof generator.stageId !== "string" ||
                    typeof generator.artifactId !== "string" ||
                    typeof generator.promptVersion !== "string" ||
                    !Number.isSafeInteger(generator.schemaVersion))))
            return undefined;
        const lifecycle = lifecycleSnap.data();
        const lifecycleKeys = Object.keys(lifecycle ?? {}).sort();
        const replacementRef = lifecycle?.replacementRef;
        const replacementKeys = replacementRef && typeof replacementRef === "object"
            ? Object.keys(replacementRef).sort()
            : [];
        if (!lifecycle ||
            lifecycleKeys.some((key) => ![
                "schemaVersion",
                "templateId",
                "version",
                "contentHash",
                "status",
                "reason",
                "replacementRef",
                "noReplacement",
                "changedBy",
                "changedAt",
                "lifecycleRevision",
            ].includes(key)) ||
            ![
                "schemaVersion",
                "templateId",
                "version",
                "contentHash",
                "status",
                "reason",
                "changedBy",
                "changedAt",
                "lifecycleRevision",
            ].every((key) => Object.prototype.hasOwnProperty.call(lifecycle, key)) ||
            (Object.prototype.hasOwnProperty.call(lifecycle, "replacementRef") &&
                (replacementKeys.join("|") !== "contentHash|templateId|version" ||
                    typeof replacementRef?.templateId !== "string" ||
                    replacementRef.templateId.length === 0 ||
                    !Number.isSafeInteger(replacementRef?.version) ||
                    Number(replacementRef.version) < 1 ||
                    typeof replacementRef?.contentHash !== "string" ||
                    !/^[a-f0-9]{64}$/.test(String(replacementRef.contentHash)))) ||
            (Object.prototype.hasOwnProperty.call(lifecycle, "noReplacement") &&
                typeof lifecycle.noReplacement !== "boolean") ||
            lifecycle.schemaVersion !== "v2-mode-template-lifecycle.v1" ||
            lifecycle.templateId !== templateRef.templateId ||
            lifecycle.version !== templateRef.version ||
            lifecycle.contentHash !== templateRef.contentHash ||
            !["published", ...(options.allowDeprecated ? ["deprecated"] : [])].includes(String(lifecycle.status)) ||
            typeof lifecycle.reason !== "string" ||
            lifecycle.reason.length === 0 ||
            typeof lifecycle.changedBy !== "string" ||
            lifecycle.changedBy.length === 0 ||
            typeof lifecycle.changedAt !== "string" ||
            lifecycle.changedAt.length === 0 ||
            typeof lifecycle.lifecycleRevision !== "number" ||
            !Number.isSafeInteger(lifecycle.lifecycleRevision) ||
            lifecycle.lifecycleRevision < 1)
            return undefined;
        const hasReplacement = Object.prototype.hasOwnProperty.call(lifecycle, "replacementRef");
        const hasNoReplacement = Object.prototype.hasOwnProperty.call(lifecycle, "noReplacement");
        const noReplacement = lifecycle.noReplacement === true;
        if (lifecycle.status === "deprecated" &&
            hasReplacement === hasNoReplacement)
            return undefined;
        if (hasReplacement &&
            replacementRef?.templateId === templateRef.templateId &&
            replacementRef.version === templateRef.version &&
            replacementRef.contentHash === templateRef.contentHash)
            return undefined;
        if (lifecycle.status === "published" && (hasReplacement || hasNoReplacement))
            return undefined;
        if (!(0, validation_1.validateModeTemplateLifecycleHead)(lifecycle).ok)
            return undefined;
        const stored = await objectReader.read(String(object.objectPath), templateRef.contentHash, String(object.objectGeneration), Number(object.byteSize));
        if (stored.contentHash !== templateRef.contentHash ||
            stored.objectGeneration !== object.objectGeneration ||
            stored.byteSize !== object.byteSize)
            return undefined;
        const body = stored.body;
        if (!body ||
            body.schemaVersion !== "v2-mode-template-body.v1" ||
            body.templateId !== templateRef.templateId ||
            body.version !== templateRef.version ||
            body.kernel === undefined ||
            !body.authoring ||
            Object.keys(body.authoring).some((key) => ![
                "editableFieldPaths",
                "requiredFieldPaths",
                "defaultValues",
                "allowedOverridePaths",
            ].includes(key)) ||
            ![
                "editableFieldPaths",
                "requiredFieldPaths",
                "defaultValues",
                "allowedOverridePaths",
            ].every((key) => Object.prototype.hasOwnProperty.call(body.authoring, key)) ||
            !Array.isArray(body.authoring.editableFieldPaths) ||
            !Array.isArray(body.authoring.requiredFieldPaths) ||
            !Array.isArray(body.authoring.allowedOverridePaths) ||
            body.authoring.editableFieldPaths.some((path) => typeof path !== "string") ||
            body.authoring.requiredFieldPaths.some((path) => typeof path !== "string") ||
            body.authoring.allowedOverridePaths.some((path) => typeof path !== "string"))
            return undefined;
        if (!(0, validation_1.validateModeTemplateArtifactBody)(body).ok)
            return undefined;
        return {
            templateRef: {
                templateId: templateRef.templateId,
                version: templateRef.version,
                contentHash: templateRef.contentHash,
            },
            allowedOverridePaths: body.authoring.allowedOverridePaths,
        };
    };
}
const decisionRegistryDocumentPath = (id, version) => `content_decision_registries/${id}__v${version}`;
exports.decisionRegistryDocumentPath = decisionRegistryDocumentPath;
function createFirestoreEpisodeDraftStore(db) {
    return {
        runTransaction: (work) => db.runTransaction(async (transaction) => work(createEpisodeTransactionStore(db, transaction))),
        read: async (id) => {
            const snap = await db.doc((0, exports.episodeDraftDocumentPath)(id)).get();
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async () => {
            throw new Error("authoring_transaction_required");
        },
        createIfAbsent: async () => {
            throw new Error("authoring_transaction_required");
        },
    };
}
function createEpisodeTransactionStore(db, transaction) {
    return {
        runTransaction: async (work) => work(createEpisodeTransactionStore(db, transaction)),
        read: async (id) => {
            const snap = await transaction.get(db.doc((0, exports.episodeDraftDocumentPath)(id)));
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
            const ref = db.doc((0, exports.episodeDraftDocumentPath)(id));
            const snap = await transaction.get(ref);
            const current = snap.data();
            if (!current?.draft ||
                current.draft.record.revision !== expectedRevision ||
                current.draft.record.fingerprint !== expectedFingerprint)
                throw new Error("authoring_revision_stale");
            transaction.set(ref, {
                ...value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        },
        createIfAbsent: async (id, value) => {
            const ref = db.doc((0, exports.episodeDraftDocumentPath)(id));
            const snap = await transaction.get(ref);
            if (snap.exists)
                throw new Error("authoring_create_conflict");
            transaction.create(ref, {
                ...value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        },
    };
}
function createFirestoreSeasonDraftStore(db) {
    return {
        runTransaction: (work) => db.runTransaction(async (transaction) => work(createSeasonTransactionStore(db, transaction))),
        read: async (id) => {
            const snap = await db.doc((0, exports.seasonDraftDocumentPath)(id)).get();
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async () => {
            throw new Error("authoring_transaction_required");
        },
        createIfAbsent: async () => {
            throw new Error("authoring_transaction_required");
        },
    };
}
function createSeasonTransactionStore(db, transaction) {
    return {
        runTransaction: async (work) => work(createSeasonTransactionStore(db, transaction)),
        episodeRevisionReadContext: {
            get: (path) => transaction.get(db.doc(path)),
        },
        decisionRegistryReadContext: {
            get: (path) => transaction.get(db.doc(path)),
        },
        read: async (id) => {
            const snap = await transaction.get(db.doc((0, exports.seasonDraftDocumentPath)(id)));
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
            const ref = db.doc((0, exports.seasonDraftDocumentPath)(id));
            const snap = await transaction.get(ref);
            const current = snap.data();
            if (!current?.draft ||
                current.draft.record.revision !== expectedRevision ||
                current.draft.record.fingerprint !== expectedFingerprint)
                throw new Error("authoring_revision_stale");
            transaction.set(ref, {
                ...value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        },
        createIfAbsent: async (id, value) => {
            const ref = db.doc((0, exports.seasonDraftDocumentPath)(id));
            const snap = await transaction.get(ref);
            if (snap.exists)
                throw new Error("authoring_create_conflict");
            transaction.create(ref, {
                ...value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        },
    };
}
function createFirestoreEpisodeRevisionResolver(db, objectReader = {
    read: async (path, expectedHash, expectedGeneration, expectedByteSize) => {
        return (0, immutable_object_reader_1.readImmutableCanonicalObject)(admin.storage().bucket().file(path), {
            expectedHash,
            expectedGeneration,
            expectedByteSize,
        });
    },
}, resolveModeTemplate) {
    const resolveArtifact = async (ref, context) => {
        const snap = context
            ? await context.get((0, exports.episodeRevisionDocumentPath)(ref.draftId, ref.revision))
            : await db.doc((0, exports.episodeRevisionDocumentPath)(ref.draftId, ref.revision)).get();
        if (!snap.exists)
            return undefined;
        const envelope = snap.data();
        let record;
        let lifecycle;
        if ((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)(envelope)) {
            record = envelope.record;
            lifecycle = envelope.lifecycle;
        }
        else if ((0, episode_revision_resolver_1.validateEpisodeRevisionRecordOnly)(envelope)) {
            const lifecyclePath = `content_episode_lifecycle/${ref.draftId}__r${ref.revision}`;
            const lifecycleSnap = context ? await context.get(lifecyclePath) : await db.doc(lifecyclePath).get();
            const lifecycleValue = lifecycleSnap.data();
            if (!lifecycleSnap.exists || !(0, episode_revision_resolver_1.validateEpisodeLifecycleHead)(lifecycleValue?.lifecycle))
                throw new Error("season_episode_lifecycle_missing_or_invalid");
            record = envelope.record;
            lifecycle = lifecycleValue.lifecycle;
        }
        else
            throw new Error("season_episode_revision_record_invalid");
        const expectedPath = (0, episode_revision_resolver_1.episodeRevisionObjectPath)(ref.draftId, ref.revision, ref.contentHash);
        if (record.object.objectPath !== expectedPath)
            throw new Error("season_episode_object_path_invalid");
        const metadata = await objectReader.read(expectedPath, ref.contentHash, record.object.objectGeneration, record.object.byteSize);
        if (metadata.contentHash !== ref.contentHash || metadata.objectGeneration !== record.object.objectGeneration || metadata.byteSize !== record.object.byteSize || metadata.body === undefined)
            throw new Error("season_episode_object_generation_invalid");
        return { draftId: record.draftId, episodeId: record.episodeId, revision: record.revision, revisionFingerprint: record.revisionFingerprint, contentHash: record.contentHash, ordinal: ref.ordinal, chapterId: ref.chapterId, approvalStatus: lifecycle.status === "approved" ? "approved" : "draft", body: metadata.body, bodyHash: record.contentHash, objectPath: record.object.objectPath, objectGeneration: record.object.objectGeneration, record, lifecycle };
    };
    return {
        validateBody: episode_revision_resolver_1.validateEpisodeRevisionArtifactBody,
        resolveModeTemplate,
        resolve: resolveArtifact,
        resolveForAuthoring: resolveArtifact,
    };
}
function createFirestoreDecisionRegistryResolver(db, objectReader = {
    read: async (path, expectedHash, expectedGeneration, expectedByteSize) => (0, immutable_object_reader_1.readImmutableCanonicalObject)(admin.storage().bucket().file(path), {
        expectedHash,
        expectedGeneration,
        expectedByteSize,
    }),
}) {
    return {
        resolve: async (ref, context) => {
            const snap = context
                ? await context.get((0, exports.decisionRegistryDocumentPath)(ref.id, ref.version))
                : await db.doc((0, exports.decisionRegistryDocumentPath)(ref.id, ref.version)).get();
            if (!snap.exists)
                return undefined;
            const result = (0, decision_registry_2.validateDecisionRegistryRecord)(snap.data());
            if (!result.ok)
                throw new Error("season_decision_registry_invalid");
            if (result.value.ref.id !== ref.id ||
                result.value.ref.version !== ref.version ||
                result.value.ref.contentHash !== ref.contentHash)
                throw new Error("season_decision_registry_ref_mismatch");
            const object = result.value.object;
            if (object.objectPath !==
                (0, decision_registry_1.decisionRegistryObjectPath)(ref.id, ref.version, ref.contentHash))
                throw new Error("season_decision_registry_object_path_invalid");
            const stored = await objectReader.read(object.objectPath, ref.contentHash, object.objectGeneration, object.byteSize);
            if (stored.contentHash !== object.contentHash ||
                stored.objectGeneration !== object.objectGeneration ||
                stored.byteSize !== object.byteSize)
                throw new Error("season_decision_registry_object_metadata_invalid");
            const storedResult = (0, decision_registry_2.validateDecisionRegistry)({
                body: stored.body,
                record: result.value,
            });
            if (!storedResult.ok)
                throw new Error("season_decision_registry_object_invalid");
            return {
                ...storedResult.value.record,
                body: storedResult.value.body,
            };
        },
    };
}
/** Firestore transaction adapter for the guarded ModeTemplate lifecycle repository. */
function createFirestoreModeTemplateLifecycleStore(db) {
    const build = (transaction) => {
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : (await db.doc(path).get());
        const receiptReader = {
            get: async (collection, id) => {
                const snapshot = await get(`${collection}/${id}`);
                return snapshot.exists ? snapshot.data() : undefined;
            },
        };
        return {
            receiptReader,
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            readLifecycle: async (templateId, version) => {
                const snapshot = await get((0, exports.modeTemplateLifecycleDocumentPath)(templateId, version));
                if (!snapshot.exists)
                    return undefined;
                const result = (0, validation_1.validateModeTemplateLifecycleHead)(snapshot.data());
                if (!result.ok || result.value.templateId !== templateId || result.value.version !== version)
                    return undefined;
                return result.value;
            },
            readTemplateVersion: async (templateId, version) => {
                const snapshot = await get((0, exports.modeTemplateVersionDocumentPath)(templateId, version));
                if (!snapshot.exists)
                    return undefined;
                const data = snapshot.data();
                const object = data.object;
                const provenance = data.provenance;
                const expectedPath = `content-studio/mode-templates/${(0, decision_registry_3.sha256Utf8)(templateId)}/v${version}/${String(data.contentHash)}.json`;
                if (Object.keys(data).sort().join("|") !== "contentHash|createdAt|object|provenance|schemaVersion|templateId|version" ||
                    data.schemaVersion !== "v2-mode-template-record.v1" ||
                    data.templateId !== templateId ||
                    data.version !== version ||
                    typeof data.contentHash !== "string" ||
                    !/^[a-f0-9]{64}$/.test(data.contentHash) ||
                    !object ||
                    Object.keys(object).sort().join("|") !== "byteSize|contentHash|objectGeneration|objectPath" ||
                    object.objectPath !== expectedPath ||
                    object.contentHash !== data.contentHash ||
                    typeof object.objectGeneration !== "string" ||
                    object.objectGeneration.length === 0 ||
                    !Number.isSafeInteger(object.byteSize) ||
                    Number(object.byteSize) < 1 ||
                    !provenance ||
                    typeof provenance.createdBy !== "string" ||
                    provenance.createdBy.length === 0 ||
                    typeof provenance.createdAt !== "string" ||
                    provenance.createdAt.length === 0 ||
                    typeof data.createdAt !== "string" ||
                    data.createdAt.length === 0)
                    return undefined;
                return {
                    templateId: data.templateId,
                    version: Number(data.version),
                    contentHash: data.contentHash,
                };
            },
            hasUnsealedEpisodeDraftForTemplate: async (templateId, version, contentHash) => {
                const snapshots = transaction
                    ? await transaction.get(db.collection("content_episode_drafts"))
                    : await db.collection("content_episode_drafts").get();
                return snapshots.docs.some((snapshot) => {
                    const value = snapshot.data();
                    const record = value.record;
                    if (record?.status !== "draft")
                        return false;
                    const body = value.body;
                    const activities = Array.isArray(body?.activities) ? body.activities : [];
                    return activities.some((activity) => {
                        if (!activity || typeof activity !== "object")
                            return false;
                        const templateRef = activity.templateRef;
                        return !!templateRef && typeof templateRef === "object" &&
                            templateRef.templateId === templateId &&
                            templateRef.version === version &&
                            templateRef.contentHash === contentHash;
                    });
                });
            },
            compareAndSetLifecycle: async (templateId, version, expectedRevision, next) => {
                if (!transaction)
                    throw new Error("mode_template_transaction_required");
                const ref = db.doc((0, exports.modeTemplateLifecycleDocumentPath)(templateId, version));
                transaction.update(ref, next);
                void expectedRevision;
            },
            appendAudit: async (event) => {
                if (!transaction)
                    throw new Error("mode_template_transaction_required");
                const ref = db.doc((0, exports.modeTemplateLifecycleAuditDocumentPath)(event.templateId, event.version, event.lifecycleRevision));
                transaction.create(ref, {
                    schemaVersion: "v2-mode-template-lifecycle-audit.v1",
                    ...event,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            },
            readOperation: async (operationId) => {
                const snapshot = await get((0, exports.modeTemplateLifecycleOperationDocumentPath)(operationId));
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (!value || typeof value.requestFingerprint !== "string" || !value.lifecycle)
                    throw new Error("mode_template_idempotency_operation_invalid");
                const lifecycleResult = (0, validation_1.validateModeTemplateLifecycleHead)(value.lifecycle);
                if (!lifecycleResult.ok)
                    throw new Error("mode_template_idempotency_operation_invalid");
                return {
                    requestFingerprint: value.requestFingerprint,
                    lifecycle: lifecycleResult.value,
                };
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("mode_template_transaction_required");
                transaction.create(db.doc((0, exports.modeTemplateLifecycleOperationDocumentPath)(operationId)), value);
            },
        };
    };
    return build();
}
/** Firestore transaction adapter for the server-owned Episode lifecycle transition repository. */
function createFirestoreEpisodeLifecycleStore(db, options = {}) {
    const seasonObjectReader = options.seasonObjectReader ?? (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(admin.storage().bucket());
    const build = (transaction) => {
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
        const receiptReader = {
            get: async (collection, id) => { const snapshot = await get(`${collection}/${id}`); return snapshot.exists ? snapshot.data() : undefined; },
        };
        return {
            receiptReader,
            readReviewActor: async (receiptId) => {
                const snapshot = await get(`content_studio_review_receipts/${receiptId}`);
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                return typeof value.reviewerId === "string" ? value.reviewerId : undefined;
            },
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            readLifecycle: async (ref) => {
                const snapshot = await get((0, exports.episodeLifecycleDocumentPath)(ref));
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                return (0, episode_revision_resolver_1.validateEpisodeLifecycleHead)(value.lifecycle) ? value.lifecycle : undefined;
            },
            createLifecycle: async (ref, lifecycle) => {
                if (!transaction)
                    throw new Error("episode_lifecycle_transaction_required");
                transaction.create(db.doc((0, exports.episodeLifecycleDocumentPath)(ref)), { lifecycle });
            },
            compareAndSetLifecycle: async (ref, expectedRevision, next) => {
                if (!transaction)
                    throw new Error("episode_lifecycle_transaction_required");
                const doc = db.doc((0, exports.episodeLifecycleDocumentPath)(ref));
                const snapshot = await transaction.get(doc);
                const value = snapshot.exists ? snapshot.data() : undefined;
                const current = value?.lifecycle;
                if (!snapshot.exists || !(0, episode_revision_resolver_1.validateEpisodeLifecycleHead)(current) || current.lifecycleRevision !== expectedRevision) {
                    throw new Error("episode_lifecycle_stale");
                }
                transaction.update(doc, { lifecycle: next });
            },
            appendAudit: async (event) => {
                if (!transaction)
                    throw new Error("episode_lifecycle_transaction_required");
                transaction.create(db.doc((0, exports.episodeLifecycleAuditDocumentPath)(event.ref, event.lifecycleRevision)), { schemaVersion: "episode-lifecycle-audit.v1", ...event, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            },
            readOperation: async (operationId) => {
                const snapshot = await get((0, exports.episodeLifecycleOperationDocumentPath)(operationId));
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                const keys = Object.keys(value).sort();
                if (keys.join("|") !== "lifecycle|requestFingerprint" || typeof value.requestFingerprint !== "string" || !(0, episode_revision_resolver_1.validateEpisodeLifecycleHead)(value.lifecycle))
                    throw new Error("episode_lifecycle_operation_invalid");
                return { requestFingerprint: value.requestFingerprint, lifecycle: value.lifecycle };
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("episode_lifecycle_transaction_required");
                transaction.create(db.doc((0, exports.episodeLifecycleOperationDocumentPath)(operationId)), value);
            },
            hasActiveSeasonPin: async (ref) => {
                const indexedSnapshot = await get((0, season_pin_index_paths_1.seasonEpisodePinIndexDocumentPath)(ref));
                if (indexedSnapshot.exists) {
                    const indexed = indexedSnapshot.data();
                    if (!(0, season_pin_index_repository_1.validateSeasonPinIndexEntry)(indexed, ref))
                        return true;
                    const seasonRevisionId = typeof indexed.seasonRevisionId === "string" ? indexed.seasonRevisionId : "";
                    if (!seasonRevisionId)
                        return true;
                    try {
                        const resolved = await (0, season_revision_resolver_1.resolveImmutableSeasonRevision)({
                            revisionPath: `content_season_revisions/${seasonRevisionId}`,
                            lifecyclePath: `content_season_lifecycle/${seasonRevisionId}`,
                            objectReader: seasonObjectReader,
                            documentReader: { read: async (path) => { const document = await get(path); return { exists: document.exists, data: () => document.data() }; } },
                        });
                        if (resolved.record.revisionFingerprint !== indexed.seasonRevisionFingerprint)
                            return true;
                        if (resolved.lifecycle.status !== "approved")
                            return false;
                        const refs = Array.isArray(resolved.body.episodeRevisionRefs) ? resolved.body.episodeRevisionRefs : [];
                        return refs.some((item) => item && typeof item === "object" && item.episodeId === ref.episodeId && item.revision === ref.revision && item.revisionFingerprint === ref.revisionFingerprint && item.contentHash === ref.contentHash);
                    }
                    catch {
                        return true;
                    }
                }
                const snapshots = transaction ? await transaction.get(db.collection("content_season_revisions")) : await db.collection("content_season_revisions").get();
                for (const snapshot of snapshots.docs) {
                    const value = snapshot.data();
                    if (!Object.prototype.hasOwnProperty.call(value, "body") && value.record) {
                        try {
                            const resolved = await (0, season_revision_resolver_1.resolveImmutableSeasonRevision)({
                                revisionPath: `content_season_revisions/${snapshot.id}`,
                                lifecyclePath: `content_season_lifecycle/${snapshot.id}`,
                                objectReader: seasonObjectReader,
                                documentReader: { read: async (path) => { const document = await get(path); return { exists: document.exists, data: () => document.data() }; } },
                            });
                            if (resolved.lifecycle.status !== "approved")
                                continue;
                            const refs = Array.isArray(resolved.body.episodeRevisionRefs) ? resolved.body.episodeRevisionRefs : [];
                            if (refs.some((item) => item && typeof item === "object" && item.episodeId === ref.episodeId && item.revision === ref.revision && item.revisionFingerprint === ref.revisionFingerprint && item.contentHash === ref.contentHash))
                                return true;
                        }
                        catch {
                            // Fail closed for malformed/missing canonical Season objects.
                        }
                        continue;
                    }
                    const body = value.body;
                    const refs = Array.isArray(body?.episodeRevisionRefs) ? body.episodeRevisionRefs : [];
                    const candidate = refs.some((item) => item && typeof item === "object" && item.episodeId === ref.episodeId && item.revision === ref.revision && item.revisionFingerprint === ref.revisionFingerprint && item.contentHash === ref.contentHash);
                    if (!candidate)
                        continue;
                    const immutablePin = (0, season_draft_1.validateSeasonImmutablePin)({ body, record: value.record });
                    if (!immutablePin)
                        continue;
                    const lifecycleSnapshot = transaction ? await transaction.get(db.doc(`content_season_lifecycle/${snapshot.id}`)) : await db.doc(`content_season_lifecycle/${snapshot.id}`).get();
                    const lifecycle = lifecycleSnapshot.exists ? lifecycleSnapshot.data() : undefined;
                    const status = lifecycle?.status ?? lifecycle?.lifecycle?.status ?? value.lifecycle?.status ?? value.record?.status;
                    if (["approved", "released"].includes(String(status)))
                        return true;
                }
                return false;
            },
        };
    };
    return build();
}
/** Firestore transaction adapter for approved Season lifecycle and pin-index projection. */
function createFirestoreSeasonLifecycleTransitionStore(db) {
    const seasonObjectReader = (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(admin.storage().bucket());
    const build = (transaction) => {
        let observedLifecycleRevision;
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
        return {
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            readLifecycle: async (seasonRevisionId) => {
                const snapshot = await get(`content_season_lifecycle/${seasonRevisionId}`);
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (!(0, season_revision_1.validateSeasonLifecycleHead)(value))
                    throw new Error("season_lifecycle_head_invalid");
                observedLifecycleRevision = value.lifecycleRevision;
                return value;
            },
            compareAndSetLifecycle: async (seasonRevisionId, expectedRevision, next) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                const doc = db.doc(`content_season_lifecycle/${seasonRevisionId}`);
                if (observedLifecycleRevision === undefined)
                    throw new Error("season_lifecycle_cas_unobserved");
                if (observedLifecycleRevision !== expectedRevision || !(0, season_revision_1.validateSeasonLifecycleHead)(next))
                    throw new Error("season_lifecycle_cas_mismatch");
                transaction.update(doc, next);
            },
            writePinIndex: async (_seasonRevisionId, entries) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                for (const entry of entries)
                    transaction.set(db.doc(entry.documentPath), entry);
            },
            clearPinIndex: async (seasonRevisionId) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                const snapshots = await transaction.get(db.collection("content_season_episode_pins").where("seasonRevisionId", "==", seasonRevisionId));
                for (const snapshot of snapshots.docs)
                    transaction.delete(snapshot.ref);
            },
            clearPinIndexForSeason: async (seasonId, keepSeasonRevisionId) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                const snapshots = await transaction.get(db.collection("content_season_episode_pins"));
                const deletions = [];
                for (const snapshot of snapshots.docs) {
                    const value = snapshot.data();
                    if (value.seasonRevisionId === keepSeasonRevisionId)
                        continue;
                    if (typeof value.seasonRevisionId !== "string")
                        continue;
                    const lifecycle = await transaction.get(db.doc(`content_season_lifecycle/${value.seasonRevisionId}`));
                    const lifecycleValue = lifecycle.exists ? lifecycle.data() : undefined;
                    if (lifecycleValue?.seasonId === seasonId)
                        deletions.push(snapshot.ref);
                }
                for (const reference of deletions)
                    transaction.delete(reference);
            },
            writePinCleanupAudit: async (entry) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                transaction.create(db.doc((0, exports.seasonPinCleanupAuditDocumentPath)(entry.auditId)), { schemaVersion: "season-pin-cleanup-audit.v1", ...entry, createdAt: new Date().toISOString() });
            },
            writeApprovalReceipt: async (receipt) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                transaction.create(db.doc(`content_studio_season_approval_receipts/${receipt.receiptId}`), receipt);
            },
            readOperation: async (operationId) => {
                const snapshot = await get((0, exports.seasonLifecycleOperationDocumentPath)(operationId));
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (!(0, season_lifecycle_transition_repository_1.validateSeasonLifecycleOperationEnvelope)(value) || !(0, season_revision_1.validateSeasonLifecycleHead)(value.lifecycle))
                    throw new Error("season_lifecycle_operation_invalid");
                return value;
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("season_lifecycle_transaction_required");
                transaction.create(db.doc((0, exports.seasonLifecycleOperationDocumentPath)(operationId)), value);
            },
            readRevision: async (seasonRevisionId) => (0, season_revision_resolver_1.resolveImmutableSeasonRevision)({
                revisionPath: `content_season_revisions/${seasonRevisionId}`,
                lifecyclePath: `content_season_lifecycle/${seasonRevisionId}`,
                objectReader: seasonObjectReader,
                documentReader: { read: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } },
            }),
        };
    };
    return build();
}
/** Firestore adapter for the server-owned Episode semantic review receipt. */
function createFirestoreEpisodeReviewStore(db, resolver) {
    const build = (transaction) => {
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
        return {
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            readArtifact: async (ref) => (resolver.resolveForAuthoring ?? resolver.resolve)(ref),
            readReceipt: async (receiptId) => {
                const snapshot = await get(`content_studio_review_receipts/${receiptId}`);
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (typeof value.receiptHash !== "string" || typeof value.reviewerId !== "string" || !value.subject || !["approved", "changes_requested"].includes(String(value.status)))
                    throw new Error("episode_review_receipt_invalid");
                return value;
            },
            writeReceipt: async (receiptId, receipt) => {
                if (!transaction)
                    throw new Error("episode_review_transaction_required");
                transaction.create(db.doc(`content_studio_review_receipts/${receiptId}`), receipt);
            },
            readOperation: async (operationId) => {
                const snapshot = await get((0, exports.episodeReviewOperationDocumentPath)(operationId));
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (typeof value.requestFingerprint !== "string" || !value.receipt)
                    throw new Error("episode_review_operation_invalid");
                return value;
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("episode_review_transaction_required");
                transaction.create(db.doc((0, exports.episodeReviewOperationDocumentPath)(operationId)), value);
            },
        };
    };
    return build();
}
function createFirestoreContentGateIssueStore(db, objectWriter) {
    const build = (transaction) => {
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
        return {
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            objectWriter: objectWriter ?? {
                write: async (path, body) => {
                    const bytes = Buffer.from((0, decision_registry_4.canonicalJsonV1)(body), "utf8");
                    const file = admin.storage().bucket().file(path);
                    await file.save(bytes, { resumable: false, metadata: { contentType: "application/json", metadata: { contentHash: (0, decision_registry_4.hashCanonicalBody)(body) } } });
                    const [metadata] = await file.getMetadata();
                    return { objectGeneration: String(metadata.generation ?? ""), byteSize: bytes.byteLength, contentHash: (0, decision_registry_4.hashCanonicalBody)(body) };
                },
            },
            receiptReader: {
                get: async (collection, id) => {
                    const snapshot = await get(`${collection}/${id}`);
                    return snapshot.exists ? snapshot.data() : undefined;
                },
            },
            writeGate: async (gateId, body, record) => {
                if (!transaction)
                    throw new Error("content_gate_transaction_required");
                transaction.create(db.doc(`content_studio_gate_receipts/${gateId}`), { body, ...(record ? { record } : {}) });
            },
            readOperation: async (operationId) => {
                const snapshot = await get((0, exports.contentGateOperationDocumentPath)(operationId));
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (typeof value.requestFingerprint !== "string" || !value.body)
                    throw new Error("content_gate_operation_invalid");
                return value;
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("content_gate_transaction_required");
                transaction.create(db.doc((0, exports.contentGateOperationDocumentPath)(operationId)), value);
            },
        };
    };
    return build();
}
function createFirestoreEpisodeValidationStore(db, resolver, options = {}) {
    const receiptCollection = options.receiptCollection ?? "content_studio_validation_receipts";
    const operationCollection = options.operationCollection ?? "content_studio_episode_validation_operations";
    const build = (transaction) => {
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
        return {
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            readArtifact: async (ref) => (resolver.resolveForAuthoring ?? resolver.resolve)(ref),
            writeReceipt: async (receiptId, receipt) => {
                if (!transaction)
                    throw new Error("episode_validation_transaction_required");
                transaction.create(db.doc(`${receiptCollection}/${receiptId}`), receipt);
            },
            readOperation: async (operationId) => {
                const snapshot = await get(`${operationCollection}/${operationId}`);
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (typeof value.requestFingerprint !== "string" || !value.receipt)
                    throw new Error("episode_validation_operation_invalid");
                return value;
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("episode_validation_transaction_required");
                transaction.create(db.doc(`${operationCollection}/${operationId}`), value);
            },
        };
    };
    return build();
}
function createFirestoreEpisodeVoiceStore(db, resolver) {
    const build = (transaction) => {
        const get = async (path) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
        return {
            runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
            readArtifact: async (ref) => (resolver.resolveForAuthoring ?? resolver.resolve)(ref),
            writeReceipt: async (receiptId, receipt) => {
                if (!transaction)
                    throw new Error("episode_voice_transaction_required");
                transaction.create(db.doc(`content_studio_voice_receipts/${receiptId}`), receipt);
            },
            readOperation: async (operationId) => {
                const snapshot = await get(`content_studio_episode_voice_operations/${operationId}`);
                if (!snapshot.exists)
                    return undefined;
                const value = snapshot.data();
                if (typeof value.requestFingerprint !== "string" || !value.receipt)
                    throw new Error("episode_voice_operation_invalid");
                return value;
            },
            createOperation: async (operationId, value) => {
                if (!transaction)
                    throw new Error("episode_voice_transaction_required");
                transaction.create(db.doc(`content_studio_episode_voice_operations/${operationId}`), value);
            },
        };
    };
    return build();
}
