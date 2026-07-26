import { hashCanonicalBody } from '../policies/decision_registry';

const HASH = /^[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9._:-]{1,160}$/;
const CODE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const PERCENT = new Set([0, 1, 5, 10, 25, 50, 100]);

export type V2ReleaseEnvironment = 'lab' | 'staging' | 'production';
export type V2ReleaseState = 'internal' | 'rolling_out' | 'live' | 'paused' | 'rolled_back';
export type V2ReleaseScope = 'vertical_slice' | 'chapter_internal' | 'full_season';
export type V2Ref = Readonly<{ id: string; version: number; contentHash: string }>;
export type V2ObjectRef = Readonly<{ path: string; generation: string; contentHash: string; byteSize: number }>;
export type V2SupportRef = Readonly<{ platform: 'ios' | 'android'; environment: V2ReleaseEnvironment; minAppVersion: string; manifestId: string; contentHash: string }>;

export interface V2SeasonReleaseManifestBody {
  readonly schemaVersion: 'v2-season-release-manifest-body.v1';
  readonly releaseId: string;
  readonly courseReleaseId: string;
  readonly seasonId: string;
  readonly seasonRevision: number;
  readonly seasonContentHash: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly releaseScope: V2ReleaseScope;
  readonly decisionRegistryRef: V2Ref;
  readonly supportManifestRefs: readonly [V2SupportRef, V2SupportRef];
  readonly voiceNetworkEgressRefs: readonly V2Ref[];
  readonly lessonUnits: readonly { episodeId: string; lessonId: number; object: V2ObjectRef }[];
}

export interface V2SeasonReleaseManifestRecord {
  readonly schemaVersion: 'v2-season-release-manifest-record.v1';
  readonly releaseId: string;
  readonly seasonId: string;
  readonly manifestHash: string;
  readonly object: V2ObjectRef;
  readonly createdAt: string;
}

