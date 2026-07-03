import fs from 'fs';
import path from 'path';
import { buildCoursePackCacheKey } from '../app/course_pack_manifest';

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(
  ROOT,
  'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/runtime_cache_integrity_rollback_v2_packet.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts/gustav_runtime_cache_integrity_rollback_v2_packet.ts');

describe('Gustav runtime cache integrity rollback V2 packet', () => {
  it('keeps French runtime cache keys scoped by target, source locale, surface, schema, content version and sha', () => {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const scriptSource = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(report.status).toBe('PASS');
    expect(report.summary.cacheIntegrityContracts).toBe(12);
    expect(report.summary.cacheKeyDimensionContracts).toBe(12);
    expect(report.summary.uiLocaleIdentityDimensions).toBe(0);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.cacheWritesOpened).toBe(false);
    expect(report.summary.readyCacheStateOpened).toBe(false);
    expect(report.summary.activationApprovedFlags).toBe(0);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.fixtureProbesPassed).toBe(report.summary.fixtureProbes);
    expect(report.contract.cacheIntegrityContracts).toHaveLength(12);

    for (const contract of report.contract.cacheIntegrityContracts) {
      expect(contract.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(contract.sourceLocale);
      expect(contract.cacheKey).toBe(contract.expectedCacheKeyTemplate);
      expect(contract.cacheKey).toBe(
        `fr/${contract.sourceLocale}/${contract.surface}/${contract.schemaVersion}/${contract.contentVersion}/{sha256}`,
      );
      expect(contract.requiredCacheKeyDimensions).toEqual([
        'studyTarget',
        'sourceLocale',
        'surface',
        'schemaVersion',
        'contentVersion',
        'sha256',
      ]);
      expect(contract.integrityOutcomes.sourceLocaleMismatch).toBe('reject_no_cache_write');
      expect(contract.integrityOutcomes.studyTargetMismatch).toBe('reject_no_cache_write');
      expect(contract.integrityOutcomes.checksumMismatch).toBe('corrupt_quarantine');
      expect(contract.integrityOutcomes.byteSizeMismatch).toBe('corrupt_quarantine');
      expect(contract.integrityOutcomes.missingNetwork).toBe('offline_fallback_requires_prior_known_good');
      expect(contract.rollbackSimulation.rollbackRequiredBeforeActivation).toBe(true);
      expect(contract.rollbackSimulation.rollbackAvailableNow).toBe(false);
    }

    expect(scriptSource).toContain('cache_key_missing_sha256_rejected');
    expect(scriptSource).toContain('ui_locale_cache_dimension_rejected');
    expect(scriptSource).toContain('source_locale_mismatch_cache_write_rejected');
    expect(scriptSource).toContain('offline_fallback_without_prior_good_rejected');
  });

  it('proves the runtime cache key builder separates English, French, source locales and content hashes', () => {
    const base = {
      surface: 'lesson' as const,
      schemaVersion: 'course-pack-v1',
      contentVersion: '2026-05-19_fr_inventory_v0a1',
      sha256: 'a'.repeat(64),
    };

    const frRu = buildCoursePackCacheKey({ ...base, studyTarget: 'fr', sourceLocale: 'ru' });
    const frUk = buildCoursePackCacheKey({ ...base, studyTarget: 'fr', sourceLocale: 'uk' });
    const enRu = buildCoursePackCacheKey({ ...base, studyTarget: 'en', sourceLocale: 'ru' });
    const frRuOtherHash = buildCoursePackCacheKey({ ...base, studyTarget: 'fr', sourceLocale: 'ru', sha256: 'b'.repeat(64) });

    expect(frRu).toBe(`fr/ru/lesson/course-pack-v1/${base.contentVersion}/${'a'.repeat(64)}`);
    expect(new Set([frRu, frUk, enRu, frRuOtherHash]).size).toBe(4);
    expect(frRu).not.toContain('ui');
    expect(frRu).not.toContain('interface');
  });
});
