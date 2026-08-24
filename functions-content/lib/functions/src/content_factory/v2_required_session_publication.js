"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredSessionCourseIdForTarget = exports.requiredSessionSetId = exports.publishedRequiredSessionAnswerManifestDocumentId = exports.publishedRequiredSessionSetDocumentId = void 0;
exports.materializeSessionSetFromCompiledArtifact = materializeSessionSetFromCompiledArtifact;
exports.publishRequiredSessionSetFromApprovedRelease = publishRequiredSessionSetFromApprovedRelease;
exports.createFirestoreRequiredSessionPublicationStore = createFirestoreRequiredSessionPublicationStore;
exports.createFirestoreRequiredSessionAnswerManifestStore = createFirestoreRequiredSessionAnswerManifestStore;
const required_session_progress_1 = require("../../../modules/learning-v2/contracts/required_session_progress");
const session_1 = require("../../../modules/learning-v2/contracts/session");
const v2_release_adapter_1 = require("./v2_release_adapter");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const episode_revision_resolver_1 = require("../content_studio/episode_revision_resolver");
const required_session_answer_verifier_1 = require("../learning_v2/required_session_answer_verifier");
const required_session_release_identity_1 = require("../../../modules/learning-v2/contracts/required_session_release_identity");
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const HASH = /^[a-f0-9]{64}$/;
const publishedRequiredSessionSetDocumentId = (sessionSetId) => {
    if (typeof sessionSetId !== "string" || !SAFE_ID.test(sessionSetId)) {
        throw new Error("required_session_publication_identity_invalid");
    }
    return `rssv1_${(0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-required-session-set-document-key.v1",
        sessionSetId,
    })}`;
};
exports.publishedRequiredSessionSetDocumentId = publishedRequiredSessionSetDocumentId;
const publishedRequiredSessionAnswerManifestDocumentId = (sessionSetId) => {
    if (typeof sessionSetId !== "string" || !SAFE_ID.test(sessionSetId)) {
        throw new Error("required_session_publication_identity_invalid");
    }
    return `rsav1_${(0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-required-session-answer-manifest-document-key.v1",
        sessionSetId,
    })}`;
};
exports.publishedRequiredSessionAnswerManifestDocumentId = publishedRequiredSessionAnswerManifestDocumentId;
var required_session_release_identity_2 = require("../../../modules/learning-v2/contracts/required_session_release_identity");
Object.defineProperty(exports, "requiredSessionSetId", { enumerable: true, get: function () { return required_session_release_identity_2.requiredSessionSetId; } });
// Пилот пока имеет ровно один owner-approved course identity. Новые targets
// добавляются явным versioned catalog, а не формулой из client locale.
const requiredSessionCourseIdForTarget = (studyTarget) => {
    if (studyTarget === "en")
        return "english-core";
    throw new Error("required_session_course_catalog_missing");
};
exports.requiredSessionCourseIdForTarget = requiredSessionCourseIdForTarget;
function materializeSessionSetFromCompiledArtifact(compiled, version) {
    if (!compiled ||
        compiled.schemaVersion !== "v2-compiled-episode-content.v2" ||
        !SAFE_ID.test(compiled.episodeId) ||
        !Array.isArray(compiled.sessions) ||
        !Array.isArray(compiled.optionalPracticeTemplates) ||
        !compiled.qualityReport ||
        compiled.qualityReport.ok !== true ||
        !Number.isSafeInteger(version) ||
        version < 1)
        throw new Error("required_session_compiled_artifact_invalid");
    const candidate = {
        schemaVersion: "v2-session-set.v2",
        episodeId: compiled.episodeId,
        version,
        sessions: compiled.sessions.map(({ support: _derivedSupport, ...session }) => session),
        optionalPracticeSlots: compiled.optionalPracticeTemplates,
    };
    const validated = (0, session_1.validateV2SessionSet)(candidate);
    if (!validated.ok || validated.value.schemaVersion !== "v2-session-set.v2") {
        throw new Error("required_session_compiled_artifact_invalid");
    }
    return validated.value;
}
const exactEpisodeRef = (left, right) => left.draftId === right.draftId &&
    left.episodeId === right.episodeId &&
    left.revision === right.revision &&
    left.revisionFingerprint === right.revisionFingerprint &&
    left.contentHash === right.contentHash &&
    left.ordinal === right.ordinal &&
    left.chapterId === right.chapterId &&
    right.approvalStatus === "approved";
