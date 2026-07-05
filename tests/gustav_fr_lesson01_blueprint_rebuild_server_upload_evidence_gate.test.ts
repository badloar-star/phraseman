import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const GATE_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_v1.md');
const EVIDENCE_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_server_upload_evidence_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild server upload evidence gate', () => {
  it('keeps upload evidence missing and blocks runtime until payload/hash-lock/audio evidence exists', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('fr_lesson01_blueprint_rebuild_server_upload_evidence_v1.json');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('uploadEvidenceWrittenByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');
    expect(script).toContain('course-packs/fr/ru/');
    expect(script).toContain('course-packs/fr/uk/');
    expect(script).toContain('course-packs/en/');

    expect(fs.existsSync(EVIDENCE_PATH)).toBe(false);

    expect(gate.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-gate-v1');
    expect(gate.status).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.targetContentLang).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.lessonId).toBe(1);
    expect(gate.sourceArtifacts).toMatchObject({
      serverManifest: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json',
      payloadHashLockGateAudit: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json',
      rollbackManifestGateAudit: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json',
      runtimeDeliveryGateAudit: 'docs/gustav/generated/fr/runtime/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json',
      audioTtsManifestGateAudit: 'docs/gustav/generated/fr/audio/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json',
    });
    expect(gate.requiredEvidenceContract).toMatchObject({
      expectedUploadEvidence: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_upload_evidence_v1.json',
      expectedSchemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-v1',
      remoteObjectPathsMustStartWith: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      requiresPayloadHashLockReady: true,
      requiresRollbackReady: true,
      requiresAudioChecksums: true,
      requiresRemoteShaMatch: true,
      requiresRemoteByteSizeMatch: true,
      requiresUploadReceiptId: true,
      requiresRollbackHashLockId: true,
      requiresActivationApprovedFalse: true,
      mayOpenRuntimeDelivery: false,
    });
    expect(gate.requiredEvidenceContract.deniedRemotePathTokens).toEqual(expect.arrayContaining([
      'course-packs/en/',
      'uiLocale',
      'sourceLocale',
      '..',
      'card_packs/',
      'community_packs/',
    ]));

    expect(gate.objectEvidenceInspections).toHaveLength(4);
    const expectedPairs = new Set(['ru:lesson', 'ru:audio_metadata', 'uk:lesson', 'uk:audio_metadata']);
    for (const item of gate.objectEvidenceInspections) {
      expectedPairs.delete(`${item.sourceLocale}:${item.surface}`);
      expect(item.studyTarget).toBe('fr');
      expect(item.targetContentLang).toBe('fr');
      expect(item.expectedRemotePathPrefix).toBe(`course-packs/fr/${item.sourceLocale}/${item.surface}/lesson01_blueprint_rebuild/`);
      expect(item.expectedSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.expectedByteSize).toBeGreaterThan(0);
      expect(item.evidencePresent).toBe(false);
      expect(item.evidenceRemotePath).toBe('');
      expect(item.remotePathSourceScoped).toBe(false);
      expect(item.remotePathDenied).toBe(false);
      expect(item.remoteShaMatches).toBe(false);
      expect(item.remoteByteSizeMatches).toBe(false);
      expect(item.uploadReceiptValid).toBe(false);
      expect(item.rollbackHashLockIdValid).toBe(false);
      expect(item.activationApprovedFalse).toBe(false);
      expect(item.accepted).toBe(false);
      expect(item.errors).toEqual(expect.arrayContaining([
        'upload evidence missing',
        'remote path is not lesson01 sourceLocale scoped',
        'remote sha does not match local artifact hash',
        'remote byteSize does not match local artifact byteSize',
        'upload receipt missing or invalid',
        'rollback hash-lock id missing or invalid',
        'activationApproved must remain false in upload evidence',
      ]));
    }
    expect([...expectedPairs]).toEqual([]);

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-server-upload-evidence-gate-audit-v1');
    expect(audit.status).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(audit.blockers).toEqual(['blocked_pending_payload_hash_lock_audio_upload_evidence']);
    expect(audit.summary).toMatchObject({
      expectedObjects: 4,
      uploadEvidenceFileExists: false,
      uploadEvidenceSchemaValid: false,
      evidenceObjects: 0,
      acceptedObjects: 0,
      missingEvidenceObjects: 4,
      sourceLocaleScopedRemoteObjects: 0,
      deniedRemotePathHits: 0,
      shaMatchedObjects: 0,
      byteSizeMatchedObjects: 0,
      uploadReceiptValidObjects: 0,
      rollbackHashLockValidObjects: 0,
      payloadHashLockReady: false,
      rollbackReady: false,
      audioChecksumReady: false,
      runtimeReadyBeforeEvidence: false,
      uploadEvidenceReady: false,
      runtimeDeliveryMayOpen: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
    });
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'UPLOAD_EVIDENCE_FILE_MISSING',
      'UPLOAD_OBJECT_EVIDENCE_INCOMPLETE_OR_INVALID',
      'PAYLOAD_HASH_LOCK_NOT_READY',
      'ROLLBACK_EXECUTION_NOT_READY',
      'AUDIO_CHECKSUMS_NOT_READY',
      'RUNTIME_DELIVERY_CLOSED_UNTIL_UPLOAD_EVIDENCE_PASS',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      firebaseOrServerUploadStarted: false,
      uploadEvidenceWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(markdown).toContain('Expected objects: 4');
    expect(markdown).toContain('Accepted objects: 0');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildServerUploadEvidenceStatus).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(state.lesson01BlueprintRebuildServerUploadEvidenceGateAudit).toBe('docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildServerUploadEvidenceSummary).toMatchObject({
      expectedObjects: 4,
      acceptedObjects: 0,
      uploadEvidenceReady: false,
      activationApproved: false,
    });
  });
});
