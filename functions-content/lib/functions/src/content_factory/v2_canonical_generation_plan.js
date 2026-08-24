"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_CANONICAL_MAX_SEASON_TEMPLATES = exports.V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES = exports.V2_CANONICAL_INTERFACE_LOCALES = exports.V2_CANONICAL_STAGE_KINDS = void 0;
exports.parseV2CanonicalPlanRequest = parseV2CanonicalPlanRequest;
exports.buildV2CanonicalSeasonPlan = buildV2CanonicalSeasonPlan;
exports.isV2CanonicalSeasonPlan = isV2CanonicalSeasonPlan;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
exports.V2_CANONICAL_STAGE_KINDS = Object.freeze([
    "v2_season_outline",
    "v2_episode_outline",
    "v2_scene_set",
    "v2_dialogue_script",
    "v2_speaking_mission",
    "v2_voice_targets",
    "v2_activity_instances",
    "v2_activity_graph",
    "v2_asset_manifest",
    "v2_localization",
    "v2_preview_receipt",
    "v2_episode_bundle",
    "v2_season_qa",
]);
exports.V2_CANONICAL_INTERFACE_LOCALES = Object.freeze([
    "ru",
    "uk",
    "es",
    "pt-BR",
    "vi",
    "id",
    "tr",
    "pl",
]);
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const MAX_PLAN_REQUEST_BYTES = 1024 * 1024;
// Worst-case dependency rows (max identifiers, object path and generation)
// must still fit the shared 64 KiB canonical snapshot. One slot is the
// language profile and up to four stage predecessors. This leaves at most 28
// unique templates so every activity-instance closure also stays within 32.
exports.V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES = 32;
exports.V2_CANONICAL_MAX_SEASON_TEMPLATES = 28;
const EXPECTED_EPISODES = Object.freeze({
    vertical_slice: 1,
    chapter_internal: 8,
    full_season: 32,
});
const planHandles = new WeakSet();
const requestHandles = new WeakSet();
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, required, optional = []) {
    const keys = Object.keys(value);
    return (required.every((key) => keys.includes(key)) &&
        keys.every((key) => required.includes(key) || optional.includes(key)));
}
function deepFreezeJson(value) {
    if (value && typeof value === "object") {
        for (const child of Object.values(value))
            deepFreezeJson(child);
        Object.freeze(value);
    }
    return value;
}
function exactToken(value, code) {
    if (typeof value !== "string" || !TOKEN_RE.test(value))
        throw new Error(code);
    return value;
}
function exactVersion(value, code) {
    if (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > 1_000_000)
        throw new Error(code);
    return value;
}
function exactHash(value, code) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        throw new Error(code);
    return value;
}
function codePointCompare(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
function stageId(input, requestFingerprint, kind, episodeId = null, locale = null) {
    const coordinateFingerprint = (0, decision_registry_1.hashCanonicalBody)(Object.freeze({
        schemaVersion: "v2-stage-coordinate.v1",
        requestFingerprint,
        workspaceId: input.workspaceId,
        jobId: input.jobId,
        authoringRevision: input.authoringRevision,
        seasonId: input.seasonId,
        kind,
        episodeId,
        locale,
    }));
    return `v2s:${kind}:r${input.authoringRevision}:${coordinateFingerprint}`;
}
function immutableNode(node) {
    return Object.freeze({
        ...node,
        dependsOn: Object.freeze([...node.dependsOn]),
        externalRequirements: Object.freeze(node.externalRequirements.map((item) => Object.freeze({ ...item }))),
    });
}
function normalizeInput(input) {
    if (!isRecord(input) ||
        !exactKeys(input, [
            "schemaVersion",
            "workspaceId",
            "jobId",
            "authoringRevision",
            "seasonId",
            "scope",
            "episodeIds",
            "languageProfileRef",
            "decisionRegistryRef",
            "templateBindings",
        ], ["recipes"]) ||
        input.schemaVersion !== "v2-canonical-plan-request.v1") {
        throw new Error("v2_canonical_plan_input_invalid");
    }
    const identity = Object.freeze({
        workspaceId: exactToken(input.workspaceId, "v2_canonical_workspace_invalid"),
        jobId: exactToken(input.jobId, "v2_canonical_job_invalid"),
        authoringRevision: exactVersion(input.authoringRevision, "v2_canonical_revision_invalid"),
        seasonId: exactToken(input.seasonId, "v2_canonical_season_invalid"),
    });
    const expected = EXPECTED_EPISODES[input.scope];
    if (!expected)
        throw new Error("v2_canonical_scope_invalid");
    if (!Array.isArray(input.episodeIds) ||
        input.episodeIds.length !== expected) {
        throw new Error(`v2_canonical_episode_count_expected_${expected}`);
    }
    const episodeIds = Object.freeze(input.episodeIds.map((value) => exactToken(value, "v2_canonical_episode_invalid")));
    if (new Set(episodeIds).size !== episodeIds.length)
        throw new Error("v2_canonical_episode_duplicate");
    const recipeRows = input.recipes ?? [];
    if (!Array.isArray(recipeRows) || recipeRows.length > episodeIds.length)
        throw new Error("v2_canonical_recipe_invalid");
    const recipes = new Map();
    for (const row of recipeRows) {
        if (!isRecord(row) ||
            !exactKeys(row, ["episodeId"], ["dialogue", "speakingMission"]))
            throw new Error("v2_canonical_recipe_invalid");
        const episodeId = exactToken(row?.episodeId, "v2_canonical_recipe_invalid");
        if (!episodeIds.includes(episodeId) ||
            recipes.has(episodeId) ||
            (row.dialogue !== undefined && typeof row.dialogue !== "boolean") ||
            (row.speakingMission !== undefined &&
                typeof row.speakingMission !== "boolean")) {
            throw new Error("v2_canonical_recipe_invalid");
        }
        const normalizedRecipe = Object.freeze({
            episodeId,
            ...(row.dialogue === true ? { dialogue: true } : {}),
            ...(row.speakingMission === true
                ? { speakingMission: true }
                : {}),
        });
        if (normalizedRecipe.dialogue === true ||
            normalizedRecipe.speakingMission === true)
            recipes.set(episodeId, normalizedRecipe);
    }
    const profile = input.languageProfileRef;
    if (!isRecord(profile) ||
        !exactKeys(profile, [
            "profileId",
            "targetLanguage",
            "version",
            "contentHash",
        ])) {
        throw new Error("v2_canonical_profile_invalid");
    }
    if (typeof profile.targetLanguage !== "string" ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(profile.targetLanguage) === null) {
        throw new Error("v2_canonical_profile_invalid");
    }
    const targetLanguage = profile.targetLanguage;
    const decision = input.decisionRegistryRef;
    if (!isRecord(decision) ||
        !exactKeys(decision, ["decisionId", "version", "contentHash"]) ||
        decision.decisionId !== "HYP-V2-007") {
        throw new Error("v2_canonical_decision_registry_invalid");
    }
    const decisionRegistryRef = Object.freeze({
        decisionId: "HYP-V2-007",
        version: exactVersion(decision.version, "v2_canonical_decision_registry_invalid"),
        contentHash: exactHash(decision.contentHash, "v2_canonical_decision_registry_invalid"),
    });
    const languageProfile = Object.freeze({
        dependencyType: "language_profile",
        profileId: exactToken(profile?.profileId, "v2_canonical_profile_invalid"),
        version: exactVersion(profile?.version, "v2_canonical_profile_invalid"),
        contentHash: exactHash(profile?.contentHash, "v2_canonical_profile_invalid"),
    });
    if (!Array.isArray(input.templateBindings) ||
        input.templateBindings.length !== episodeIds.length) {
        throw new Error("v2_canonical_template_binding_invalid");
    }
    const templatesByEpisode = new Map();
    const seasonTemplates = new Map();
    const templateBindings = input.templateBindings;
    for (const binding of templateBindings) {
        if (!isRecord(binding) ||
            !exactKeys(binding, ["episodeId", "templateRefs"]))
            throw new Error("v2_canonical_template_binding_invalid");
        const episodeId = exactToken(binding?.episodeId, "v2_canonical_template_binding_invalid");
        if (!episodeIds.includes(episodeId) ||
            templatesByEpisode.has(episodeId) ||
            !Array.isArray(binding.templateRefs) ||
            binding.templateRefs.length < 1 ||
            binding.templateRefs.length > 64) {
            throw new Error("v2_canonical_template_binding_invalid");
        }
        const refs = binding.templateRefs.map((ref) => {
            if (!isRecord(ref) ||
                !exactKeys(ref, ["templateId", "version", "contentHash"]))
                throw new Error("v2_canonical_template_invalid");
            return Object.freeze({
                dependencyType: "published_template",
                templateId: exactToken(ref.templateId, "v2_canonical_template_invalid"),
                version: exactVersion(ref.version, "v2_canonical_template_invalid"),
                contentHash: exactHash(ref.contentHash, "v2_canonical_template_invalid"),
            });
        });
        const identities = refs.map((ref) => `${ref.templateId}@${ref.version}`);
        if (new Set(identities).size !== identities.length)
            throw new Error("v2_canonical_template_duplicate");
        refs.sort((left, right) => codePointCompare(`${left.templateId}@${left.version}`, `${right.templateId}@${right.version}`));
        for (const ref of refs) {
            const identityKey = `${ref.templateId}@${ref.version}`;
            const prior = seasonTemplates.get(identityKey);
            if (prior && prior.contentHash !== ref.contentHash)
                throw new Error("v2_canonical_template_conflict");
            seasonTemplates.set(identityKey, ref);
        }
        templatesByEpisode.set(episodeId, Object.freeze(refs));
    }
    const seasonTemplateRequirements = Object.freeze([...seasonTemplates.values()].sort((left, right) => codePointCompare(`${left.templateId}@${left.version}`, `${right.templateId}@${right.version}`)));
    if (seasonTemplateRequirements.length > exports.V2_CANONICAL_MAX_SEASON_TEMPLATES) {
        throw new Error("v2_canonical_season_prerequisite_capacity");
    }
    const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)(Object.freeze({
        schemaVersion: "v2-canonical-plan-semantics.v1",
        ...identity,
        scope: input.scope,
        episodeIds,
        recipes: Object.freeze(episodeIds.flatMap((episodeId) => {
            const recipe = recipes.get(episodeId);
            return recipe ? [recipe] : [];
        })),
        targetLanguage,
        decisionRegistryRef,
        languageProfile,
        templateBindings: Object.freeze(episodeIds.map((episodeId) => Object.freeze({
            episodeId,
            templateRefs: templatesByEpisode.get(episodeId) ?? [],
        }))),
    }));
    return Object.freeze({
        identity,
        scope: input.scope,
        targetLanguage,
        decisionRegistryRef,
        episodeIds,
        recipes,
        languageProfile,
        seasonTemplateRequirements,
        templatesByEpisode,
        requestFingerprint,
    });
}
/** Parse the only accepted canonical request boundary without executing accessors. */
function parseV2CanonicalPlanRequest(raw) {
    if (typeof raw !== "string" || raw.length > MAX_PLAN_REQUEST_BYTES)
        throw new Error("v2_canonical_plan_request_invalid");
    let bytes;
    try {
        bytes = (0, decision_registry_1.utf8ByteLengthV1)(raw);
    }
    catch {
        throw new Error("v2_canonical_plan_request_invalid");
    }
    if (bytes > MAX_PLAN_REQUEST_BYTES) {
        throw new Error("v2_canonical_plan_request_too_large");
    }
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        throw new Error("v2_canonical_plan_request_invalid");
    }
    // JSON.parse creates data-only objects. Validate every recognized nested
    // shape before canonical recursion, then require exact canonical bytes.
    normalizeInput(decoded);
    let canonical;
    try {
        canonical = (0, decision_registry_1.canonicalJsonV1)(decoded);
    }
    catch {
        throw new Error("v2_canonical_plan_request_invalid");
    }
    if (canonical !== raw)
        throw new Error("v2_canonical_plan_request_noncanonical");
    const request = deepFreezeJson(decoded);
    requestHandles.add(request);
    return request;
}
/**
 * Pure compiler only. It performs no Firebase/provider/storage work and gives
 * no execution, publication, review or release authority.
 */
