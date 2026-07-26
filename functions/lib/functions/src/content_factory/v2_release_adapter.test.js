"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v2_release_adapter_1 = require("./v2_release_adapter");
const hash = 'a'.repeat(64);
const object = { path: 'v2/episode-01.json', generation: '7', contentHash: hash, byteSize: 42 };
const body = {
    schemaVersion: 'v2-season-release-manifest-body.v1', releaseId: 'release-1', courseReleaseId: 'course-1', seasonId: 'season-1', seasonRevision: 1, seasonContentHash: hash, studyTarget: 'en', learnerSourceLocale: 'ru', releaseScope: 'vertical_slice', decisionRegistryRef: { id: 'decision-registry', version: 1, contentHash: hash }, supportManifestRefs: [
        { platform: 'ios', environment: 'lab', minAppVersion: '1.0.0', manifestId: 'ios-manifest', contentHash: hash },
        { platform: 'android', environment: 'lab', minAppVersion: '1.0.0', manifestId: 'android-manifest', contentHash: hash },
    ], voiceNetworkEgressRefs: [], lessonUnits: [{ episodeId: 'episode-1', lessonId: 1, object }],
};
const pointer = {
    schemaVersion: 'v2-season-release-pointer.v1', pointerId: 'lab:en:ru:season-1', environment: 'lab', studyTarget: 'en', learnerSourceLocale: 'ru', seasonId: 'season-1', activeReleaseId: 'release-1', activeManifestHash: hash, rollout: { revision: 1, state: 'internal', percent: 0, cohortSaltVersion: 1, allowlistCohortIds: [], excludeCohortIds: [] }, expectedCatalogRevision: 1, updatedBy: 'admin-1', updatedAt: '2026-07-17T00:00:00.000Z',
};
describe('V2 lesson-bundle release adapter', () => {
    test('accepts canonical vertical manifest and records external hash', () => {
        expect((0, v2_release_adapter_1.validateV2SeasonReleaseManifestBody)(body)).toEqual({ ok: true, errors: [] });
        expect((0, v2_release_adapter_1.v2ManifestHash)(body)).toMatch(/^[a-f0-9]{64}$/);
        expect((0, v2_release_adapter_1.buildV2SeasonReleaseRecord)(body, object, '2026-07-17T00:00:00.000Z')).toMatchObject({ releaseId: 'release-1', seasonId: 'season-1', manifestHash: (0, v2_release_adapter_1.v2ManifestHash)(body) });
        expect(() => (0, v2_release_adapter_1.assertV2SeasonReleaseManifestBody)({ ...body, manifestHash: hash })).toThrow('manifest_body_self_metadata_forbidden');
    });
    test('full season requires exactly 32 lesson units and support pair is ios/android', () => {
        expect((0, v2_release_adapter_1.validateV2SeasonReleaseManifestBody)({ ...body, releaseScope: 'full_season' }).errors).toContain('full_season_requires_32_units');
        expect((0, v2_release_adapter_1.validateV2SeasonReleaseManifestBody)({ ...body, supportManifestRefs: [body.supportManifestRefs[0], body.supportManifestRefs[0]] }).errors).toContain('support_manifest_pair_invalid');
    });
    test('pointer is environment-bound and paused rollout requires a reason', () => {
        expect((0, v2_release_adapter_1.validateV2SeasonReleasePointer)(pointer, 'lab')).toEqual({ ok: true, errors: [] });
        expect((0, v2_release_adapter_1.validateV2SeasonReleasePointer)({ ...pointer, rollout: { ...pointer.rollout, state: 'paused' } }).errors).toContain('pause_reason_required');
        expect(() => (0, v2_release_adapter_1.assertV2SeasonReleasePointer)(pointer, 'production')).toThrow('pointer_environment_mismatch');
    });
    test('rollback cannot cross scope or target the active release', () => {
        expect(() => (0, v2_release_adapter_1.assertV2RollbackTarget)(pointer, pointer)).toThrow('v2_rollback_target_same_release');
        expect(() => (0, v2_release_adapter_1.assertV2RollbackTarget)(pointer, { ...pointer, seasonId: 'season-2', activeReleaseId: 'release-0' })).toThrow('v2_rollback_scope_mismatch');
        expect(() => (0, v2_release_adapter_1.assertV2RollbackTarget)(pointer, { ...pointer, activeReleaseId: 'release-0', activeManifestHash: 'b'.repeat(64) })).not.toThrow();
    });
});
//# sourceMappingURL=v2_release_adapter.test.js.map