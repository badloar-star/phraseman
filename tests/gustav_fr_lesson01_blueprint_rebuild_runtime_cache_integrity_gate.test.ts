import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const MD_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild runtime cache integrity gate', () => {
  it('derives cache identity from app manifest dimensions while keeping all runtime cache use closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('buildCoursePackCacheKey');
    expect(script).toContain('cacheWriteAllowedNow: false');
    expect(script).toContain('runtimeDownloadAllowedNow: false');
    expect(script).toContain('rollbackCacheInvalidationAllowedNow: false');
    expect(script).toContain('activationApproved: false');
    expect(script).toContain('course-packs/en');
    expect(script).toContain('uiLocale');
    expect(script).toContain('sourceLocale');

    expect(gate.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-runtime-cache-integrity-gate-v1');
    expect(gate.status).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.targetContentLang).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.lessonId).toBe(1);
    expect(gate.sourceArtifacts).toMatchObject({
      serverManifest: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json',
      serverUploadEvidenceGateAudit: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json',
      rollbackManifestGateAudit: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json',
      runtimeDeliveryGateAudit: 'docs/gustav/generated/fr/runtime/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json',
      coursePackManifest: 'app/course_pack_manifest.ts',
      coursePackLoader: 'app/course_pack_loader.ts',
      coursePackIndex: 'app/course_pack_index.ts',
    });
    expect(gate.cacheKeyContract).toMatchObject({
      appBuilder: 'buildCoursePackCacheKey',
      dimensions: ['studyTarget', 'sourceLocale', 'surface', 'schemaVersion', 'contentVersion', 'sha256'],
      separator: '/',
      requiredStudyTarget: 'fr',
      requiredSourceLocales: ['ru', 'uk'],
      requiredSurfaces: ['lesson', 'audio_metadata'],
      sha256Lowercase: true,
      cacheLookupAllowedNow: false,
      cacheReadAllowedNow: false,
      cacheWriteAllowedNow: false,
      cacheRepairAllowedNow: false,
      runtimeDownloadAllowedNow: false,
      rollbackCacheInvalidationAllowedNow: false,
      activationApproved: false,
    });
    expect(gate.cacheKeyContract.deniedCacheKeyTokens).toEqual(expect.arrayContaining([
      'course-packs/en',
      'uiLocale',
      'sourceLocale',
      '..',
      'card_packs',
      'community_packs',
    ]));

    expect(gate.cacheRows).toHaveLength(4);
    const expectedPairs = new Set(['ru:lesson', 'ru:audio_metadata', 'uk:lesson', 'uk:audio_metadata']);
    const cacheKeys = new Set<string>();
    for (const row of gate.cacheRows) {
      expectedPairs.delete(`${row.sourceLocale}:${row.surface}`);
      cacheKeys.add(row.expectedCacheKey);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.appSurfaceDeclared).toBe(true);
      expect(row.expectedCacheKey).toMatch(new RegExp(`^fr/${row.sourceLocale}/${row.surface}/course-pack-v1/fr-lesson01-blueprint-rebuild-v1\\.reviewed\\.pending/[a-f0-9]{64}$`));
      expect(row.cacheKeyDimensions).toMatchObject({
        studyTarget: 'fr',
        sourceLocale: row.sourceLocale,
        surface: row.surface,
        schemaVersion: 'course-pack-v1',
        contentVersion: 'fr-lesson01-blueprint-rebuild-v1.reviewed.pending',
      });
      expect(row.cacheKeyDimensions.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.cacheKeyMatchesManifestDimensions).toBe(true);
      expect(row.cacheKeySegmentCount).toBe(6);
      expect(row.sourceLocaleScoped).toBe(true);
      expect(row.serverPathSourceScoped).toBe(true);
      expect(row.deniedTokenHits).toEqual([]);
      expect(row.cacheLookupAllowedNow).toBe(false);
      expect(row.cacheReadAllowedNow).toBe(false);
      expect(row.cacheWriteAllowedNow).toBe(false);
      expect(row.cacheRepairAllowedNow).toBe(false);
      expect(row.offlineCacheReady).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.rollbackCacheInvalidationAllowedNow).toBe(false);
      expect(row.productionApplyApproved).toBe(false);
      expect(row.activationApproved).toBe(false);
    }
    expect([...expectedPairs]).toEqual([]);
    expect(cacheKeys.size).toBe(4);

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1');
    expect(audit.status).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(audit.blockers).toEqual(['blocked_pending_upload_evidence_payload_audio_runtime_index_activation']);
    expect(audit.summary).toMatchObject({
      serverManifestEntries: 4,
      cacheRows: 4,
      uniqueCacheKeys: 4,
      sourceLocaleScopedRows: 4,
      serverPathSourceScopedRows: 4,
      appSurfaceDeclaredRows: 4,
      deniedTokenHitRows: 0,
      uploadEvidenceReady: false,
      runtimeDeliveryReady: false,
      rollbackReady: false,
      cacheLookupAllowedRows: 0,
      cacheReadAllowedRows: 0,
      cacheWriteAllowedRows: 0,
      cacheRepairAllowedRows: 0,
      offlineCacheReadyRows: 0,
      runtimeDownloadAllowedRows: 0,
      rollbackCacheInvalidationAllowedRows: 0,
      activationApprovedRows: 0,
      readyForRuntimeCacheUse: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.summary.duplicateCacheKeys).toEqual([]);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'UPLOAD_EVIDENCE_FILE_MISSING',
      'PAYLOAD_HASH_LOCK_NOT_READY',
      'AUDIO_CHECKSUMS_NOT_READY',
      'RUNTIME_DELIVERY_CLOSED',
      'RUNTIME_INDEX_ENTRY_NOT_APPROVED',
      'CACHE_WRITES_CLOSED',
      'ROLLBACK_CACHE_INVALIDATION_CLOSED',
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      appFilesModifiedByThisScript: false,
      cacheWritesStarted: false,
      cacheReadsStarted: false,
      cacheRepairStarted: false,
      runtimeDownloadsEnabled: false,
      rollbackCacheInvalidationAllowed: false,
      firebaseOrServerMutationStarted: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(markdown).toContain('Cache rows: 4');
    expect(markdown).toContain('Unique cache keys: 4');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildRuntimeCacheIntegrityStatus).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(state.lesson01BlueprintRebuildRuntimeCacheIntegrityGateAudit).toBe('docs/gustav/generated/fr/runtime/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildRuntimeCacheIntegritySummary).toMatchObject({
      cacheRows: 4,
      uniqueCacheKeys: 4,
      cacheWriteAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      activationApproved: false,
    });
  });
});
