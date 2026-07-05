import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_payload_materialization_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_payload_materialization_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_server_payload_materialization_gate.mjs');

describe('Gustav French lesson server payload materialization gate', () => {
  it('defines isolated future payload outputs and keeps materialization/upload closed until review and audio gates pass', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain("const ALLOWED_LOCAL_OUTPUT_ROOT = '.codex-tmp/gustav/fr/server-payloads'");
    expect(script).toContain('payloadFilesWrittenByThisScript: false');
    expect(script).toContain('appBundleModifiedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');
    expect(script).toContain('allRowsAccepted && audioChecksumReady && false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson-server-payload-materialization-gate-v1');
    expect(contract.status).toBe('HOLD_MATERIALIZATION_CLOSED');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.activationApproved).toBe(false);
    expect(contract.materializationRules).toMatchObject({
      localOutputRoot: '.codex-tmp/gustav/fr/server-payloads',
      appBundleWritesAllowed: false,
      firebaseUploadAllowed: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      requiresAcceptedRows: 1600,
      requiresChecksumReadySlots: 1600,
      requiresSourceLocaleScopedServerPaths: true,
      requiresRealPayloadSha256: true,
      requiresPayloadByteSize: true,
      requiresUploadPolicyGate: true,
    });

    expect(contract.expectedPayloads).toHaveLength(4);
    for (const payload of contract.expectedPayloads) {
      expect(payload.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(payload.sourceLocale);
      expect(payload.serverPath.startsWith(`course-packs/fr/${payload.sourceLocale}/${payload.surface}/`)).toBe(true);
      expect(payload.localOutputPath.startsWith(`.codex-tmp/gustav/fr/server-payloads/${payload.sourceLocale}/${payload.surface}/`)).toBe(true);
      expect(payload.exists).toBe(false);
      expect(payload.sizeBytes).toBe(0);
      expect(payload.sourceLocaleScoped).toBe(true);
      expect(payload.localOutputAllowed).toBe(true);
      expect(payload.manifestShaPlaceholder).toBe(true);
      expect(payload.manifestShaMatchesPayload).toBe(false);
      expect(payload.manifestByteSizeMatchesPayload).toBe(false);
      expect(payload.payloadReadyForManifest).toBe(false);
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-server-payload-materialization-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.expectedPayloads).toBe(4);
    expect(audit.summary.expectedSourceLocales).toEqual(['ru', 'uk']);
    expect(audit.summary.importedAcceptedRows).toBe(0);
    expect(audit.summary.expectedRows).toBe(1600);
    expect(audit.summary.allRowsAccepted).toBe(false);
    expect(audit.summary.checksumReadySlots).toBe(0);
    expect(audit.summary.expectedAudioSlots).toBe(1600);
    expect(audit.summary.audioChecksumReady).toBe(false);
    expect(audit.summary.uploadPolicyReady).toBe(false);
    expect(audit.summary.materializationAllowedNow).toBe(false);
    expect(audit.summary.existingPayloadFiles).toBe(0);
    expect(audit.summary.sourceLocaleScopedPayloads).toBe(4);
    expect(audit.summary.localOutputAllowlistedPayloads).toBe(4);
    expect(audit.summary.manifestShaPlaceholderEntries).toBe(4);
    expect(audit.summary.manifestShaMatchesPayload).toBe(0);
    expect(audit.summary.manifestByteSizeMatchesPayload).toBe(0);
    expect(audit.summary.payloadsReadyForManifest).toBe(0);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'REVIEW_IMPORT_NOT_ACCEPTED_FOR_ALL_1600_ROWS',
      'AUDIO_CHECKSUM_GATE_NOT_READY',
      'PAYLOAD_FILES_MISSING',
      'PAYLOAD_SHA_NOT_LOCKED_IN_MANIFEST',
      'PAYLOAD_BYTES_NOT_LOCKED_IN_MANIFEST',
      'UPLOAD_POLICY_NOT_READY_FOR_EXECUTION',
      'MATERIALIZATION_CLOSED_UNTIL_REVIEW_AUDIO_AND_POLICY_PASS',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      payloadFilesWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
