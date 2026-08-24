"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_OWNER_CURRENT_COURSE_CONTRACT = exports.V2_CANONICAL_PLAN_V2_MAX_BYTES = void 0;
exports.parseV2CanonicalPlanRequestV2 = parseV2CanonicalPlanRequestV2;
exports.buildV2CanonicalSeasonPlanV2 = buildV2CanonicalSeasonPlanV2;
exports.isV2CanonicalSeasonPlanV2 = isV2CanonicalSeasonPlanV2;
const activity_catalog_v2_1 = require("../../../modules/learning-v2/contracts/activity_catalog_v2");
const voice_playback_policy_v1_1 = require("../../../modules/learning-v2/contracts/voice_playback_policy_v1");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_canonical_generation_plan_1 = require("./v2_canonical_generation_plan");
const HASH_RE = /^[0-9a-f]{64}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const MAX_PLAN_REQUEST_BYTES = 1024 * 1024;
exports.V2_CANONICAL_PLAN_V2_MAX_BYTES = 512 * 1024;
const performancePolicyBody = Object.freeze({
    schemaVersion: "v2-required-session-performance-policy.v1",
    policyId: "v2-required-session-performance-3-2-1-0",
    version: 1,
    firstCorrectNoHint: 3,
    secondCorrectNoHint: 2,
    hintedOrLaterCorrect: 1,
    skipped: 0,
    technicalInvalid: "neutral_retry",
    awardAuthority: "server_derived_policy_only",
});
const performancePolicyRef = Object.freeze({
    policyId: performancePolicyBody.policyId,
    version: performancePolicyBody.version,
    contentHash: (0, decision_registry_1.hashCanonicalBody)(performancePolicyBody),
});
const courseContractBody = Object.freeze({
    schemaVersion: "v2-owner-current-course-contract.v1",
    artifactModel: "episode-v2-session-set-v2",
    requiredEpisodesPerCourse: 32,
    requiredSessionsPerEpisode: 12,
    requiredTasksPerSession: 12,
    provisionalTaskStars: Object.freeze({
        firstCorrectNoHint: 3,
        secondCorrectNoHint: 2,
        hintedOrLaterCorrect: 1,
        skipped: 0,
        technicalInvalid: "neutral_retry",
    }),
    maxProvisionalPerformanceStarsPerSession: 36,
    performancePolicyRef,
    performanceAuthority: "server_derived_policy_only",
    contentMayAward: false,
    masteryAuthority: "none",
    evidenceAuthority: "none",
    walletMutationAuthority: "none",
    legacyEpisodeGraphStarAuthority: false,
    familyCatalogRef: activity_catalog_v2_1.V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
    requiredSessionFamilyPolicyRef: activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
    activityInstancesSchema: "v2-activity-instances-package-root.v2",
    activitySessionShardSchema: "v2-activity-session-source-shard.v2",
    activityGraphSchema: "v2-activity-graph-artifact.v2",
    voiceTargetsSchema: "v2-voice-targets-artifact.v2",
    requiredMapSessionNodesPerEpisode: 12,
    courseMapNodeUnit: "required_session",
    taskNodesVisibleOnCourseMap: false,
    mapConnectorLinePolicy: "forbidden",
    requiredVoiceIds: voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS,
    voiceVariantsPerApprovedTarget: 4,
    voicePlaybackPolicyRef: voice_playback_policy_v1_1.V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref,
    audioPrefetchPolicyRef: voice_playback_policy_v1_1.V2_AUDIO_PREFETCH_POLICY_V1.ref,
    audioDeliveryImplementationStatus: "contract_only_runtime_open",
    requiredInterfaceLocales: v2_canonical_generation_plan_1.V2_CANONICAL_INTERFACE_LOCALES,
    interfaceLocalesAreTtsDuplicationAxis: false,
    voiceTargetByteAuthority: "none",
    languageAndSpeechProfileResolutionAuthority: "unverified_external_refs",
    voiceSourceHashInvalidationAuthority: "future_voice_targets_validator",
    historicalEightSlotGraphAcceptedAsAuthority: false,
    familyCatalogApplicability: "canonical_activity_instances_and_optional_capstones",
    requiredSessionCardsUseExactSevenFamilyPolicyOnly: true,
});
exports.V2_OWNER_CURRENT_COURSE_CONTRACT = Object.freeze({
    ...courseContractBody,
    courseContractFingerprint: (0, decision_registry_1.hashCanonicalBody)(courseContractBody),
});
const requestHandles = new WeakMap();
const planHandles = new WeakSet();
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value);
    return (actual.length === keys.length && keys.every((key) => actual.includes(key)));
}
function exactToken(value) {
    return typeof value === "string" && TOKEN_RE.test(value);
}
function exactVersion(value) {
    return (typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 1 &&
        value <= 1_000_000);
}
function exactHash(value) {
    return typeof value === "string" && HASH_RE.test(value);
}
function exactLanguageTag(value) {
    return (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value) !== null;
}
function deepFreezeJson(value) {
    if (value && typeof value === "object") {
        for (const child of Object.values(value)) {
            deepFreezeJson(child);
        }
        Object.freeze(value);
    }
    return value;
}
function parseSpeechProfile(value) {
    if (!isRecord(value) ||
        !exactKeys(value, [
            "profileId",
            "targetLanguage",
            "speechLocale",
            "version",
            "contentHash",
        ]) ||
        !exactToken(value.profileId) ||
        !exactLanguageTag(value.targetLanguage) ||
        !exactLanguageTag(value.speechLocale) ||
        !exactVersion(value.version) ||
        !exactHash(value.contentHash)) {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    return Object.freeze({
        profileId: value.profileId,
        targetLanguage: value.targetLanguage,
        speechLocale: value.speechLocale,
        version: value.version,
        contentHash: value.contentHash,
    });
}
function parseVoiceGenerationProfile(value) {
    if (!isRecord(value) ||
        !exactKeys(value, ["profileId", "version", "contentHash"]) ||
        !exactToken(value.profileId) ||
        !exactVersion(value.version) ||
        !exactHash(value.contentHash)) {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    return Object.freeze({
        profileId: value.profileId,
        version: value.version,
        contentHash: value.contentHash,
    });
}
/** Canonical raw-only request boundary for the owner-current plan namespace. */
function parseV2CanonicalPlanRequestV2(raw) {
    if (typeof raw !== "string" || raw.length > MAX_PLAN_REQUEST_BYTES) {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    let byteLength;
    try {
        byteLength = (0, decision_registry_1.utf8ByteLengthV1)(raw);
    }
    catch {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    if (byteLength > MAX_PLAN_REQUEST_BYTES) {
        throw new Error("v2_canonical_plan_v2_request_too_large");
    }
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    const requiredKeys = [
        "schemaVersion",
        "workspaceId",
        "jobId",
        "authoringRevision",
        "seasonId",
        "scope",
        "episodeIds",
        "languageProfileRef",
        "speechProfileRef",
        "voiceGenerationProfileRef",
        "decisionRegistryRef",
        "templateBindings",
    ];
    const allowedKeys = [...requiredKeys, "recipes"];
    const actualKeys = isRecord(decoded) ? Object.keys(decoded) : [];
    if (!isRecord(decoded) ||
        !requiredKeys.every((key) => actualKeys.includes(key)) ||
        !actualKeys.every((key) => allowedKeys.includes(key)) ||
        decoded.schemaVersion !== "v2-canonical-plan-request.v2") {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    const speechProfileRef = parseSpeechProfile(decoded.speechProfileRef);
    const voiceGenerationProfileRef = parseVoiceGenerationProfile(decoded.voiceGenerationProfileRef);
    const v1Candidate = {
        ...decoded,
        schemaVersion: "v2-canonical-plan-request.v1",
    };
    delete v1Candidate.speechProfileRef;
    delete v1Candidate.voiceGenerationProfileRef;
    let v1Request;
    try {
        v1Request = (0, v2_canonical_generation_plan_1.parseV2CanonicalPlanRequest)((0, decision_registry_1.canonicalJsonV1)(v1Candidate));
    }
    catch {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    if (!exactLanguageTag(v1Request.languageProfileRef.targetLanguage) ||
        speechProfileRef.targetLanguage !==
            v1Request.languageProfileRef.targetLanguage) {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    if (!(0, language_tag_v1_1.v2ExactLanguageTagsCompatibleV1)(v1Request.languageProfileRef.targetLanguage, speechProfileRef.speechLocale)) {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    let canonical;
    try {
        canonical = (0, decision_registry_1.canonicalJsonV1)(decoded);
    }
    catch {
        throw new Error("v2_canonical_plan_v2_request_invalid");
    }
    if (canonical !== raw) {
        throw new Error("v2_canonical_plan_v2_request_noncanonical");
    }
    const request = deepFreezeJson(decoded);
    requestHandles.set(request, {
        v1Request,
        speechProfileRef,
        voiceGenerationProfileRef,
    });
    return request;
}
function stageId(identity, requestFingerprint, kind, episodeId = null, locale = null) {
    const coordinateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-stage-coordinate.v2",
        compilerVersion: "v2-canonical-plan-compiler.v2",
        planSchemaVersion: "v2-canonical-season-plan.v2",
        artifactModel: exports.V2_OWNER_CURRENT_COURSE_CONTRACT.artifactModel,
        requestFingerprint,
        ...identity,
        kind,
        episodeId,
        locale,
    });
    return `v2s2:${kind}:r${identity.authoringRevision}:${coordinateFingerprint}`;
}
function immutableNode(node) {
    if (node.dependsOn.length + node.externalRequirementIds.length >
        v2_canonical_generation_plan_1.V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES) {
        throw new Error("v2_canonical_plan_v2_dependency_capacity");
    }
    return Object.freeze({
        ...node,
        dependsOn: Object.freeze([...node.dependsOn]),
        externalRequirementIds: Object.freeze([...node.externalRequirementIds]),
    });
}
function codePointCompare(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
/**
 * Pure additive compiler. It performs no dependency resolution, provider,
 * storage, execution, publication or release work.
 */
function buildV2CanonicalSeasonPlanV2(input) {
    if (!input || typeof input !== "object") {
        throw new Error("v2_canonical_plan_v2_request_untrusted");
    }
    const trusted = requestHandles.get(input);
    if (!trusted)
        throw new Error("v2_canonical_plan_v2_request_untrusted");
    const v1Plan = (0, v2_canonical_generation_plan_1.buildV2CanonicalSeasonPlan)(trusted.v1Request);
    const identity = Object.freeze({
        workspaceId: v1Plan.workspaceId,
        jobId: v1Plan.jobId,
        authoringRevision: v1Plan.authoringRevision,
        seasonId: v1Plan.seasonId,
    });
    const optionalStageDispositions = v1Plan.optionalStageDispositions;
    const outlineV1 = v1Plan.stages.find((node) => node.kind === "v2_season_outline");
    const languageProfile = outlineV1?.externalRequirements.find((requirement) => requirement.dependencyType === "language_profile");
    if (!languageProfile)
        throw new Error("v2_canonical_plan_v2_internal_invalid");
    const templatesByEpisode = new Map();
    for (const episodeId of v1Plan.episodeIds) {
        const instance = v1Plan.stages.find((node) => node.kind === "v2_activity_instances" && node.episodeId === episodeId);
        if (!instance)
            throw new Error("v2_canonical_plan_v2_internal_invalid");
        templatesByEpisode.set(episodeId, Object.freeze(instance.externalRequirements.map((requirement) => Object.freeze({ ...requirement }))));
    }
    const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-canonical-plan-semantics.v2",
        ...identity,
        scope: v1Plan.scope,
        targetLanguage: v1Plan.targetLanguage,
        decisionRegistryRef: v1Plan.decisionRegistryRef,
        episodeIds: v1Plan.episodeIds,
        optionalStageDispositions,
        languageProfile,
        templateBindings: v1Plan.episodeIds.map((episodeId) => ({
            episodeId,
            templateRefs: templatesByEpisode.get(episodeId) ?? [],
        })),
        courseContractFingerprint: exports.V2_OWNER_CURRENT_COURSE_CONTRACT.courseContractFingerprint,
    });
    const voiceRequestFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-canonical-voice-stage-semantics.v1",
        structuralRequestFingerprint: requestFingerprint,
        speechProfileRef: trusted.speechProfileRef,
        voiceGenerationProfileRef: trusted.voiceGenerationProfileRef,
        requiredVoiceIds: exports.V2_OWNER_CURRENT_COURSE_CONTRACT.requiredVoiceIds,
        voicePlaybackPolicyRef: exports.V2_OWNER_CURRENT_COURSE_CONTRACT.voicePlaybackPolicyRef,
    });
    const seasonOutline = stageId(identity, requestFingerprint, "v2_season_outline");
    const requirementCatalog = new Map();
    const requirementIds = (requirements) => Object.freeze(requirements.map((requirement) => {
        const requirementId = `v2req:${(0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "v2-plan-external-requirement.v1",
            requirement,
        })}`;
        const prior = requirementCatalog.get(requirementId);
        if (prior &&
            (0, decision_registry_1.hashCanonicalBody)(prior.requirement) !==
                (0, decision_registry_1.hashCanonicalBody)(requirement)) {
            throw new Error("v2_canonical_plan_v2_requirement_conflict");
        }
        if (!prior) {
            requirementCatalog.set(requirementId, Object.freeze({
                requirementId,
                requirement: Object.freeze({ ...requirement }),
            }));
        }
        return requirementId;
    }));
    const nodes = [
        immutableNode({
            stageId: seasonOutline,
            kind: "v2_season_outline",
            episodeId: null,
            locale: null,
            dependsOn: [],
            externalRequirementIds: requirementIds([
                Object.freeze({ ...languageProfile }),
            ]),
        }),
    ];
    for (const episodeId of v1Plan.episodeIds) {
        const disposition = optionalStageDispositions.find((candidate) => candidate.episodeId === episodeId);
        if (!disposition)
            throw new Error("v2_canonical_plan_v2_internal_invalid");
        const outline = stageId(identity, requestFingerprint, "v2_episode_outline", episodeId);
        const scene = stageId(identity, requestFingerprint, "v2_scene_set", episodeId);
        const dialogue = stageId(identity, requestFingerprint, "v2_dialogue_script", episodeId);
        const mission = stageId(identity, requestFingerprint, "v2_speaking_mission", episodeId);
        const instances = stageId(identity, requestFingerprint, "v2_activity_instances", episodeId);
        const voice = stageId(identity, voiceRequestFingerprint, "v2_voice_targets", episodeId);
        const graph = stageId(identity, requestFingerprint, "v2_activity_graph", episodeId);
        const assets = stageId(identity, voiceRequestFingerprint, "v2_asset_manifest", episodeId);
        const localeNodes = v2_canonical_generation_plan_1.V2_CANONICAL_INTERFACE_LOCALES.map((locale) => stageId(identity, requestFingerprint, "v2_localization", episodeId, locale));
        const preview = stageId(identity, voiceRequestFingerprint, "v2_preview_receipt", episodeId);
        const bundle = stageId(identity, voiceRequestFingerprint, "v2_episode_bundle", episodeId);
        nodes.push(immutableNode({
            stageId: outline,
            kind: "v2_episode_outline",
            episodeId,
            locale: null,
            dependsOn: [seasonOutline],
            externalRequirementIds: [],
        }), immutableNode({
            stageId: scene,
            kind: "v2_scene_set",
            episodeId,
            locale: null,
            dependsOn: [outline],
            externalRequirementIds: [],
        }));
        if (disposition.dialogue === "required") {
            nodes.push(immutableNode({
                stageId: dialogue,
                kind: "v2_dialogue_script",
                episodeId,
                locale: null,
                dependsOn: [outline],
                externalRequirementIds: [],
            }));
        }
        if (disposition.speakingMission === "required") {
            nodes.push(immutableNode({
                stageId: mission,
                kind: "v2_speaking_mission",
                episodeId,
                locale: null,
                dependsOn: [outline],
                externalRequirementIds: [],
            }));
        }
        const instanceDependencies = [outline, scene];
        const voiceDependencies = [scene];
        if (disposition.dialogue === "required") {
            instanceDependencies.push(dialogue);
            voiceDependencies.push(dialogue);
        }
        if (disposition.speakingMission === "required") {
            instanceDependencies.push(mission);
            voiceDependencies.push(mission);
        }
        nodes.push(immutableNode({
            stageId: instances,
            kind: "v2_activity_instances",
            episodeId,
            locale: null,
            dependsOn: instanceDependencies,
            externalRequirementIds: requirementIds(templatesByEpisode.get(episodeId) ?? []),
        }));
        voiceDependencies.push(instances);
        nodes.push(immutableNode({
            stageId: voice,
            kind: "v2_voice_targets",
            episodeId,
            locale: null,
            dependsOn: voiceDependencies,
            externalRequirementIds: requirementIds([
                Object.freeze({ ...languageProfile }),
                Object.freeze({
                    dependencyType: "speech_profile",
                    profileId: trusted.speechProfileRef.profileId,
                    version: trusted.speechProfileRef.version,
                    contentHash: trusted.speechProfileRef.contentHash,
                }),
                Object.freeze({
                    dependencyType: "voice_generation_profile",
                    profileId: trusted.voiceGenerationProfileRef.profileId,
                    version: trusted.voiceGenerationProfileRef.version,
                    contentHash: trusted.voiceGenerationProfileRef.contentHash,
                }),
            ]),
        }), immutableNode({
            stageId: graph,
            kind: "v2_activity_graph",
            episodeId,
            locale: null,
            dependsOn: [instances],
            externalRequirementIds: [],
        }), immutableNode({
            stageId: assets,
            kind: "v2_asset_manifest",
            episodeId,
            locale: null,
            dependsOn: [graph, voice],
            externalRequirementIds: [],
        }));
        v2_canonical_generation_plan_1.V2_CANONICAL_INTERFACE_LOCALES.forEach((locale, index) => {
            nodes.push(immutableNode({
                stageId: localeNodes[index],
                kind: "v2_localization",
                episodeId,
                locale,
                dependsOn: [instances, graph],
                externalRequirementIds: [],
            }));
        });
        nodes.push(immutableNode({
            stageId: preview,
            kind: "v2_preview_receipt",
            episodeId,
            locale: null,
            dependsOn: [assets, ...localeNodes],
            externalRequirementIds: [],
        }), immutableNode({
            stageId: bundle,
            kind: "v2_episode_bundle",
            episodeId,
            locale: null,
            dependsOn: [preview],
            externalRequirementIds: [],
        }));
    }
    nodes.push(immutableNode({
        stageId: stageId(identity, voiceRequestFingerprint, "v2_season_qa"),
        kind: "v2_season_qa",
        episodeId: null,
        locale: null,
        dependsOn: v1Plan.episodeIds.map((episodeId) => stageId(identity, voiceRequestFingerprint, "v2_episode_bundle", episodeId)),
        externalRequirementIds: [],
    }));
    if (nodes.some((node) => !v2_canonical_generation_plan_1.V2_CANONICAL_STAGE_KINDS.includes(node.kind))) {
        throw new Error("v2_canonical_plan_v2_internal_invalid");
    }
    const body = Object.freeze({
        schemaVersion: "v2-canonical-season-plan.v2",
        compilerVersion: "v2-canonical-plan-compiler.v2",
        coordinateSchemaVersion: "v2-stage-coordinate.v2",
        ...identity,
        scope: v1Plan.scope,
        targetLanguage: v1Plan.targetLanguage,
        decisionRegistryRef: v1Plan.decisionRegistryRef,
        episodeIds: v1Plan.episodeIds,
        optionalStageDispositions,
        courseContract: exports.V2_OWNER_CURRENT_COURSE_CONTRACT,
        externalRequirementCatalog: Object.freeze([...requirementCatalog.values()].sort((left, right) => codePointCompare(left.requirementId, right.requirementId))),
        stages: Object.freeze(nodes),
        executionAuthority: "none",
        storageAuthority: "none",
        humanReviewAuthority: "none",
        specialistEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        listeningEvidenceAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const plan = Object.freeze({
        ...body,
        planFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(plan)) > exports.V2_CANONICAL_PLAN_V2_MAX_BYTES) {
        throw new Error("v2_canonical_plan_v2_too_large");
    }
    planHandles.add(plan);
    return plan;
}
function isV2CanonicalSeasonPlanV2(value) {
    return typeof value === "object" && value !== null && planHandles.has(value);
}
//# sourceMappingURL=v2_canonical_generation_plan_v2.js.map