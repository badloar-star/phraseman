"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES = exports.V2_ACTIVITY_TASK_COUNT = exports.V2_ACTIVITY_TASKS_PER_SESSION = exports.V2_ACTIVITY_SESSION_COUNT = exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES = exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES = exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES = exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES = exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_SCHEMA_V2 = exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2 = exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_MAX_BYTES = exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES = void 0;
exports.materializeV2GenerationCapabilitySnapshotV1 = materializeV2GenerationCapabilitySnapshotV1;
exports.v2ActivitySessionId = v2ActivitySessionId;
exports.v2ActivitySessionSourceObjectPath = v2ActivitySessionSourceObjectPath;
exports.v2ActivitySessionProjectionObjectPath = v2ActivitySessionProjectionObjectPath;
exports.materializeV2ActivityInstancesAuthoringRootV2 = materializeV2ActivityInstancesAuthoringRootV2;
exports.parseV2ActivityInstancesUntrustedRootManifestPermitsV2 = parseV2ActivityInstancesUntrustedRootManifestPermitsV2;
exports.parseV2ActivityInstancesAuthoringRootV2 = parseV2ActivityInstancesAuthoringRootV2;
exports.materializeV2ActivityInstancesDeviceRootV2 = materializeV2ActivityInstancesDeviceRootV2;
exports.parseV2ActivityInstancesDeviceRootV2 = parseV2ActivityInstancesDeviceRootV2;
exports.loadV2ActivityInstancesDeviceSessionV2 = loadV2ActivityInstancesDeviceSessionV2;
exports.getV2ActivityInstancesDeviceRenderPayloadV2 = getV2ActivityInstancesDeviceRenderPayloadV2;
exports.getV2ActivityInstancesDeviceEvaluatorHandleV2 = getV2ActivityInstancesDeviceEvaluatorHandleV2;
exports.isV2ActivityInstancesDeviceIntegrityHandleV2 = isV2ActivityInstancesDeviceIntegrityHandleV2;
exports.isV2ActivityInstancesAuthoringRootV2 = isV2ActivityInstancesAuthoringRootV2;
exports.isV2ActivityInstancesDeviceRootV2 = isV2ActivityInstancesDeviceRootV2;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_canonical_generation_plan_v2_1 = require("./v2_canonical_generation_plan_v2");
const local_evaluator_capsule_v1_1 = require("../../../modules/learning-v2/runtime/local_evaluator_capsule_v1");
const activity_session_package_v2_1 = require("../../../modules/learning-v2/contracts/activity_session_package_v2");
const v2_activity_session_projection_1 = require("./v2_activity_session_projection");
exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES = 64 * 1024;
exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_MAX_BYTES = 32 * 1024;
exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2 = "v2-activity-instances-package-root.v2";
exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_SCHEMA_V2 = "v2-activity-instances-device-root.v2";
exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES = v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES;
exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES = v2_activity_session_projection_1.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES;
exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES = v2_activity_session_projection_1.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES;
exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES = v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES;
exports.V2_ACTIVITY_SESSION_COUNT = 12;
exports.V2_ACTIVITY_TASKS_PER_SESSION = 12;
exports.V2_ACTIVITY_TASK_COUNT = 144;
exports.V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES = exports.V2_ACTIVITY_SESSION_COUNT *
    (exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES +
        exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES +
        exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES +
        exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES);
