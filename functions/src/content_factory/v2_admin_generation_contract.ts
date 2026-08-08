import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import type { PublishedModeTemplateRef } from '../../../modules/learning-v2/contracts/activity';
import type { V2LanguageProfileRef } from '../../../modules/learning-v2/content/language_profile';
import {
  buildV2SeasonPlan,
  type V2EpisodeRecipe,
  type V2GenerationScope,
  type V2GenerationStage,
  type V2SeasonGenerationInput,
} from './v2_generation_plan';

const TOP_LEVEL_FIELDS = [
  'schemaVersion', 'seasonId', 'scope', 'episodeIds', 'recipes',
  'studyTarget', 'sourceLocale', 'targetLocales', 'templateBindings', 'idempotencyKey',
  'languageProfileRef',
] as const;
const SCOPES = new Set<V2GenerationScope>(['vertical_slice', 'chapter_internal', 'full_season']);
const LOCALE_PATTERN = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

export interface V2EpisodeTemplateBinding {
  readonly episodeId: string;
  readonly templateRefs: readonly PublishedModeTemplateRef[];
}

export interface V2AdminGenerationRequest extends V2SeasonGenerationInput {
  readonly schemaVersion: 'v2-admin-generation-request.v1';
  readonly episodeIds: readonly string[];
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly targetLocales: readonly string[];
  readonly templateBindings: readonly V2EpisodeTemplateBinding[];
  readonly idempotencyKey: string;
  // зачем: владелец требует неизменяемый языковой профиль как ПРЕДУСЛОВИЕ генерации —
  // exact ref (id+version+hash), не новая стадия фабрики.
  readonly languageProfileRef: V2LanguageProfileRef;
}

export interface V2LocalizationTask {
  readonly id: string;
  readonly episodeId: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly dependsOn: readonly string[];
}

export interface V2AdminTemplateBinding extends V2EpisodeTemplateBinding {
  readonly activityInstancesStageId: string;
}

export interface V2AdminGenerationPlan {
  readonly schemaVersion: 'v2-admin-generation-plan.v1';
  readonly requestFingerprint: string;
  readonly stages: readonly V2GenerationStage[];
  readonly localizationTasks: readonly V2LocalizationTask[];
  readonly templateBindings: readonly V2AdminTemplateBinding[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactFields(value: Record<string, unknown>, fields: readonly string[]): void {
  if (Object.keys(value).some((key) => !fields.includes(key))) throw new Error('v2_generation_unknown_field');
}

function parseString(value: unknown, code: string, pattern?: RegExp): string {
  if (typeof value !== 'string') throw new Error(code);
  const result = value.trim();
  if (!result || (pattern && !pattern.test(result))) throw new Error(code);
  return result;
}

function parseTemplateRef(value: unknown): PublishedModeTemplateRef {
  if (!isRecord(value)) throw new Error('v2_generation_template_ref_invalid');
  assertExactFields(value, ['templateId', 'version', 'contentHash']);
  const templateId = parseString(value.templateId, 'v2_generation_template_ref_invalid', IDENTIFIER_PATTERN);
  const version = value.version;
  const contentHash = parseString(value.contentHash, 'v2_generation_template_ref_invalid', HASH_PATTERN);
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 100000)
    throw new Error('v2_generation_template_ref_invalid');
  return Object.freeze({ templateId, version, contentHash });
}

function parseTemplateBindings(value: unknown, episodeIds: readonly string[]): readonly V2EpisodeTemplateBinding[] {
  if (!Array.isArray(value) || value.length !== episodeIds.length) throw new Error('v2_generation_template_binding_missing');
  const seen = new Set<string>();
  const result = value.map((item) => {
    if (!isRecord(item)) throw new Error('v2_generation_template_binding_invalid');
    assertExactFields(item, ['episodeId', 'templateRefs']);
    const episodeId = parseString(item.episodeId, 'v2_generation_template_binding_invalid', IDENTIFIER_PATTERN);
    if (!episodeIds.includes(episodeId) || seen.has(episodeId)) throw new Error('v2_generation_template_binding_invalid');
    seen.add(episodeId);
    if (!Array.isArray(item.templateRefs) || item.templateRefs.length < 1 || item.templateRefs.length > 64)
      throw new Error('v2_generation_template_binding_invalid');
    const refs = item.templateRefs.map(parseTemplateRef);
    const refKeys = refs.map((ref) => `${ref.templateId}@${ref.version}:${ref.contentHash}`);
    if (new Set(refKeys).size !== refKeys.length) throw new Error('v2_generation_template_ref_duplicate');
    return Object.freeze({ episodeId, templateRefs: Object.freeze(refs) });
  });
  if (seen.size !== episodeIds.length) throw new Error('v2_generation_template_binding_missing');
  return Object.freeze(result);
}

function parseRecipes(value: unknown, episodeIds: readonly string[]): readonly V2EpisodeRecipe[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > episodeIds.length) throw new Error('v2_generation_recipes_invalid');
  const seen = new Set<string>();
  const result = value.map((item) => {
    if (!isRecord(item)) throw new Error('v2_generation_recipes_invalid');
    assertExactFields(item, ['episodeId', 'dialogue']);
    const episodeId = parseString(item.episodeId, 'v2_generation_recipes_invalid', IDENTIFIER_PATTERN);
    if (!episodeIds.includes(episodeId) || seen.has(episodeId)) throw new Error('v2_generation_recipes_invalid');
    if (item.dialogue !== undefined && typeof item.dialogue !== 'boolean') throw new Error('v2_generation_recipes_invalid');
    seen.add(episodeId);
    return Object.freeze({ episodeId, ...(item.dialogue === undefined ? {} : { dialogue: item.dialogue }) });
  });
  return Object.freeze(result);
}

