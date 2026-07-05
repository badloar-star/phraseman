import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_evidence_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_evidence_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_server_upload_evidence_gate.mjs');
const EVIDENCE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_evidence_v1.json');

describe('Gustav French lesson server upload evidence gate', () => {
  it('requires remote evidence before runtime delivery can open', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('fr_lesson_server_upload_evidence_v1.json');
    expect(script).toContain('runtimeDeliveryMayOpen: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('uploadEvidenceWrittenByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');
    expect(script).toContain('course-packs/fr/ru/');
    expect(script).toContain('course-packs/fr/uk/');
    expect(script).toContain('course-packs/en/');

    expect(fs.existsSync(EVIDENCE_PATH)).toBe(false);

    expect(gate.schemaVersion).toBe('gustav-fr-lesson-server-upload-evidence-gate-v1');
    expect(gate.status).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.targetContentLang).toBe('fr');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.activationApproved).toBe(false);
    expect(gate.requiredEvidenceContract).toMatchObject({
      expectedUploadEvidence: 'docs/gustav/generated/fr/server/fr_lesson_server_upload_evidence_v1.json',
      expectedSchemaVersion: 'gustav-fr-lesson-server-upload-evidence-v1',
      remoteObjectPathsMustStartWith: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      requiresManifestShaMatch: true,
      requiresManifestByteSizeMatch: true,
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
    for (const item of gate.objectEvidenceInspections) {
      expect(item.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(item.sourceLocale);
      expect(item.expectedRemotePathPrefix).toBe(`course-packs/fr/${item.sourceLocale}/${item.surface}/`);
      expect(item.evidencePresent).toBe(false);
      expect(item.remotePathSourceScoped).toBe(false);
      expect(item.remotePathDenied).toBe(false);
      expect(item.remoteShaMatches).toBe(false);
      expect(item.remoteByteSizeMatches).toBe(false);
      expect(item.uploadReceiptValid).toBe(false);
      expect(item.rollbackHashLockIdValid).toBe(false);
      expect(item.accepted).toBe(false);
      expect(item.errors).toEqual(expect.arrayContaining([
        'upload evidence missing',
        'remote path is not sourceLocale scoped',
        'remote sha does not match manifest or manifest sha is placeholder',
        'remote byteSize does not match manifest or manifest byteSize is placeholder',
        'upload receipt missing or invalid',
        'rollback hash-lock id missing or invalid',
        'activationApproved must remain false in upload evidence',
      ]));
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-server-upload-evidence-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.expectedObjects).toBe(4);
    expect(audit.summary.uploadEvidenceFileExists).toBe(false);
    expect(audit.summary.uploadEvidenceSchemaValid).toBe(false);
    expect(audit.summary.evidenceObjects).toBe(0);
    expect(audit.summary.acceptedObjects).toBe(0);
    expect(audit.summary.missingEvidenceObjects).toBe(4);
    expect(audit.summary.sourceLocaleScopedRemoteObjects).toBe(0);
    expect(audit.summary.deniedRemotePathHits).toBe(0);
    expect(audit.summary.shaMatchedObjects).toBe(0);
    expect(audit.summary.byteSizeMatchedObjects).toBe(0);
    expect(audit.summary.uploadReceiptValidObjects).toBe(0);
    expect(audit.summary.rollbackHashLockValidObjects).toBe(0);
    expect(audit.summary.uploadPolicyReady).toBe(false);
    expect(audit.summary.boundaryReady).toBe(false);
    expect(audit.summary.uploadEvidenceReady).toBe(false);
    expect(audit.summary.runtimeDeliveryMayOpen).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'UPLOAD_EVIDENCE_FILE_MISSING',
      'UPLOAD_OBJECT_EVIDENCE_INCOMPLETE_OR_INVALID',
      'UPLOAD_POLICY_NOT_READY_FOR_EXECUTION',
      'MANIFEST_WRITER_APPLY_BOUNDARY_NOT_READY',
      'RUNTIME_DELIVERY_CLOSED_UNTIL_UPLOAD_EVIDENCE_PASS',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      firebaseOrServerUploadStarted: false,
      uploadEvidenceWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
