import { hashCanonicalBody } from '../modules/learning-v2/policies/decision_registry';
import { createV2ReleaseCache } from '../modules/learning-v2/content/release_cache';
import { buildV2ReleaseCacheKey, validatePublishedV2SeasonManifest } from '../modules/learning-v2/content/release_manifest';
import { loadV2ReleaseWithLkg } from '../modules/learning-v2/content/release_loader';

const object = { path: 'v2/r1/manifest.json', generation: '1', contentHash: 'a'.repeat(64), byteSize: 1 };
const body = { schemaVersion: 'v2-season-release-manifest-body.v1', releaseId: 'r1', courseReleaseId: 'course-1', seasonId: 's1', seasonRevision: 1, seasonContentHash: 'b'.repeat(64), studyTarget: 'en', learnerSourceLocale: 'ru', releaseScope: 'vertical_slice', decisionRegistryRef: { id: 'decision-1', version: 1, contentHash: 'c'.repeat(64) }, supportManifestRefs: [{ platform: 'ios', environment: 'lab', minAppVersion: '1.0.0', manifestId: 'ios-1', contentHash: 'd'.repeat(64) }, { platform: 'android', environment: 'lab', minAppVersion: '1.0.0', manifestId: 'android-1', contentHash: 'e'.repeat(64) }], voiceNetworkEgressRefs: [], lessonUnits: [{ episodeId: 'e1', lessonId: 1, object }] } as const;
const manifestHash = hashCanonicalBody(body);
const view = { schemaVersion: 'published-v2-season-manifest-view.v1', catalogRevision: 1, manifestBody: body, manifestRecord: { schemaVersion: 'v2-season-release-manifest-record.v1', releaseId: 'r1', seasonId: 's1', manifestHash, object: { ...object, contentHash: manifestHash }, createdAt: '2026-07-18T00:00:00.000Z' }, activePointer: { schemaVersion: 'v2-season-release-pointer.v1', pointerId: 'p1', environment: 'lab', studyTarget: 'en', learnerSourceLocale: 'ru', seasonId: 's1', activeReleaseId: 'r1', activeManifestHash: manifestHash, expectedCatalogRevision: 1, updatedBy: 'admin-1', updatedAt: '2026-07-18T00:00:00.000Z', rollout: { revision: 1, state: 'internal', percent: 0, cohortSaltVersion: 1, allowlistCohortIds: [], excludeCohortIds: [] } } } as const;

describe('Learning V2 release loader/cache', () => {
  test('rejects pointer/body/record identity or hash drift', () => {
    expect(validatePublishedV2SeasonManifest(view).ok).toBe(true);
    expect(validatePublishedV2SeasonManifest({ ...view, activePointer: { ...view.activePointer, activeManifestHash: 'b'.repeat(64) } }).ok).toBe(false);
  });
  test('uses bounded cache and preserves last-known-good on fetch failure', async () => {
    const cache = createV2ReleaseCache({ maxEntries: 1, ttlMs: 1000, now: () => 100 });
    const key = buildV2ReleaseCacheKey({ target: 'en', source: 'ru', seasonId: 's1', releaseId: 'r1', manifestHash });
    await cache.set(key, view);
    const result = await loadV2ReleaseWithLkg({ key, cache, fetchView: async () => { throw new Error('offline'); } });
    expect(result.source).toBe('lkg');
    expect(result.view).toEqual(view);
  });
  test('does not cache invalid network response', async () => {
    const cache = createV2ReleaseCache({ maxEntries: 2, ttlMs: 1000, now: () => 100 });
    const key = buildV2ReleaseCacheKey({ target: 'en', source: 'ru', seasonId: 's1', releaseId: 'r1', manifestHash });
    await expect(loadV2ReleaseWithLkg({ key, cache, fetchView: async () => ({ ...view, activePointer: { ...view.activePointer, activeManifestHash: 'b'.repeat(64) } }) })).rejects.toThrow('v2_release_invalid');
    expect(await cache.get(key)).toBeUndefined();
  });
});
