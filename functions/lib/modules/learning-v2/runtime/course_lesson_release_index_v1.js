"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_PACKAGE_PREFIX_V1 = exports.LEARNING_V2_COURSE_SESSION_PACKAGE_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1 = exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1 = void 0;
exports.learningV2CourseSessionPackageObjectPathV1 = learningV2CourseSessionPackageObjectPathV1;
exports.materializeLearningV2CourseLessonReleaseIndexV1 = materializeLearningV2CourseLessonReleaseIndexV1;
exports.parseLearningV2CourseLessonReleaseIndexV1 = parseLearningV2CourseLessonReleaseIndexV1;
exports.encodeLearningV2CourseLessonReleaseIndexV1 = encodeLearningV2CourseLessonReleaseIndexV1;
exports.isLearningV2CourseLessonReleaseIndexV1 = isLearningV2CourseLessonReleaseIndexV1;
const course_topology_v1_1 = require("../content/course_topology_v1");
const decision_registry_1 = require("../policies/decision_registry");
const generator_course_contract_1 = require("../content/generator_course_contract");
exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1 = "learning-v2-course-lesson-release-index.v1";
exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1 = 256 * 1024;
exports.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1 = "learning-v2-course-session-release-package.v1";
exports.LEARNING_V2_COURSE_SESSION_PACKAGE_MAX_BYTES_V1 = 8 * 1024 * 1024;
exports.LEARNING_V2_COURSE_SESSION_PACKAGE_PREFIX_V1 = "learning-v2/course-session-packages";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "topologySchemaVersion",
    "topologyFingerprint",
    "releaseId",
    "lessonId",
    "lessonOrdinal",
    "titleByLocale",
    "canDoByLocale",
    "ownerLessonFingerprint",
    "ownerConfirmationFingerprint",
    "sessions",
    "sessionCount",
    "chapterCount",
    "sessionSetFingerprint",
    "sessionIdentityModel",
    "packageBinding",
    "contentAuthorship",
    "repositoryOriginAuthority",
    "storageAuthority",
    "ownerConfirmationAuthority",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "indexFingerprint",
]);
const SESSION_KEYS = Object.freeze([
    "courseSessionId",
    "sessionOrdinal",
    "chapterOrdinal",
    "positionInChapter",
    "role",
    "learningOutcomeKind",
    "learningOutcomeByLocale",
    "packageSchemaVersion",
    "packageFingerprint",
    "packagePin",
]);
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
]);
const handles = new WeakSet();
const COURSE_TOPOLOGY_V1 = (0, course_topology_v1_1.buildLearningV2CourseTopologyV1)();
function fail() {
    throw new Error("learning_v2_course_lesson_release_index_invalid");
}
function plain(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Object.keys(value);
    if (keys.length !== expected.length ||
        keys.some((key) => !expected.includes(key) || RESERVED_KEYS.has(key)))
        fail();
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactId(value) {
    if (typeof value !== "string" ||
        !ID_RE.test(value) ||
        RESERVED_KEYS.has(value))
        fail();
    return value;
}
function localized(value, maximum) {
    if (!plain(value))
        fail();
    exactKeys(value, generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES);
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        const text = value[locale];
        if (typeof text !== "string" ||
            text.length < 4 ||
            text.length > maximum ||
            text !== text.normalize("NFC") ||
            /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(text))
            fail();
        result[locale] = text;
    }
    return Object.freeze(result);
}
function preflight(value) {
    const stack = [{ value, depth: 1 }];
    let nodes = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 4096 || current.depth > 16)
            fail();
        if (typeof current.value === "string") {
            if (current.value.length > 4096 ||
                current.value.normalize("NFC") !== current.value ||
                /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(current.value))
                fail();
        }
        else if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                !Number.isSafeInteger(current.value))
                fail();
        }
        else if (Array.isArray(current.value)) {
            if (current.value.length > course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
                fail();
            for (const child of current.value)
                stack.push({ value: child, depth: current.depth + 1 });
        }
        else if (current.value !== null && typeof current.value === "object") {
            if (!plain(current.value))
                fail();
            const entries = Object.entries(current.value);
            if (entries.length > 64)
                fail();
            for (const [key, child] of entries) {
                if (RESERVED_KEYS.has(key))
                    fail();
                stack.push({ value: child, depth: current.depth + 1 });
            }
        }
    }
}
function learningV2CourseSessionPackageObjectPathV1(input) {
    const topology = COURSE_TOPOLOGY_V1;
    const lesson = topology.lessons[input.lessonOrdinal - 1];
    const session = lesson?.sessions[input.sessionOrdinal - 1];
    if (!lesson || !session)
        fail();
    return `${exports.LEARNING_V2_COURSE_SESSION_PACKAGE_PREFIX_V1}/${(0, decision_registry_1.sha256Utf8)(exactId(input.releaseId))}/${lesson.lessonId}/sessions/${String(session.sessionOrdinal).padStart(2, "0")}/${exactHash(input.packageFingerprint)}/${exactHash(input.contentHash)}.json`;
}
function parsePin(value, expected) {
    if (!plain(value))
        fail();
    exactKeys(value, PIN_KEYS);
    const contentHash = exactHash(value.contentHash);
    if (typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 2 ||
        Number(value.byteSize) > exports.LEARNING_V2_COURSE_SESSION_PACKAGE_MAX_BYTES_V1 ||
        value.contentType !== "application/json; charset=utf-8" ||
        value.objectPath !==
            learningV2CourseSessionPackageObjectPathV1({
                ...expected,
                contentHash,
            }))
        fail();
    return Object.freeze({
        objectPath: value.objectPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
        contentType: "application/json; charset=utf-8",
    });
}
function parseSession(value, expected, releaseId) {
    if (!plain(value))
        fail();
    exactKeys(value, SESSION_KEYS);
    const packageFingerprint = exactHash(value.packageFingerprint);
    if (value.courseSessionId !== expected.sessionId ||
        value.sessionOrdinal !== expected.sessionOrdinal ||
        value.chapterOrdinal !== expected.chapterOrdinal ||
        value.positionInChapter !== expected.positionInChapter ||
        value.role !== expected.role ||
        value.packageSchemaVersion !==
            exports.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1)
        fail();
    return Object.freeze({
        courseSessionId: expected.sessionId,
        sessionOrdinal: expected.sessionOrdinal,
        chapterOrdinal: expected.chapterOrdinal,
        positionInChapter: expected.positionInChapter,
        role: expected.role,
        learningOutcomeKind: value.learningOutcomeKind === "understand" ||
            value.learningOutcomeKind === "learn" ||
            value.learningOutcomeKind === "can_do"
            ? value.learningOutcomeKind
            : fail(),
        learningOutcomeByLocale: localized(value.learningOutcomeByLocale, 512),
        packageSchemaVersion: exports.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
        packageFingerprint,
        packagePin: parsePin(value.packagePin, {
            releaseId,
            lessonOrdinal: expected.lessonOrdinal,
            sessionOrdinal: expected.sessionOrdinal,
            packageFingerprint,
        }),
    });
}
function validate(value) {
    preflight(value);
    if (!plain(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    const topology = COURSE_TOPOLOGY_V1;
    const releaseId = exactId(value.releaseId);
    if (!Number.isSafeInteger(value.lessonOrdinal) ||
        Number(value.lessonOrdinal) < 1 ||
        Number(value.lessonOrdinal) > topology.lessonCount)
        fail();
    const lesson = topology.lessons[Number(value.lessonOrdinal) - 1];
    // зачем: неполный урок разрешён владельцем — публикация не должна ждать
    // последней из 56 сессий. Дырка в середине остаётся ошибкой: сессии идут
    // подряд с первой, идентификаторы сверяются с топологией ниже.
    if (!lesson ||
        !Array.isArray(value.sessions) ||
        value.sessions.length < 1 ||
        value.sessions.length > lesson.sessionCount)
        fail();
    const sessions = value.sessions.map((session, index) => parseSession(session, lesson.sessions[index], releaseId));
    const sessionSetFingerprint = (0, decision_registry_1.hashCanonicalBody)(sessions);
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1,
        topologySchemaVersion: topology.schemaVersion,
        topologyFingerprint: topology.topologyFingerprint,
        releaseId,
        lessonId: lesson.lessonId,
        lessonOrdinal: lesson.lessonOrdinal,
        titleByLocale: localized(value.titleByLocale, 160),
        canDoByLocale: localized(value.canDoByLocale, 512),
        ownerLessonFingerprint: exactHash(value.ownerLessonFingerprint),
        ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
        sessions: Object.freeze(sessions),
        // зачем: считаем по факту, а не константой полного урока — иначе индекс
        // объявлял бы 56 сессий там, где их написано меньше, и приложение искало
        // бы пакеты, которых нет.
        sessionCount: sessions.length,
        chapterCount: course_topology_v1_1.LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
        sessionSetFingerprint,
        sessionIdentityModel: "direct_56_no_hidden_grouping",
        packageBinding: "exact_56_direct_content_addressed_session_packages",
        contentAuthorship: "owner_only",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none_server_readback_required",
        ownerConfirmationAuthority: "none_private_owner_handle_required",
        runtimeAuthority: "none_active_release_join_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    if (value.schemaVersion !== body.schemaVersion ||
        value.topologySchemaVersion !== body.topologySchemaVersion ||
        value.topologyFingerprint !== body.topologyFingerprint ||
        value.lessonId !== body.lessonId ||
        value.sessionCount !== body.sessionCount ||
        value.chapterCount !== body.chapterCount ||
        value.sessionSetFingerprint !== body.sessionSetFingerprint ||
        value.sessionIdentityModel !== body.sessionIdentityModel ||
        value.packageBinding !== body.packageBinding ||
        value.contentAuthorship !== body.contentAuthorship ||
        value.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
        value.storageAuthority !== body.storageAuthority ||
        value.ownerConfirmationAuthority !== body.ownerConfirmationAuthority ||
        value.runtimeAuthority !== body.runtimeAuthority ||
        value.walletAuthority !== body.walletAuthority ||
        value.masteryAuthority !== body.masteryAuthority ||
        value.evidenceAuthority !== body.evidenceAuthority ||
        value.publicationAuthority !== body.publicationAuthority ||
        value.releaseAuthority !== false ||
        value.indexFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const index = Object.freeze({
        ...body,
        indexFingerprint: value.indexFingerprint,
    });
    handles.add(index);
    return index;
}
function materializeLearningV2CourseLessonReleaseIndexV1(input) {
    const topology = COURSE_TOPOLOGY_V1;
    const lesson = topology.lessons[input.lessonOrdinal - 1];
    // зачем: индекс требовал РОВНО 56 сессий, поэтому урок нельзя было
    // опубликовать, пока не написана последняя — владелец видел «Сессия
    // недоступна / NOT FOUND» и не мог проверить ни одного занятия. Решение
    // владельца (2026-08-16, повторно): неполный урок разрешён.
    //
    // Ослабление узкое: сессии по-прежнему обязаны идти подряд с первой и
    // совпадать с топологией по идентификаторам — дырка в середине означала бы,
    // что человек упрётся в стену посреди урока. Пустой урок остаётся ошибкой.
    if (!lesson ||
        input.sessions.length < 1 ||
        input.sessions.length > lesson.sessionCount)
        fail();
    const sessions = lesson.sessions.slice(0, input.sessions.length).map((expected, index) => {
        const source = input.sessions[index];
        if (!source ||
            source.courseSessionId !== expected.sessionId ||
            source.packageSchemaVersion !==
                exports.LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1)
            fail();
        const packageFingerprint = exactHash(source.packageFingerprint);
        const contentHash = exactHash(source.contentHash);
        return Object.freeze({
            courseSessionId: expected.sessionId,
            sessionOrdinal: expected.sessionOrdinal,
            chapterOrdinal: expected.chapterOrdinal,
            positionInChapter: expected.positionInChapter,
            role: expected.role,
            learningOutcomeKind: source.learningOutcomeKind,
            learningOutcomeByLocale: localized(source.learningOutcomeByLocale, 512),
            packageSchemaVersion: source.packageSchemaVersion,
            packageFingerprint,
            packagePin: Object.freeze({
                objectPath: learningV2CourseSessionPackageObjectPathV1({
                    releaseId: input.releaseId,
                    lessonOrdinal: input.lessonOrdinal,
                    sessionOrdinal: expected.sessionOrdinal,
                    packageFingerprint,
                    contentHash,
                }),
                contentHash,
                objectGeneration: source.objectGeneration,
                byteSize: source.byteSize,
                contentType: "application/json; charset=utf-8",
            }),
        });
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1,
        topologySchemaVersion: topology.schemaVersion,
        topologyFingerprint: topology.topologyFingerprint,
        releaseId: input.releaseId,
        lessonId: (0, course_topology_v1_1.learningV2CourseLessonIdV1)(input.lessonOrdinal),
        lessonOrdinal: input.lessonOrdinal,
        titleByLocale: input.titleByLocale,
        canDoByLocale: input.canDoByLocale,
        ownerLessonFingerprint: input.ownerLessonFingerprint,
        ownerConfirmationFingerprint: input.ownerConfirmationFingerprint,
        sessions: Object.freeze(sessions),
        // зачем: считаем по факту, а не константой полного урока — иначе индекс
        // объявлял бы 56 сессий там, где их написано меньше, и приложение искало
        // бы пакеты, которых нет.
        sessionCount: sessions.length,
        chapterCount: course_topology_v1_1.LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
        sessionSetFingerprint: (0, decision_registry_1.hashCanonicalBody)(sessions),
        sessionIdentityModel: "direct_56_no_hidden_grouping",
        packageBinding: "exact_56_direct_content_addressed_session_packages",
        contentAuthorship: "owner_only",
        repositoryOriginAuthority: "none_server_readback_required",
        storageAuthority: "none_server_readback_required",
        ownerConfirmationAuthority: "none_private_owner_handle_required",
        runtimeAuthority: "none_active_release_join_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return validate({ ...body, indexFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
}
function parseLearningV2CourseLessonReleaseIndexV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if ((0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    return validate(value);
}
function encodeLearningV2CourseLessonReleaseIndexV1(index) {
    if (!handles.has(index))
        fail();
    const raw = (0, decision_registry_1.canonicalJsonV1)(index);
    if ((0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1)
        fail();
    return raw;
}
function isLearningV2CourseLessonReleaseIndexV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=course_lesson_release_index_v1.js.map