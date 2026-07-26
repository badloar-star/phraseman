import { assertV2RollbackTarget, assertV2SeasonReleaseManifestBody, assertV2SeasonReleasePointer, buildV2SeasonReleaseRecord, validateV2SeasonReleaseManifestBody, validateV2SeasonReleasePointer, v2ManifestHash, type V2SeasonReleaseManifestBody, type V2SeasonReleasePointer } from './v2_release_adapter';

const hash = 'a'.repeat(64);
const object = { path: 'v2/episode-01.json', generation: '7', contentHash: hash, byteSize: 42 } as const;
const body: V2SeasonReleaseManifestBody = {
  schemaVersion: 'v2-season-release-manifest-body.v1', releaseId: 'release-1', courseReleaseId: 'course-1', seasonId: 'season-1', seasonRevision: 1, seasonContentHash: hash, studyTarget: 'en', learnerSourceLocale: 'ru', releaseScope: 'vertical_slice', decisionRegistryRef: { id: 'decision-registry', version: 1, contentHash: hash }, supportManifestRefs: [
    { platform: 'ios', environment: 'lab', minAppVersion: '1.0.0', manifestId: 'ios-manifest', contentHash: hash },
    { platform: 'android', environment: 'lab', minAppVersion: '1.0.0', manifestId: 'android-manifest', contentHash: hash },
  ], voiceNetworkEgressRefs: [], lessonUnits: [{ episodeId: 'episode-1', lessonId: 1, object }],
};
const pointer: V2SeasonReleasePointer = {
  schemaVersion: 'v2-season-release-pointer.v1', pointerId: 'lab:en:ru:season-1', environment: 'lab', studyTarget: 'en', learnerSourceLocale: 'ru', seasonId: 'season-1', activeReleaseId: 'release-1', activeManifestHash: hash, rollout: { revision: 1, state: 'internal', percent: 0, cohortSaltVersion: 1, allowlistCohortIds: [], excludeCohortIds: [] }, expectedCatalogRevision: 1, updatedBy: 'admin-1', updatedAt: '2026-07-17T00:00:00.000Z',
};

describe('V2 lesson-bundle release adapter', () => {
  test('accepts canonical vertical manifest and records external hash', () => {
    expect(validateV2SeasonReleaseManifestBody(body)).toEqual({ ok: true, errors: [] });
    expect(v2ManifestHash(body)).toMatch(/^[a-f0-9]{64}$/);
    expect(buildV2SeasonReleaseRecord(body, object, '2026-07-17T00:00:00.000Z')).toMatchObject({ releaseId: 'release-1', seasonId: 'season-1', manifestHash: v2ManifestHash(body) });
    expect(() => assertV2SeasonReleaseManifestBody({ ...body, manifestHash: hash })).toThrow('manifest_body_self_metadata_forbidden');
  });
  test('full season requires exactly 32 lesson units and support pair is ios/android', () => {
    expect(validateV2SeasonReleaseManifestBody({ ...body, releaseScope: 'full_season' }).errors).toContain('full_season_requires_32_units');
    expect(validateV2SeasonReleaseManifestBody({ ...body, supportManifestRefs: [body.supportManifestRefs[0], body.supportManifestRefs[0]] }).errors).toContain('support_manifest_pair_invalid');
  });
  test('pointer is environment-bound and paused rollout requires a reason', () => {
    expect(validateV2SeasonReleasePointer(pointer, 'lab')).toEqual({ ok: true, errors: [] });
    expect(validateV2SeasonReleasePointer({ ...pointer, rollout: { ...pointer.rollout, state: 'paused' } }).errors).toContain('pause_reason_required');
    expect(() => assertV2SeasonReleasePointer(pointer, 'production')).toThrow('pointer_environment_mismatch');
  });
  test('rollback cannot cross scope or target the active release', () => {
    expect(() => assertV2RollbackTarget(pointer, pointer)).toThrow('v2_rollback_target_same_release');
    expect(() => assertV2RollbackTarget(pointer, { ...pointer, seasonId: 'season-2', activeReleaseId: 'release-0' })).toThrow('v2_rollback_scope_mismatch');
    expect(() => assertV2RollbackTarget(pointer, { ...pointer, activeReleaseId: 'release-0', activeManifestHash: 'b'.repeat(64) })).not.toThrow();
  });
});
