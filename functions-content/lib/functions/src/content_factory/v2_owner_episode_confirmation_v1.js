"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1 = exports.V2_OWNER_EPISODE_CONFIRMATION_SCHEMA_V1 = void 0;
exports.materializeV2OwnerEpisodeConfirmationV1 = materializeV2OwnerEpisodeConfirmationV1;
exports.isV2OwnerEpisodeConfirmationV1 = isV2OwnerEpisodeConfirmationV1;
exports.parseV2OwnerEpisodeConfirmationV1 = parseV2OwnerEpisodeConfirmationV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
exports.V2_OWNER_EPISODE_CONFIRMATION_SCHEMA_V1 = "v2-owner-episode-confirmation.v1";
exports.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1 = 64 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/u;
const handles = new WeakSet();
function fail() {
    throw new Error("v2_owner_episode_confirmation_invalid");
}
function exactReason(value) {
    if (typeof value !== "string" ||
        value.length < 5 ||
        value.length > 500 ||
        value !== value.trim() ||
        value.normalize("NFC") !== value ||
        /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(value))
        fail();
    return value;
}
function exactIso(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
        new Date(value).toISOString() !== value)
        fail();
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function materializeV2OwnerEpisodeConfirmationV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            [
                "activityAssemblyFingerprint",
                "confirmedAtIso",
                "contentClass",
                "courseContractFingerprint",
                "episodeId",
                "ownerIdentityFingerprint",
                "ownerInputFingerprint",
                "planFingerprint",
                "reason",
                "stageId",
                "stageReviewFingerprint",
            ]
                .sort()
                .join("|") ||
        input.contentClass !== "production_candidate" ||
        typeof input.stageId !== "string" ||
        !STAGE_ID_RE.test(input.stageId) ||
        typeof input.episodeId !== "string" ||
        !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(input.episodeId))
        fail();
    const body = Object.freeze({
        schemaVersion: exports.V2_OWNER_EPISODE_CONFIRMATION_SCHEMA_V1,
        planFingerprint: exactHash(input.planFingerprint),
        courseContractFingerprint: exactHash(input.courseContractFingerprint),
        stageId: input.stageId,
        episodeId: input.episodeId,
        ownerInputFingerprint: exactHash(input.ownerInputFingerprint),
        activityAssemblyFingerprint: exactHash(input.activityAssemblyFingerprint),
        stageReviewFingerprint: exactHash(input.stageReviewFingerprint),
        ownerIdentityFingerprint: exactHash(input.ownerIdentityFingerprint),
        confirmedAtIso: exactIso(input.confirmedAtIso),
        reason: exactReason(input.reason),
        contentClass: "production_candidate",
        confirmationMode: "single_owner_explicit_two_step_confirmation",
        planReadbackEvidence: "exact_generation_hash_size_content_type",
        ownerInputReadbackEvidence: "exact_generation_hash_size_content_type",
        ownerAuthenticationAuthority: "unverified_structural_claim_server_adapter_required",
        humanConfirmationAuthority: "unverified_structural_confirmation_claim",
        makerCheckerAuthority: "none_single_owner_mode",
        specialistEvidenceAuthority: "none",
        publicationDecisionAuthority: "none",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const result = Object.freeze({
        ...body,
        confirmationFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(result)) >
        exports.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1)
        fail();
    handles.add(result);
    return result;
}
function isV2OwnerEpisodeConfirmationV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function parseV2OwnerEpisodeConfirmationV1(raw, expected) {
    if (typeof raw !== "string" ||
        raw.length < 2 ||
        raw.length > exports.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1)
        fail();
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if ((0, decision_registry_1.canonicalJsonV1)(decoded) !== raw)
        fail();
    const rebuilt = materializeV2OwnerEpisodeConfirmationV1(expected);
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw)
        fail();
    return rebuilt;
}
//# sourceMappingURL=v2_owner_episode_confirmation_v1.js.map