const episodeRefFromSeason = (season, episodeId) => {
    const body = season.body;
    const refs = body?.episodeRevisionRefs;
    if (!Array.isArray(refs))
        throw new Error("required_session_season_invalid");
    const matches = refs.filter((ref) => ref?.episodeId === episodeId);
    if (matches.length !== 1 || matches[0].approvalStatus !== "approved") {
        throw new Error("required_session_episode_pin_invalid");
    }
    return matches[0];
};
const assertSeasonMatchesRelease = (release, season) => {
    if (season.lifecycle?.status !== "approved" ||
        season.record?.seasonId !== release.body.seasonId ||
        season.record?.revision !== release.body.seasonRevision ||
        season.record?.contentHash !== release.body.seasonContentHash ||
        season.lifecycle.revision !== season.record.revision ||
        season.lifecycle.revisionFingerprint !== season.record.revisionFingerprint)
        throw new Error("required_session_release_season_mismatch");
};
const sessionSetRefFromEpisode = (episode) => {
    const body = episode.body;
    const ref = body?.sessionSetRef;
    if (!ref ||
        typeof ref !== "object" ||
        Array.isArray(ref) ||
        Object.keys(ref).length !== 3 ||
        !["episodeId", "version", "contentHash"].every((key) => Object.prototype.hasOwnProperty.call(ref, key)) ||
        ref.episodeId !== episode.episodeId ||
        !Number.isSafeInteger(ref.version) ||
        ref.version < 1 ||
        typeof ref.contentHash !== "string" ||
        !HASH.test(ref.contentHash))
        throw new Error("required_session_episode_session_set_ref_invalid");
    return ref;
};
async function publishRequiredSessionSetFromApprovedRelease(input, dependencies) {
    if (!SAFE_ID.test(input.seasonRevisionId) || !SAFE_ID.test(input.episodeId)) {
        throw new Error("required_session_publication_identity_invalid");
    }
    const release = (0, v2_release_adapter_1.resolveV2ReleaseManifest)(input.activePointer, input.manifestRecord, input.manifestBody, input.expectedEnvironment);
    const season = await dependencies.resolveSeasonRevision(input.seasonRevisionId);
    assertSeasonMatchesRelease(release, season);
    const episodeRef = episodeRefFromSeason(season, input.episodeId);
    const episode = await (0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)(dependencies.episodeResolver, episodeRef);
    if (!exactEpisodeRef(episodeRef, episode) || episode.bodyHash !== episode.contentHash) {
        throw new Error("required_session_episode_revision_mismatch");
    }
    const releaseUnits = release.body.lessonUnits.filter((unit) => unit.episodeId === input.episodeId);
    if (releaseUnits.length !== 1 || releaseUnits[0].lessonId !== episode.ordinal) {
        throw new Error("required_session_release_unit_mismatch");
    }
    const unitRef = releaseUnits[0].object;
    const resolvedUnit = await dependencies.resolveCompiledLessonUnit(unitRef);
    if (resolvedUnit.contentHash !== unitRef.contentHash ||
        resolvedUnit.generation !== unitRef.generation ||
        resolvedUnit.byteSize !== unitRef.byteSize ||
        (0, decision_registry_1.hashCanonicalBody)(resolvedUnit.body) !== unitRef.contentHash ||
        resolvedUnit.body.episodeId !== episode.episodeId)
        throw new Error("required_session_release_unit_mismatch");
    const sessionSetRef = sessionSetRefFromEpisode(episode);
    const sessionSet = materializeSessionSetFromCompiledArtifact(resolvedUnit.body, sessionSetRef.version);
    const sessionSetHash = (0, decision_registry_1.hashCanonicalBody)(sessionSet);
    if (sessionSetHash !== sessionSetRef.contentHash) {
        throw new Error("required_session_episode_session_set_ref_mismatch");
    }
    const publication = (0, required_session_progress_1.createPublishedRequiredSessionSet)({
        schemaVersion: "learning-v2-published-required-session-set.v2",
        courseId: (0, exports.requiredSessionCourseIdForTarget)(release.body.studyTarget),
        studyTarget: release.body.studyTarget,
        courseReleaseId: release.body.courseReleaseId,
        seasonRevisionId: input.seasonRevisionId,
        episodeRevisionFingerprint: episode.revisionFingerprint,
        episodeContentHash: episode.contentHash,
        sessionSetId: (0, required_session_release_identity_1.requiredSessionSetId)(episode.episodeId, sessionSet.version),
        sessionSetHash,
        sessionSet,
        episodeOrdinal: episode.ordinal,
    });
    if (publication.schemaVersion !== "learning-v2-published-required-session-set.v2") {
        throw new Error("required_session_publication_invalid");
    }
    const documentId = (0, exports.publishedRequiredSessionSetDocumentId)(publication.sessionSetId);
    const answerManifest = (0, required_session_answer_verifier_1.createPublishedRequiredSessionAnswerManifest)({
        schemaVersion: "learning-v2-published-required-session-answer-manifest.v1",
        courseId: publication.courseId,
        studyTarget: publication.studyTarget,
        courseReleaseId: publication.courseReleaseId,
        seasonRevisionId: publication.seasonRevisionId,
        episodeRevisionFingerprint: publication.episodeRevisionFingerprint,
        episodeContentHash: publication.episodeContentHash,
        sessionSetId: publication.sessionSetId,
        sessionSetHash: publication.sessionSetHash,
        answerKeys: resolvedUnit.body.requiredTaskAnswerKeys,
    });
    const answerManifestDocumentId = (0, exports.publishedRequiredSessionAnswerManifestDocumentId)(publication.sessionSetId);
    const write = await dependencies.publicationStore.putIfAbsent(documentId, publication);
    const answerWrite = await dependencies.answerManifestStore.putIfAbsent(answerManifestDocumentId, answerManifest);
    let persistedPublication = publication;
    if (write.status === "existing") {
        const existing = (0, required_session_progress_1.parsePublishedRequiredSessionSet)(write.value);
        if (existing.schemaVersion !== "learning-v2-published-required-session-set.v2" ||
            existing.publicationFingerprint !== publication.publicationFingerprint) {
            throw new Error("required_session_publication_conflict");
        }
        persistedPublication = existing;
    }
    let persistedAnswerManifest = answerManifest;
    if (answerWrite.status === "existing") {
        const existing = (0, required_session_answer_verifier_1.parsePublishedRequiredSessionAnswerManifest)(answerWrite.value);
        if (existing.manifestFingerprint !== answerManifest.manifestFingerprint) {
            throw new Error("required_session_answer_manifest_conflict");
        }
        persistedAnswerManifest = existing;
    }
    return Object.freeze({
        status: write.status === "existing" && answerWrite.status === "existing"
            ? "replayed"
            : "published",
        documentId,
        publication: persistedPublication,
        answerManifestDocumentId,
        answerManifest: persistedAnswerManifest,
    });
}
function createFirestoreRequiredSessionPublicationStore(db) {
    return {
        putIfAbsent: async (documentId, publication) => db.runTransaction(async (transaction) => {
            const ref = db.collection("content_v2_required_session_sets").doc(documentId);
            const snapshot = await transaction.get(ref);
            if (snapshot.exists)
                return { status: "existing", value: snapshot.data() };
            transaction.create(ref, publication);
            return { status: "created" };
        }),
    };
}
function createFirestoreRequiredSessionAnswerManifestStore(db) {
    return {
        putIfAbsent: async (documentId, manifest) => db.runTransaction(async (transaction) => {
            const ref = db.collection("content_v2_required_session_answer_manifests").doc(documentId);
            const snapshot = await transaction.get(ref);
            if (snapshot.exists)
                return { status: "existing", value: snapshot.data() };
            transaction.create(ref, manifest);
            return { status: "created" };
        }),
    };
}
//# sourceMappingURL=v2_required_session_publication.js.map