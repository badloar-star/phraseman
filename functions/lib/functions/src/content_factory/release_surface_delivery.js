"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCourseSurfaceEntryRequest = parseCourseSurfaceEntryRequest;
exports.parseCourseSurfaceBundleRequest = parseCourseSurfaceBundleRequest;
exports.resolveIndexedCourseUnits = resolveIndexedCourseUnits;
exports.resolveIndexedCourseUnit = resolveIndexedCourseUnit;
exports.parseHashedJsonBytes = parseHashedJsonBytes;
const course_release_contract_1 = require("./course_release_contract");
const node_crypto_1 = require("node:crypto");
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseCourseSurfaceEntryRequest(value) {
    if (!isRecord(value))
        throw new Error('course_surface_request_invalid');
    const studyTarget = String(value.studyTarget ?? '').trim();
    const learnerSourceLocale = String(value.learnerSourceLocale ?? '').trim();
    const releaseId = String(value.releaseId ?? '').trim();
    const surface = String(value.surface ?? '');
    const lessonId = Number(value.lessonId);
    if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(learnerSourceLocale) || !TOKEN_RE.test(releaseId) || !course_release_contract_1.CANONICAL_RELEASE_SURFACES.includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100)
        throw new Error('course_surface_request_invalid');
    return Object.freeze({ studyTarget, learnerSourceLocale, releaseId, surface, lessonId });
}
function parseCourseSurfaceBundleRequest(value) {
    if (!isRecord(value))
        throw new Error('course_surface_request_invalid');
    const studyTarget = String(value.studyTarget ?? '').trim();
    const learnerSourceLocale = String(value.learnerSourceLocale ?? '').trim();
    const releaseId = String(value.releaseId ?? '').trim();
    const surface = String(value.surface ?? '');
    if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(learnerSourceLocale) || !TOKEN_RE.test(releaseId) || !course_release_contract_1.CANONICAL_RELEASE_SURFACES.includes(surface))
        throw new Error('course_surface_request_invalid');
    return Object.freeze({ studyTarget, learnerSourceLocale, releaseId, surface });
}
function resolveIndexedCourseUnits(index, request) {
    if (!isRecord(index) || index.releaseId !== request.releaseId || index.studyTarget !== request.studyTarget || index.learnerSourceLocale !== request.learnerSourceLocale || index.surface !== request.surface)
        throw new Error('course_surface_index_identity_mismatch');
    if (!Array.isArray(index.units) || index.units.length < 1 || index.units.length > 100)
        throw new Error('course_surface_index_invalid');
    const seen = new Set();
    const units = [];
    for (const value of index.units) {
        if (!isRecord(value))
            throw new Error('course_surface_index_invalid');
        const lessonId = Number(value.lessonId);
        const expectedPath = `course-releases/${request.releaseId}/${request.surface}/${lessonId}.json`;
        if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100 || typeof value.objectPath !== 'string' || value.objectPath !== expectedPath || typeof value.contentHash !== 'string' || !HASH_RE.test(value.contentHash) || typeof value.objectGeneration !== 'string' || !value.objectGeneration.trim())
            throw new Error('course_surface_index_invalid');
        if (seen.has(lessonId))
            throw new Error('course_surface_index_duplicate_lesson');
        seen.add(lessonId);
        units.push(Object.freeze({ lessonId, objectPath: value.objectPath, contentHash: value.contentHash, objectGeneration: value.objectGeneration }));
    }
    return Object.freeze(units.sort((a, b) => a.lessonId - b.lessonId));
}
function resolveIndexedCourseUnit(index, request) {
    const matched = resolveIndexedCourseUnits(index, request).find((unit) => unit.lessonId === request.lessonId) ?? null;
    if (!matched)
        throw new Error('course_surface_entry_not_found');
    return matched;
}
function parseHashedJsonBytes(bytes, expectedHash) {
    const actualHash = (0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex');
    if (!HASH_RE.test(expectedHash) || actualHash !== expectedHash.toLowerCase())
        throw new Error('course_surface_hash_mismatch');
    try {
        return JSON.parse(bytes.toString('utf8'));
    }
    catch {
        throw new Error('course_surface_json_invalid');
    }
}
//# sourceMappingURL=release_surface_delivery.js.map