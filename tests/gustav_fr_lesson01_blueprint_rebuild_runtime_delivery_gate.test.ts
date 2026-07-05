import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const MD_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_runtime_delivery_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild runtime delivery gate', () => {
  it('proves Lesson 1 runtime delivery remains a closed dry-run until upload evidence, index, cache and activation gates pass', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('COURSE_PACK_REMOTE_LOADING_ENABLED');
    expect(script).toContain('expectedReadinessReason: \'no_index_entry\'');
    expect(script).toContain('serverUploadEvidenceRequired: true');
    expect(script).toContain('runtimeDownloadAllowedNow: false');
    expect(script).toContain('cacheKeyAllowedNow: false');
    expect(script).toContain('activationApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-runtime-delivery-gate-audit-v1');
    expect(audit.status).toBe('HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED');
    expect(audit.sourceArtifacts).toMatchObject({
      serverManifest: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json',
      serverManifestGate: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json',
      coursePackLoader: 'app/course_pack_loader.ts',
      coursePackIndex: 'app/course_pack_index.ts',
      coursePackManifest: 'app/course_pack_manifest.ts',
      studyTarget: 'app/study_target.ts',
    });
    expect(audit.summary).toMatchObject({
      serverManifestEntries: 4,
      sourceLocaleScopedEntries: 4,
      openServerManifestEntries: 0,
      readinessRows: 4,
      appKnownRuntimeSurfaceRows: 4,
      embeddedFrenchIndexEntries: 0,
      legacyRemoteLoaderDisabled: true,
      loaderHasNetworkAccess: false,
      productionStudyTargetsAreEnglishOnly: true,
      internalFrenchDeclared: true,
      serverUploadEvidenceReadyRows: 0,
      runtimeIndexEntryAllowedRows: 0,
      cacheKeyAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      productionApplyApprovedRows: 0,
      activationApprovedRows: 0,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });

    expect(audit.readinessMatrix).toHaveLength(4);
    const expectedPairs = new Set(['ru:lesson', 'ru:audio_metadata', 'uk:lesson', 'uk:audio_metadata']);
    for (const row of audit.readinessMatrix) {
      expectedPairs.delete(`${row.sourceLocale}:${row.surface}`);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.selectionConfirmed).toBe(true);
      expect(row.appSurfaceDeclared).toBe(true);
      expect(row.serverPath.startsWith(`course-packs/fr/${row.sourceLocale}/${row.surface}/lesson01_blueprint_rebuild/`)).toBe(true);
      expect(row.expectedReadinessState).toBe('missing');
      expect(row.expectedReadinessReason).toBe('no_index_entry');
      expect(row.serverUploadEvidenceRequired).toBe(true);
      expect(row.serverUploadEvidenceReady).toBe(false);
      expect(row.runtimeIndexEntryAllowedNow).toBe(false);
      expect(row.cacheKeyAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.productionApplyApproved).toBe(false);
      expect(row.activationApproved).toBe(false);
      expect(row.blockers).toEqual(['blocked_pending_server_upload_evidence_runtime_index_activation']);
    }
    expect([...expectedPairs]).toEqual([]);

    expect(audit.blockers).toEqual(['blocked_pending_server_upload_evidence_runtime_index_activation']);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_INDEX_ENTRY_NOT_APPROVED',
      'CACHE_KEYS_NOT_ALLOWED',
      'RUNTIME_DOWNLOADS_DISABLED',
      'EXPLICIT_ACTIVATION_APPROVAL_NOT_GRANTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      appFilesModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeIndexEntriesWritten: false,
      cacheKeysWritten: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED');
    expect(markdown).toContain('Readiness rows: 4');
    expect(markdown).toContain('Runtime allowed rows: 0');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildRuntimeDeliveryStatus).toBe('HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED');
    expect(state.lesson01BlueprintRebuildRuntimeDeliveryGateAudit).toBe('docs/gustav/generated/fr/runtime/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildRuntimeDeliverySummary).toMatchObject({
      readinessRows: 4,
      runtimeDownloadAllowedRows: 0,
      activationApproved: false,
    });
  });
});
