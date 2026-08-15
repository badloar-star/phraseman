"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_READBACK_MAX_CONCURRENCY_V1 = exports.LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1 = void 0;
exports.loadLearningV2CourseSessionReadbackV1 = loadLearningV2CourseSessionReadbackV1;
exports.isLearningV2CourseSessionReadbackHandleV1 = isLearningV2CourseSessionReadbackHandleV1;
exports.getLearningV2CourseSessionReadbackSummaryV1 = getLearningV2CourseSessionReadbackSummaryV1;
exports.resolveLearningV2CourseSessionLearnerMaterialV1 = resolveLearningV2CourseSessionLearnerMaterialV1;
const decision_registry_1 = require("../policies/decision_registry");
const course_session_release_package_v1_1 = require("./course_session_release_package_v1");
exports.LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1 = "learning-v2-course-session-readback.v1";
exports.LEARNING_V2_COURSE_SESSION_READBACK_MAX_CONCURRENCY_V1 = 2;
const handles = new WeakSet();
const materialByHandle = new WeakMap();
function fail() {
    throw new Error("learning_v2_course_session_readback_invalid");
}
function plain(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactRaw(pin, value) {
    if (!plain(value) ||
        Object.keys(value).sort().join("|") !==
            "byteSize|contentHash|contentType|objectGeneration|raw" ||
        typeof value.raw !== "string" ||
        value.objectGeneration !== pin.objectGeneration ||
        value.byteSize !== pin.byteSize ||
        value.contentHash !== pin.contentHash ||
        value.contentType !== pin.contentType ||
        (0, decision_registry_1.utf8ByteLengthV1)(value.raw) !== pin.byteSize ||
        (0, decision_registry_1.sha256Utf8)(value.raw) !== pin.contentHash)
        fail();
    return value.raw;
}
async function readBounded(pins, reader) {
    const results = new Array(pins.length);
    let nextIndex = 0;
    const worker = async () => {
        while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= pins.length)
                return;
            const pin = pins[index];
            results[index] = exactRaw(pin, await reader.readExact(pin));
        }
    };
    await Promise.all(Array.from({
        length: Math.min(exports.LEARNING_V2_COURSE_SESSION_READBACK_MAX_CONCURRENCY_V1, pins.length),
    }, () => worker()));
    return Object.freeze(results);
}
async function loadLearningV2CourseSessionReadbackV1(input) {
    if (!plain(input) ||
        Object.keys(input).sort().join("|") !== "index|package|packageRaw|reader" ||
        typeof input.packageRaw !== "string" ||
        !plain(input.reader) ||
        typeof input.reader.readExact !== "function")
        fail();
    const value = (0, course_session_release_package_v1_1.bindLearningV2CourseSessionPackageToReleaseIndexV1)({
        index: input.index,
        package: input.package,
    });
    if ((0, course_session_release_package_v1_1.encodeLearningV2CourseSessionReleasePackageV1)(value) !== input.packageRaw)
        fail();
    const readbacks = await readBounded(value.children, input.reader);
    const summary = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1,
        releaseId: value.releaseId,
        lessonId: value.lessonId,
        courseSessionId: value.courseSessionId,
        sessionOrdinal: value.sessionOrdinal,
        packageFingerprint: value.packageFingerprint,
        childSetFingerprint: value.childSetFingerprint,
        childCount: 5,
        storageIntegrity: "exact_generation_hash_size_content_type_readback",
        learnerProjection: "intro_learner_capsule_auxiliary_only",
        evaluatorIsolation: "server_sidecar_not_exposed",
        repositoryOriginAuthority: "none_external_active_release_required",
        runtimeAuthority: "integrity_only_no_active_release_authority",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        releaseAuthority: false,
    });
    const handle = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1,
    });
    handles.add(handle);
    materialByHandle.set(handle, Object.freeze({
        summary,
        introRaw: readbacks[0],
        learnerRaw: readbacks[1],
        evaluatorCapsuleRaw: readbacks[2],
        auxiliaryRaw: readbacks[4],
    }));
    return handle;
}
function material(handle) {
    if (!isLearningV2CourseSessionReadbackHandleV1(handle))
        fail();
    const found = materialByHandle.get(handle);
    if (!found)
        fail();
    return found;
}
function isLearningV2CourseSessionReadbackHandleV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function getLearningV2CourseSessionReadbackSummaryV1(handle) {
    return material(handle).summary;
}
function resolveLearningV2CourseSessionLearnerMaterialV1(handle) {
    const found = material(handle);
    return Object.freeze({
        introRaw: found.introRaw,
        learnerRaw: found.learnerRaw,
        evaluatorCapsuleRaw: found.evaluatorCapsuleRaw,
        auxiliaryRaw: found.auxiliaryRaw,
        evaluatorSidecarRawExposed: false,
        materialAuthority: "none_integrity_handle_projection_only",
    });
}
//# sourceMappingURL=course_session_readback_v1.js.map