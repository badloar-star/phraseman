"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1 = exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1 = void 0;
exports.materializeV2OwnerAuthoredEpisodeDraftV1 = materializeV2OwnerAuthoredEpisodeDraftV1;
exports.parseV2OwnerAuthoredEpisodeInputV1 = parseV2OwnerAuthoredEpisodeInputV1;
exports.isV2OwnerAuthoredEpisodeInputHandleV1 = isV2OwnerAuthoredEpisodeInputHandleV1;
exports.getV2OwnerAuthoredEpisodeInputSummaryV1 = getV2OwnerAuthoredEpisodeInputSummaryV1;
exports.resolveV2OwnerAuthoredEpisodeInputMaterialV1 = resolveV2OwnerAuthoredEpisodeInputMaterialV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_canonical_generation_plan_1 = require("./v2_canonical_generation_plan");
const v2_canonical_generation_plan_v2_1 = require("./v2_canonical_generation_plan_v2");
const v2_activity_session_projection_1 = require("./v2_activity_session_projection");
exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1 = "v2-owner-authored-episode-input.v1";
exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1 = 7 * 1024 * 1024;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const handles = new WeakSet();
const materials = new WeakMap();
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value);
    return (actual.length === keys.length && keys.every((key) => actual.includes(key)));
}
function preflightJson(root) {
    const stack = [
        { value: root, depth: 0 },
    ];
    let nodes = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || ++nodes > 200_000 || current.depth > 96)
            fail("v2_owner_episode_input_complexity_invalid");
        if (current.value && typeof current.value === "object") {
            for (const child of Object.values(current.value))
                stack.push({ value: child, depth: current.depth + 1 });
        }
    }
}
function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
/**
 * Builds the immutable owner-input envelope from the owner's twelve source
 * sessions. All plan identities and fingerprints are code-derived; the owner
 * never has to calculate or type cryptographic fields.
 */
