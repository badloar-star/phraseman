"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActiveCourseCatalogV1 = materializeLearningV2ActiveCourseCatalogV1;
exports.parseLearningV2ActiveCourseCatalogV1 = parseLearningV2ActiveCourseCatalogV1;
exports.encodeLearningV2ActiveCourseCatalogV1 = encodeLearningV2ActiveCourseCatalogV1;
exports.isLearningV2ActiveCourseCatalogV1 = isLearningV2ActiveCourseCatalogV1;
const course_topology_v1_1 = require("../content/course_topology_v1");
const generator_course_contract_1 = require("../content/generator_course_contract");
const decision_registry_1 = require("../policies/decision_registry");
const course_lesson_release_index_v1_1 = require("./course_lesson_release_index_v1");
exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_SCHEMA_V1 = 'learning-v2-active-course-catalog.v1';
exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1 = 2 * 1024 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:\-]{0,159}$/u;
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
const handles = new WeakSet();
const topology = (0, course_topology_v1_1.buildLearningV2CourseTopologyV1)();
const ROOT_KEYS = Object.freeze([
    'schemaVersion',
    'topologySchemaVersion',
    'topologyFingerprint',
    'environment',
    'releaseId',
    'activeRootFingerprint',
    'activeHeadFingerprint',
    'headOperationRevision',
    'seasonId',
    'targetLanguage',
    'studyTarget',
    'learnerSourceLocale',
    'interfaceLocale',
    'contentClass',
    'releaseScope',
    'lessons',
    'lessonCount',
    'sessionsPerLesson',
    'directSessionCount',
    'lessonIndexAggregate',
    'learnerProjection',
    'correctnessAuthority',
    'serverAnswerAuthority',
    'progressWriteAuthority',
    'interruptedSessionPolicy',
    'walletAuthority',
    'masteryAuthority',
    'evidenceAuthority',
    'publicationAuthority',
    'releaseAuthority',
    'catalogFingerprint',
]);
const LESSON_KEYS = Object.freeze(['lessonId', 'lessonOrdinal', 'title', 'canDo', 'lessonIndexFingerprint', 'sessions', 'sessionCount', 'chapterCount']);
const SESSION_KEYS = Object.freeze([
    'courseSessionId',
    'sessionOrdinal',
    'chapterOrdinal',
    'positionInChapter',
    'role',
    'learningOutcomeKind',
    'learningOutcome',
    'packageFingerprint',
]);
function fail() {
    throw new Error('learning_v2_active_course_catalog_invalid');
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function exactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const sortedExpected = [...expected].sort();
    if (actual.length !== sortedExpected.length || actual.some((key, index) => key !== sortedExpected[index] || RESERVED.has(key)))
        fail();
}
function exactHash(value) {
    if (typeof value !== 'string' || !HASH_RE.test(value))
        fail();
    return value;
}
function exactId(value) {
    if (typeof value !== 'string' || !ID_RE.test(value) || RESERVED.has(value))
        fail();
    return value;
}
function exactText(value, maximum) {
    if (typeof value !== 'string' ||
        value.length < 4 ||
        value.length > maximum ||
        value !== value.normalize('NFC') ||
        /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(value))
        fail();
    return value;
}
function preflight(value) {
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length) {
        const current = stack.pop();
        if (++nodes > 40000 || current.depth > 20)
            fail();
        if (typeof current.value === 'string') {
            if (current.value.length > 4096 || current.value !== current.value.normalize('NFC'))
                fail();
        }
        else if (typeof current.value === 'number') {
            if (!Number.isSafeInteger(current.value) || Object.is(current.value, -0))
                fail();
        }
        else if (Array.isArray(current.value)) {
            if (current.value.length > course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
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
        else if (current.value !== null && typeof current.value !== 'boolean') {
            fail();
        }
    }
}
function build(input) {
    const expectedLessonCount = input.releaseScope === 'full_course' ? 32 : 1;
    if (input.indexes.length !== expectedLessonCount ||
        (input.releaseScope === 'vertical_slice' && input.indexes[0]?.lessonOrdinal !== 1) ||
        !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale) ||
        !['lab', 'staging', 'production'].includes(input.environment) ||
        !Number.isSafeInteger(input.headOperationRevision) ||
        input.headOperationRevision < 1)
        fail();
    const releaseId = exactId(input.releaseId);
    const lessons = input.indexes.map((index, lessonIndex) => {
        const expectedLesson = topology.lessons[lessonIndex];
        if (!expectedLesson ||
            !(0, course_lesson_release_index_v1_1.isLearningV2CourseLessonReleaseIndexV1)(index) ||
            index.releaseId !== releaseId ||
            index.topologyFingerprint !== topology.topologyFingerprint ||
            index.lessonOrdinal !== expectedLesson.lessonOrdinal ||
            index.lessonId !== expectedLesson.lessonId)
            fail();
        const sessions = index.sessions.map((session, sessionIndex) => {
            const expected = expectedLesson.sessions[sessionIndex];
            if (!expected ||
                session.courseSessionId !== expected.sessionId ||
                session.sessionOrdinal !== expected.sessionOrdinal ||
                session.chapterOrdinal !== expected.chapterOrdinal ||
                session.positionInChapter !== expected.positionInChapter ||
                session.role !== expected.role)
                fail();
            return Object.freeze({
                courseSessionId: expected.sessionId,
                sessionOrdinal: expected.sessionOrdinal,
                chapterOrdinal: expected.chapterOrdinal,
                positionInChapter: expected.positionInChapter,
                role: expected.role,
                learningOutcomeKind: session.learningOutcomeKind,
                learningOutcome: exactText(session.learningOutcomeByLocale[input.interfaceLocale], 512),
                packageFingerprint: exactHash(session.packageFingerprint),
            });
        });
        return Object.freeze({
            lessonId: expectedLesson.lessonId,
            lessonOrdinal: expectedLesson.lessonOrdinal,
            title: exactText(index.titleByLocale[input.interfaceLocale], 160),
            canDo: exactText(index.canDoByLocale[input.interfaceLocale], 512),
            lessonIndexFingerprint: exactHash(index.indexFingerprint),
            sessions: Object.freeze(sessions),
            sessionCount: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
            chapterCount: course_topology_v1_1.LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
        });
    });
    if (input.lessonIndexAggregate !==
        (0, decision_registry_1.hashCanonicalBody)(lessons.map((lesson) => ({
            lessonOrdinal: lesson.lessonOrdinal,
            value: lesson.lessonIndexFingerprint,
        }))))
        fail();
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_SCHEMA_V1,
        topologySchemaVersion: topology.schemaVersion,
        topologyFingerprint: topology.topologyFingerprint,
        environment: input.environment,
        releaseId,
        activeRootFingerprint: exactHash(input.activeRootFingerprint),
        activeHeadFingerprint: exactHash(input.activeHeadFingerprint),
        headOperationRevision: input.headOperationRevision,
        seasonId: exactId(input.seasonId),
        targetLanguage: exactId(input.targetLanguage),
        studyTarget: exactId(input.studyTarget),
        learnerSourceLocale: exactId(input.learnerSourceLocale),
        interfaceLocale: input.interfaceLocale,
        contentClass: input.contentClass,
        releaseScope: input.releaseScope,
        lessons: Object.freeze(lessons),
        lessonCount: lessons.length,
        sessionsPerLesson: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        directSessionCount: lessons.length * course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        lessonIndexAggregate: exactHash(input.lessonIndexAggregate),
        learnerProjection: 'titles_can_do_and_session_learning_outcomes_only',
        correctnessAuthority: 'local_device_only',
        serverAnswerAuthority: 'none_answers_never_transported',
        progressWriteAuthority: 'completed_session_summary_only',
        interruptedSessionPolicy: 'restart_from_first_intro_with_new_run_id',
        walletAuthority: 'none',
        masteryAuthority: 'none',
        evidenceAuthority: 'none',
        publicationAuthority: 'none_active_release_readback_required',
        releaseAuthority: false,
    };
    const catalog = Object.freeze({
        ...body,
        catalogFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(catalog)) > exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1)
        fail();
    handles.add(catalog);
    return catalog;
}
function materializeLearningV2ActiveCourseCatalogV1(input) {
    return build(input);
}
function parseLearningV2ActiveCourseCatalogV1(raw) {
    if (typeof raw !== 'string' || raw.length > exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1 || (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1)
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
    const lessons = value.lessons.map((lesson, lessonIndex) => {
        if (!record(lesson))
            fail();
        exactKeys(lesson, LESSON_KEYS);
        if (!Array.isArray(lesson.sessions))
            fail();
        const sessions = lesson.sessions.map((session, sessionIndex) => {
            if (!record(session))
                fail();
            exactKeys(session, SESSION_KEYS);
            const expected = topology.lessons[lessonIndex]?.sessions[sessionIndex];
            if (!expected ||
                session.courseSessionId !== expected.sessionId ||
                session.sessionOrdinal !== expected.sessionOrdinal ||
                session.chapterOrdinal !== expected.chapterOrdinal ||
                session.positionInChapter !== expected.positionInChapter ||
                session.role !== expected.role ||
                !['understand', 'learn', 'can_do'].includes(String(session.learningOutcomeKind)))
                fail();
            return Object.freeze({
                courseSessionId: exactId(session.courseSessionId),
                sessionOrdinal: session.sessionOrdinal,
                chapterOrdinal: session.chapterOrdinal,
                positionInChapter: session.positionInChapter,
                role: session.role,
                learningOutcomeKind: session.learningOutcomeKind,
                learningOutcome: exactText(session.learningOutcome, 512),
                packageFingerprint: exactHash(session.packageFingerprint),
            });
        });
        const expectedLesson = topology.lessons[lessonIndex];
        if (!expectedLesson ||
            lesson.lessonId !== expectedLesson.lessonId ||
            lesson.lessonOrdinal !== expectedLesson.lessonOrdinal ||
            lesson.sessionCount !== course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
            lesson.chapterCount !== course_topology_v1_1.LEARNING_V2_LESSON_CHAPTER_COUNT_V1 ||
            sessions.length !== course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
            fail();
        return Object.freeze({
            lessonId: exactId(lesson.lessonId),
            lessonOrdinal: lesson.lessonOrdinal,
            title: exactText(lesson.title, 160),
            canDo: exactText(lesson.canDo, 512),
            lessonIndexFingerprint: exactHash(lesson.lessonIndexFingerprint),
            sessions: Object.freeze(sessions),
            sessionCount: lesson.sessionCount,
            chapterCount: lesson.chapterCount,
        });
    });
    const releaseScope = value.releaseScope;
    const expectedLessonCount = releaseScope === 'full_course' ? 32 : 1;
    const lessonIndexAggregate = (0, decision_registry_1.hashCanonicalBody)(lessons.map((lesson) => ({
        lessonOrdinal: lesson.lessonOrdinal,
        value: lesson.lessonIndexFingerprint,
    })));
    if (!['lab', 'staging', 'production'].includes(String(value.environment)) ||
        !['production_candidate', 'neutral_test_fixture'].includes(String(value.contentClass)) ||
        !['vertical_slice', 'full_course'].includes(String(releaseScope)) ||
        !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(value.interfaceLocale) ||
        lessons.length !== expectedLessonCount ||
        !Number.isSafeInteger(value.headOperationRevision) ||
        Number(value.headOperationRevision) < 1 ||
        value.lessonCount !== lessons.length ||
        value.sessionsPerLesson !== course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
        value.directSessionCount !== lessons.length * course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
        value.lessonIndexAggregate !== lessonIndexAggregate)
        fail();
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVE_COURSE_CATALOG_SCHEMA_V1,
        topologySchemaVersion: topology.schemaVersion,
        topologyFingerprint: topology.topologyFingerprint,
        environment: value.environment,
        releaseId: exactId(value.releaseId),
        activeRootFingerprint: exactHash(value.activeRootFingerprint),
        activeHeadFingerprint: exactHash(value.activeHeadFingerprint),
        headOperationRevision: Number(value.headOperationRevision),
        seasonId: exactId(value.seasonId),
        targetLanguage: exactId(value.targetLanguage),
        studyTarget: exactId(value.studyTarget),
        learnerSourceLocale: exactId(value.learnerSourceLocale),
        interfaceLocale: value.interfaceLocale,
        contentClass: value.contentClass,
        releaseScope: releaseScope,
        lessons: Object.freeze(lessons),
        lessonCount: lessons.length,
        sessionsPerLesson: course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        directSessionCount: lessons.length * course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        lessonIndexAggregate,
        learnerProjection: 'titles_can_do_and_session_learning_outcomes_only',
        correctnessAuthority: 'local_device_only',
        serverAnswerAuthority: 'none_answers_never_transported',
        progressWriteAuthority: 'completed_session_summary_only',
        interruptedSessionPolicy: 'restart_from_first_intro_with_new_run_id',
        walletAuthority: 'none',
        masteryAuthority: 'none',
        evidenceAuthority: 'none',
        publicationAuthority: 'none_active_release_readback_required',
        releaseAuthority: false,
    };
    if (value.schemaVersion !== body.schemaVersion ||
        value.topologySchemaVersion !== body.topologySchemaVersion ||
        value.topologyFingerprint !== body.topologyFingerprint ||
        value.learnerProjection !== body.learnerProjection ||
        value.correctnessAuthority !== body.correctnessAuthority ||
        value.serverAnswerAuthority !== body.serverAnswerAuthority ||
        value.progressWriteAuthority !== body.progressWriteAuthority ||
        value.interruptedSessionPolicy !== body.interruptedSessionPolicy ||
        value.walletAuthority !== body.walletAuthority ||
        value.masteryAuthority !== body.masteryAuthority ||
        value.evidenceAuthority !== body.evidenceAuthority ||
        value.publicationAuthority !== body.publicationAuthority ||
        value.releaseAuthority !== false ||
        value.catalogFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const catalog = Object.freeze({
        ...body,
        catalogFingerprint: value.catalogFingerprint,
    });
    if ((0, decision_registry_1.canonicalJsonV1)(catalog) !== raw)
        fail();
    handles.add(catalog);
    return catalog;
}
function encodeLearningV2ActiveCourseCatalogV1(value) {
    if (!isLearningV2ActiveCourseCatalogV1(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
function isLearningV2ActiveCourseCatalogV1(value) {
    return record(value) && handles.has(value);
}
//# sourceMappingURL=course_active_catalog_v1.js.map