function buildV2CanonicalSeasonPlan(input) {
    if (!input ||
        typeof input !== "object" ||
        !requestHandles.has(input))
        throw new Error("v2_canonical_plan_request_untrusted");
    const normalized = normalizeInput(input);
    const identity = normalized.identity;
    const seasonOutline = stageId(identity, normalized.requestFingerprint, "v2_season_outline");
    const nodes = [
        immutableNode({
            stageId: seasonOutline,
            kind: "v2_season_outline",
            ...identity,
            episodeId: null,
            locale: null,
            dependsOn: [],
            externalRequirements: [
                normalized.languageProfile,
                ...normalized.seasonTemplateRequirements,
            ],
        }),
    ];
    for (const episodeId of normalized.episodeIds) {
        const recipe = normalized.recipes.get(episodeId);
        const outline = stageId(identity, normalized.requestFingerprint, "v2_episode_outline", episodeId);
        const scene = stageId(identity, normalized.requestFingerprint, "v2_scene_set", episodeId);
        const dialogue = stageId(identity, normalized.requestFingerprint, "v2_dialogue_script", episodeId);
        const mission = stageId(identity, normalized.requestFingerprint, "v2_speaking_mission", episodeId);
        const voice = stageId(identity, normalized.requestFingerprint, "v2_voice_targets", episodeId);
        const instances = stageId(identity, normalized.requestFingerprint, "v2_activity_instances", episodeId);
        const graph = stageId(identity, normalized.requestFingerprint, "v2_activity_graph", episodeId);
        const assets = stageId(identity, normalized.requestFingerprint, "v2_asset_manifest", episodeId);
        const localeNodes = exports.V2_CANONICAL_INTERFACE_LOCALES.map((locale) => stageId(identity, normalized.requestFingerprint, "v2_localization", episodeId, locale));
        const preview = stageId(identity, normalized.requestFingerprint, "v2_preview_receipt", episodeId);
        const bundle = stageId(identity, normalized.requestFingerprint, "v2_episode_bundle", episodeId);
        const base = { ...identity, episodeId, locale: null };
        nodes.push(immutableNode({
            stageId: outline,
            kind: "v2_episode_outline",
            ...base,
            dependsOn: [seasonOutline],
            externalRequirements: [],
        }));
        nodes.push(immutableNode({
            stageId: scene,
            kind: "v2_scene_set",
            ...base,
            dependsOn: [outline],
            externalRequirements: [],
        }));
        if (recipe?.dialogue)
            nodes.push(immutableNode({
                stageId: dialogue,
                kind: "v2_dialogue_script",
                ...base,
                dependsOn: [outline],
                externalRequirements: [],
            }));
        if (recipe?.speakingMission)
            nodes.push(immutableNode({
                stageId: mission,
                kind: "v2_speaking_mission",
                ...base,
                dependsOn: [outline],
                externalRequirements: [],
            }));
        nodes.push(immutableNode({
            stageId: voice,
            kind: "v2_voice_targets",
            ...base,
            dependsOn: [outline],
            externalRequirements: [],
        }));
        const instanceDependencies = [scene, voice];
        if (recipe?.dialogue)
            instanceDependencies.push(dialogue);
        if (recipe?.speakingMission)
            instanceDependencies.push(mission);
        nodes.push(immutableNode({
            stageId: instances,
            kind: "v2_activity_instances",
            ...base,
            dependsOn: instanceDependencies,
            externalRequirements: normalized.templatesByEpisode.get(episodeId) ?? [],
        }));
        nodes.push(immutableNode({
            stageId: graph,
            kind: "v2_activity_graph",
            ...base,
            dependsOn: [instances],
            externalRequirements: [],
        }));
        nodes.push(immutableNode({
            stageId: assets,
            kind: "v2_asset_manifest",
            ...base,
            dependsOn: [graph],
            externalRequirements: [],
        }));
        exports.V2_CANONICAL_INTERFACE_LOCALES.forEach((locale, index) => nodes.push(immutableNode({
            stageId: localeNodes[index],
            kind: "v2_localization",
            ...identity,
            episodeId,
            locale,
            dependsOn: [graph],
            externalRequirements: [],
        })));
        nodes.push(immutableNode({
            stageId: preview,
            kind: "v2_preview_receipt",
            ...base,
            dependsOn: [assets, ...localeNodes],
            externalRequirements: [],
        }));
        nodes.push(immutableNode({
            stageId: bundle,
            kind: "v2_episode_bundle",
            ...base,
            dependsOn: [preview],
            externalRequirements: [],
        }));
    }
    nodes.push(immutableNode({
        stageId: stageId(identity, normalized.requestFingerprint, "v2_season_qa"),
        kind: "v2_season_qa",
        ...identity,
        episodeId: null,
        locale: null,
        dependsOn: normalized.episodeIds.map((episodeId) => stageId(identity, normalized.requestFingerprint, "v2_episode_bundle", episodeId)),
        externalRequirements: [],
    }));
    const optionalStageDispositions = Object.freeze(normalized.episodeIds.map((episodeId) => Object.freeze({
        episodeId,
        dialogue: normalized.recipes.get(episodeId)?.dialogue
            ? "required"
            : "not_required_by_recipe",
        speakingMission: normalized.recipes.get(episodeId)?.speakingMission
            ? "required"
            : "not_required_by_recipe",
    })));
    const body = Object.freeze({
        schemaVersion: "v2-canonical-season-plan.v1",
        compilerVersion: "v2-canonical-plan-compiler.v1",
        ...identity,
        scope: normalized.scope,
        targetLanguage: normalized.targetLanguage,
        decisionRegistryRef: normalized.decisionRegistryRef,
        episodeIds: normalized.episodeIds,
        optionalStageDispositions,
        stages: Object.freeze(nodes),
        executionAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const plan = Object.freeze({
        ...body,
        planFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    planHandles.add(plan);
    return plan;
}
function isV2CanonicalSeasonPlan(value) {
    return (typeof value === "object" &&
        value !== null &&
        planHandles.has(value));
}
//# sourceMappingURL=v2_canonical_generation_plan.js.map