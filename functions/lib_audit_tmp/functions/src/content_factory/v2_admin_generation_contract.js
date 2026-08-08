"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseV2AdminGenerationRequest = parseV2AdminGenerationRequest;
exports.buildV2AdminGenerationPlan = buildV2AdminGenerationPlan;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_generation_plan_1 = require("./v2_generation_plan");
const TOP_LEVEL_FIELDS = [
    'schemaVersion', 'seasonId', 'scope', 'episodeIds', 'recipes',
    'studyTarget', 'sourceLocale', 'targetLocales', 'templateBindings', 'idempotencyKey',
    'languageProfileRef',
];
const SCOPES = new Set(['vertical_slice', 'chapter_internal', 'full_season']);
const LOCALE_PATTERN = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assertExactFields(value, fields) {
    if (Object.keys(value).some((key) => !fields.includes(key)))
        throw new Error('v2_generation_unknown_field');
}
function parseString(value, code, pattern) {
    if (typeof value !== 'string')
        throw new Error(code);
    const result = value.trim();
    if (!result || (pattern && !pattern.test(result)))
        throw new Error(code);
    return result;
}
function parseTemplateRef(value) {
    if (!isRecord(value))
        throw new Error('v2_generation_template_ref_invalid');
    assertExactFields(value, ['templateId', 'version', 'contentHash']);
    const templateId = parseString(value.templateId, 'v2_generation_template_ref_invalid', IDENTIFIER_PATTERN);
    const version = value.version;
    const contentHash = parseString(value.contentHash, 'v2_generation_template_ref_invalid', HASH_PATTERN);
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 100000)
        throw new Error('v2_generation_template_ref_invalid');
    return Object.freeze({ templateId, version, contentHash });
}
function parseTemplateBindings(value, episodeIds) {
    if (!Array.isArray(value) || value.length !== episodeIds.length)
        throw new Error('v2_generation_template_binding_missing');
    const seen = new Set();
    const result = value.map((item) => {
        if (!isRecord(item))
            throw new Error('v2_generation_template_binding_invalid');
        assertExactFields(item, ['episodeId', 'templateRefs']);
        const episodeId = parseString(item.episodeId, 'v2_generation_template_binding_invalid', IDENTIFIER_PATTERN);
        if (!episodeIds.includes(episodeId) || seen.has(episodeId))
            throw new Error('v2_generation_template_binding_invalid');
        seen.add(episodeId);
        if (!Array.isArray(item.templateRefs) || item.templateRefs.length < 1 || item.templateRefs.length > 64)
            throw new Error('v2_generation_template_binding_invalid');
        const refs = item.templateRefs.map(parseTemplateRef);
        const refKeys = refs.map((ref) => `${ref.templateId}@${ref.version}:${ref.contentHash}`);
        if (new Set(refKeys).size !== refKeys.length)
            throw new Error('v2_generation_template_ref_duplicate');
        return Object.freeze({ episodeId, templateRefs: Object.freeze(refs) });
    });
    if (seen.size !== episodeIds.length)
        throw new Error('v2_generation_template_binding_missing');
    return Object.freeze(result);
}
function parseRecipes(value, episodeIds) {
    if (value === undefined)
        return undefined;
    if (!Array.isArray(value) || value.length > episodeIds.length)
        throw new Error('v2_generation_recipes_invalid');
    const seen = new Set();
    const result = value.map((item) => {
        if (!isRecord(item))
            throw new Error('v2_generation_recipes_invalid');
        assertExactFields(item, ['episodeId', 'dialogue']);
        const episodeId = parseString(item.episodeId, 'v2_generation_recipes_invalid', IDENTIFIER_PATTERN);
        if (!episodeIds.includes(episodeId) || seen.has(episodeId))
            throw new Error('v2_generation_recipes_invalid');
        if (item.dialogue !== undefined && typeof item.dialogue !== 'boolean')
            throw new Error('v2_generation_recipes_invalid');
        seen.add(episodeId);
        return Object.freeze({ episodeId, ...(item.dialogue === undefined ? {} : { dialogue: item.dialogue }) });
    });
    return Object.freeze(result);
}
// зачем: fail-closed разбор exact ref профиля — только три поля, честный sha256,
// целая версия; битый ref не должен доехать до fingerprint и стадий.
function parseLanguageProfileRef(value) {
    if (value === undefined || value === null)
        throw new Error('v2_generation_language_profile_required');
    if (!isRecord(value))
        throw new Error('v2_generation_language_profile_invalid');
    if (Object.keys(value).some((key) => !['profileId', 'version', 'contentHash'].includes(key)))
        throw new Error('v2_generation_language_profile_invalid');
    const profileId = parseString(value.profileId, 'v2_generation_language_profile_invalid', IDENTIFIER_PATTERN);
    const contentHash = parseString(value.contentHash, 'v2_generation_language_profile_invalid', HASH_PATTERN);
    const version = value.version;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 100000)
        throw new Error('v2_generation_language_profile_invalid');
    return Object.freeze({ profileId, version, contentHash });
}
function parseV2AdminGenerationRequest(data) {
    if (!isRecord(data))
        throw new Error('v2_generation_request_invalid');
    assertExactFields(data, TOP_LEVEL_FIELDS);
    if (data.schemaVersion !== 'v2-admin-generation-request.v1')
        throw new Error('v2_generation_schema_invalid');
    const seasonId = parseString(data.seasonId, 'v2_generation_season_required', IDENTIFIER_PATTERN);
    const scope = data.scope;
    if (typeof scope !== 'string' || !SCOPES.has(scope))
        throw new Error('v2_generation_scope_invalid');
    if (!Array.isArray(data.episodeIds) || data.episodeIds.length < 1)
        throw new Error('v2_generation_episode_ids_invalid');
    const episodeIds = data.episodeIds.map((id) => parseString(id, 'v2_generation_episode_ids_invalid', IDENTIFIER_PATTERN));
    if (new Set(episodeIds).size !== episodeIds.length)
        throw new Error('v2_generation_episode_ids_unique');
    const studyTarget = parseString(data.studyTarget, 'v2_generation_language_invalid', LOCALE_PATTERN);
    const sourceLocale = parseString(data.sourceLocale, 'v2_generation_language_invalid', LOCALE_PATTERN);
    const targetLocales = data.targetLocales;
    if (!Array.isArray(targetLocales) || targetLocales.length < 1 || targetLocales.length > 32)
        throw new Error('v2_generation_locales_invalid');
    const locales = targetLocales.map((locale) => parseString(locale, 'v2_generation_locales_invalid', LOCALE_PATTERN));
    if (new Set(locales).size !== locales.length || locales.includes(sourceLocale))
        throw new Error('v2_generation_locales_unique');
    const recipes = parseRecipes(data.recipes, episodeIds);
    const templateBindings = parseTemplateBindings(data.templateBindings, episodeIds);
    const idempotencyKey = parseString(data.idempotencyKey, 'v2_generation_idempotency_required', IDENTIFIER_PATTERN);
    const languageProfileRef = parseLanguageProfileRef(data.languageProfileRef);
    return Object.freeze({ schemaVersion: 'v2-admin-generation-request.v1', seasonId, scope: scope, episodeIds: Object.freeze(episodeIds), ...(recipes ? { recipes } : {}), studyTarget, sourceLocale, targetLocales: Object.freeze(locales), templateBindings, idempotencyKey, languageProfileRef });
}
function buildV2AdminGenerationPlan(request) {
    const stages = (0, v2_generation_plan_1.buildV2SeasonPlan)(request);
    const localizationStageFor = (episodeId) => `v2_localization:${request.seasonId}:${episodeId}`;
    const localizationTasks = request.episodeIds.flatMap((episodeId) => request.targetLocales.map((targetLocale) => Object.freeze({
        id: `${localizationStageFor(episodeId)}:${targetLocale}`,
        episodeId,
        sourceLocale: request.sourceLocale,
        targetLocale,
        dependsOn: Object.freeze([localizationStageFor(episodeId)]),
    })));
    const templateBindings = request.templateBindings.map((binding) => Object.freeze({
        ...binding,
        activityInstancesStageId: `v2_activity_instances:${request.seasonId}:${binding.episodeId}`,
    }));
    const requestFingerprint = `v2-admin-generation-request.v1:${(0, decision_registry_1.hashCanonicalBody)(request)}`;
    return Object.freeze({ schemaVersion: 'v2-admin-generation-plan.v1', requestFingerprint, stages, localizationTasks: Object.freeze(localizationTasks), templateBindings: Object.freeze(templateBindings) });
}
//# sourceMappingURL=v2_admin_generation_contract.js.map