export interface V2SeasonReleasePointer {
  readonly schemaVersion: 'v2-season-release-pointer.v1';
  readonly pointerId: string;
  readonly environment: V2ReleaseEnvironment;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly activeReleaseId: string;
  readonly activeManifestHash: string;
  readonly previousReleaseId?: string;
  readonly rollout: { revision: number; state: V2ReleaseState; percent: number; cohortSaltVersion: number; allowlistCohortIds: readonly string[]; excludeCohortIds: readonly string[]; healthReceiptHash?: string; pauseReason?: string };
  readonly expectedCatalogRevision: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const iso = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const ref = (value: unknown): value is V2Ref => isObject(value) && typeof value.id === 'string' && TOKEN.test(value.id) && Number.isSafeInteger(value.version) && Number(value.version) >= 1 && typeof value.contentHash === 'string' && HASH.test(value.contentHash);
const objectRef = (value: unknown): value is V2ObjectRef => isObject(value) && typeof value.path === 'string' && value.path.length > 0 && !value.path.startsWith('/') && !value.path.includes('..') && typeof value.generation === 'string' && value.generation.length > 0 && typeof value.contentHash === 'string' && HASH.test(value.contentHash) && Number.isSafeInteger(value.byteSize) && Number(value.byteSize) > 0;

export const v2ManifestHash = (body: V2SeasonReleaseManifestBody): string => hashCanonicalBody(body);

export function validateV2SeasonReleaseManifestBody(value: unknown): { ok: boolean; errors: readonly string[] } {
  const errors: string[] = [];
  if (!isObject(value) || value.schemaVersion !== 'v2-season-release-manifest-body.v1') return { ok: false, errors: ['manifest_schema_invalid'] };
  if (Object.prototype.hasOwnProperty.call(value, 'manifestHash') || Object.prototype.hasOwnProperty.call(value, 'object') || Object.prototype.hasOwnProperty.call(value, 'record')) errors.push('manifest_body_self_metadata_forbidden');
  if (typeof value.releaseId !== 'string' || !TOKEN.test(value.releaseId)) errors.push('release_id_invalid');
  if (typeof value.courseReleaseId !== 'string' || !TOKEN.test(value.courseReleaseId)) errors.push('course_release_id_invalid');
  if (typeof value.seasonId !== 'string' || !TOKEN.test(value.seasonId)) errors.push('season_id_invalid');
  if (!Number.isSafeInteger(value.seasonRevision) || Number(value.seasonRevision) < 1) errors.push('season_revision_invalid');
  if (typeof value.seasonContentHash !== 'string' || !HASH.test(value.seasonContentHash)) errors.push('season_hash_invalid');
  if (typeof value.studyTarget !== 'string' || !CODE.test(value.studyTarget)) errors.push('study_target_invalid');
  if (typeof value.learnerSourceLocale !== 'string' || !CODE.test(value.learnerSourceLocale)) errors.push('source_locale_invalid');
  if (!['vertical_slice', 'chapter_internal', 'full_season'].includes(String(value.releaseScope))) errors.push('release_scope_invalid');
  if (!ref(value.decisionRegistryRef)) errors.push('decision_registry_ref_invalid');
  const supports = value.supportManifestRefs;
  if (!Array.isArray(supports) || supports.length !== 2 || new Set(supports.filter(isObject).map((item) => item.platform)).size !== 2) errors.push('support_manifest_pair_invalid');
  else for (const support of supports) if (!isObject(support) || !['ios', 'android'].includes(String(support.platform)) || !['lab', 'staging', 'production'].includes(String(support.environment)) || typeof support.manifestId !== 'string' || !TOKEN.test(support.manifestId) || typeof support.minAppVersion !== 'string' || !TOKEN.test(support.minAppVersion) || typeof support.contentHash !== 'string' || !HASH.test(support.contentHash)) errors.push('support_manifest_ref_invalid');
  if (!Array.isArray(value.voiceNetworkEgressRefs) || !value.voiceNetworkEgressRefs.every(ref)) errors.push('voice_egress_refs_invalid');
  if (!Array.isArray(value.lessonUnits) || value.lessonUnits.length < 1 || !value.lessonUnits.every((unit) => isObject(unit) && typeof unit.episodeId === 'string' && TOKEN.test(unit.episodeId) && Number.isSafeInteger(unit.lessonId) && Number(unit.lessonId) >= 1 && objectRef(unit.object))) errors.push('lesson_units_invalid');
  if (value.releaseScope === 'full_season' && Array.isArray(value.lessonUnits) && value.lessonUnits.length !== 32) errors.push('full_season_requires_32_units');
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function assertV2SeasonReleaseManifestBody(value: unknown): V2SeasonReleaseManifestBody {
  const result = validateV2SeasonReleaseManifestBody(value);
  if (!result.ok) throw new Error(`v2_manifest_invalid:${result.errors.join(',')}`);
  return value as V2SeasonReleaseManifestBody;
}

export function buildV2SeasonReleaseRecord(body: V2SeasonReleaseManifestBody, object: V2ObjectRef, createdAt: string): V2SeasonReleaseManifestRecord {
  const manifest = assertV2SeasonReleaseManifestBody(body);
  if (!objectRef(object) || !iso(createdAt)) throw new Error('v2_manifest_record_invalid');
  return Object.freeze({ schemaVersion: 'v2-season-release-manifest-record.v1', releaseId: manifest.releaseId, seasonId: manifest.seasonId, manifestHash: v2ManifestHash(manifest), object, createdAt });
}

export function validateV2SeasonReleasePointer(value: unknown, expectedEnvironment?: V2ReleaseEnvironment): { ok: boolean; errors: readonly string[] } {
  const errors: string[] = [];
  if (!isObject(value) || value.schemaVersion !== 'v2-season-release-pointer.v1') return { ok: false, errors: ['pointer_schema_invalid'] };
  if (expectedEnvironment && value.environment !== expectedEnvironment) errors.push('pointer_environment_mismatch');
  if (!['lab', 'staging', 'production'].includes(String(value.environment))) errors.push('pointer_environment_invalid');
  for (const key of ['pointerId', 'studyTarget', 'learnerSourceLocale', 'seasonId', 'activeReleaseId', 'updatedBy']) if (typeof value[key] !== 'string' || !TOKEN.test(value[key] as string)) errors.push(`${key}_invalid`);
  if (typeof value.studyTarget === 'string' && !CODE.test(value.studyTarget)) errors.push('study_target_invalid');
  if (typeof value.learnerSourceLocale === 'string' && !CODE.test(value.learnerSourceLocale)) errors.push('source_locale_invalid');
  if (typeof value.activeManifestHash !== 'string' || !HASH.test(value.activeManifestHash)) errors.push('active_manifest_hash_invalid');
  if (!Number.isSafeInteger(value.expectedCatalogRevision) || Number(value.expectedCatalogRevision) < 1) errors.push('catalog_revision_invalid');
  if (!iso(value.updatedAt)) errors.push('updated_at_invalid');
  const rollout = value.rollout;
  if (!isObject(rollout) || !Number.isSafeInteger(rollout.revision) || Number(rollout.revision) < 1 || !PERCENT.has(Number(rollout.percent)) || !Number.isSafeInteger(rollout.cohortSaltVersion) || Number(rollout.cohortSaltVersion) < 1 || !Array.isArray(rollout.allowlistCohortIds) || !Array.isArray(rollout.excludeCohortIds) || !['internal', 'rolling_out', 'live', 'paused', 'rolled_back'].includes(String(rollout.state))) errors.push('rollout_invalid');
  const rolloutRecord = isObject(rollout) ? rollout : undefined;
  if (rolloutRecord && rolloutRecord.state === 'paused' && (typeof rolloutRecord.pauseReason !== 'string' || !rolloutRecord.pauseReason.trim())) errors.push('pause_reason_required');
  if (rolloutRecord && rolloutRecord.state !== 'paused' && rolloutRecord.pauseReason !== undefined) errors.push('pause_reason_forbidden');
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function assertV2SeasonReleasePointer(value: unknown, expectedEnvironment?: V2ReleaseEnvironment): V2SeasonReleasePointer {
  const result = validateV2SeasonReleasePointer(value, expectedEnvironment);
  if (!result.ok) throw new Error(`v2_pointer_invalid:${result.errors.join(',')}`);
  return value as V2SeasonReleasePointer;
}

export function assertV2RollbackTarget(pointer: V2SeasonReleasePointer, target: Pick<V2SeasonReleasePointer, 'environment' | 'seasonId' | 'studyTarget' | 'learnerSourceLocale' | 'activeReleaseId' | 'activeManifestHash'>): void {
  if (target.environment !== pointer.environment || target.seasonId !== pointer.seasonId || target.studyTarget !== pointer.studyTarget || target.learnerSourceLocale !== pointer.learnerSourceLocale) throw new Error('v2_rollback_scope_mismatch');
  if (target.activeReleaseId === pointer.activeReleaseId && target.activeManifestHash === pointer.activeManifestHash) throw new Error('v2_rollback_target_same_release');
}

export interface V2ResolvedReleaseManifest {
  readonly pointer: V2SeasonReleasePointer;
  readonly record: V2SeasonReleaseManifestRecord;
  readonly body: V2SeasonReleaseManifestBody;
}

export interface V2PublishedSeasonManifestView {
  readonly schemaVersion: 'published-v2-season-manifest-view.v1';
  readonly catalogRevision: number;
  readonly manifestBody: V2SeasonReleaseManifestBody;
  readonly manifestRecord: V2SeasonReleaseManifestRecord;
  readonly activePointer: V2SeasonReleasePointer;
}

export function buildV2ReleaseCacheKey(input: { target: string; source: string; seasonId: string; releaseId: string; manifestHash: string }): string {
  for (const [name, value] of Object.entries(input)) {
    if (name === 'manifestHash' ? !HASH.test(value) : !TOKEN.test(value)) throw new Error(`v2_release_cache_key_${name}_invalid`);
  }
  return `v2:${input.target}:${input.source}:${input.seasonId}:${input.releaseId}:${input.manifestHash}`;
}

export function validatePublishedV2SeasonManifest(value: unknown, expectedEnvironment?: V2ReleaseEnvironment): { ok: boolean; errors: readonly string[] } {
  if (!isObject(value) || value.schemaVersion !== 'published-v2-season-manifest-view.v1') return { ok: false, errors: ['published_view_schema_invalid'] };
  const errors: string[] = [];
  if (!Number.isSafeInteger(value.catalogRevision) || Number(value.catalogRevision) < 1) errors.push('catalog_revision_invalid');
  try {
    const resolved = resolveV2ReleaseManifest(value.activePointer, value.manifestRecord, value.manifestBody, expectedEnvironment);
    if (resolved.pointer.expectedCatalogRevision !== value.catalogRevision) errors.push('catalog_revision_mismatch');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'published_view_identity_invalid');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function resolveV2ReleaseManifest(pointerValue: unknown, recordValue: unknown, bodyValue: unknown, expectedEnvironment?: V2ReleaseEnvironment): V2ResolvedReleaseManifest {
  const pointer = assertV2SeasonReleasePointer(pointerValue, expectedEnvironment);
  const record = recordValue as V2SeasonReleaseManifestRecord;
  if (!isObject(record) || record.schemaVersion !== 'v2-season-release-manifest-record.v1' || typeof record.releaseId !== 'string' || typeof record.seasonId !== 'string' || typeof record.manifestHash !== 'string' || !HASH.test(record.manifestHash) || !objectRef(record.object) || !iso(record.createdAt)) throw new Error('v2_manifest_record_invalid');
  const body = assertV2SeasonReleaseManifestBody(bodyValue);
  const computedHash = v2ManifestHash(body);
  if (record.manifestHash !== computedHash || record.object.contentHash !== computedHash) throw new Error('v2_manifest_hash_mismatch');
  if (pointer.activeReleaseId !== record.releaseId || pointer.activeManifestHash !== record.manifestHash || pointer.seasonId !== record.seasonId || body.releaseId !== record.releaseId || body.seasonId !== record.seasonId || body.seasonId !== pointer.seasonId || body.studyTarget !== pointer.studyTarget || body.learnerSourceLocale !== pointer.learnerSourceLocale) throw new Error('v2_manifest_identity_mismatch');
  return Object.freeze({ pointer, record, body });
}
