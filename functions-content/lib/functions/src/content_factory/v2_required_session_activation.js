"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2SeasonReleaseManifestDocumentId = exports.v2SeasonReleasePointerDocumentId = exports.v2SeasonReleasePointerId = void 0;
exports.activateRequiredSessionRelease = activateRequiredSessionRelease;
exports.activateStoredRequiredSessionRelease = activateStoredRequiredSessionRelease;
exports.createFirestoreV2SeasonReleasePointerStore = createFirestoreV2SeasonReleasePointerStore;
exports.createFirestoreV2CourseCatalogReader = createFirestoreV2CourseCatalogReader;
exports.createFirestoreV2SeasonReleaseManifestStore = createFirestoreV2SeasonReleaseManifestStore;
exports.createProductionRequiredSessionActivationDependencies = createProductionRequiredSessionActivationDependencies;
const wallet_1 = require("../../../modules/learning-v2/contracts/wallet");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_release_adapter_1 = require("./v2_release_adapter");
const v2_required_session_publication_1 = require("./v2_required_session_publication");
const firestore_authoring_store_1 = require("../content_studio/firestore_authoring_store");
const season_revision_resolver_1 = require("../content_studio/season_revision_resolver");
const immutable_object_reader_1 = require("../content_studio/immutable_object_reader");
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const v2SeasonReleasePointerId = (environment, studyTarget, learnerSourceLocale, seasonId) => {
    const id = `${environment}:${studyTarget}:${learnerSourceLocale}:${seasonId}`;
    if (!SAFE_ID.test(id))
        throw new Error("v2_required_session_activation_invalid");
    return id;
};
exports.v2SeasonReleasePointerId = v2SeasonReleasePointerId;
const v2SeasonReleasePointerDocumentId = (pointerId) => {
    if (!SAFE_ID.test(pointerId))
        throw new Error("v2_required_session_activation_invalid");
    return `v2srp_${(0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-season-release-pointer-document-key.v1",
        pointerId,
    })}`;
};
exports.v2SeasonReleasePointerDocumentId = v2SeasonReleasePointerDocumentId;
const v2SeasonReleaseManifestDocumentId = (releaseId) => {
    if (!SAFE_ID.test(releaseId))
        throw new Error("v2_required_session_activation_invalid");
    return `v2srm_${(0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-season-release-manifest-document-key.v1",
        releaseId,
    })}`;
};
exports.v2SeasonReleaseManifestDocumentId = v2SeasonReleaseManifestDocumentId;
const detach = (value) => (0, wallet_1.detachBoundedWalletJson)(value, "v2_required_session_activation_invalid");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, required, optional = []) => {
    if (!isRecord(value))
        return false;
    const keys = Object.keys(value);
    return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
        keys.every((key) => required.includes(key) || optional.includes(key));
};
const POINTER_KEYS = [
    "schemaVersion", "pointerId", "environment", "studyTarget",
    "learnerSourceLocale", "seasonId", "activeReleaseId", "activeManifestHash",
    "rollout", "expectedCatalogRevision", "updatedBy", "updatedAt",
];
const ROLLOUT_KEYS = [
    "revision", "state", "percent", "cohortSaltVersion",
    "allowlistCohortIds", "excludeCohortIds",
];
const MANIFEST_KEYS = [
    "schemaVersion", "releaseId", "courseReleaseId", "seasonId",
    "seasonRevision", "seasonContentHash", "studyTarget", "learnerSourceLocale",
    "releaseScope", "decisionRegistryRef", "supportManifestRefs",
    "voiceNetworkEgressRefs", "lessonUnits",
];
const RECORD_KEYS = [
    "schemaVersion", "releaseId", "seasonId", "manifestHash", "object", "createdAt",
];
const OBJECT_REF_KEYS = ["path", "generation", "contentHash", "byteSize"];
const VERSION_REF_KEYS = ["id", "version", "contentHash"];
const SUPPORT_REF_KEYS = [
    "platform", "environment", "minAppVersion", "manifestId", "contentHash",
];
const assertExactManifestShape = (recordValue, bodyValue) => {
    const record = detach(recordValue);
    const body = detach(bodyValue);
    if (!exactKeys(record, RECORD_KEYS) ||
        !exactKeys(record.object, OBJECT_REF_KEYS) ||
        !exactKeys(body, MANIFEST_KEYS) ||
        !exactKeys(body.decisionRegistryRef, VERSION_REF_KEYS) ||
        !Array.isArray(body.supportManifestRefs) ||
        body.supportManifestRefs.some((ref) => !exactKeys(ref, SUPPORT_REF_KEYS)) ||
        !Array.isArray(body.voiceNetworkEgressRefs) ||
        body.voiceNetworkEgressRefs.some((ref) => !exactKeys(ref, VERSION_REF_KEYS)) ||
        !Array.isArray(body.lessonUnits) ||
        body.lessonUnits.some((unit) => !exactKeys(unit, ["episodeId", "lessonId", "object"]) ||
            !exactKeys(unit.object, OBJECT_REF_KEYS)))
        throw new Error("v2_required_session_activation_invalid");
    return { record, body };
};
const parsePointer = (value, environment) => {
    try {
        const stable = detach(value);
        if (!exactKeys(stable, POINTER_KEYS, ["previousReleaseId"]) ||
            !exactKeys(stable.rollout, ROLLOUT_KEYS, ["healthReceiptHash", "pauseReason"]))
            throw new Error("v2_required_session_activation_invalid");
        return (0, v2_release_adapter_1.assertV2SeasonReleasePointer)(stable, environment);
    }
    catch {
        throw new Error("v2_required_session_activation_invalid");
    }
};
const exactPointer = (left, right) => {
    try {
        return (0, decision_registry_1.hashCanonicalBody)(detach(left)) === (0, decision_registry_1.hashCanonicalBody)(detach(right));
    }
    catch {
        return false;
    }
};
const assertActivationTransition = (next, current, input) => {
    if (next.pointerId !== (0, exports.v2SeasonReleasePointerId)(next.environment, next.studyTarget, next.learnerSourceLocale, next.seasonId) ||
        next.rollout.state !== "internal" ||
        next.rollout.percent !== 0 ||
        input.expectedCurrentRolloutRevision !== (current?.rollout.revision ?? 0) ||
        input.expectedCurrentReleaseId !== (current?.activeReleaseId ?? null))
        throw new Error("v2_required_session_activation_conflict");
    if (!current) {
        if (next.rollout.revision !== 1 || next.previousReleaseId !== undefined) {
            throw new Error("v2_required_session_activation_invalid");
        }
        return;
    }
    if (current.pointerId !== next.pointerId ||
        current.environment !== next.environment ||
        current.studyTarget !== next.studyTarget ||
        current.learnerSourceLocale !== next.learnerSourceLocale ||
        current.seasonId !== next.seasonId ||
        current.activeReleaseId === next.activeReleaseId ||
        next.previousReleaseId !== current.activeReleaseId ||
        next.rollout.revision !== current.rollout.revision + 1)
        throw new Error("v2_required_session_activation_invalid");
};
const assertReleaseUnitSet = (releaseScope, units) => {
    const expected = releaseScope === "vertical_slice" ? 1 : releaseScope === "chapter_internal" ? 8 : 32;
    if (units.length !== expected ||
        new Set(units.map((unit) => unit.episodeId)).size !== units.length ||
        new Set(units.map((unit) => unit.lessonId)).size !== units.length)
        throw new Error("v2_required_session_activation_unit_set_invalid");
};
/**
 * Stages every exact required-session publication before a single pointer CAS.
 * This function is server coordination, not an admin/client authorization seam.
 */
