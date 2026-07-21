"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceRegistryDocId = sourceRegistryDocId;
exports.parseSourceRegistryReference = parseSourceRegistryReference;
exports.inspectSourceRegistryCoverage = inspectSourceRegistryCoverage;
exports.validateSourceRegistry = validateSourceRegistry;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
function sourceRegistryDocId(blueprintId, version) {
    if (!TOKEN_RE.test(blueprintId) || !TOKEN_RE.test(version))
        throw new Error('source_registry_id_invalid');
    return `${blueprintId}:${version}`;
}
function parseSourceRegistryReference(reference) {
    const separator = reference.indexOf(':');
    if (separator <= 0 || separator === reference.length - 1)
        throw new Error('source_registry_reference_invalid');
    const blueprintId = reference.slice(0, separator);
    const version = reference.slice(separator + 1);
    sourceRegistryDocId(blueprintId, version);
    return Object.freeze({ blueprintId, version });
}
function inspectSourceRegistryCoverage(registry, requestedLessonIds) {
    const missingLessonIds = [...new Set(requestedLessonIds)]
        .filter((lessonId) => !Object.prototype.hasOwnProperty.call(registry.lessons, String(lessonId)))
        .sort((left, right) => left - right);
    return missingLessonIds.length
        ? Object.freeze({ ok: false, code: 'source_coverage', missingLessonIds: Object.freeze(missingLessonIds) })
        : Object.freeze({ ok: true, code: 'ok', missingLessonIds: Object.freeze([]) });
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validateSourceRegistry(value) {
    const errors = [];
    if (!isRecord(value))
        return { ok: false, errors: ['source_registry_required'] };
    if (typeof value.blueprintId !== 'string' || !TOKEN_RE.test(value.blueprintId))
        errors.push('blueprint_id_invalid');
    if (value.blueprintLocale !== 'en')
        errors.push('blueprint_locale_must_be_en');
    if (typeof value.blueprintHash !== 'string' || !HASH_RE.test(value.blueprintHash))
        errors.push('blueprint_hash_invalid');
    if (typeof value.version !== 'string' || !TOKEN_RE.test(value.version))
        errors.push('version_invalid');
    if (!Array.isArray(value.evidence) || value.evidence.length === 0)
        errors.push('source_evidence_required');
    else
        value.evidence.forEach((item) => {
            if (!isRecord(item) || typeof item.evidenceId !== 'string' || !item.evidenceId.trim() || typeof item.authority !== 'string' || !item.authority.trim() || typeof item.url !== 'string' || !item.url.startsWith('https://') || typeof item.claim !== 'string' || !item.claim.trim())
                errors.push('source_evidence_invalid');
        });
    if (!isRecord(value.lessons) || Object.keys(value.lessons).length === 0)
        errors.push('lessons_required');
    else
        Object.values(value.lessons).forEach((lesson) => {
            if (!isRecord(lesson) || !Number.isInteger(lesson.lessonId) || Number(lesson.lessonId) < 1 || typeof lesson.topic !== 'string' || !lesson.topic.trim() || !Array.isArray(lesson.sourcePhrases) || lesson.sourcePhrases.length === 0 || lesson.sourcePhrases.some((phrase) => typeof phrase !== 'string' || !phrase.trim()) || !Array.isArray(lesson.vocabularyFocus) || !Array.isArray(lesson.drills))
                errors.push('lesson_blueprint_invalid');
        });
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
//# sourceMappingURL=source_registry.js.map