// зачем: fail-closed разбор exact ref профиля — только три поля, честный sha256,
// целая версия; битый ref не должен доехать до fingerprint и стадий.
function parseLanguageProfileRef(value: unknown): V2LanguageProfileRef {
  if (value === undefined || value === null) throw new Error('v2_generation_language_profile_required');
  if (!isRecord(value)) throw new Error('v2_generation_language_profile_invalid');
  if (Object.keys(value).some((key) => !['profileId', 'version', 'contentHash'].includes(key)))
    throw new Error('v2_generation_language_profile_invalid');
  const profileId = parseString(value.profileId, 'v2_generation_language_profile_invalid', IDENTIFIER_PATTERN);
  const contentHash = parseString(value.contentHash, 'v2_generation_language_profile_invalid', HASH_PATTERN);
  const version = value.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 100000)
    throw new Error('v2_generation_language_profile_invalid');
  return Object.freeze({ profileId, version, contentHash });
}

export function parseV2AdminGenerationRequest(data: unknown): V2AdminGenerationRequest {
  if (!isRecord(data)) throw new Error('v2_generation_request_invalid');
  assertExactFields(data, TOP_LEVEL_FIELDS);
  if (data.schemaVersion !== 'v2-admin-generation-request.v1') throw new Error('v2_generation_schema_invalid');
  const seasonId = parseString(data.seasonId, 'v2_generation_season_required', IDENTIFIER_PATTERN);
  const scope = data.scope;
  if (typeof scope !== 'string' || !SCOPES.has(scope as V2GenerationScope)) throw new Error('v2_generation_scope_invalid');
  if (!Array.isArray(data.episodeIds) || data.episodeIds.length < 1) throw new Error('v2_generation_episode_ids_invalid');
  const episodeIds = data.episodeIds.map((id) => parseString(id, 'v2_generation_episode_ids_invalid', IDENTIFIER_PATTERN));
  if (new Set(episodeIds).size !== episodeIds.length) throw new Error('v2_generation_episode_ids_unique');
  const studyTarget = parseString(data.studyTarget, 'v2_generation_language_invalid', LOCALE_PATTERN);
  const sourceLocale = parseString(data.sourceLocale, 'v2_generation_language_invalid', LOCALE_PATTERN);
  const targetLocales = data.targetLocales;
  if (!Array.isArray(targetLocales) || targetLocales.length < 1 || targetLocales.length > 32) throw new Error('v2_generation_locales_invalid');
  const locales = targetLocales.map((locale) => parseString(locale, 'v2_generation_locales_invalid', LOCALE_PATTERN));
  if (new Set(locales).size !== locales.length || locales.includes(sourceLocale)) throw new Error('v2_generation_locales_unique');
  const recipes = parseRecipes(data.recipes, episodeIds);
  const templateBindings = parseTemplateBindings(data.templateBindings, episodeIds);
  const idempotencyKey = parseString(data.idempotencyKey, 'v2_generation_idempotency_required', IDENTIFIER_PATTERN);
  const languageProfileRef = parseLanguageProfileRef(data.languageProfileRef);
  return Object.freeze({ schemaVersion: 'v2-admin-generation-request.v1', seasonId, scope: scope as V2GenerationScope, episodeIds: Object.freeze(episodeIds), ...(recipes ? { recipes } : {}), studyTarget, sourceLocale, targetLocales: Object.freeze(locales), templateBindings, idempotencyKey, languageProfileRef });
}

export function buildV2AdminGenerationPlan(request: V2AdminGenerationRequest): V2AdminGenerationPlan {
  const stages = buildV2SeasonPlan(request);
  const localizationStageFor = (episodeId: string) => `v2_localization:${request.seasonId}:${episodeId}`;
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
  const requestFingerprint = `v2-admin-generation-request.v1:${hashCanonicalBody(request)}`;
  return Object.freeze({ schemaVersion: 'v2-admin-generation-plan.v1', requestFingerprint, stages, localizationTasks: Object.freeze(localizationTasks), templateBindings: Object.freeze(templateBindings) });
}
