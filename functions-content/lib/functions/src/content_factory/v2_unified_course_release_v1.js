"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_UNIFIED_COURSE_RELEASE_EPISODE_COUNT_V1 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1 = void 0;
exports.materializeV2UnifiedCourseReleaseRootV1 = materializeV2UnifiedCourseReleaseRootV1;
exports.parseV2UnifiedCourseReleaseRootV1 = parseV2UnifiedCourseReleaseRootV1;
exports.isV2UnifiedCourseReleaseRootV1 = isV2UnifiedCourseReleaseRootV1;
exports.decideV2UnifiedCourseReleaseHeadV1 = decideV2UnifiedCourseReleaseHeadV1;
exports.parseV2UnifiedCourseReleaseHeadV1 = parseV2UnifiedCourseReleaseHeadV1;
exports.isV2UnifiedCourseReleaseHeadV1 = isV2UnifiedCourseReleaseHeadV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const generator_course_contract_1 = require("../../../modules/learning-v2/content/generator_course_contract");
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1 = "v2-unified-course-release-root.v1";
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1 = "v2-unified-course-release-head.v1";
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1 = 512 * 1024;
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1 = 32 * 1024;
exports.V2_UNIFIED_COURSE_RELEASE_EPISODE_COUNT_V1 = 32;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LOCALE_RE = /^[a-z]{2,8}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const CONTENT_TYPE = "application/json; charset=utf-8";
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const rootHandles = new WeakSet();
const headHandles = new WeakSet();
const EPISODE_KEYS = Object.freeze([
    "episodeOrdinal",
    "episodeId",
    "stageId",
    "activityAssemblyFingerprint",
    "activityPackageFingerprint",
    "ownerInputFingerprint",
    "ownerConfirmationFingerprint",
    "ownerConfirmationObject",
    "learnerCoreIndexFingerprint",
    "learnerCoreIndexObject",
    "serverEvaluatorIndexFingerprint",
    "serverEvaluatorIndexObject",
    "auxiliaryIndexFingerprint",
    "auxiliaryIndexObject",
    "voiceAudioIndexFingerprint",
    "voiceAudioIndexObject",
    "localizationIndexFingerprint",
    "localizationIndexObject",
    "errorGuidanceIndexFingerprint",
    "errorGuidanceIndexObject",
    "episodeReleaseFingerprint",
]);
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "releaseId",
    "activeManifestHash",
    "planFingerprint",
    "courseContractFingerprint",
    "seasonId",
    "targetLanguage",
    "studyTarget",
    "learnerSourceLocale",
    "interfaceLocales",
    "contentClass",
    "releaseScope",
    "rollout",
    "episodes",
    "episodeCount",
    "ownerConfirmationAggregate",
    "learnerCoreAggregate",
    "serverEvaluatorAggregate",
    "auxiliaryAggregate",
    "voiceAudioAggregate",
    "localizationAggregate",
    "errorGuidanceAggregate",
    "inventoryAggregate",
    "inventoryEvidence",
    "ownerContentAuthority",
    "machineValidationAuthority",
    "humanApprovalAuthority",
    "publicationDecisionAuthority",
    "executionAuthority",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "rootFingerprint",
]);
const HEAD_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "seasonId",
    "targetLanguage",
    "studyTarget",
    "learnerSourceLocale",
    "activeReleaseId",
    "activeRootFingerprint",
    "activeRootObject",
    "previousReleaseId",
    "previousRootFingerprint",
    "previousRootObject",
    "operationRevision",
    "state",
    "operationId",
    "operationFingerprint",
    "updatedAtIso",
    "headAuthority",
    "runtimeConsumer",
    "releaseAuthority",
    "headFingerprint",
]);
function fail(code = "invalid") {
    throw new Error(`v2_unified_course_release_${code}`);
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index]))
        fail();
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
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
function exactPin(value) {
    if (!record(value))
        fail();
    exactKeys(value, PIN_KEYS);
    if (typeof value.objectPath !== "string" ||
        value.objectPath.length > 600 ||
        value.objectPath.startsWith("/") ||
        value.objectPath.includes("..") ||
        value.objectPath.includes("\\") ||
        /%2f|%5c/iu.test(value.objectPath) ||
        !GENERATION_RE.test(String(value.objectGeneration)) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) > 24 * 1024 * 1024 ||
        value.contentType !== CONTENT_TYPE)
        fail();
    exactHash(value.contentHash);
    return Object.freeze({
        objectPath: value.objectPath,
        contentHash: value.contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: value.byteSize,
        contentType: CONTENT_TYPE,
    });
}
function preflight(value) {
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length) {
        const current = stack.pop();
        if (++nodes > 20_000 || current.depth > 24)
            fail();
        if (typeof current.value === "number" &&
            (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value))))
            fail();
        if (typeof current.value === "string" &&
            (current.value.length > 20_000 ||
                current.value.normalize("NFC") !== current.value ||
                /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(current.value)))
            fail();
        if (Array.isArray(current.value)) {
            if (current.value.length > 256)
                fail();
            for (const child of current.value)
                stack.push({ value: child, depth: current.depth + 1 });
        }
        else if (record(current.value)) {
            const entries = Object.entries(current.value);
            if (entries.length > 64 || entries.some(([key]) => RESERVED.has(key)))
                fail();
            for (const [, child] of entries)
                stack.push({ value: child, depth: current.depth + 1 });
        }
        else if (current.value !== null &&
            !["string", "number", "boolean"].includes(typeof current.value))
            fail();
    }
}
function episodeBody(value, expectedOrdinal) {
    if (!record(value))
        fail();
    exactKeys(value, EPISODE_KEYS);
    if (value.episodeOrdinal !== expectedOrdinal)
        fail("episode_order_invalid");
    const body = {
        episodeOrdinal: expectedOrdinal,
        episodeId: exactId(value.episodeId),
        stageId: exactId(value.stageId),
        activityAssemblyFingerprint: exactHash(value.activityAssemblyFingerprint),
        activityPackageFingerprint: exactHash(value.activityPackageFingerprint),
        ownerInputFingerprint: exactHash(value.ownerInputFingerprint),
        ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
        ownerConfirmationObject: exactPin(value.ownerConfirmationObject),
        learnerCoreIndexFingerprint: exactHash(value.learnerCoreIndexFingerprint),
        learnerCoreIndexObject: exactPin(value.learnerCoreIndexObject),
        serverEvaluatorIndexFingerprint: exactHash(value.serverEvaluatorIndexFingerprint),
        serverEvaluatorIndexObject: exactPin(value.serverEvaluatorIndexObject),
        auxiliaryIndexFingerprint: exactHash(value.auxiliaryIndexFingerprint),
        auxiliaryIndexObject: exactPin(value.auxiliaryIndexObject),
        voiceAudioIndexFingerprint: exactHash(value.voiceAudioIndexFingerprint),
        voiceAudioIndexObject: exactPin(value.voiceAudioIndexObject),
        localizationIndexFingerprint: exactHash(value.localizationIndexFingerprint),
        localizationIndexObject: exactPin(value.localizationIndexObject),
        errorGuidanceIndexFingerprint: exactHash(value.errorGuidanceIndexFingerprint),
        errorGuidanceIndexObject: exactPin(value.errorGuidanceIndexObject),
    };
    if (value.episodeReleaseFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail("episode_fingerprint_mismatch");
    return Object.freeze({
        ...body,
        episodeReleaseFingerprint: value.episodeReleaseFingerprint,
    });
}
function aggregate(episodes, key) {
    return (0, decision_registry_1.hashCanonicalBody)(episodes.map((episode) => ({
        episodeOrdinal: episode.episodeOrdinal,
        value: episode[key],
    })));
}
function materializeV2UnifiedCourseReleaseRootV1(input) {
    if (!record(input))
        fail();
    // зачем: раньше боевой релиз принимал ТОЛЬКО полный сезон из 32 уроков, и
    // курс невозможно было показать, пока не готов последний урок. Владелец
    // (2026-08-16) решил разрешить частичный прод: «ослабить контракт», чтобы
    // видеть готовые уроки на телефоне сразу, а не через 31 урок.
    //
    // Ослабление узкое. Vertical slice по-прежнему ровно один урок — это его
    // определение. Полный сезон по-прежнему ровно 32. Изменилось одно: прод
    // теперь принимает и vertical slice, а не только full_season. Пустой релиз
    // и заявка «полный сезон» с неполным списком остаются ошибкой — иначе
    // приложение показало бы дыры в середине курса.
    const expectedCount = input.releaseScope === "full_season" ? 32 : 1;
    if (!Array.isArray(input.episodes) ||
        input.episodes.length !== expectedCount ||
        !["lab", "staging", "production"].includes(input.environment) ||
        !["vertical_slice", "full_season"].includes(input.releaseScope) ||
        (input.environment === "production" &&
            input.contentClass !== "production_candidate") ||
        (input.environment !== "production" &&
            input.contentClass !== "neutral_test_fixture"))
        fail("scope_invalid");
    const seen = new Set();
    const episodes = input.episodes.map((episode, index) => {
        const body = { ...episode };
        const parsed = episodeBody({ ...body, episodeReleaseFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }, index + 1);
        if (seen.has(parsed.episodeId) || seen.has(parsed.stageId))
            fail("episode_identity_duplicate");
        seen.add(parsed.episodeId);
        seen.add(parsed.stageId);
        return parsed;
    });
    const locales = [...input.interfaceLocales];
    if (!LOCALE_RE.test(input.targetLanguage) ||
        !LOCALE_RE.test(input.studyTarget) ||
        !LOCALE_RE.test(input.learnerSourceLocale) ||
        locales.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
        locales.some((locale, index) => !LOCALE_RE.test(locale) ||
            locale !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES[index]))
        fail("locale_invalid");
    const rollout = input.rollout;
    if (!record(rollout) ||
        !Number.isSafeInteger(rollout.revision) ||
        rollout.revision < 1 ||
        !["internal", "rolling_out", "live", "paused"].includes(rollout.state) ||
        ![0, 1, 5, 10, 25, 50, 100].includes(rollout.percent) ||
        !Number.isSafeInteger(rollout.cohortSaltVersion) ||
        rollout.cohortSaltVersion < 1 ||
        !Array.isArray(rollout.allowlistCohortIds) ||
        !Array.isArray(rollout.excludeCohortIds) ||
        [...rollout.allowlistCohortIds, ...rollout.excludeCohortIds].some((value) => typeof value !== "string" || !HASH_RE.test(value)) ||
        new Set(rollout.allowlistCohortIds).size !==
            rollout.allowlistCohortIds.length ||
        new Set(rollout.excludeCohortIds).size !==
            rollout.excludeCohortIds.length ||
        rollout.allowlistCohortIds.some((value, index) => index > 0 && rollout.allowlistCohortIds[index - 1] >= value) ||
        rollout.excludeCohortIds.some((value, index) => index > 0 && rollout.excludeCohortIds[index - 1] >= value) ||
        rollout.allowlistCohortIds.some((value) => rollout.excludeCohortIds.includes(value)))
        fail("rollout_invalid");
    const aggregates = {
        ownerConfirmationAggregate: aggregate(episodes, "ownerConfirmationFingerprint"),
        learnerCoreAggregate: aggregate(episodes, "learnerCoreIndexFingerprint"),
        serverEvaluatorAggregate: aggregate(episodes, "serverEvaluatorIndexFingerprint"),
        auxiliaryAggregate: aggregate(episodes, "auxiliaryIndexFingerprint"),
        voiceAudioAggregate: aggregate(episodes, "voiceAudioIndexFingerprint"),
        localizationAggregate: aggregate(episodes, "localizationIndexFingerprint"),
        errorGuidanceAggregate: aggregate(episodes, "errorGuidanceIndexFingerprint"),
    };
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1,
        environment: input.environment,
        releaseId: exactId(input.releaseId),
        activeManifestHash: exactHash(input.activeManifestHash),
        planFingerprint: exactHash(input.planFingerprint),
        courseContractFingerprint: exactHash(input.courseContractFingerprint),
        seasonId: exactId(input.seasonId),
        targetLanguage: input.targetLanguage,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
        interfaceLocales: Object.freeze(locales),
        contentClass: input.contentClass,
        releaseScope: input.releaseScope,
        rollout: Object.freeze({
            ...rollout,
            allowlistCohortIds: Object.freeze([...rollout.allowlistCohortIds]),
            excludeCohortIds: Object.freeze([...rollout.excludeCohortIds]),
        }),
        episodes: Object.freeze(episodes),
        episodeCount: episodes.length,
        ...aggregates,
        inventoryAggregate: (0, decision_registry_1.hashCanonicalBody)(episodes),
        inventoryEvidence: "immutable_generation_hash_size_content_type_pins",
        ownerContentAuthority: "none_structural_confirmation_pins_only",
        machineValidationAuthority: "structural_inventory_join_only",
        humanApprovalAuthority: "none_activation_confirmation_required",
        publicationDecisionAuthority: "none",
        executionAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    const root = Object.freeze({
        ...body,
        rootFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(root)) >
        exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1)
        fail("oversize");
    rootHandles.add(root);
    return root;
}
function parseV2UnifiedCourseReleaseRootV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    preflight(value);
    if (!record(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !== exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1 ||
        !Array.isArray(value.episodes) ||
        value.episodeCount !== value.episodes.length)
        fail();
    const expectedCount = value.releaseScope === "full_season"
        ? 32
        : value.releaseScope === "vertical_slice"
            ? 1
            : 0;
    if (value.episodes.length !== expectedCount)
        fail();
    const episodes = value.episodes.map((episode, index) => episodeBody(episode, index + 1));
    const rebuilt = materializeV2UnifiedCourseReleaseRootV1({
        environment: value.environment,
        releaseId: value.releaseId,
        activeManifestHash: value.activeManifestHash,
        planFingerprint: value.planFingerprint,
        courseContractFingerprint: value.courseContractFingerprint,
        seasonId: value.seasonId,
        targetLanguage: value.targetLanguage,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        interfaceLocales: value.interfaceLocales,
        contentClass: value.contentClass,
        releaseScope: value.releaseScope,
        rollout: value.rollout,
        episodes: episodes.map(({ episodeReleaseFingerprint: _ignored, ...episode }) => episode),
    });
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw)
        fail();
    return rebuilt;
}
function isV2UnifiedCourseReleaseRootV1(value) {
    return record(value) && rootHandles.has(value);
}
function decideV2UnifiedCourseReleaseHeadV1(input) {
    if (!isV2UnifiedCourseReleaseRootV1(input.target) ||
        !Number.isSafeInteger(input.expectedRevision) ||
        input.expectedRevision < 0)
        fail("head_invalid");
    const targetObject = exactPin(input.targetObject);
    const operationId = exactId(input.operationId);
    const operationFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        action: input.action,
        operationId,
        targetRootFingerprint: input.target.rootFingerprint,
        targetObject,
        expectedRevision: input.expectedRevision,
    });
    if (input.current &&
        headHandles.has(input.current) &&
        input.current.operationFingerprint === operationFingerprint)
        return Object.freeze({ kind: "exact_replay", head: input.current });
    if ((input.current?.operationRevision ?? 0) !== input.expectedRevision)
        fail("head_conflict");
    if (input.current &&
        (input.current.environment !== input.target.environment ||
            input.current.seasonId !== input.target.seasonId ||
            input.current.targetLanguage !== input.target.targetLanguage ||
            input.current.studyTarget !== input.target.studyTarget ||
            input.current.learnerSourceLocale !== input.target.learnerSourceLocale))
        fail("head_scope_mismatch");
    if (input.current &&
        input.current.activeRootFingerprint === input.target.rootFingerprint)
        fail("head_same_release");
    if (input.current &&
        input.current.activeReleaseId === input.target.releaseId &&
        input.current.activeRootFingerprint !== input.target.rootFingerprint)
        fail("release_identity_conflict");
    if (input.action === "rollback" &&
        (!input.current ||
            input.current.previousRootFingerprint !== input.target.rootFingerprint ||
            input.current.previousReleaseId !== input.target.releaseId ||
            (0, decision_registry_1.canonicalJsonV1)(input.current.previousRootObject) !==
                (0, decision_registry_1.canonicalJsonV1)(targetObject)))
        fail("rollback_target_invalid");
    if (input.action === "activate" &&
        input.current?.state === "rolled_back" &&
        input.current.previousRootFingerprint === input.target.rootFingerprint)
        fail("head_immediate_reactivate_forbidden");
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1,
        environment: input.target.environment,
        seasonId: input.target.seasonId,
        targetLanguage: input.target.targetLanguage,
        studyTarget: input.target.studyTarget,
        learnerSourceLocale: input.target.learnerSourceLocale,
        activeReleaseId: input.target.releaseId,
        activeRootFingerprint: input.target.rootFingerprint,
        activeRootObject: targetObject,
        previousReleaseId: input.current?.activeReleaseId ?? null,
        previousRootFingerprint: input.current?.activeRootFingerprint ?? null,
        previousRootObject: input.current?.activeRootObject ?? null,
        operationRevision: input.expectedRevision + 1,
        state: input.action === "rollback"
            ? "rolled_back"
            : "live",
        operationId,
        operationFingerprint,
        updatedAtIso: exactIso(input.updatedAtIso),
        headAuthority: "none_server_cas_and_readback_required",
        runtimeConsumer: false,
        releaseAuthority: false,
    };
    const head = Object.freeze({
        ...body,
        headFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(head)) >
        exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1)
        fail("head_oversize");
    headHandles.add(head);
    return Object.freeze({ kind: "commit", head });
}
function parseV2UnifiedCourseReleaseHeadV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1)
        fail("head_invalid");
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail("head_invalid");
    }
    preflight(value);
    if (!record(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail("head_invalid");
    exactKeys(value, HEAD_KEYS);
    const { headFingerprint, ...body } = value;
    if (value.schemaVersion !== exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        !["live", "rolled_back"].includes(String(value.state)) ||
        !Number.isSafeInteger(value.operationRevision) ||
        Number(value.operationRevision) < 1 ||
        value.headAuthority !== "none_server_cas_and_readback_required" ||
        value.runtimeConsumer !== false ||
        value.releaseAuthority !== false ||
        headFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail("head_invalid");
    exactId(value.seasonId);
    exactId(value.activeReleaseId);
    exactId(value.operationId);
    exactHash(value.activeRootFingerprint);
    exactHash(value.operationFingerprint);
    exactIso(value.updatedAtIso);
    const activeRootObject = exactPin(value.activeRootObject);
    const previousValues = [
        value.previousReleaseId,
        value.previousRootFingerprint,
        value.previousRootObject,
    ];
    if (!LOCALE_RE.test(String(value.targetLanguage)) ||
        !LOCALE_RE.test(String(value.studyTarget)) ||
        !LOCALE_RE.test(String(value.learnerSourceLocale)) ||
        (previousValues.some((item) => item === null) &&
            !previousValues.every((item) => item === null)) ||
        (value.previousReleaseId !== null &&
            (!ID_RE.test(String(value.previousReleaseId)) ||
                !HASH_RE.test(String(value.previousRootFingerprint)))))
        fail("head_invalid");
    const previousRootObject = value.previousRootObject === null
        ? null
        : exactPin(value.previousRootObject);
    const head = Object.freeze({
        ...value,
        activeRootObject,
        previousRootObject,
    });
    headHandles.add(head);
    return head;
}
function isV2UnifiedCourseReleaseHeadV1(value) {
    return record(value) && headHandles.has(value);
}
//# sourceMappingURL=v2_unified_course_release_v1.js.map