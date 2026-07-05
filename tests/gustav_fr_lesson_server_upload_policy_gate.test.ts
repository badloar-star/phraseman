import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const POLICY_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_policy_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_policy_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_server_upload_policy_gate.mjs');

describe('Gustav French lesson server upload policy gate', () => {
  it('keeps French server upload closed until paths, checksums, payloads, rollback locks, and explicit approval are ready', () => {
    const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain("const ALLOWED_UPLOAD_PREFIXES = ['course-packs/fr/ru/', 'course-packs/fr/uk/']");
    expect(script).toContain("'course-packs/en/'");
    expect(script).toContain("'course-packs/fr/uiLocale/'");
    expect(script).toContain("'course-packs/fr/sourceLocale/'");
    expect(script).toContain('serverUploadStartedByThisScript: false');
    expect(script).toContain('firebaseUploadStartedByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');
    expect(script).toContain('checksumReadySlots === EXPECTED_AUDIO_SLOTS');
    expect(script).toContain('activeApprovalReceiptExists === true');
    expect(script).toContain('activeHashLockManifestExists === true');

    expect(policy.schemaVersion).toBe('gustav-fr-lesson-server-upload-policy-gate-v1');
    expect(policy.status).toBe('HOLD_UPLOAD_EXECUTION_CLOSED');
    expect(policy.studyTarget).toBe('fr');
    expect(policy.targetContentLang).toBe('fr');
    expect(policy.sourceLocales).toEqual(['ru', 'uk']);
    expect(policy.activationApproved).toBe(false);
    expect(policy.allowedUploadPrefixes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(policy.deniedUploadPrefixes).toEqual(expect.arrayContaining([
      'course-packs/en/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
      'card_packs/',
      'community_packs/',
    ]));
    expect(policy.requiredBeforeUpload).toEqual(expect.arrayContaining([
      'all 1600 French lesson rows accepted by LLM official-source review/import dry-run',
      'audio checksum gate has 1600 checksum-ready mp3 files',
      'server payloads are materialized with non-zero sha256 and byteSize > 1',
      'server paths are scoped to course-packs/fr/{sourceLocale}/{surface}/',
      'active explicit approval receipt exists',
      'active hash lock manifest exists',
      'rollback scopes are exactly course-packs/fr/ru/ and course-packs/fr/uk/',
    ]));

    expect(policy.entryInspections).toHaveLength(4);
    for (const entry of policy.entryInspections) {
      expect(entry.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(entry.sourceLocale);
      expect(entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`)).toBe(true);
      expect(entry.sourceLocaleScoped).toBe(true);
      expect(entry.uploadTargetValid).toBe(true);
      expect(entry.deniedPathToken).toBe(false);
      expect(entry.traversalHit).toBe(false);
      expect(entry.zeroSha).toBe(true);
      expect(entry.payloadMaterialized).toBe(false);
      expect(entry.productionFlagsClosed).toBe(true);
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-server-upload-policy-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.serverManifestEntries).toBe(4);
    expect(audit.summary.sourceLocaleScopedEntries).toBe(4);
    expect(audit.summary.allowedUploadTargetEntries).toBe(4);
    expect(audit.summary.deniedUploadTargetHits).toBe(0);
    expect(audit.summary.traversalHits).toBe(0);
    expect(audit.summary.zeroShaEntries).toBe(4);
    expect(audit.summary.materializedPayloadEntries).toBe(0);
    expect(audit.summary.checksumReadySlots).toBe(0);
    expect(audit.summary.expectedAudioSlots).toBe(1600);
    expect(audit.summary.serverManifestReadyForUpload).toBe(false);
    expect(audit.summary.audioChecksumReadyForUpload).toBe(false);
    expect(audit.summary.activationRollbackReady).toBe(false);
    expect(audit.summary.payloadsMaterialized).toBe(false);
    expect(audit.summary.currentProductionFlagsClosed).toBe(true);
    expect(audit.summary.uploadExecutionAllowed).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);

    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'SERVER_MANIFEST_GATE_NOT_READY_FOR_UPLOAD',
      'AUDIO_CHECKSUM_GATE_NOT_READY',
      'SERVER_PAYLOADS_NOT_MATERIALIZED_WITH_REAL_SHA_AND_BYTES',
      'ROLLBACK_OR_HASH_LOCKS_NOT_READY',
      'UPLOAD_EXECUTION_CLOSED',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      serverUploadStartedByThisScript: false,
      firebaseUploadStartedByThisScript: false,
      serverManifestModifiedByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