const HASH_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const UTF8_ENCODER = new TextEncoder();
const TEMPLATE_LIMIT = 28;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const AUTHORING_ROOT_KEYS = [
    "schemaVersion",
    "planSchemaVersion",
    "compilerVersion",
    "coordinateSchemaVersion",
    "artifactModel",
    "planFingerprint",
    "stageId",
    "stageKind",
    "workspaceId",
    "jobId",
    "authoringRevision",
    "seasonId",
    "episodeId",
    "sessionCount",
    "taskCount",
    "capabilitySnapshot",
    "sessions",
    "contentAggregateFingerprint",
    "storageAggregateFingerprint",
    "repositoryResolutionAuthority",
    "objectPinEvidence",
    "executionAuthority",
    "storageAuthority",
    "humanReviewAuthority",
    "specialistEvidenceAuthority",
    "deviceEvidenceAuthority",
    "publicationPolicy",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "packageFingerprint",
];
const AUTHORING_SESSION_ROW_KEYS = [
    "sessionOrdinal",
    "sessionId",
    "taskCount",
    "generationInputFingerprint",
    "capabilitySnapshotFingerprint",
    "taskIdentityFingerprint",
    "source",
    "render",
    "capsule",
    "sidecar",
    "pairFingerprint",
];
const OBJECT_PIN_KEYS = [
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
];
const SIDECAR_TASK_KEYS = [
    "acceptedCommitments",
    "acceptedResponses",
    "activityId",
    "capsuleId",
    "correctResponse",
    "family",
    "inputKind",
    "normalizationLocale",
    "normalizationProfileHash",
    "normalizationRef",
    "salt",
    "taskId",
];
const authoringRootHandles = new WeakSet();
const deviceRootHandles = new WeakSet();
const deviceIntegrityHandles = new WeakMap();
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value);
    return (actual.length === keys.length && keys.every((key) => actual.includes(key)));
}
function hasLoneSurrogate(value) {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code >= 0xd800 && code <= 0xdbff) {
            const next = value.charCodeAt(index + 1);
            if (next < 0xdc00 || next > 0xdfff)
                return true;
            index += 1;
        }
        else if (code >= 0xdc00 && code <= 0xdfff) {
            return true;
        }
    }
    return false;
}
function preflightUntrustedAuthoringRootJson(value) {
    const pending = [
        { value, depth: 0 },
    ];
    let nodes = 0;
    let arrayEntries = 0;
    while (pending.length > 0) {
        const current = pending.pop();
        nodes += 1;
        if (nodes > 10_000 || current.depth > 16)
            throw new Error("v2_activity_instances_manifest_complexity_invalid");
        const child = current.value;
        if (typeof child === "string") {
            if (child.length > exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES ||
                hasLoneSurrogate(child) ||
                child.normalize("NFC") !== child) {
                throw new Error("v2_activity_instances_manifest_string_invalid");
            }
            continue;
        }
        if (child === null || typeof child === "boolean")
            continue;
        if (typeof child === "number") {
            if (!Number.isSafeInteger(child) || Object.is(child, -0))
                throw new Error("v2_activity_instances_manifest_number_invalid");
            continue;
        }
        if (Array.isArray(child)) {
            arrayEntries += child.length;
            if (arrayEntries > 1_000)
                throw new Error("v2_activity_instances_manifest_complexity_invalid");
            for (let index = child.length - 1; index >= 0; index -= 1) {
                pending.push({ value: child[index], depth: current.depth + 1 });
            }
            continue;
        }
        if (!isRecord(child))
            throw new Error("v2_activity_instances_manifest_shape_invalid");
        const keys = Object.keys(child);
        if (keys.length > 64 ||
            keys.some((key) => RESERVED_KEYS.has(key) ||
                hasLoneSurrogate(key) ||
                key.normalize("NFC") !== key)) {
            throw new Error("v2_activity_instances_manifest_object_invalid");
        }
        for (let index = keys.length - 1; index >= 0; index -= 1) {
            const key = keys[index];
            pending.push({ value: child[key], depth: current.depth + 1 });
        }
    }
}
function parseUntrustedCanonicalAuthoringRootRaw(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES) {
        throw new Error("v2_activity_instances_authoring_root_too_large");
    }
    const rawBytes = UTF8_ENCODER.encode(raw).byteLength;
    if (rawBytes > exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES)
        throw new Error("v2_activity_instances_authoring_root_too_large");
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        throw new Error("v2_activity_instances_manifest_invalid");
    }
    preflightUntrustedAuthoringRootJson(decoded);
    if (!isRecord(decoded) || (0, decision_registry_1.canonicalJsonV1)(decoded) !== raw)
        throw new Error("v2_activity_instances_manifest_noncanonical");
    return decoded;
}
function deepFreeze(value) {
    if (value && typeof value === "object") {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
function exactVersion(value) {
    return (typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 1 &&
        value <= 1_000_000);
}
function exactRef(value, idKey) {
    if (!isRecord(value) ||
        !exactKeys(value, [idKey, "version", "contentHash"]) ||
        typeof value[idKey] !== "string" ||
        !TOKEN_RE.test(value[idKey]) ||
        !exactVersion(value.version) ||
        typeof value.contentHash !== "string" ||
        !HASH_RE.test(value.contentHash)) {
        throw new Error("v2_activity_instances_capability_ref_invalid");
    }
    return Object.freeze({
        [idKey]: value[idKey],
        version: value.version,
        contentHash: value.contentHash,
    });
}
function templateCapabilityBody(input) {
    return Object.freeze({
        templateId: input.templateId,
        version: input.version,
        contentHash: input.contentHash,
        kernelBindingFingerprint: input.kernelBindingFingerprint,
        policySetFingerprint: input.policySetFingerprint,
        projectorRulesFingerprint: input.projectorRulesFingerprint,
        supportManifestFingerprint: input.supportManifestFingerprint,
    });
}
function materializeTemplateCapability(value) {
    const keys = [
        "templateId",
        "version",
        "contentHash",
        "kernelBindingFingerprint",
        "policySetFingerprint",
        "projectorRulesFingerprint",
        "supportManifestFingerprint",
    ];
    if (!isRecord(value) ||
        !Object.keys(value).every((key) => [...keys, "capabilityFingerprint"].includes(key)) ||
        !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)) ||
        typeof value.templateId !== "string" ||
        !TOKEN_RE.test(value.templateId) ||
        !exactVersion(value.version) ||
        [
            value.contentHash,
            value.kernelBindingFingerprint,
            value.policySetFingerprint,
            value.projectorRulesFingerprint,
            value.supportManifestFingerprint,
        ].some((item) => typeof item !== "string" || !HASH_RE.test(item))) {
        throw new Error("v2_activity_instances_template_capability_invalid");
    }
    const body = templateCapabilityBody(value);
    const capabilityFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-structural-template-capability.v1",
        capability: body,
    });
    if (value.capabilityFingerprint !== undefined &&
        value.capabilityFingerprint !== capabilityFingerprint) {
        throw new Error("v2_activity_instances_template_capability_invalid");
    }
    return Object.freeze({ ...body, capabilityFingerprint });
}
function materializeV2GenerationCapabilitySnapshotV1(input) {
    if (!isRecord(input) ||
        !exactKeys(input, [
            "languageProfileRef",
            "familyCatalogRef",
            "requiredSessionFamilyPolicyRef",
            "templates",
        ]) ||
        !Array.isArray(input.templates) ||
        input.templates.length < 1 ||
        input.templates.length > TEMPLATE_LIMIT) {
        throw new Error("v2_activity_instances_capability_snapshot_invalid");
    }
    const languageProfileRef = exactRef(input.languageProfileRef, "profileId");
    const familyCatalogRef = exactRef(input.familyCatalogRef, "catalogId");
    const requiredSessionFamilyPolicyRef = exactRef(input.requiredSessionFamilyPolicyRef, "policyId");
    const templates = Object.freeze(input.templates.map(materializeTemplateCapability));
    const identities = templates.map((item) => `${item.templateId}@${item.version}`);
    if (new Set(identities).size !== identities.length ||
        identities.some((item, index) => index > 0 && identities[index - 1] >= item)) {
        throw new Error("v2_activity_instances_capability_snapshot_invalid");
    }
    const body = Object.freeze({
        schemaVersion: "v2-generation-capability-snapshot.v1",
        repositoryResolutionAuthority: "unverified_external_refs",
        languageProfileRef,
        familyCatalogRef,
        requiredSessionFamilyPolicyRef,
        templates,
    });
    return deepFreeze({
        ...body,
        snapshotFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
}
function parseCapabilitySnapshot(value) {
    if (!isRecord(value) ||
        !exactKeys(value, [
            "schemaVersion",
            "repositoryResolutionAuthority",
            "languageProfileRef",
            "familyCatalogRef",
            "requiredSessionFamilyPolicyRef",
            "templates",
            "snapshotFingerprint",
        ]) ||
        value.schemaVersion !== "v2-generation-capability-snapshot.v1" ||
        value.repositoryResolutionAuthority !== "unverified_external_refs" ||
        typeof value.snapshotFingerprint !== "string") {
        throw new Error("v2_activity_instances_capability_snapshot_invalid");
    }
    const rebuilt = materializeV2GenerationCapabilitySnapshotV1({
        languageProfileRef: value.languageProfileRef,
        familyCatalogRef: value.familyCatalogRef,
        requiredSessionFamilyPolicyRef: value.requiredSessionFamilyPolicyRef,
        templates: value.templates,
    });
    if (rebuilt.snapshotFingerprint !== value.snapshotFingerprint) {
        throw new Error("v2_activity_instances_capability_snapshot_invalid");
    }
    return rebuilt;
}
function assertCapabilitySnapshotBoundToPlan(plan, stageId, snapshot) {
    const stage = stageFor(plan, stageId);
    if ((0, decision_registry_1.canonicalJsonV1)(snapshot.familyCatalogRef) !==
        (0, decision_registry_1.canonicalJsonV1)(plan.courseContract.familyCatalogRef) ||
        (0, decision_registry_1.canonicalJsonV1)(snapshot.requiredSessionFamilyPolicyRef) !==
            (0, decision_registry_1.canonicalJsonV1)(plan.courseContract.requiredSessionFamilyPolicyRef)) {
        throw new Error("v2_activity_instances_capability_plan_mismatch");
    }
    const languageRequirements = plan.externalRequirementCatalog
        .map((entry) => entry.requirement)
        .filter((requirement) => requirement.dependencyType === "language_profile");
    if (languageRequirements.length !== 1 ||
        (0, decision_registry_1.canonicalJsonV1)(snapshot.languageProfileRef) !==
            (0, decision_registry_1.canonicalJsonV1)({
                profileId: languageRequirements[0].profileId,
                version: languageRequirements[0].version,
                contentHash: languageRequirements[0].contentHash,
            })) {
        throw new Error("v2_activity_instances_capability_plan_mismatch");
    }
    const requirementsById = new Map(plan.externalRequirementCatalog.map((entry) => [
        entry.requirementId,
        entry.requirement,
    ]));
    const expectedTemplates = stage.externalRequirementIds.map((requirementId) => {
        const requirement = requirementsById.get(requirementId);
        if (!requirement || requirement.dependencyType !== "published_template") {
            throw new Error("v2_activity_instances_capability_plan_mismatch");
        }
        return {
            templateId: requirement.templateId,
            version: requirement.version,
            contentHash: requirement.contentHash,
        };
    });
    const actualTemplates = snapshot.templates.map((template) => ({
        templateId: template.templateId,
        version: template.version,
        contentHash: template.contentHash,
    }));
    const sortTemplates = (values) => [...values].sort((left, right) => `${left.templateId}@${left.version}`.localeCompare(`${right.templateId}@${right.version}`, "en"));
    if ((0, decision_registry_1.canonicalJsonV1)(sortTemplates(actualTemplates)) !==
        (0, decision_registry_1.canonicalJsonV1)(sortTemplates(expectedTemplates))) {
        throw new Error("v2_activity_instances_capability_plan_mismatch");
    }
}
function pad(value) {
    return String(value).padStart(2, "0");
}
function exactSessionOrdinal(value) {
    if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 12) {
        throw new Error("v2_activity_instances_session_identity_invalid");
    }
    return Number(value);
}
function exactStageId(value) {
    if (typeof value !== "string" || !TOKEN_RE.test(value)) {
        throw new Error("v2_activity_instances_stage_identity_invalid");
    }
    return value;
}
function v2ActivitySessionId(episodeId, sessionOrdinal) {
    return (0, activity_session_package_v2_1.v2ActivitySessionIdV2)(episodeId, sessionOrdinal);
}
function stagePathPrefix(stageId, sessionOrdinal) {
    return `learning-v2/canonical/activity-instances/${(0, decision_registry_1.sha256Utf8)(exactStageId(stageId))}/sessions/${pad(exactSessionOrdinal(sessionOrdinal))}`;
}
function v2ActivitySessionSourceObjectPath(stageId, sessionOrdinal, contentHash) {
    if (!HASH_RE.test(contentHash))
        throw new Error("v2_activity_instances_object_pin_invalid");
    return `${stagePathPrefix(stageId, sessionOrdinal)}/source/${contentHash}.json`;
}
function v2ActivitySessionProjectionObjectPath(stageId, sessionOrdinal, kind, contentHash) {
    if (!HASH_RE.test(contentHash))
        throw new Error("v2_activity_instances_object_pin_invalid");
    return `${stagePathPrefix(stageId, sessionOrdinal)}/${kind}/${contentHash}.json`;
}
function stageFor(plan, stageId) {
    if (!(0, v2_canonical_generation_plan_v2_1.isV2CanonicalSeasonPlanV2)(plan))
        throw new Error("v2_activity_instances_plan_untrusted");
    if (plan.courseContract.activityInstancesSchema !==
        exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2 ||
        plan.courseContract.activitySessionShardSchema !==
            v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2) {
        throw new Error("v2_activity_instances_plan_schema_mismatch");
    }
    const stage = plan.stages.find((candidate) => candidate.stageId === stageId);
    if (!stage ||
        stage.kind !== "v2_activity_instances" ||
        stage.episodeId === null ||
        stage.locale !== null) {
        throw new Error("v2_activity_instances_stage_invalid");
    }
    return stage;
}
function parseCanonicalObjectBytes(raw, maxBytes, code) {
    if (typeof raw !== "string" ||
        raw.length > maxBytes ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > maxBytes) {
        throw new Error(code);
    }
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        throw new Error(code);
    }
    if (!isRecord(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw) {
        throw new Error(code);
    }
    return value;
}
function taskIdentity(value, capsuleKey) {
    if (!isRecord(value) ||
        typeof value.taskId !== "string" ||
        !TOKEN_RE.test(value.taskId) ||
        typeof value.activityId !== "string" ||
        !TOKEN_RE.test(value.activityId) ||
        typeof value[capsuleKey] !== "string" ||
        !TOKEN_RE.test(value[capsuleKey])) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    return Object.freeze({
        taskId: value.taskId,
        activityId: value.activityId,
        capsuleId: value[capsuleKey],
    });
}
function exactTaskSequence(tasks, capsuleKey) {
    if (!Array.isArray(tasks) || tasks.length !== 12) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    const identities = tasks.map((task, index) => {
        if (!isRecord(task) ||
            ("slot" in task && task.slot !== index + 1) ||
            ("taskOrdinal" in task && task.taskOrdinal !== index + 1)) {
            throw new Error("v2_activity_instances_task_bijection_invalid");
        }
        return taskIdentity(task, capsuleKey);
    });
    const allIds = identities.flatMap((item) => [
        item.taskId,
        item.activityId,
        item.capsuleId,
    ]);
    if (new Set(allIds).size !== allIds.length) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    return Object.freeze(identities);
}
function sameTaskSequence(expected, actual) {
    return (0, decision_registry_1.canonicalJsonV1)(actual) === (0, decision_registry_1.canonicalJsonV1)(expected);
}
function exactRenderTaskSequence(tasks) {
    if (!Array.isArray(tasks) || tasks.length !== 12) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    return Object.freeze(tasks.map((task, index) => {
        if (!isRecord(task) ||
            task.slot !== index + 1 ||
            typeof task.taskId !== "string" ||
            !TOKEN_RE.test(task.taskId)) {
            throw new Error("v2_activity_instances_task_bijection_invalid");
        }
        return task.taskId;
    }));
}
function sameRenderTaskSequence(expected, actualTaskIds) {
    return ((0, decision_registry_1.canonicalJsonV1)(expected.map(({ taskId }) => taskId)) ===
        (0, decision_registry_1.canonicalJsonV1)(actualTaskIds));
}
function parseSessionBytes(input, episodeId, targetLanguage) {
    if (!isRecord(input) || !isRecord(input.objectGenerations)) {
        throw new Error("v2_activity_instances_session_bytes_invalid");
    }
    const sessionOrdinal = exactSessionOrdinal(input.sessionOrdinal);
    const sessionId = v2ActivitySessionId(episodeId, sessionOrdinal);
    if (input.sessionId !== sessionId) {
        throw new Error("v2_activity_instances_session_identity_invalid");
    }
    let sourceHandle;
    try {
        sourceHandle = (0, v2_activity_session_projection_1.parseV2ActivitySessionProjectionSource)(input.sourceRaw);
    }
    catch {
        throw new Error("v2_activity_instances_source_bytes_invalid");
    }
    const source = sourceHandle;
    if (!exactKeys(source, [
        "schemaVersion",
        "episodeId",
        "targetLanguage",
        "normalizationLocale",
        "normalizationProfileHash",
        "session",
    ]) ||
        source.schemaVersion !== v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2 ||
        source.episodeId !== episodeId ||
        source.targetLanguage !== targetLanguage ||
        source.normalizationLocale !== targetLanguage ||
        !isRecord(source.session) ||
        source.session.sessionId !== sessionId ||
        source.session.ordinal !== sessionOrdinal) {
        throw new Error("v2_activity_instances_source_bytes_invalid");
    }
    const taskIdentities = exactTaskSequence(source.session.tasks, "localEvaluatorCapsuleId");
    const sourceFingerprint = (0, decision_registry_1.hashCanonicalBody)(source);
    const expectedProjection = (0, v2_activity_session_projection_1.buildV2ActivitySessionProjection)(sourceHandle);
    const render = parseCanonicalObjectBytes(input.renderRaw, exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES, "v2_activity_instances_render_bytes_invalid");
    if (!exactKeys(render, [
        "schemaVersion",
        "sourceFingerprint",
        "episodeId",
        "targetLanguage",
        "session",
        "executionAuthority",
        "rewardAuthority",
        "runtimeConsumer",
        "releaseAuthority",
    ]) ||
        render.schemaVersion !== v2_activity_session_projection_1.V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2 ||
        render.sourceFingerprint !== sourceFingerprint ||
        render.episodeId !== episodeId ||
        render.executionAuthority !== "none" ||
        render.rewardAuthority !== "none" ||
        render.runtimeConsumer !== false ||
        render.releaseAuthority !== false ||
        !isRecord(render.session) ||
        render.session.sessionId !== sessionId ||
        render.session.ordinal !== sessionOrdinal ||
        (0, decision_registry_1.canonicalJsonV1)(render) !==
            (0, decision_registry_1.canonicalJsonV1)(expectedProjection.renderSeed) ||
        !sameRenderTaskSequence(taskIdentities, exactRenderTaskSequence(render.session.tasks))) {
        throw new Error("v2_activity_instances_render_bytes_invalid");
    }
    const capsuleEnvelope = parseCanonicalObjectBytes(input.capsuleEnvelopeRaw, exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES, "v2_activity_instances_capsule_bytes_invalid");
    if (!exactKeys(capsuleEnvelope, [
        "schemaVersion",
        "sourceFingerprint",
        "episodeId",
        "sessionId",
        "sessionOrdinal",
        "normalizationLocale",
        "normalizationProfileHash",
        "capsules",
        "commitmentAggregate",
        "consumer",
        "verdictAuthority",
    ]) ||
        capsuleEnvelope.schemaVersion !==
            v2_activity_session_projection_1.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1 ||
        capsuleEnvelope.sourceFingerprint !== sourceFingerprint ||
        capsuleEnvelope.episodeId !== episodeId ||
        capsuleEnvelope.sessionId !== sessionId ||
        capsuleEnvelope.sessionOrdinal !== sessionOrdinal ||
        capsuleEnvelope.normalizationLocale !== source.normalizationLocale ||
        capsuleEnvelope.normalizationProfileHash !==
            source.normalizationProfileHash ||
        capsuleEnvelope.consumer !== "app_internal_local_evaluator_only" ||
        capsuleEnvelope.verdictAuthority !== "local_provisional_only" ||
        !Array.isArray(capsuleEnvelope.capsules) ||
        capsuleEnvelope.capsules.length !== 12 ||
        (0, decision_registry_1.canonicalJsonV1)(capsuleEnvelope) !==
            (0, decision_registry_1.canonicalJsonV1)(expectedProjection.appLocalCapsuleEnvelope)) {
        throw new Error("v2_activity_instances_capsule_bytes_invalid");
    }
    const capsuleIdentities = capsuleEnvelope.capsules.map((raw) => {
        if (typeof raw !== "string") {
            throw new Error("v2_activity_instances_capsule_bytes_invalid");
        }
        const handle = (0, local_evaluator_capsule_v1_1.parseV2LocalEvaluatorCapsuleV1)(raw);
        const identity = Object.freeze({
            taskId: handle.taskId,
            activityId: handle.activityId,
            capsuleId: handle.capsuleId,
        });
        if (handle.normalizationLocale !== source.normalizationLocale ||
            handle.normalizationProfileHash !== source.normalizationProfileHash) {
            throw new Error("v2_activity_instances_capsule_bytes_invalid");
        }
        return identity;
    });
    if (!sameTaskSequence(taskIdentities, capsuleIdentities)) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    const commitmentAggregate = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-session-commitment-aggregate.v2",
        sourceFingerprint,
        sessionId,
        capsules: capsuleEnvelope.capsules,
    });
    if (capsuleEnvelope.commitmentAggregate !== commitmentAggregate) {
        throw new Error("v2_activity_instances_capsule_bytes_invalid");
    }
    const sidecar = parseCanonicalObjectBytes(input.sidecarRaw, exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES, "v2_activity_instances_sidecar_bytes_invalid");
    if (!exactKeys(sidecar, [
        "schemaVersion",
        "sourceFingerprint",
        "episodeId",
        "sessionId",
        "sessionOrdinal",
        "tasks",
        "commitmentAggregate",
        "serverOnly",
        "evaluationAuthority",
        "rewardAuthority",
        "releaseAuthority",
    ]) ||
        sidecar.schemaVersion !== v2_activity_session_projection_1.V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 ||
        sidecar.sourceFingerprint !== sourceFingerprint ||
        sidecar.episodeId !== episodeId ||
        sidecar.sessionId !== sessionId ||
        sidecar.sessionOrdinal !== sessionOrdinal ||
        sidecar.commitmentAggregate !== commitmentAggregate ||
        sidecar.serverOnly !== true ||
        sidecar.evaluationAuthority !== "none" ||
        sidecar.rewardAuthority !== "none" ||
        sidecar.releaseAuthority !== false ||
        (0, decision_registry_1.canonicalJsonV1)(sidecar) !==
            (0, decision_registry_1.canonicalJsonV1)(expectedProjection.serverSidecar) ||
        !sameTaskSequence(taskIdentities, exactTaskSequence(sidecar.tasks, "capsuleId"))) {
        throw new Error("v2_activity_instances_sidecar_bytes_invalid");
    }
    const rebuiltCapsules = sidecar.tasks.map((candidate) => {
        if (!isRecord(candidate) ||
            !exactKeys(candidate, SIDECAR_TASK_KEYS) ||
            typeof candidate.capsuleId !== "string" ||
            typeof candidate.taskId !== "string" ||
            typeof candidate.activityId !== "string" ||
            typeof candidate.correctResponse !== "string" ||
            !Array.isArray(candidate.acceptedResponses) ||
            !candidate.acceptedResponses.includes(candidate.correctResponse) ||
            !Array.isArray(candidate.acceptedCommitments)) {
            throw new Error("v2_activity_instances_sidecar_bytes_invalid");
        }
        const acceptedCommitments = candidate.acceptedResponses
            .map((response) => {
            if (typeof response !== "string") {
                throw new Error("v2_activity_instances_sidecar_bytes_invalid");
            }
            try {
                return (0, local_evaluator_capsule_v1_1.createV2LocalEvaluatorCommitmentV1)({
                    capsuleId: candidate.capsuleId,
                    taskId: candidate.taskId,
                    activityId: candidate.activityId,
                    family: candidate.family,
                    inputKind: candidate.inputKind,
                    normalizationLocale: candidate.normalizationLocale,
                    normalizationProfileHash: candidate.normalizationProfileHash,
                    salt: candidate.salt,
                    response,
                });
            }
            catch {
                throw new Error("v2_activity_instances_sidecar_bytes_invalid");
            }
        })
            .sort();
        if ((0, decision_registry_1.canonicalJsonV1)(acceptedCommitments) !==
            (0, decision_registry_1.canonicalJsonV1)(candidate.acceptedCommitments)) {
            throw new Error("v2_activity_instances_sidecar_bytes_invalid");
        }
        try {
            return (0, local_evaluator_capsule_v1_1.buildV2LocalEvaluatorCapsuleRawV1)({
                capsuleId: candidate.capsuleId,
                taskId: candidate.taskId,
                activityId: candidate.activityId,
                family: candidate.family,
                inputKind: candidate.inputKind,
                normalizationLocale: candidate.normalizationLocale,
                normalizationProfileHash: candidate.normalizationProfileHash,
                salt: candidate.salt,
                acceptedCommitments,
            });
        }
        catch {
            throw new Error("v2_activity_instances_sidecar_bytes_invalid");
        }
    });
    if ((0, decision_registry_1.canonicalJsonV1)(rebuiltCapsules) !==
        (0, decision_registry_1.canonicalJsonV1)(capsuleEnvelope.capsules)) {
        throw new Error("v2_activity_instances_capsule_sidecar_mismatch");
    }
    for (const generation of Object.values(input.objectGenerations)) {
        if (typeof generation !== "string" || !GENERATION_RE.test(generation)) {
            throw new Error("v2_activity_instances_object_pin_invalid");
        }
    }
    return Object.freeze({
        sessionOrdinal,
        sessionId,
        taskIdentities,
        sourceFingerprint,
        sourceHandle,
        sourceRaw: input.sourceRaw,
        renderRaw: input.renderRaw,
        capsuleEnvelopeRaw: input.capsuleEnvelopeRaw,
        sidecarRaw: input.sidecarRaw,
    });
}
function pinFromCanonicalBytes(raw, objectPath, objectGeneration) {
    return Object.freeze({
        objectPath,
        contentHash: (0, decision_registry_1.sha256Utf8)(raw),
        objectGeneration,
        byteSize: (0, decision_registry_1.utf8ByteLengthV1)(raw),
    });
}
function materializeSessionRow(plan, stageId, input, ordinal, capabilitySnapshotFingerprint) {
    const stage = stageFor(plan, stageId);
    if (!isRecord(input) || input.sessionOrdinal !== ordinal) {
        throw new Error("v2_activity_instances_session_identity_invalid");
    }
    const parsed = parseSessionBytes(input, stage.episodeId, plan.targetLanguage);
    const source = pinFromCanonicalBytes(parsed.sourceRaw, v2ActivitySessionSourceObjectPath(stageId, ordinal, (0, decision_registry_1.sha256Utf8)(parsed.sourceRaw)), input.objectGenerations.source);
    const renderHash = (0, decision_registry_1.sha256Utf8)(parsed.renderRaw);
    const render = pinFromCanonicalBytes(parsed.renderRaw, v2ActivitySessionProjectionObjectPath(stageId, ordinal, "render", renderHash), input.objectGenerations.render);
    const capsuleHash = (0, decision_registry_1.sha256Utf8)(parsed.capsuleEnvelopeRaw);
    const capsule = pinFromCanonicalBytes(parsed.capsuleEnvelopeRaw, v2ActivitySessionProjectionObjectPath(stageId, ordinal, "capsule", capsuleHash), input.objectGenerations.capsule);
    const sidecarHash = (0, decision_registry_1.sha256Utf8)(parsed.sidecarRaw);
    const sidecar = pinFromCanonicalBytes(parsed.sidecarRaw, v2ActivitySessionProjectionObjectPath(stageId, ordinal, "sidecar", sidecarHash), input.objectGenerations.sidecar);
    const taskIdentityFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-session-task-identities.v2",
        episodeId: stage.episodeId,
        sessionOrdinal: ordinal,
        sessionId: parsed.sessionId,
        tasks: parsed.taskIdentities,
    });
    const generationInputFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-session-generation-input.v2",
        planFingerprint: plan.planFingerprint,
        stageId,
        episodeId: stage.episodeId,
        sessionOrdinal: ordinal,
        sourceFingerprint: parsed.sourceFingerprint,
        capabilitySnapshotFingerprint,
    });
    const body = Object.freeze({
        sessionOrdinal: ordinal,
        sessionId: parsed.sessionId,
        taskCount: 12,
        generationInputFingerprint,
        capabilitySnapshotFingerprint,
        taskIdentityFingerprint,
        source,
        render,
        capsule,
        sidecar,
    });
    const pairFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-session-storage-pair.v2",
        planFingerprint: plan.planFingerprint,
        stageId,
        episodeId: stage.episodeId,
        session: body,
    });
    return deepFreeze({
        ...body,
        pairFingerprint,
    });
}
function authoringBody(plan, stageId, capabilitySnapshot, sessions) {
    const stage = stageFor(plan, stageId);
    const contentAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-instances-content-aggregate.v2",
        planFingerprint: plan.planFingerprint,
        stageId,
        episodeId: stage.episodeId,
        sessions: sessions.map((row) => ({
            sessionOrdinal: row.sessionOrdinal,
            sessionId: row.sessionId,
            generationInputFingerprint: row.generationInputFingerprint,
            capabilitySnapshotFingerprint: row.capabilitySnapshotFingerprint,
            taskIdentityFingerprint: row.taskIdentityFingerprint,
            sourceContentHash: row.source.contentHash,
            renderContentHash: row.render.contentHash,
            capsuleContentHash: row.capsule.contentHash,
            sidecarContentHash: row.sidecar.contentHash,
        })),
    });
    const storageAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-instances-storage-aggregate.v2",
        planFingerprint: plan.planFingerprint,
        stageId,
        pairFingerprints: sessions.map((row) => row.pairFingerprint),
    });
    return Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2,
        planSchemaVersion: plan.schemaVersion,
        compilerVersion: plan.compilerVersion,
        coordinateSchemaVersion: plan.coordinateSchemaVersion,
        artifactModel: plan.courseContract.artifactModel,
        planFingerprint: plan.planFingerprint,
        stageId,
        stageKind: "v2_activity_instances",
        workspaceId: plan.workspaceId,
        jobId: plan.jobId,
        authoringRevision: plan.authoringRevision,
        seasonId: plan.seasonId,
        episodeId: stage.episodeId,
        sessionCount: 12,
        taskCount: 144,
        capabilitySnapshot,
        sessions: Object.freeze([...sessions]),
        contentAggregateFingerprint,
        storageAggregateFingerprint,
        repositoryResolutionAuthority: "unverified_external_refs",
        objectPinEvidence: "unverified_structural_only",
        executionAuthority: "none",
        storageAuthority: "none",
        humanReviewAuthority: "none",
        specialistEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
}
function materializeV2ActivityInstancesAuthoringRootV2(input) {
    if (!isRecord(input) || !isRecord(input.capabilitySnapshot)) {
        throw new Error("v2_activity_instances_authoring_root_invalid");
    }
    const stage = stageFor(input.plan, input.stageId);
    void stage;
    const capabilitySnapshot = Object.prototype.hasOwnProperty.call(input.capabilitySnapshot, "snapshotFingerprint")
        ? parseCapabilitySnapshot(input.capabilitySnapshot)
        : materializeV2GenerationCapabilitySnapshotV1(input.capabilitySnapshot);
    assertCapabilitySnapshotBoundToPlan(input.plan, input.stageId, capabilitySnapshot);
    if (!Array.isArray(input.sessions) ||
        input.sessions.length !== exports.V2_ACTIVITY_SESSION_COUNT) {
        throw new Error("v2_activity_instances_session_count_invalid");
    }
    const parsedSessions = input.sessions.map((session, index) => {
        if (session.sessionOrdinal !== index + 1) {
            throw new Error("v2_activity_instances_session_identity_invalid");
        }
        return parseSessionBytes(session, stage.episodeId, input.plan.targetLanguage);
    });
    try {
        (0, v2_activity_session_projection_1.assembleV2ActivityEpisodeProjectionV1)(parsedSessions.map((session) => session.sourceHandle));
    }
    catch {
        throw new Error("v2_activity_instances_episode_projection_invalid");
    }
    const episodeObjectIds = parsedSessions.flatMap((session) => session.taskIdentities.flatMap((task) => [
        task.taskId,
        task.activityId,
        task.capsuleId,
    ]));
    if (new Set(episodeObjectIds).size !== 12 * 12 * 3) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    const sessions = Object.freeze(input.sessions.map((row, index) => materializeSessionRow(input.plan, input.stageId, row, index + 1, capabilitySnapshot.snapshotFingerprint)));
    const body = authoringBody(input.plan, input.stageId, capabilitySnapshot, sessions);
    const root = deepFreeze({
        ...body,
        packageFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(root)) >
        exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES) {
        throw new Error("v2_activity_instances_authoring_root_too_large");
    }
    authoringRootHandles.add(root);
    return root;
}
function untrustedReadPermit(stageId, sessionOrdinal, sessionId, kind, value) {
    const maximumBytes = kind === "source"
        ? exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES
        : kind === "render"
            ? exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES
            : kind === "capsule"
                ? exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES
                : exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES;
    if (!isRecord(value) ||
        !exactKeys(value, OBJECT_PIN_KEYS) ||
        typeof value.contentHash !== "string" ||
        !HASH_RE.test(value.contentHash) ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) > maximumBytes) {
        throw new Error("v2_activity_instances_manifest_pin_invalid");
    }
    const expectedPath = kind === "source"
        ? v2ActivitySessionSourceObjectPath(stageId, sessionOrdinal, value.contentHash)
        : v2ActivitySessionProjectionObjectPath(stageId, sessionOrdinal, kind, value.contentHash);
    if (value.objectPath !== expectedPath)
        throw new Error("v2_activity_instances_manifest_pin_invalid");
    return Object.freeze({
        sessionOrdinal,
        sessionId,
        kind,
        objectPath: expectedPath,
        contentHash: value.contentHash,
        objectGeneration: value.objectGeneration,
        declaredByteSize: Number(value.byteSize),
        maximumBytes,
    });
}
function parseV2ActivityInstancesUntrustedRootManifestPermitsV2(raw, plan, stageId) {
    const decoded = parseUntrustedCanonicalAuthoringRootRaw(raw);
    const stage = stageFor(plan, stageId);
    if (!exactKeys(decoded, AUTHORING_ROOT_KEYS) ||
        decoded.schemaVersion !== exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2 ||
        decoded.planSchemaVersion !== plan.schemaVersion ||
        decoded.compilerVersion !== plan.compilerVersion ||
        decoded.coordinateSchemaVersion !== plan.coordinateSchemaVersion ||
        decoded.artifactModel !== plan.courseContract.artifactModel ||
        decoded.planFingerprint !== plan.planFingerprint ||
        decoded.stageId !== stageId ||
        decoded.stageKind !== "v2_activity_instances" ||
        decoded.workspaceId !== plan.workspaceId ||
        decoded.jobId !== plan.jobId ||
        decoded.authoringRevision !== plan.authoringRevision ||
        decoded.seasonId !== plan.seasonId ||
        decoded.episodeId !== stage.episodeId ||
        decoded.sessionCount !== exports.V2_ACTIVITY_SESSION_COUNT ||
        decoded.taskCount !== exports.V2_ACTIVITY_TASK_COUNT ||
        decoded.repositoryResolutionAuthority !== "unverified_external_refs" ||
        decoded.objectPinEvidence !== "unverified_structural_only" ||
        decoded.executionAuthority !== "none" ||
        decoded.storageAuthority !== "none" ||
        decoded.humanReviewAuthority !== "none" ||
        decoded.specialistEvidenceAuthority !== "none" ||
        decoded.deviceEvidenceAuthority !== "none" ||
        decoded.publicationPolicy !== "draft_only_no_consumer" ||
        decoded.runtimeConsumer !== false ||
        decoded.releaseEligible !== false ||
        decoded.releaseAuthority !== false ||
        typeof decoded.packageFingerprint !== "string" ||
        !HASH_RE.test(decoded.packageFingerprint) ||
        typeof decoded.contentAggregateFingerprint !== "string" ||
        !HASH_RE.test(decoded.contentAggregateFingerprint) ||
        typeof decoded.storageAggregateFingerprint !== "string" ||
        !HASH_RE.test(decoded.storageAggregateFingerprint)) {
        throw new Error("v2_activity_instances_manifest_invalid");
    }
    const capabilitySnapshot = parseCapabilitySnapshot(decoded.capabilitySnapshot);
    assertCapabilitySnapshotBoundToPlan(plan, stageId, capabilitySnapshot);
    if (!Array.isArray(decoded.sessions) ||
        decoded.sessions.length !== exports.V2_ACTIVITY_SESSION_COUNT) {
        throw new Error("v2_activity_instances_manifest_permit_count_invalid");
    }
    const permits = [];
    const normalizedRows = [];
    let totalDeclaredByteSize = 0;
    for (let index = 0; index < decoded.sessions.length; index += 1) {
        const value = decoded.sessions[index];
        const sessionOrdinal = index + 1;
        const sessionId = (0, activity_session_package_v2_1.v2ActivitySessionIdV2)(stage.episodeId, sessionOrdinal);
        if (!isRecord(value) ||
            !exactKeys(value, AUTHORING_SESSION_ROW_KEYS) ||
            value.sessionOrdinal !== sessionOrdinal ||
            value.sessionId !== sessionId ||
            value.taskCount !== exports.V2_ACTIVITY_TASKS_PER_SESSION ||
            value.capabilitySnapshotFingerprint !==
                capabilitySnapshot.snapshotFingerprint ||
            typeof value.generationInputFingerprint !== "string" ||
            !HASH_RE.test(value.generationInputFingerprint) ||
            typeof value.taskIdentityFingerprint !== "string" ||
            !HASH_RE.test(value.taskIdentityFingerprint) ||
            typeof value.pairFingerprint !== "string" ||
            !HASH_RE.test(value.pairFingerprint)) {
            throw new Error("v2_activity_instances_manifest_session_invalid");
        }
        const rowPermits = ["source", "render", "capsule", "sidecar"].map((kind) => untrustedReadPermit(stageId, sessionOrdinal, sessionId, kind, value[kind]));
        for (const permit of rowPermits) {
            const nextTotal = totalDeclaredByteSize + permit.declaredByteSize;
            if (!Number.isSafeInteger(nextTotal) ||
                nextTotal > exports.V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES) {
                throw new Error("v2_activity_instances_manifest_aggregate_oversize");
            }
            totalDeclaredByteSize = nextTotal;
            permits.push(permit);
        }
        const rowBody = Object.freeze({
            sessionOrdinal,
            sessionId,
            taskCount: 12,
            generationInputFingerprint: value.generationInputFingerprint,
            capabilitySnapshotFingerprint: capabilitySnapshot.snapshotFingerprint,
            taskIdentityFingerprint: value.taskIdentityFingerprint,
            source: value.source,
            render: value.render,
            capsule: value.capsule,
            sidecar: value.sidecar,
        });
        const expectedPairFingerprint = (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "v2-activity-session-storage-pair.v2",
            planFingerprint: plan.planFingerprint,
            stageId,
            episodeId: stage.episodeId,
            session: rowBody,
        });
        if (value.pairFingerprint !== expectedPairFingerprint)
            throw new Error("v2_activity_instances_manifest_session_invalid");
        normalizedRows.push(Object.freeze({
            ...rowBody,
            pairFingerprint: expectedPairFingerprint,
        }));
    }
    if (permits.length !== exports.V2_ACTIVITY_SESSION_COUNT * 4 ||
        new Set(permits.map((permit) => permit.objectPath)).size !== permits.length) {
        throw new Error("v2_activity_instances_manifest_permit_count_invalid");
    }
    const expectedContentAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-instances-content-aggregate.v2",
        planFingerprint: plan.planFingerprint,
        stageId,
        episodeId: stage.episodeId,
        sessions: normalizedRows.map((row) => ({
            sessionOrdinal: row.sessionOrdinal,
            sessionId: row.sessionId,
            generationInputFingerprint: row.generationInputFingerprint,
            capabilitySnapshotFingerprint: row.capabilitySnapshotFingerprint,
            taskIdentityFingerprint: row.taskIdentityFingerprint,
            sourceContentHash: row.source.contentHash,
            renderContentHash: row.render.contentHash,
            capsuleContentHash: row.capsule.contentHash,
            sidecarContentHash: row.sidecar.contentHash,
        })),
    });
    const expectedStorageAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-instances-storage-aggregate.v2",
        planFingerprint: plan.planFingerprint,
        stageId,
        pairFingerprints: normalizedRows.map((row) => row.pairFingerprint),
    });
    const { packageFingerprint: _packageFingerprint, ...body } = decoded;
    if (decoded.contentAggregateFingerprint !==
        expectedContentAggregateFingerprint ||
        decoded.storageAggregateFingerprint !==
            expectedStorageAggregateFingerprint ||
        decoded.packageFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
        throw new Error("v2_activity_instances_manifest_fingerprint_invalid");
    }
    const frozenPermits = Object.freeze([...permits]);
    const aggregateBody = Object.freeze({
        schemaVersion: "v2-activity-instances-untrusted-read-permits.v2",
        trust: "untrusted_structural_only",
        planFingerprint: plan.planFingerprint,
        stageId,
        episodeId: stage.episodeId,
        packageFingerprint: decoded.packageFingerprint,
        permitCount: 48,
        totalDeclaredByteSize,
        maximumAggregateBytes: exports.V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
        permits: frozenPermits,
    });
    return deepFreeze({
        ...aggregateBody,
        permitAggregateFingerprint: (0, decision_registry_1.hashCanonicalBody)(aggregateBody),
    });
}
function parseV2ActivityInstancesAuthoringRootV2(raw, plan, stageId, sessionBytes) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_MAX_BYTES) {
        throw new Error("v2_activity_instances_authoring_root_too_large");
    }
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        throw new Error("v2_activity_instances_authoring_root_invalid");
    }
    if (!isRecord(decoded) ||
        !exactKeys(decoded, AUTHORING_ROOT_KEYS) ||
        decoded.schemaVersion !== exports.V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2) {
        throw new Error("v2_activity_instances_authoring_root_invalid");
    }
    if (!(0, v2_canonical_generation_plan_v2_1.isV2CanonicalSeasonPlanV2)(plan)) {
        throw new Error("v2_activity_instances_authoring_root_invalid");
    }
    const rebuilt = materializeV2ActivityInstancesAuthoringRootV2({
        plan,
        stageId,
        capabilitySnapshot: decoded.capabilitySnapshot,
        sessions: sessionBytes,
    });
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw ||
        decoded.packageFingerprint !== rebuilt.packageFingerprint) {
        throw new Error("v2_activity_instances_authoring_root_invalid");
    }
    return rebuilt;
}
function deviceRow(root, row) {
    const body = Object.freeze({
        sessionOrdinal: row.sessionOrdinal,
        sessionId: row.sessionId,
        taskCount: 12,
        generationInputFingerprint: row.generationInputFingerprint,
        taskIdentityFingerprint: row.taskIdentityFingerprint,
        render: row.render,
        capsule: row.capsule,
    });
    return deepFreeze({
        ...body,
        devicePairFingerprint: (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "v2-activity-session-device-pair.v2",
            planFingerprint: root.planFingerprint,
            stageId: root.stageId,
            session: body,
        }),
    });
}
function materializeV2ActivityInstancesDeviceRootV2(root) {
    if (!root ||
        typeof root !== "object" ||
        !authoringRootHandles.has(root)) {
        throw new Error("v2_activity_instances_authoring_root_untrusted");
    }
    const sessions = Object.freeze(root.sessions.map((row) => deviceRow(root, row)));
    const deviceContentAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-instances-device-content-aggregate.v2",
        planFingerprint: root.planFingerprint,
        stageId: root.stageId,
        devicePairFingerprints: sessions.map((row) => row.devicePairFingerprint),
    });
    const body = Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_SCHEMA_V2,
        planFingerprint: root.planFingerprint,
        stageId: root.stageId,
        episodeId: root.episodeId,
        sessionCount: 12,
        taskCount: 144,
        capabilitySnapshotFingerprint: root.capabilitySnapshot.snapshotFingerprint,
        sessions,
        deviceContentAggregateFingerprint,
        renderConsumer: "learner_renderer",
        capsuleConsumer: "app_internal_local_evaluator_only",
        localFeedbackAuthority: "local_provisional_only",
        assessmentSecrecy: "none_device_inspectable",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const device = deepFreeze({
        ...body,
        deviceRootFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(device)) >
        exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_MAX_BYTES) {
        throw new Error("v2_activity_instances_device_root_too_large");
    }
    deviceRootHandles.add(device);
    return device;
}
function parseV2ActivityInstancesDeviceRootV2(raw) {
    const decoded = parseCanonicalObjectBytes(raw, exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_MAX_BYTES, "v2_activity_instances_device_root_invalid");
    if (!exactKeys(decoded, [
        "schemaVersion",
        "planFingerprint",
        "stageId",
        "episodeId",
        "sessionCount",
        "taskCount",
        "capabilitySnapshotFingerprint",
        "sessions",
        "deviceContentAggregateFingerprint",
        "renderConsumer",
        "capsuleConsumer",
        "localFeedbackAuthority",
        "assessmentSecrecy",
        "walletAuthority",
        "masteryAuthority",
        "evidenceAuthority",
        "publicationPolicy",
        "runtimeConsumer",
        "releaseEligible",
        "releaseAuthority",
        "deviceRootFingerprint",
    ]) ||
        decoded.schemaVersion !== exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_SCHEMA_V2 ||
        typeof decoded.planFingerprint !== "string" ||
        !HASH_RE.test(decoded.planFingerprint) ||
        typeof decoded.stageId !== "string" ||
        !TOKEN_RE.test(decoded.stageId) ||
        typeof decoded.episodeId !== "string" ||
        !TOKEN_RE.test(decoded.episodeId) ||
        decoded.sessionCount !== 12 ||
        decoded.taskCount !== 144 ||
        typeof decoded.capabilitySnapshotFingerprint !== "string" ||
        !HASH_RE.test(decoded.capabilitySnapshotFingerprint) ||
        !Array.isArray(decoded.sessions) ||
        decoded.sessions.length !== 12) {
        throw new Error("v2_activity_instances_device_root_invalid");
    }
    const planFingerprint = decoded.planFingerprint;
    const stageId = decoded.stageId;
    const episodeId = decoded.episodeId;
    const sessions = Object.freeze(decoded.sessions.map((candidate, index) => {
        const sessionOrdinal = index + 1;
        if (!isRecord(candidate) ||
            !exactKeys(candidate, [
                "sessionOrdinal",
                "sessionId",
                "taskCount",
                "generationInputFingerprint",
                "taskIdentityFingerprint",
                "render",
                "capsule",
                "devicePairFingerprint",
            ]) ||
            candidate.sessionOrdinal !== sessionOrdinal ||
            candidate.sessionId !==
                v2ActivitySessionId(episodeId, sessionOrdinal) ||
            candidate.taskCount !== 12 ||
            typeof candidate.generationInputFingerprint !== "string" ||
            !HASH_RE.test(candidate.generationInputFingerprint) ||
            typeof candidate.taskIdentityFingerprint !== "string" ||
            !HASH_RE.test(candidate.taskIdentityFingerprint) ||
            !isRecord(candidate.render) ||
            !isRecord(candidate.capsule)) {
            throw new Error("v2_activity_instances_device_root_invalid");
        }
        const parsePin = (value, kind, maximumBytes) => {
            if (!exactKeys(value, [
                "objectPath",
                "contentHash",
                "objectGeneration",
                "byteSize",
            ]) ||
                typeof value.contentHash !== "string" ||
                !HASH_RE.test(value.contentHash) ||
                value.objectPath !==
                    v2ActivitySessionProjectionObjectPath(stageId, sessionOrdinal, kind, value.contentHash) ||
                typeof value.objectGeneration !== "string" ||
                !GENERATION_RE.test(value.objectGeneration) ||
                !Number.isSafeInteger(value.byteSize) ||
                Number(value.byteSize) < 1 ||
                Number(value.byteSize) > maximumBytes) {
                throw new Error("v2_activity_instances_device_root_invalid");
            }
            return Object.freeze({
                objectPath: value.objectPath,
                contentHash: value.contentHash,
                objectGeneration: value.objectGeneration,
                byteSize: Number(value.byteSize),
            });
        };
        const rowBody = Object.freeze({
            sessionOrdinal,
            sessionId: candidate.sessionId,
            taskCount: 12,
            generationInputFingerprint: candidate.generationInputFingerprint,
            taskIdentityFingerprint: candidate.taskIdentityFingerprint,
            render: parsePin(candidate.render, "render", exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES),
            capsule: parsePin(candidate.capsule, "capsule", exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES),
        });
        const row = deepFreeze({
            ...rowBody,
            devicePairFingerprint: (0, decision_registry_1.hashCanonicalBody)({
                schemaVersion: "v2-activity-session-device-pair.v2",
                planFingerprint,
                stageId,
                session: rowBody,
            }),
        });
        if (candidate.devicePairFingerprint !== row.devicePairFingerprint) {
            throw new Error("v2_activity_instances_device_root_invalid");
        }
        return row;
    }));
    const deviceContentAggregateFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-instances-device-content-aggregate.v2",
        planFingerprint,
        stageId,
        devicePairFingerprints: sessions.map((row) => row.devicePairFingerprint),
    });
    const body = Object.freeze({
        schemaVersion: exports.V2_ACTIVITY_INSTANCES_DEVICE_ROOT_SCHEMA_V2,
        planFingerprint,
        stageId,
        episodeId,
        sessionCount: 12,
        taskCount: 144,
        capabilitySnapshotFingerprint: decoded.capabilitySnapshotFingerprint,
        sessions,
        deviceContentAggregateFingerprint,
        renderConsumer: "learner_renderer",
        capsuleConsumer: "app_internal_local_evaluator_only",
        localFeedbackAuthority: "local_provisional_only",
        assessmentSecrecy: "none_device_inspectable",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationPolicy: "draft_only_no_consumer",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
    const rebuilt = deepFreeze({
        ...body,
        deviceRootFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if (decoded.deviceContentAggregateFingerprint !==
        deviceContentAggregateFingerprint ||
        decoded.renderConsumer !== rebuilt.renderConsumer ||
        decoded.capsuleConsumer !== rebuilt.capsuleConsumer ||
        decoded.localFeedbackAuthority !== rebuilt.localFeedbackAuthority ||
        decoded.assessmentSecrecy !== rebuilt.assessmentSecrecy ||
        decoded.walletAuthority !== "none" ||
        decoded.masteryAuthority !== "none" ||
        decoded.evidenceAuthority !== "none" ||
        decoded.publicationPolicy !== "draft_only_no_consumer" ||
        decoded.runtimeConsumer !== false ||
        decoded.releaseEligible !== false ||
        decoded.releaseAuthority !== false ||
        decoded.deviceRootFingerprint !== rebuilt.deviceRootFingerprint ||
        (0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw) {
        throw new Error("v2_activity_instances_device_root_invalid");
    }
    deviceRootHandles.add(rebuilt);
    return rebuilt;
}
function loadV2ActivityInstancesDeviceSessionV2(input) {
    if (!isRecord(input) || !deviceRootHandles.has(input.deviceRoot)) {
        throw new Error("v2_activity_instances_device_root_untrusted");
    }
    if (typeof input.renderRaw !== "string" ||
        input.renderRaw.length > exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES ||
        typeof input.capsuleEnvelopeRaw !== "string" ||
        input.capsuleEnvelopeRaw.length > exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES) {
        throw new Error("v2_activity_instances_device_bytes_mismatch");
    }
    const sessionOrdinal = exactSessionOrdinal(input.sessionOrdinal);
    const expected = input.deviceRoot.sessions[sessionOrdinal - 1];
    if (!expected || expected.sessionOrdinal !== sessionOrdinal) {
        throw new Error("v2_activity_instances_device_session_invalid");
    }
    if ((0, decision_registry_1.sha256Utf8)(input.renderRaw) !== expected.render.contentHash ||
        (0, decision_registry_1.utf8ByteLengthV1)(input.renderRaw) !== expected.render.byteSize ||
        (0, decision_registry_1.sha256Utf8)(input.capsuleEnvelopeRaw) !== expected.capsule.contentHash ||
        (0, decision_registry_1.utf8ByteLengthV1)(input.capsuleEnvelopeRaw) !== expected.capsule.byteSize) {
        throw new Error("v2_activity_instances_device_bytes_mismatch");
    }
    const render = parseCanonicalObjectBytes(input.renderRaw, exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES, "v2_activity_instances_render_bytes_invalid");
    if (render.schemaVersion !== v2_activity_session_projection_1.V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2 ||
        render.episodeId !== input.deviceRoot.episodeId ||
        !isRecord(render.session) ||
        render.session.sessionId !== expected.sessionId ||
        render.session.ordinal !== sessionOrdinal) {
        throw new Error("v2_activity_instances_device_session_invalid");
    }
    const renderTaskIds = exactRenderTaskSequence(render.session.tasks);
    const envelope = parseCanonicalObjectBytes(input.capsuleEnvelopeRaw, exports.V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES, "v2_activity_instances_capsule_bytes_invalid");
    if (envelope.schemaVersion !== v2_activity_session_projection_1.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1 ||
        envelope.sourceFingerprint !== render.sourceFingerprint ||
        envelope.episodeId !== input.deviceRoot.episodeId ||
        envelope.sessionId !== expected.sessionId ||
        envelope.sessionOrdinal !== sessionOrdinal ||
        !Array.isArray(envelope.capsules) ||
        envelope.capsules.length !== 12) {
        throw new Error("v2_activity_instances_capsule_bytes_invalid");
    }
    const capsulesByTaskId = new Map();
    const capsuleIdentities = envelope.capsules.map((raw) => {
        if (typeof raw !== "string") {
            throw new Error("v2_activity_instances_capsule_bytes_invalid");
        }
        const capsule = (0, local_evaluator_capsule_v1_1.parseV2LocalEvaluatorCapsuleV1)(raw);
        const identity = Object.freeze({
            taskId: capsule.taskId,
            activityId: capsule.activityId,
            capsuleId: capsule.capsuleId,
        });
        if (!(0, local_evaluator_capsule_v1_1.isV2LocalEvaluatorCapsuleHandleV1)(capsule) ||
            capsule.taskId !== identity.taskId ||
            capsule.activityId !== identity.activityId ||
            capsule.capsuleId !== identity.capsuleId ||
            capsulesByTaskId.has(identity.taskId)) {
            throw new Error("v2_activity_instances_capsule_bytes_invalid");
        }
        capsulesByTaskId.set(identity.taskId, capsule);
        return identity;
    });
    if (!sameRenderTaskSequence(capsuleIdentities, renderTaskIds)) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    const taskIdentityFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-session-task-identities.v2",
        episodeId: input.deviceRoot.episodeId,
        sessionOrdinal,
        sessionId: expected.sessionId,
        tasks: capsuleIdentities,
    });
    if (taskIdentityFingerprint !== expected.taskIdentityFingerprint) {
        throw new Error("v2_activity_instances_task_bijection_invalid");
    }
    const handle = Object.freeze({
        schemaVersion: "v2-activity-instances-device-integrity-handle.v2",
        deviceRootFingerprint: input.deviceRoot.deviceRootFingerprint,
        sessionOrdinal,
        sessionId: expected.sessionId,
        taskCount: 12,
        taskIdentityFingerprint,
        renderPayloadFingerprint: expected.render.contentHash,
        capsuleEnvelopeFingerprint: expected.capsule.contentHash,
        localFeedbackAuthority: "local_provisional_only",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
    });
    deviceIntegrityHandles.set(handle, {
        renderPayload: deepFreeze(render),
        capsulesByTaskId,
    });
    return handle;
}
function getV2ActivityInstancesDeviceRenderPayloadV2(handle) {
    const internal = deviceIntegrityHandles.get(handle);
    if (!internal) {
        throw new Error("v2_activity_instances_device_handle_untrusted");
    }
    return internal.renderPayload;
}
function getV2ActivityInstancesDeviceEvaluatorHandleV2(handle, taskId) {
    const internal = deviceIntegrityHandles.get(handle);
    const capsule = internal?.capsulesByTaskId.get(taskId);
    if (!capsule) {
        throw new Error("v2_activity_instances_device_task_invalid");
    }
    return capsule;
}
function isV2ActivityInstancesDeviceIntegrityHandleV2(value) {
    return (typeof value === "object" &&
        value !== null &&
        deviceIntegrityHandles.has(value));
}
function isV2ActivityInstancesAuthoringRootV2(value) {
    return (typeof value === "object" &&
        value !== null &&
        authoringRootHandles.has(value));
}
function isV2ActivityInstancesDeviceRootV2(value) {
    return (typeof value === "object" &&
        value !== null &&
        deviceRootHandles.has(value));
}
//# sourceMappingURL=v2_activity_instances_package_v2.js.map