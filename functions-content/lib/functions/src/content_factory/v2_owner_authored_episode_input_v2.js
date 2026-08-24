"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2 = exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2 = void 0;
exports.materializeV2OwnerAuthoredEpisodeDraftV2 = materializeV2OwnerAuthoredEpisodeDraftV2;
exports.parseV2OwnerAuthoredEpisodeInputV2 = parseV2OwnerAuthoredEpisodeInputV2;
exports.isV2OwnerAuthoredEpisodeInputHandleV2 = isV2OwnerAuthoredEpisodeInputHandleV2;
exports.getV2OwnerAuthoredEpisodeInputSummaryV2 = getV2OwnerAuthoredEpisodeInputSummaryV2;
exports.resolveV2OwnerAuthoredEpisodeInputMaterialV2 = resolveV2OwnerAuthoredEpisodeInputMaterialV2;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_canonical_generation_plan_1 = require("./v2_canonical_generation_plan");
const v2_canonical_generation_plan_v2_1 = require("./v2_canonical_generation_plan_v2");
const v2_activity_session_projection_1 = require("./v2_activity_session_projection");
const v2_owner_authored_session_intro_v1_1 = require("./v2_owner_authored_session_intro_v1");
exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2 = "v2-owner-authored-episode-input.v2";
exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2 = 8 * 1024 * 1024;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const handles = new WeakSet();
const materials = new WeakMap();
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
    "sessionIntroRaws",
    "introAggregateFingerprint",
    "ownerInputOrigin",
    "ownerInputBytesOrigin",
    "authorIdentityAuthority",
    "introContentAuthority",
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
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return (actual.length === expected.length &&
        actual.every((key, index) => key === expected[index]));
}
function preflightJson(root) {
    const stack = [
        { value: root, depth: 0 },
    ];
    let nodes = 0;
    while (stack.length) {
        const current = stack.pop();
        if (!current || ++nodes > 240_000 || current.depth > 96)
            fail("v2_owner_episode_input_v2_complexity_invalid");
        if (current.value && typeof current.value === "object") {
            Object.values(current.value).forEach((value) => stack.push({ value, depth: current.depth + 1 }));
        }
        else if (typeof current.value === "number" &&
            (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value))))
            fail("v2_owner_episode_input_v2_complexity_invalid");
    }
}
function trustedSource(source) {
    try {
        return (0, v2_activity_session_projection_1.parseV2ActivitySessionProjectionSource)((0, decision_registry_1.canonicalJsonV1)(source));
    }
    catch {
        fail("v2_owner_episode_input_v2_source_invalid");
    }
}
function bindIntro(source, draft) {
    const material = (0, v2_owner_authored_session_intro_v1_1.materializeV2OwnerAuthoredSessionIntroV1)(draft, source);
    return { source: material.source, intro: material };
}
function assertRaw(value) {
    if (!isRecord(value) || !exactKeys(value, RAW_KEYS))
        fail("v2_owner_episode_input_v2_shape_invalid");
    if (value.schemaVersion !== exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2 ||
        (value.contentClass !== "production_candidate" &&
            value.contentClass !== "neutral_test_fixture") ||
        typeof value.ownerInputId !== "string" ||
        !TOKEN_RE.test(value.ownerInputId) ||
        typeof value.claimedAuthorId !== "string" ||
        !TOKEN_RE.test(value.claimedAuthorId) ||
        !Number.isSafeInteger(value.authoringRevision) ||
        Number(value.authoringRevision) < 1 ||
        typeof value.planFingerprint !== "string" ||
        !HASH_RE.test(value.planFingerprint) ||
        typeof value.courseContractFingerprint !== "string" ||
        !HASH_RE.test(value.courseContractFingerprint) ||
        typeof value.stageId !== "string" ||
        typeof value.episodeId !== "string" ||
        !TOKEN_RE.test(value.episodeId) ||
        typeof value.targetLanguage !== "string" ||
        (0, decision_registry_1.canonicalJsonV1)(value.requiredInterfaceLocales) !==
            (0, decision_registry_1.canonicalJsonV1)(v2_canonical_generation_plan_1.V2_CANONICAL_INTERFACE_LOCALES) ||
        !Array.isArray(value.sessionSourceRaws) ||
        value.sessionSourceRaws.length !== 12 ||
        !value.sessionSourceRaws.every((entry) => typeof entry === "string") ||
        !Array.isArray(value.sessionIntroRaws) ||
        value.sessionIntroRaws.length !== 12 ||
        !value.sessionIntroRaws.every((entry) => typeof entry === "string") ||
        typeof value.introAggregateFingerprint !== "string" ||
        !HASH_RE.test(value.introAggregateFingerprint) ||
        value.ownerInputBytesOrigin !== "caller_supplied_canonical_bytes" ||
        value.authorIdentityAuthority !== "unverified_input_claim" ||
        value.introContentAuthority !== "unverified_owner_input_claim" ||
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
        fail("v2_owner_episode_input_v2_value_invalid");
    const expectedOrigin = value.contentClass === "production_candidate"
        ? "owner_authored_import"
        : "neutral_test_fixture";
    if (value.ownerInputOrigin !== expectedOrigin)
        fail("v2_owner_episode_input_v2_content_class_invalid");
}
function materializeV2OwnerAuthoredEpisodeDraftV2(input, plan) {
    if (!(0, v2_canonical_generation_plan_v2_1.isV2CanonicalSeasonPlanV2)(plan) ||
        !isRecord(input) ||
        !exactKeys(input, [
            "contentClass",
            "ownerInputId",
            "claimedAuthorId",
            "stageId",
            "sessionSources",
            "sessionIntros",
        ]) ||
        (input.contentClass !== "production_candidate" &&
            input.contentClass !== "neutral_test_fixture") ||
        !TOKEN_RE.test(input.ownerInputId) ||
        !TOKEN_RE.test(input.claimedAuthorId) ||
        !Array.isArray(input.sessionSources) ||
        input.sessionSources.length !== 12 ||
        !Array.isArray(input.sessionIntros) ||
        input.sessionIntros.length !== 12)
        fail("v2_owner_episode_input_v2_draft_invalid");
    const stage = plan.stages.find((candidate) => candidate.stageId === input.stageId);
    if (!stage || stage.kind !== "v2_activity_instances" || !stage.episodeId)
        fail("v2_owner_episode_input_v2_stage_invalid");
    const bound = input.sessionSources.map((source, index) => bindIntro(trustedSource(source), input.sessionIntros[index]));
    const sources = bound.map((entry) => entry.source);
    const intros = bound.map((entry) => entry.intro);
    const sessionSourceRaws = sources.map(decision_registry_1.canonicalJsonV1);
    const sessionIntroRaws = intros.map((intro) => intro.raw);
    const introAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)(intros.map((intro) => intro.summary.introFingerprint));
    const body = {
        schemaVersion: exports.V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
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
        sessionIntroRaws,
        introAggregateFingerprint,
        ownerInputOrigin: input.contentClass === "production_candidate"
            ? "owner_authored_import"
            : "neutral_test_fixture",
        ownerInputBytesOrigin: "caller_supplied_canonical_bytes",
        authorIdentityAuthority: "unverified_input_claim",
        introContentAuthority: "unverified_owner_input_claim",
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
    return resolveV2OwnerAuthoredEpisodeInputMaterialV2(parseV2OwnerAuthoredEpisodeInputV2(raw, plan, input.stageId));
}
function parseV2OwnerAuthoredEpisodeInputV2(raw, plan, stageId) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2)
        fail("v2_owner_episode_input_v2_raw_invalid");
    if (!(0, v2_canonical_generation_plan_v2_1.isV2CanonicalSeasonPlanV2)(plan))
        fail("v2_owner_episode_input_v2_plan_untrusted");
    let candidate;
    try {
        candidate = JSON.parse(raw);
    }
    catch {
        fail("v2_owner_episode_input_v2_json_invalid");
    }
    preflightJson(candidate);
    assertRaw(candidate);
    if ((0, decision_registry_1.canonicalJsonV1)(candidate) !== raw)
        fail("v2_owner_episode_input_v2_noncanonical");
    const { inputFingerprint: _ignored, ...body } = candidate;
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== candidate.inputFingerprint)
        fail("v2_owner_episode_input_v2_fingerprint_invalid");
    const stage = plan.stages.find((item) => item.stageId === stageId);
    if (!stage ||
        stage.kind !== "v2_activity_instances" ||
        stage.episodeId !== candidate.episodeId ||
        stage.locale !== null ||
        candidate.stageId !== stageId ||
        candidate.planFingerprint !== plan.planFingerprint ||
        candidate.courseContractFingerprint !==
            plan.courseContract.courseContractFingerprint ||
        candidate.authoringRevision !== plan.authoringRevision ||
        candidate.targetLanguage !== plan.targetLanguage)
        fail("v2_owner_episode_input_v2_plan_binding_invalid");
    const sources = candidate.sessionSourceRaws.map((sourceRaw) => (0, v2_activity_session_projection_1.parseV2ActivitySessionProjectionSource)(sourceRaw));
    const intros = candidate.sessionIntroRaws.map((introRaw, index) => {
        const handle = (0, v2_owner_authored_session_intro_v1_1.parseV2OwnerAuthoredSessionIntroV1)(introRaw, sources[index]);
        return (0, v2_owner_authored_session_intro_v1_1.resolveV2OwnerAuthoredSessionIntroMaterialV1)(handle);
    });
    if (sources.some((source, index) => source.session.ordinal !== index + 1) ||
        intros.some((intro, index) => intro.summary.sessionOrdinal !== index + 1 ||
            intro.summary.contentClass !== candidate.contentClass))
        fail("v2_owner_episode_input_v2_intro_binding_invalid");
    const introFingerprints = intros.map((intro) => intro.summary.introFingerprint);
    if ((0, decision_registry_1.hashCanonicalBody)(introFingerprints) !== candidate.introAggregateFingerprint)
        fail("v2_owner_episode_input_v2_intro_aggregate_invalid");
    const assembly = (0, v2_activity_session_projection_1.assembleV2ActivityEpisodeProjectionV1)(sources);
    if (assembly.episodeId !== candidate.episodeId ||
        assembly.targetLanguage !== candidate.targetLanguage)
        fail("v2_owner_episode_input_v2_activity_binding_invalid");
    const summary = Object.freeze({
        schemaVersion: "v2-owner-authored-episode-input-summary.v2",
        contentClass: candidate.contentClass,
        ownerInputId: candidate.ownerInputId,
        planFingerprint: candidate.planFingerprint,
        courseContractFingerprint: candidate.courseContractFingerprint,
        stageId,
        episodeId: candidate.episodeId,
        targetLanguage: candidate.targetLanguage,
        authoringRevision: candidate.authoringRevision,
        sessionCount: 12,
        taskCount: 144,
        introCount: 12,
        introQuestionCount: 36,
        inputFingerprint: candidate.inputFingerprint,
        activityAssemblyFingerprint: assembly.assemblyFingerprint,
        introAggregateFingerprint: candidate.introAggregateFingerprint,
        sourceFingerprints: Object.freeze(sources.map(decision_registry_1.hashCanonicalBody)),
        introFingerprints: Object.freeze(introFingerprints),
        ownerInputOriginAuthority: "unverified_canonical_input_claim",
        introContentAuthority: "unverified_owner_input_claim",
        interfaceLocalizationAuthority: "none",
        languageAccuracyAuthority: "none",
        curriculumAuthority: "none",
        repositoryAuthority: "none",
        humanApprovalAuthority: "none",
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        __brand: "V2OwnerAuthoredEpisodeInputHandleV2",
    });
    handles.add(handle);
    materials.set(handle, Object.freeze({
        raw,
        summary,
        sources: Object.freeze(sources),
        intros: Object.freeze(intros),
        assembly,
    }));
    return handle;
}
function isV2OwnerAuthoredEpisodeInputHandleV2(value) {
    return isRecord(value) && handles.has(value);
}
function getV2OwnerAuthoredEpisodeInputSummaryV2(handle) {
    const material = materials.get(handle);
    if (!material)
        fail("v2_owner_episode_input_v2_handle_invalid");
    return material.summary;
}
function resolveV2OwnerAuthoredEpisodeInputMaterialV2(handle) {
    const material = materials.get(handle);
    if (!material)
        fail("v2_owner_episode_input_v2_handle_invalid");
    return material;
}
//# sourceMappingURL=v2_owner_authored_episode_input_v2.js.map