async function activateRequiredSessionRelease(input, dependencies) {
    if (!Number.isSafeInteger(input.expectedCurrentRolloutRevision) ||
        input.expectedCurrentRolloutRevision < 0 ||
        (input.expectedCurrentReleaseId !== null && !SAFE_ID.test(input.expectedCurrentReleaseId)))
        throw new Error("v2_required_session_activation_invalid");
    const next = parsePointer(input.nextPointer, input.expectedEnvironment);
    const exactManifest = assertExactManifestShape(input.manifestRecord, input.manifestBody);
    const release = (0, v2_release_adapter_1.resolveV2ReleaseManifest)(next, exactManifest.record, exactManifest.body, input.expectedEnvironment);
    if (input.expectedEnvironment === "production" && release.body.releaseScope !== "full_season") {
        throw new Error("v2_required_session_activation_scope_not_production_ready");
    }
    assertReleaseUnitSet(release.body.releaseScope, release.body.lessonUnits);
    if (release.body.supportManifestRefs.some((ref) => ref.environment !== next.environment)) {
        throw new Error("v2_required_session_activation_support_environment_mismatch");
    }
    const catalog = await dependencies.courseCatalog.read(release.body.studyTarget, release.body.learnerSourceLocale);
    if (!Number.isSafeInteger(catalog.revision) ||
        catalog.revision < 1 ||
        catalog.revision !== next.expectedCatalogRevision ||
        catalog.activeReleaseId !== release.body.courseReleaseId)
        throw new Error("v2_required_session_activation_catalog_mismatch");
    const currentValue = await dependencies.pointerStore.read(next.pointerId);
    const current = currentValue === undefined
        ? undefined
        : parsePointer(currentValue, input.expectedEnvironment);
    const alreadyCurrent = current !== undefined && exactPointer(current, next);
    if (!alreadyCurrent)
        assertActivationTransition(next, current, input);
    const publish = dependencies.publishSessionSet ?? v2_required_session_publication_1.publishRequiredSessionSetFromApprovedRelease;
    const publishedEpisodeIds = [];
    for (const unit of release.body.lessonUnits) {
        await publish({
            expectedEnvironment: input.expectedEnvironment,
            activePointer: next,
            manifestRecord: release.record,
            manifestBody: release.body,
            seasonRevisionId: input.seasonRevisionId,
            episodeId: unit.episodeId,
        }, dependencies);
        publishedEpisodeIds.push(unit.episodeId);
    }
    if (alreadyCurrent) {
        return Object.freeze({
            status: "replayed",
            pointer: next,
            publishedEpisodeIds: Object.freeze(publishedEpisodeIds),
        });
    }
    let outcome;
    try {
        outcome = await dependencies.pointerStore.compareAndSet(next.pointerId, current, next);
    }
    catch {
        const observed = await dependencies.pointerStore.read(next.pointerId);
        if (observed !== undefined && exactPointer(observed, next))
            outcome = "committed";
        else
            throw new Error("v2_required_session_activation_indeterminate");
    }
    const observed = await dependencies.pointerStore.read(next.pointerId);
    if (observed !== undefined && exactPointer(observed, next)) {
        return Object.freeze({
            status: outcome === "conflict" ? "replayed" : "activated",
            pointer: next,
            publishedEpisodeIds: Object.freeze(publishedEpisodeIds),
        });
    }
    if (outcome === "conflict")
        throw new Error("v2_required_session_activation_conflict");
    throw new Error("v2_required_session_activation_indeterminate");
}
/** Production entry: manifest bytes come only from the server-owned store. */
async function activateStoredRequiredSessionRelease(input, dependencies) {
    if (!SAFE_ID.test(input.releaseId)) {
        throw new Error("v2_required_session_activation_invalid");
    }
    const manifest = await dependencies.manifestStore.resolve(input.releaseId);
    if (manifest.record.releaseId !== input.releaseId ||
        manifest.body.releaseId !== input.releaseId)
        throw new Error("v2_required_session_activation_manifest_mismatch");
    return activateRequiredSessionRelease({
        expectedEnvironment: input.expectedEnvironment,
        nextPointer: input.nextPointer,
        manifestRecord: manifest.record,
        manifestBody: manifest.body,
        seasonRevisionId: input.seasonRevisionId,
        expectedCurrentRolloutRevision: input.expectedCurrentRolloutRevision,
        expectedCurrentReleaseId: input.expectedCurrentReleaseId,
    }, dependencies);
}
function createFirestoreV2SeasonReleasePointerStore(db) {
    const refFor = (pointerId) => db.collection("content_v2_season_release_pointers").doc((0, exports.v2SeasonReleasePointerDocumentId)(pointerId));
    return {
        read: async (pointerId) => {
            const snapshot = await refFor(pointerId).get();
            return snapshot.exists ? snapshot.data() : undefined;
        },
        compareAndSet: async (pointerId, expected, next) => db.runTransaction(async (transaction) => {
            const ref = refFor(pointerId);
            const snapshot = await transaction.get(ref);
            const current = snapshot.exists ? snapshot.data() : undefined;
            if ((expected === undefined && current !== undefined) ||
                (expected !== undefined && (current === undefined || !exactPointer(current, expected))))
                return "conflict";
            transaction.set(ref, next, { merge: false });
            return "committed";
        }),
    };
}
function createFirestoreV2CourseCatalogReader(db) {
    return {
        read: async (studyTarget, learnerSourceLocale) => {
            const catalogId = `${studyTarget}:${learnerSourceLocale}`;
            if (!SAFE_ID.test(catalogId))
                throw new Error("v2_required_session_activation_invalid");
            const snapshot = await db.collection("content_factory_catalog").doc(catalogId).get();
            const data = snapshot.data();
            const active = isRecord(data?.activeRelease) ? data.activeRelease : undefined;
            if (!snapshot.exists ||
                !Number.isSafeInteger(data?.revision) ||
                Number(data?.revision) < 1 ||
                typeof active?.releaseId !== "string" ||
                !SAFE_ID.test(active.releaseId) ||
                active.studyTarget !== studyTarget ||
                active.learnerSourceLocale !== learnerSourceLocale)
                throw new Error("v2_required_session_activation_catalog_mismatch");
            return Object.freeze({
                revision: Number(data?.revision),
                activeReleaseId: active.releaseId,
            });
        },
    };
}
function createFirestoreV2SeasonReleaseManifestStore(db, bucket) {
    return {
        resolve: async (releaseId) => {
            if (!SAFE_ID.test(releaseId))
                throw new Error("v2_required_session_activation_invalid");
            const snapshot = await db.collection("content_v2_season_release_manifests")
                .doc((0, exports.v2SeasonReleaseManifestDocumentId)(releaseId)).get();
            if (!snapshot.exists)
                throw new Error("v2_required_session_activation_manifest_missing");
            const recordValue = detach(snapshot.data());
            if (!exactKeys(recordValue, RECORD_KEYS) || !exactKeys(recordValue.object, OBJECT_REF_KEYS)) {
                throw new Error("v2_required_session_activation_manifest_invalid");
            }
            const object = recordValue.object;
            const resolved = await (0, immutable_object_reader_1.readImmutableCanonicalObject)(bucket.file(object.path), {
                expectedHash: object.contentHash,
                expectedGeneration: object.generation,
                expectedByteSize: object.byteSize,
            });
            const exact = assertExactManifestShape(recordValue, resolved.body);
            const body = (0, v2_release_adapter_1.assertV2SeasonReleaseManifestBody)(exact.body);
            const record = exact.record;
            if (record.releaseId !== releaseId ||
                body.releaseId !== releaseId ||
                record.seasonId !== body.seasonId ||
                record.manifestHash !== (0, v2_release_adapter_1.v2ManifestHash)(body) ||
                record.object.contentHash !== record.manifestHash)
                throw new Error("v2_required_session_activation_manifest_mismatch");
            return Object.freeze({ record, body });
        },
    };
}
/** Builds the complete production resolver/storage graph without client data. */
function createProductionRequiredSessionActivationDependencies(db, bucket) {
    const immutableReader = {
        read: async (path, expectedHash, expectedGeneration, expectedByteSize) => (0, immutable_object_reader_1.readImmutableCanonicalObject)(bucket.file(path), {
            expectedHash,
            expectedGeneration,
            expectedByteSize,
        }),
    };
    const episodeResolver = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, immutableReader, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db, undefined, { allowDeprecated: true }));
    const seasonObjectReader = immutableReader;
    return {
        episodeResolver,
        resolveSeasonRevision: async (seasonRevisionId) => (0, season_revision_resolver_1.resolveImmutableSeasonRevision)({
            revisionPath: `content_season_revisions/${seasonRevisionId}`,
            lifecyclePath: `content_season_lifecycle/${seasonRevisionId}`,
            objectReader: seasonObjectReader,
            documentReader: {
                read: async (path) => {
                    const snapshot = await db.doc(path).get();
                    return { exists: snapshot.exists, data: () => snapshot.data() };
                },
            },
        }),
        resolveCompiledLessonUnit: async (ref) => {
            const resolved = await (0, immutable_object_reader_1.readImmutableCanonicalObject)(bucket.file(ref.path), {
                expectedHash: ref.contentHash,
                expectedGeneration: ref.generation,
                expectedByteSize: ref.byteSize,
            });
            return {
                body: resolved.body,
                contentHash: resolved.contentHash,
                generation: resolved.objectGeneration,
                byteSize: resolved.byteSize,
            };
        },
        publicationStore: (0, v2_required_session_publication_1.createFirestoreRequiredSessionPublicationStore)(db),
        answerManifestStore: (0, v2_required_session_publication_1.createFirestoreRequiredSessionAnswerManifestStore)(db),
        pointerStore: createFirestoreV2SeasonReleasePointerStore(db),
        courseCatalog: createFirestoreV2CourseCatalogReader(db),
        manifestStore: createFirestoreV2SeasonReleaseManifestStore(db, bucket),
    };
}
//# sourceMappingURL=v2_required_session_activation.js.map