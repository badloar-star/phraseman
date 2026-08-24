"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideV2UnifiedCourseReleaseHeadV2 = exports.V2_UNIFIED_COURSE_LESSON_INDEX_STORAGE_PREFIX_V2 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2 = exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2 = exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2 = void 0;
exports.v2UnifiedCourseLessonIndexObjectPathV2 = v2UnifiedCourseLessonIndexObjectPathV2;
exports.materializeV2UnifiedCourseReleaseRootV2 = materializeV2UnifiedCourseReleaseRootV2;
exports.parseV2UnifiedCourseReleaseRootV2 = parseV2UnifiedCourseReleaseRootV2;
exports.isV2UnifiedCourseReleaseRootV2 = isV2UnifiedCourseReleaseRootV2;
exports.parseV2UnifiedCourseReleaseHeadV2 = parseV2UnifiedCourseReleaseHeadV2;
exports.isV2UnifiedCourseReleaseHeadV2 = isV2UnifiedCourseReleaseHeadV2;
const generator_course_contract_1 = require("../../../modules/learning-v2/content/generator_course_contract");
const course_topology_v1_1 = require("../../../modules/learning-v2/content/course_topology_v1");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const course_lesson_release_index_v1_1 = require("../../../modules/learning-v2/runtime/course_lesson_release_index_v1");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2 = "v2-unified-course-release-root.v2";
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2 = "v2-unified-course-release-head.v2";
exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2 = 512 * 1024;
exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2 = 32 * 1024;
exports.V2_UNIFIED_COURSE_LESSON_INDEX_STORAGE_PREFIX_V2 = "learning-v2/unified-course-release-v2/lesson-indexes";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const CONTENT_TYPE = "application/json; charset=utf-8";
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const rootHandles = new WeakSet();
const headHandles = new WeakSet();
const COURSE_TOPOLOGY_V1 = (0, course_topology_v1_1.buildLearningV2CourseTopologyV1)();
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const LESSON_KEYS = Object.freeze([
    "lessonOrdinal",
    "lessonId",
    "ownerLessonFingerprint",
    "ownerConfirmationFingerprint",
    "ownerConfirmationObject",
    "lessonIndexFingerprint",
    "lessonIndexObject",
    "sessionSetFingerprint",
    "sessionCount",
    "lessonReleaseFingerprint",
]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "topologySchemaVersion",
    "topologyFingerprint",
    "courseModel",
    "environment",
    "releaseId",
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
    "lessons",
    "lessonCount",
    "sessionsPerLesson",
    "directSessionCount",
    "ownerConfirmationAggregate",
    "lessonIndexAggregate",
    "sessionSetAggregate",
    "inventoryAggregate",
    "inventoryEvidence",
    "contentAuthorship",
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
    "topologyFingerprint",
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
    throw new Error(`v2_unified_course_release_v2_${code}`);
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
        actual.some((key, index) => key !== expected[index] || RESERVED.has(key)))
        fail();
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
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
        value.objectPath.length < 3 ||
        value.objectPath.length > 600 ||
        value.objectPath.startsWith("/") ||
        value.objectPath.includes("..") ||
        value.objectPath.includes("\\") ||
        /%2f|%5c/iu.test(value.objectPath) ||
        !GENERATION_RE.test(String(value.objectGeneration)) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 2 ||
        Number(value.byteSize) > 24 * 1024 * 1024 ||
        value.contentType !== CONTENT_TYPE)
        fail();
    return Object.freeze({
        objectPath: value.objectPath,
        contentHash: exactHash(value.contentHash),
        objectGeneration: value.objectGeneration,
        byteSize: value.byteSize,
        contentType: CONTENT_TYPE,
    });
}
function v2UnifiedCourseLessonIndexObjectPathV2(input) {
    return `${exports.V2_UNIFIED_COURSE_LESSON_INDEX_STORAGE_PREFIX_V2}/${(0, decision_registry_1.sha256Utf8)(exactId(input.releaseId))}/${exactId(input.lessonId)}/${exactHash(input.indexFingerprint)}/${exactHash(input.rawHash)}.json`;
}
function preflight(value) {
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length) {
        const current = stack.pop();
        if (++nodes > 20_000 || current.depth > 24)
            fail();
        if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value)))
                fail();
        }
        else if (typeof current.value === "string") {
            if (current.value.length > 20_000 ||
                current.value.normalize("NFC") !== current.value ||
                /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(current.value))
                fail();
        }
        else if (Array.isArray(current.value)) {
            if (current.value.length > course_topology_v1_1.LEARNING_V2_COURSE_LESSON_COUNT_V1)
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
        else if (current.value !== null && typeof current.value !== "boolean") {
            fail();
        }
    }
}
function lessonBody(value, expectedOrdinal) {
    if (!record(value))
        fail();
    exactKeys(value, LESSON_KEYS);
    const topology = COURSE_TOPOLOGY_V1;
    const expected = topology.lessons[expectedOrdinal - 1];
    if (!expected ||
        value.lessonOrdinal !== expectedOrdinal ||
        value.lessonId !== expected.lessonId ||
        value.sessionCount !== course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
        fail("lesson_coordinate_invalid");
    const body = {
        lessonOrdinal: expectedOrdinal,
        lessonId: expected.lessonId,
        ownerLessonFingerprint: exactHash(value.ownerLessonFingerprint),
        ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
        ownerConfirmationObject: exactPin(value.ownerConfirmationObject),
        lessonIndexFingerprint: exactHash(value.lessonIndexFingerprint),
        lessonIndexObject: exactPin(value.lessonIndexObject),
        sessionSetFingerprint: exactHash(value.sessionSetFingerprint),
        sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
    };
    if (value.lessonReleaseFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail("lesson_fingerprint_mismatch");
    return Object.freeze({
        ...body,
        lessonReleaseFingerprint: value.lessonReleaseFingerprint,
    });
}
function aggregate(lessons, key) {
    return (0, decision_registry_1.hashCanonicalBody)(lessons.map((lesson) => ({
        lessonOrdinal: lesson.lessonOrdinal,
        value: lesson[key],
    })));
}
function exactRollout(value) {
    if (!record(value))
        fail("rollout_invalid");
    exactKeys(value, [
        "revision",
        "state",
        "percent",
        "cohortSaltVersion",
        "allowlistCohortIds",
        "excludeCohortIds",
    ]);
    if (!Number.isSafeInteger(value.revision) ||
        Number(value.revision) < 1 ||
        !["internal", "rolling_out", "live", "paused"].includes(String(value.state)) ||
        ![0, 1, 5, 10, 25, 50, 100].includes(Number(value.percent)) ||
        !Number.isSafeInteger(value.cohortSaltVersion) ||
        Number(value.cohortSaltVersion) < 1 ||
        !Array.isArray(value.allowlistCohortIds) ||
        !Array.isArray(value.excludeCohortIds))
        fail("rollout_invalid");
    const allow = value.allowlistCohortIds.map(exactHash);
    const exclude = value.excludeCohortIds.map(exactHash);
    if (new Set(allow).size !== allow.length ||
        new Set(exclude).size !== exclude.length ||
        allow.some((entry, index) => index > 0 && allow[index - 1] >= entry) ||
        exclude.some((entry, index) => index > 0 && exclude[index - 1] >= entry) ||
        allow.some((entry) => exclude.includes(entry)))
        fail("rollout_invalid");
    return Object.freeze({
        revision: value.revision,
        state: value.state,
        percent: value.percent,
        cohortSaltVersion: value.cohortSaltVersion,
        allowlistCohortIds: Object.freeze(allow),
        excludeCohortIds: Object.freeze(exclude),
    });
}
function buildRoot(input) {
    const topology = COURSE_TOPOLOGY_V1;
    const expectedCount = input.releaseScope === "full_course" ? 32 : 1;
    if (input.lessons.length !== expectedCount ||
        !["lab", "staging", "production"].includes(input.environment) ||
        // зачем: боевой релиз принимал ТОЛЬКО полный курс из 32 уроков, поэтому
        // готовый первый урок невозможно было выложить — приложение отвечало
        // «Сессия недоступна / NOT FOUND». Владелец разрешил неполный курс
        // (2026-08-16, повторно), чтобы проверять уроки по мере написания.
        //
        // Ослабление узкое: contentClass в проде по-прежнему обязан быть
        // production_candidate, а vertical_slice — начинаться с первого урока
        // (проверка ниже). Полный сезон по-прежнему требует ровно 32 урока.
        (input.environment === "production" &&
            input.contentClass !== "production_candidate") ||
        (input.environment !== "production" &&
            input.contentClass !== "neutral_test_fixture") ||
        (input.releaseScope === "vertical_slice" &&
            input.lessons[0]?.lessonOrdinal !== 1))
        fail("scope_invalid");
    if (!(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.targetLanguage) ||
        !(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.studyTarget) ||
        !(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(input.learnerSourceLocale) ||
        input.interfaceLocales.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
        input.interfaceLocales.some((locale, index) => locale !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES[index]))
        fail("locale_invalid");
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2,
        topologySchemaVersion: topology.schemaVersion,
        topologyFingerprint: topology.topologyFingerprint,
        courseModel: "direct_32_lessons_56_sessions_no_hidden_episode_grouping",
        environment: input.environment,
        releaseId: exactId(input.releaseId),
        planFingerprint: exactHash(input.planFingerprint),
        courseContractFingerprint: exactHash(input.courseContractFingerprint),
        seasonId: exactId(input.seasonId),
        targetLanguage: input.targetLanguage,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
        interfaceLocales: Object.freeze([...input.interfaceLocales]),
        contentClass: input.contentClass,
        releaseScope: input.releaseScope,
        rollout: exactRollout(input.rollout),
        lessons: Object.freeze([...input.lessons]),
        lessonCount: input.lessons.length,
        sessionsPerLesson: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        directSessionCount: input.lessons.length * course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        ownerConfirmationAggregate: aggregate(input.lessons, "ownerConfirmationFingerprint"),
        lessonIndexAggregate: aggregate(input.lessons, "lessonIndexFingerprint"),
        sessionSetAggregate: aggregate(input.lessons, "sessionSetFingerprint"),
        inventoryAggregate: (0, decision_registry_1.hashCanonicalBody)(input.lessons),
        inventoryEvidence: "immutable_lesson_index_and_confirmation_pins",
        contentAuthorship: "owner_only",
        ownerContentAuthority: "none_structural_confirmation_pins_only",
        machineValidationAuthority: "structural_direct_56_inventory_join_only",
        humanApprovalAuthority: "none_activation_confirmation_required",
        publicationDecisionAuthority: "none",
        executionAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    };
    if (input.releaseScope === "full_course" &&
        body.directSessionCount !== course_topology_v1_1.LEARNING_V2_COURSE_SESSION_COUNT_V1)
        fail("session_count_invalid");
    const root = Object.freeze({
        ...body,
        rootFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(root)) >
        exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2)
        fail("oversize");
    rootHandles.add(root);
    return root;
}
function materializeV2UnifiedCourseReleaseRootV2(input) {
    if (!record(input) || !Array.isArray(input.lessons))
        fail();
    const lessons = input.lessons.map((entry, index) => {
        if (!record(entry) ||
            !(0, course_lesson_release_index_v1_1.isLearningV2CourseLessonReleaseIndexV1)(entry.index) ||
            entry.index.releaseId !== input.releaseId ||
            entry.index.lessonOrdinal !== index + 1)
            fail("lesson_index_invalid");
        const indexRaw = (0, course_lesson_release_index_v1_1.encodeLearningV2CourseLessonReleaseIndexV1)(entry.index);
        const indexRawHash = (0, decision_registry_1.sha256Utf8)(indexRaw);
        const indexObject = exactPin(entry.indexObject);
        if (indexObject.objectPath !==
            v2UnifiedCourseLessonIndexObjectPathV2({
                releaseId: input.releaseId,
                lessonId: entry.index.lessonId,
                indexFingerprint: entry.index.indexFingerprint,
                rawHash: indexRawHash,
            }) ||
            indexObject.contentHash !== indexRawHash ||
            indexObject.byteSize !== (0, decision_registry_1.utf8ByteLengthV1)(indexRaw))
            fail("lesson_index_pin_invalid");
        const body = {
            lessonOrdinal: entry.index.lessonOrdinal,
            lessonId: entry.index.lessonId,
            ownerLessonFingerprint: entry.index.ownerLessonFingerprint,
            ownerConfirmationFingerprint: entry.index.ownerConfirmationFingerprint,
            ownerConfirmationObject: exactPin(entry.ownerConfirmationObject),
            lessonIndexFingerprint: entry.index.indexFingerprint,
            lessonIndexObject: indexObject,
            sessionSetFingerprint: entry.index.sessionSetFingerprint,
            sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        };
        return Object.freeze({
            ...body,
            lessonReleaseFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
        });
    });
    return buildRoot({ ...input, lessons });
}
function parseV2UnifiedCourseReleaseRootV2(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2)
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
    if (!Array.isArray(value.lessons))
        fail();
    const lessons = value.lessons.map((lesson, index) => lessonBody(lesson, index + 1));
    const rebuilt = buildRoot({
        environment: value.environment,
        releaseId: value.releaseId,
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
        lessons,
    });
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw)
        fail();
    return rebuilt;
}
function isV2UnifiedCourseReleaseRootV2(value) {
    return record(value) && rootHandles.has(value);
}
function buildHead(input) {
    if (!isV2UnifiedCourseReleaseRootV2(input.target))
        fail("root_handle_invalid");
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
    if (!Number.isSafeInteger(input.expectedRevision) ||
        input.expectedRevision < 0 ||
        (input.current?.operationRevision ?? 0) !== input.expectedRevision)
        fail("head_conflict");
    if (input.current &&
        (input.current.topologyFingerprint !== input.target.topologyFingerprint ||
            input.current.environment !== input.target.environment ||
            input.current.seasonId !== input.target.seasonId ||
            input.current.targetLanguage !== input.target.targetLanguage ||
            input.current.studyTarget !== input.target.studyTarget ||
            input.current.learnerSourceLocale !== input.target.learnerSourceLocale))
        fail("head_scope_mismatch");
    if (input.current?.activeRootFingerprint === input.target.rootFingerprint)
        fail("head_same_release");
    if (input.action === "rollback" &&
        (!input.current ||
            input.current.previousReleaseId !== input.target.releaseId ||
            input.current.previousRootFingerprint !== input.target.rootFingerprint ||
            (0, decision_registry_1.canonicalJsonV1)(input.current.previousRootObject) !==
                (0, decision_registry_1.canonicalJsonV1)(targetObject)))
        fail("rollback_target_invalid");
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2,
        topologyFingerprint: input.target.topologyFingerprint,
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
        exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2)
        fail("head_oversize");
    headHandles.add(head);
    return Object.freeze({ kind: "commit", head });
}
exports.decideV2UnifiedCourseReleaseHeadV2 = buildHead;
function parseV2UnifiedCourseReleaseHeadV2(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2)
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
    exactKeys(value, HEAD_KEYS);
    const activeRootObject = exactPin(value.activeRootObject);
    const previousRootObject = value.previousRootObject === null
        ? null
        : exactPin(value.previousRootObject);
    if ((value.previousReleaseId === null) !==
        (value.previousRootFingerprint === null) ||
        (value.previousReleaseId === null) !== (previousRootObject === null))
        fail();
    const body = {
        schemaVersion: exports.V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2,
        topologyFingerprint: exactHash(value.topologyFingerprint),
        environment: value.environment,
        seasonId: exactId(value.seasonId),
        targetLanguage: value.targetLanguage,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        activeReleaseId: exactId(value.activeReleaseId),
        activeRootFingerprint: exactHash(value.activeRootFingerprint),
        activeRootObject,
        previousReleaseId: value.previousReleaseId === null
            ? null
            : exactId(value.previousReleaseId),
        previousRootFingerprint: value.previousRootFingerprint === null
            ? null
            : exactHash(value.previousRootFingerprint),
        previousRootObject,
        operationRevision: value.operationRevision,
        state: value.state,
        operationId: exactId(value.operationId),
        operationFingerprint: exactHash(value.operationFingerprint),
        updatedAtIso: exactIso(value.updatedAtIso),
        headAuthority: "none_server_cas_and_readback_required",
        runtimeConsumer: false,
        releaseAuthority: false,
    };
    if (value.schemaVersion !== body.schemaVersion ||
        !["lab", "staging", "production"].includes(body.environment) ||
        !(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(body.targetLanguage) ||
        !(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(body.studyTarget) ||
        !(0, language_tag_v1_1.parseV2ExactLanguageTagV1)(body.learnerSourceLocale) ||
        !Number.isSafeInteger(body.operationRevision) ||
        body.operationRevision < 1 ||
        !["live", "rolled_back"].includes(body.state) ||
        value.headAuthority !== body.headAuthority ||
        value.runtimeConsumer !== false ||
        value.releaseAuthority !== false ||
        value.headFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const head = Object.freeze({
        ...body,
        headFingerprint: value.headFingerprint,
    });
    headHandles.add(head);
    return head;
}
function isV2UnifiedCourseReleaseHeadV2(value) {
    return record(value) && headHandles.has(value);
}
//# sourceMappingURL=v2_unified_course_release_v2.js.map