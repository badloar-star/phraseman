import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_runtime_delivery_gate.mjs');

describe('Gustav French lesson runtime delivery gate', () => {
  it('keeps French lesson packs out of runtime delivery until review, audio and server gates are closed', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('COURSE_PACK_REMOTE_LOADING_ENABLED');
    expect(script).toContain('SERVER_UPLOAD_EVIDENCE_GATE_AUDIT_PATH');
    expect(script).toContain('uploadEvidenceReady');
    expect(script).toContain("expectedReadinessReason: 'no_index_entry'");
    expect(script).toContain('uploadEvidenceRequired: true');
    expect(script).toContain('runtimeDownloadAllowedNow: false');
    expect(script).toContain('activationApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-runtime-delivery-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.sourceArtifacts.coursePackLoader).toBe('app/course_pack_loader.ts');
    expect(audit.sourceArtifacts.coursePackIndex).toBe('app/course_pack_index.ts');
    expect(audit.sourceArtifacts.serverManifest).toBe('docs/gustav/generated/fr/server/fr_lesson_server_pack_manifest_v1.json');
    expect(audit.sourceArtifacts.serverUploadEvidenceGate).toBe('docs/gustav/generated/fr/server/fr_lesson_server_upload_evidence_gate_audit_v1.json');

    expect(audit.summary.serverManifestEntries).toBe(4);
    expect(audit.summary.openServerManifestEntries).toBe(0);
    expect(audit.summary.uploadEvidenceReady).toBe(false);
    expect(audit.summary.uploadEvidenceAcceptedObjects).toBe(0);
    expect(audit.summary.uploadEvidenceExpectedObjects).toBe(4);
    expect(audit.summary.uploadEvidenceBlocksRuntimeDelivery).toBe(true);
    expect(audit.summary.legacyRemoteLoaderDisabled).toBe(true);
    expect(audit.summary.legacyRemoteLoaderEnabled).toBe(false);
    expect(audit.summary.embeddedIndexHasFrenchEntries).toBe(false);
    expect(audit.summary.loaderHasNetworkAccess).toBe(false);
    expect(audit.summary.readinessRows).toBe(4);
    expect(audit.summary.readinessRowsMissingNoIndexEntry).toBe(4);
    expect(audit.summary.readinessRowsRequiringUploadEvidence).toBe(4);
    expect(audit.summary.readinessRowsWithUploadEvidenceReady).toBe(0);
    expect(audit.summary.runtimeEntryAllowedRows).toBe(0);
    expect(audit.summary.cacheKeyAllowedRows).toBe(0);
    expect(audit.summary.runtimeDownloadAllowedRows).toBe(0);
    expect(audit.summary.activationApprovedRows).toBe(0);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(audit.summary.blockers).toBe(0);

    expect(audit.readinessMatrix).toHaveLength(4);
    for (const row of audit.readinessMatrix) {
      expect(row.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(row.sourceLocale);
      expect(['lesson', 'audio_metadata']).toContain(row.surface);
      expect(row.selectionConfirmed).toBe(true);
      expect(row.expectedReadinessState).toBe('missing');
      expect(row.expectedReadinessReason).toBe('no_index_entry');
      expect(row.uploadEvidenceRequired).toBe(true);
      expect(row.uploadEvidenceReady).toBe(false);
      expect(row.runtimeEntryAllowedNow).toBe(false);
      expect(row.cacheKeyAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.activationApproved).toBe(false);
    }

    expect(audit.nextRequiredGates).toEqual(expect.arrayContaining([
      'execute_llm_official_source_review_requests',
      'audio_tts_generation_gate',
      'server_upload_evidence_gate',
      'explicit_activation_approval_gate',
    ]));
  });
});