function materializeV2OwnerAuthoredEpisodeDraftV1(input, plan) {
    if (!(0, v2_canonical_generation_plan_v2_1.isV2CanonicalSeasonPlanV2)(plan) ||
        !isRecord(input) ||
        !exactKeys(input, [
            "contentClass",
            "ownerInputId",
            "claimedAuthorId",
            "stageId",
            "sessionSources",
        ]) ||
        (input.contentClass !== "production_candidate" &&
            input.contentClass !== "neutral_test_fixture") ||
        !TOKEN_RE.test(input.ownerInputId) ||
        !TOKEN_RE.test(input.claimedAuthorId) ||
        typeof input.stageId !== "string" ||
        !Array.isArray(input.sessionSources) ||
        input.sessionSources.length !== 12)
        fail("v2_owner_episode_draft_input_invalid");
    const stage = plan.stages.find((candidate) => candidate.stageId === input.stageId);
    if (!stage || stage.kind !== "v2_activity_instances" || !stage.episodeId)
        fail("v2_owner_episode_draft_stage_invalid");
    const sessionSourceRaws = input.sessionSources.map((source) => {
        const raw = typeof source === "string"
            ? source
            : (0, decision_registry_1.canonicalJsonV1)(source);
        const parsed = (0, v2_activity_session_projection_1.parseV2ActivitySessionProjectionSource)(raw);
        return (0, decision_registry_1.canonicalJsonV1)(parsed);
    });
    const body = {
        schemaVersion: exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1,
        contentClass: input.contentClass,
        ownerInputId: input.ownerInputId,
        claimedAuthorId: input.claimedAuthorId,
        authoringRevision: plan.authoringRevision,
        planFingerprint: plan.planFingerprint,
        courseContractFingerprint: plan.courseContract.courseContractFingerprint,
        stageId: input.stageId,
        episodeId: stage.episodeId,
        targetLanguage: plan.targetLanguage,
        requiredInterfaceLocales: v2_canonical_generation_plan_1.V2_CANONICAL_INTERFACE_LOCALES,
        sessionSourceRaws,
        ownerInputOrigin: input.contentClass === "production_candidate"
            ? "owner_authored_import"
            : "neutral_test_fixture",
        ownerInputBytesOrigin: "caller_supplied_canonical_bytes",
        authorIdentityAuthority: "unverified_input_claim",
        repositoryAuthority: "none",
        humanApprovalAuthority: "none",
        generatorMutationPolicy: "owner_content_immutable",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    const raw = (0, decision_registry_1.canonicalJsonV1)({
        ...body,
        inputFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    const handle = parseV2OwnerAuthoredEpisodeInputV1(raw, plan, input.stageId);
    return resolveV2OwnerAuthoredEpisodeInputMaterialV1(handle);
}
const RAW_KEYS = [
    "schemaVersion",
    "contentClass",
    "ownerInputId",
    "claimedAuthorId",
    "authoringRevision",
    "planFingerprint",
    "courseContractFingerprint",
    "stageId",
    "episodeId",
    "targetLanguage",
    "requiredInterfaceLocales",
    "sessionSourceRaws",
    "ownerInputOrigin",
    "ownerInputBytesOrigin",
    "authorIdentityAuthority",
    "repositoryAuthority",
    "humanApprovalAuthority",
    "generatorMutationPolicy",
    "executionAuthority",
    "publicationPolicy",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "inputFingerprint",
];
function assertRaw(value) {
    if (!isRecord(value) || !exactKeys(value, RAW_KEYS))
        fail("v2_owner_episode_input_shape_invalid");
    if (value.schemaVersion !== exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1 ||
        (value.contentClass !== "production_candidate" &&
            value.contentClass !== "neutral_test_fixture") ||
        typeof value.ownerInputId !== "string" ||
        !TOKEN_RE.test(value.ownerInputId) ||
        typeof value.claimedAuthorId !== "string" ||
        !TOKEN_RE.test(value.claimedAuthorId) ||
        typeof value.authoringRevision !== "number" ||
        !Number.isSafeInteger(value.authoringRevision) ||
        value.authoringRevision < 1 ||
        typeof value.planFingerprint !== "string" ||
        !HASH_RE.test(value.planFingerprint) ||
        typeof value.courseContractFingerprint !== "string" ||
        !HASH_RE.test(value.courseContractFingerprint) ||
        typeof value.stageId !== "string" ||
        value.stageId.length > 256 ||
        typeof value.episodeId !== "string" ||
        !TOKEN_RE.test(value.episodeId) ||
        typeof value.targetLanguage !== "string" ||
        value.targetLanguage.length > 64 ||
        !Array.isArray(value.requiredInterfaceLocales) ||
        (0, decision_registry_1.canonicalJsonV1)(value.requiredInterfaceLocales) !==
            (0, decision_registry_1.canonicalJsonV1)(v2_canonical_generation_plan_1.V2_CANONICAL_INTERFACE_LOCALES) ||
        !Array.isArray(value.sessionSourceRaws) ||
        value.sessionSourceRaws.length !== 12 ||
        !value.sessionSourceRaws.every((entry) => typeof entry === "string") ||
        value.ownerInputBytesOrigin !== "caller_supplied_canonical_bytes" ||
        value.authorIdentityAuthority !== "unverified_input_claim" ||
        value.repositoryAuthority !== "none" ||
        value.humanApprovalAuthority !== "none" ||
        value.generatorMutationPolicy !== "owner_content_immutable" ||
        value.executionAuthority !== "none" ||
        value.publicationPolicy !== "draft_only_no_consumer" ||
        value.runtimeConsumer !== false ||
        value.releaseEligible !== false ||
        value.releaseAuthority !== false ||
        typeof value.inputFingerprint !== "string" ||
        !HASH_RE.test(value.inputFingerprint))
        fail("v2_owner_episode_input_value_invalid");
    const expectedOrigin = value.contentClass === "production_candidate"
        ? "owner_authored_import"
        : "neutral_test_fixture";
    if (value.ownerInputOrigin !== expectedOrigin)
        fail("v2_owner_episode_input_content_class_invalid");
}
function parseV2OwnerAuthoredEpisodeInputV1(raw, plan, stageId) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1)
        fail("v2_owner_episode_input_raw_invalid");
    if (!(0, v2_canonical_generation_plan_v2_1.isV2CanonicalSeasonPlanV2)(plan))
        fail("v2_owner_episode_input_plan_untrusted");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        fail("v2_owner_episode_input_json_invalid");
    }
    preflightJson(parsed);
    assertRaw(parsed);
    if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
        fail("v2_owner_episode_input_noncanonical");
    const { inputFingerprint: _ignored, ...body } = parsed;
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== parsed.inputFingerprint)
        fail("v2_owner_episode_input_fingerprint_invalid");
    const stage = plan.stages.find((candidate) => candidate.stageId === stageId);
    if (!stage ||
        stage.kind !== "v2_activity_instances" ||
        stage.episodeId !== parsed.episodeId ||
        stage.locale !== null ||
        parsed.stageId !== stageId ||
        parsed.planFingerprint !== plan.planFingerprint ||
        parsed.courseContractFingerprint !==
            plan.courseContract.courseContractFingerprint ||
        parsed.authoringRevision !== plan.authoringRevision ||
        parsed.targetLanguage !== plan.targetLanguage)
        fail("v2_owner_episode_input_plan_binding_invalid");
    const sources = parsed.sessionSourceRaws.map((sourceRaw) => (0, v2_activity_session_projection_1.parseV2ActivitySessionProjectionSource)(sourceRaw));
    const assembly = (0, v2_activity_session_projection_1.assembleV2ActivityEpisodeProjectionV1)(sources);
    if (assembly.episodeId !== parsed.episodeId ||
        assembly.targetLanguage !== parsed.targetLanguage)
        fail("v2_owner_episode_input_activity_binding_invalid");
    const sourceFingerprints = Object.freeze(sources.map((source) => (0, decision_registry_1.hashCanonicalBody)(source)));
    const summary = deepFreeze({
        schemaVersion: "v2-owner-authored-episode-input-summary.v1",
        contentClass: parsed.contentClass,
        ownerInputId: parsed.ownerInputId,
        planFingerprint: parsed.planFingerprint,
        courseContractFingerprint: parsed.courseContractFingerprint,
        stageId,
        episodeId: parsed.episodeId,
        targetLanguage: parsed.targetLanguage,
        authoringRevision: parsed.authoringRevision,
        sessionCount: 12,
        taskCount: 144,
        inputFingerprint: parsed.inputFingerprint,
        activityAssemblyFingerprint: assembly.assemblyFingerprint,
        sourceFingerprints,
        ownerInputOriginAuthority: "unverified_canonical_input_claim",
        interfaceLocalizationAuthority: "none",
        repositoryAuthority: "none",
        humanApprovalAuthority: "none",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        __brand: "V2OwnerAuthoredEpisodeInputHandleV1",
    });
    handles.add(handle);
    materials.set(handle, Object.freeze({ raw, summary, sources: Object.freeze(sources), assembly }));
    return handle;
}
function isV2OwnerAuthoredEpisodeInputHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getV2OwnerAuthoredEpisodeInputSummaryV1(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("v2_owner_episode_input_handle_invalid");
    return material.summary;
}
function resolveV2OwnerAuthoredEpisodeInputMaterialV1(handle) {
    const material = materials.get(handle);
    if (!material || !handles.has(handle))
        fail("v2_owner_episode_input_handle_invalid");
    return material;
}
//# sourceMappingURL=v2_owner_authored_episode_input_v1.js.map