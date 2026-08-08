"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2ManifestHash = void 0;
exports.validateV2SeasonReleaseManifestBody = validateV2SeasonReleaseManifestBody;
exports.assertV2SeasonReleaseManifestBody = assertV2SeasonReleaseManifestBody;
exports.buildV2SeasonReleaseRecord = buildV2SeasonReleaseRecord;
exports.validateV2SeasonReleasePointer = validateV2SeasonReleasePointer;
exports.assertV2SeasonReleasePointer = assertV2SeasonReleasePointer;
exports.assertV2RollbackTarget = assertV2RollbackTarget;
exports.buildV2ReleaseCacheKey = buildV2ReleaseCacheKey;
exports.validatePublishedV2SeasonManifest = validatePublishedV2SeasonManifest;
exports.resolveV2ReleaseManifest = resolveV2ReleaseManifest;
const decision_registry_1 = require("../policies/decision_registry");
const HASH = /^[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9._:-]{1,160}$/;
const CODE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const PERCENT = new Set([0, 1, 5, 10, 25, 50, 100]);
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const ref = (value) => isObject(value) && typeof value.id === 'string' && TOKEN.test(value.id) && Number.isSafeInteger(value.version) && Number(value.version) >= 1 && typeof value.contentHash === 'string' && HASH.test(value.contentHash);
const objectRef = (value) => isObject(value) && typeof value.path === 'string' && value.path.length > 0 && !value.path.startsWith('/') && !value.path.includes('..') && typeof value.generation === 'string' && value.generation.length > 0 && typeof value.contentHash === 'string' && HASH.test(value.contentHash) && Number.isSafeInteger(value.byteSize) && Number(value.byteSize) > 0;
const v2ManifestHash = (body) => (0, decision_registry_1.hashCanonicalBody)(body);
exports.v2ManifestHash = v2ManifestHash;
function validateV2SeasonReleaseManifestBody(value) {
    const errors = [];
    if (!isObject(value) || value.schemaVersion !== 'v2-season-release-manifest-body.v1')
        return { ok: false, errors: ['manifest_schema_invalid'] };
    if (Object.prototype.hasOwnProperty.call(value, 'manifestHash') || Object.prototype.hasOwnProperty.call(value, 'object') || Object.prototype.hasOwnProperty.call(value, 'record'))
        errors.push('manifest_body_self_metadata_forbidden');
    if (typeof value.releaseId !== 'string' || !TOKEN.test(value.releaseId))
        errors.push('release_id_invalid');
    if (typeof value.courseReleaseId !== 'string' || !TOKEN.test(value.courseReleaseId))
        errors.push('course_release_id_invalid');
    if (typeof value.seasonId !== 'string' || !TOKEN.test(value.seasonId))
        errors.push('season_id_invalid');
    if (!Number.isSafeInteger(value.seasonRevision) || Number(value.seasonRevision) < 1)
        errors.push('season_revision_invalid');
    if (typeof value.seasonContentHash !== 'string' || !HASH.test(value.seasonContentHash))
        errors.push('season_hash_invalid');
    if (typeof value.studyTarget !== 'string' || !CODE.test(value.studyTarget))
        errors.push('study_target_invalid');
    if (typeof value.learnerSourceLocale !== 'string' || !CODE.test(value.learnerSourceLocale))
        errors.push('source_locale_invalid');
    if (!['vertical_slice', 'chapter_internal', 'full_season'].includes(String(value.releaseScope)))
        errors.push('release_scope_invalid');
    if (!ref(value.decisionRegistryRef))
        errors.push('decision_registry_ref_invalid');
    const supports = value.supportManifestRefs;
    if (!Array.isArray(supports) || supports.length !== 2 || new Set(supports.filter(isObject).map((item) => item.platform)).size !== 2)
        errors.push('support_manifest_pair_invalid');
    else
        for (const support of supports)
            if (!isObject(support) || !['ios', 'android'].includes(String(support.platform)) || !['lab', 'staging', 'production'].includes(String(support.environment)) || typeof support.manifestId !== 'string' || !TOKEN.test(support.manifestId) || typeof support.minAppVersion !== 'string' || !TOKEN.test(support.minAppVersion) || typeof support.contentHash !== 'string' || !HASH.test(support.contentHash))
                errors.push('support_manifest_ref_invalid');
    if (!Array.isArray(value.voiceNetworkEgressRefs) || !value.voiceNetworkEgressRefs.every(ref))
        errors.push('voice_egress_refs_invalid');
    if (!Array.isArray(value.lessonUnits) || value.lessonUnits.length < 1 || !value.lessonUnits.every((unit) => isObject(unit) && typeof unit.episodeId === 'string' && TOKEN.test(unit.episodeId) && Number.isSafeInteger(unit.lessonId) && Number(unit.lessonId) >= 1 && objectRef(unit.object)))
        errors.push('lesson_units_invalid');
    if (value.releaseScope === 'full_season' && Array.isArray(value.lessonUnits) && value.lessonUnits.length !== 32)
        errors.push('full_season_requires_32_units');
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
function assertV2SeasonReleaseManifestBody(value) {
    const result = validateV2SeasonReleaseManifestBody(value);
    if (!result.ok)
        throw new Error(`v2_manifest_invalid:${result.errors.join(',')}`);
    return value;
}
function buildV2SeasonReleaseRecord(body, object, createdAt) {
    const manifest = assertV2SeasonReleaseManifestBody(body);
    if (!objectRef(object) || !iso(createdAt))
        throw new Error('v2_manifest_record_invalid');
    return Object.freeze({ schemaVersion: 'v2-season-release-manifest-record.v1', releaseId: manifest.releaseId, seasonId: manifest.seasonId, manifestHash: (0, exports.v2ManifestHash)(manifest), object, createdAt });
}
function validateV2SeasonReleasePointer(value, expectedEnvironment) {
    const errors = [];
    if (!isObject(value) || value.schemaVersion !== 'v2-season-release-pointer.v1')
        return { ok: false, errors: ['pointer_schema_invalid'] };
    if (expectedEnvironment && value.environment !== expectedEnvironment)
        errors.push('pointer_environment_mismatch');
    if (!['lab', 'staging', 'production'].includes(String(value.environment)))
        errors.push('pointer_environment_invalid');
    for (const key of ['pointerId', 'studyTarget', 'learnerSourceLocale', 'seasonId', 'activeReleaseId', 'updatedBy'])
        if (typeof value[key] !== 'string' || !TOKEN.test(value[key]))
            errors.push(`${key}_invalid`);
    if (typeof value.studyTarget === 'string' && !CODE.test(value.studyTarget))
        errors.push('study_target_invalid');
    if (typeof value.learnerSourceLocale === 'string' && !CODE.test(value.learnerSourceLocale))
        errors.push('source_locale_invalid');
    if (typeof value.activeManifestHash !== 'string' || !HASH.test(value.activeManifestHash))
        errors.push('active_manifest_hash_invalid');
    if (!Number.isSafeInteger(value.expectedCatalogRevision) || Number(value.expectedCatalogRevision) < 1)
        errors.push('catalog_revision_invalid');
    if (!iso(value.updatedAt))
        errors.push('updated_at_invalid');
    const rollout = value.rollout;
    if (!isObject(rollout) || !Number.isSafeInteger(rollout.revision) || Number(rollout.revision) < 1 || !PERCENT.has(Number(rollout.percent)) || !Number.isSafeInteger(rollout.cohortSaltVersion) || Number(rollout.cohortSaltVersion) < 1 || !Array.isArray(rollout.allowlistCohortIds) || !Array.isArray(rollout.excludeCohortIds) || !['internal', 'rolling_out', 'live', 'paused', 'rolled_back'].includes(String(rollout.state)))
        errors.push('rollout_invalid');
    const rolloutRecord = isObject(rollout) ? rollout : undefined;
    if (rolloutRecord && rolloutRecord.state === 'paused' && (typeof rolloutRecord.pauseReason !== 'string' || !rolloutRecord.pauseReason.trim()))
        errors.push('pause_reason_required');
    if (rolloutRecord && rolloutRecord.state !== 'paused' && rolloutRecord.pauseReason !== undefined)
        errors.push('pause_reason_forbidden');
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
function assertV2SeasonReleasePointer(value, expectedEnvironment) {
    const result = validateV2SeasonReleasePointer(value, expectedEnvironment);
    if (!result.ok)
        throw new Error(`v2_pointer_invalid:${result.errors.join(',')}`);
    return value;
}
function assertV2RollbackTarget(pointer, target) {
    if (target.environment !== pointer.environment || target.seasonId !== pointer.seasonId || target.studyTarget !== pointer.studyTarget || target.learnerSourceLocale !== pointer.learnerSourceLocale)
        throw new Error('v2_rollback_scope_mismatch');
    if (target.activeReleaseId === pointer.activeReleaseId && target.activeManifestHash === pointer.activeManifestHash)
        throw new Error('v2_rollback_target_same_release');
}
function buildV2ReleaseCacheKey(input) {
    for (const [name, value] of Object.entries(input)) {
        if (name === 'manifestHash' ? !HASH.test(value) : !TOKEN.test(value))
            throw new Error(`v2_release_cache_key_${name}_invalid`);
    }
    return `v2:${input.target}:${input.source}:${input.seasonId}:${input.releaseId}:${input.manifestHash}`;
}
function validatePublishedV2SeasonManifest(value, expectedEnvironment) {
    if (!isObject(value) || value.schemaVersion !== 'published-v2-season-manifest-view.v1')
        return { ok: false, errors: ['published_view_schema_invalid'] };
    const errors = [];
    if (!Number.isSafeInteger(value.catalogRevision) || Number(value.catalogRevision) < 1)
        errors.push('catalog_revision_invalid');
    try {
        const resolved = resolveV2ReleaseManifest(value.activePointer, value.manifestRecord, value.manifestBody, expectedEnvironment);
        if (resolved.pointer.expectedCatalogRevision !== value.catalogRevision)
            errors.push('catalog_revision_mismatch');
    }
    catch (error) {
        errors.push(error instanceof Error ? error.message : 'published_view_identity_invalid');
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
function resolveV2ReleaseManifest(pointerValue, recordValue, bodyValue, expectedEnvironment) {
    const pointer = assertV2SeasonReleasePointer(pointerValue, expectedEnvironment);
    const record = recordValue;
    if (!isObject(record) || record.schemaVersion !== 'v2-season-release-manifest-record.v1' || typeof record.releaseId !== 'string' || typeof record.seasonId !== 'string' || typeof record.manifestHash !== 'string' || !HASH.test(record.manifestHash) || !objectRef(record.object) || !iso(record.createdAt))
        throw new Error('v2_manifest_record_invalid');
    const body = assertV2SeasonReleaseManifestBody(bodyValue);
    const computedHash = (0, exports.v2ManifestHash)(body);
    if (record.manifestHash !== computedHash || record.object.contentHash !== computedHash)
        throw new Error('v2_manifest_hash_mismatch');
    if (pointer.activeReleaseId !== record.releaseId || pointer.activeManifestHash !== record.manifestHash || pointer.seasonId !== record.seasonId || body.releaseId !== record.releaseId || body.seasonId !== record.seasonId || body.seasonId !== pointer.seasonId || body.studyTarget !== pointer.studyTarget || body.learnerSourceLocale !== pointer.learnerSourceLocale)
        throw new Error('v2_manifest_identity_mismatch');
    return Object.freeze({ pointer, record, body });
}
//# sourceMappingURL=release_manifest.js.map