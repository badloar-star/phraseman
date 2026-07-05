import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_payload_hash_lock_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild payload/hash-lock gate', () => {
  it('plans isolated payload and hash-lock outputs while keeping materialization, upload, runtime, and activation closed', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain("const ALLOWED_LOCAL_OUTPUT_ROOT = '.codex-tmp/gustav/fr/lesson01_blueprint_rebuild/server-payloads'");
    expect(script).toContain('payloadFilesWrittenByThisScript: false');
    expect(script).toContain('hashLockManifestWrittenByThisScript: false');
    expect(script).toContain('serverManifestModifiedByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-payload-hash-lock-gate-v1');
    expect(contract.status).toBe('HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.lessonId).toBe(1);
    expect(contract.sourceArtifacts).toMatchObject({
      serverManifest: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json',
      serverManifestGate: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json',
      audioTtsManifestGate: 'docs/gustav/generated/fr/audio/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json',
      runtimeDeliveryGate: 'docs/gustav/generated/fr/runtime/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json',
      expectedHashLockManifest: 'docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_manifest_hash_lock_v1.json',
    });
    expect(contract.materializationRules).toMatchObject({
      localOutputRoot: '.codex-tmp/gustav/fr/lesson01_blueprint_rebuild/server-payloads',
      materializationAllowedNow: false,
      hashLockMaterializationAllowedNow: false,
      requiresGeneratedAudio: true,
      requiresAudioChecksums: true,
      requiresSourceLocaleScopedServerPaths: true,
      requiresAllowlistedLocalOutput: true,
      requiresRuntimeDeliveryDryRun: true,
      requiresRollbackManifest: true,
      serverManifestRewriteAllowed: false,
      appBundleWritesAllowed: false,
      firebaseUploadAllowed: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(contract.expectedPayloads).toHaveLength(4);
    const expectedPairs = new Set(['ru:lesson', 'ru:audio_metadata', 'uk:lesson', 'uk:audio_metadata']);
    for (const payload of contract.expectedPayloads) {
      expectedPairs.delete(`${payload.sourceLocale}:${payload.surface}`);
      expect(payload.studyTarget).toBe('fr');
      expect(payload.targetContentLang).toBe('fr');
      expect(payload.serverPath.startsWith(`course-packs/fr/${payload.sourceLocale}/${payload.surface}/lesson01_blueprint_rebuild/`)).toBe(true);
      expect(payload.localOutputPath.startsWith(`.codex-tmp/gustav/fr/lesson01_blueprint_rebuild/server-payloads/${payload.sourceLocale}/${payload.surface}/`)).toBe(true);
      expect(payload.localArtifactSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(payload.localArtifactByteSize).toBeGreaterThan(0);
      expect(payload.exists).toBe(false);
      expect(payload.byteSize).toBe(0);
      expect(payload.actualSha256).toBe('');
      expect(payload.sourceLocaleScoped).toBe(true);
      expect(payload.localOutputAllowed).toBe(true);
      expect(payload.manifestArtifactHashReal).toBe(true);
      expect(payload.payloadShaMatchesManifestArtifact).toBe(false);
      expect(payload.payloadByteSizeMatchesManifestArtifact).toBe(false);
      expect(payload.payloadReadyForHashLock).toBe(false);
    }
    expect([...expectedPairs]).toEqual([]);

    expect(contract.expectedHashLocks).toHaveLength(4);
    for (const lock of contract.expectedHashLocks) {
      expect(lock.studyTarget).toBe('fr');
      expect(lock.targetContentLang).toBe('fr');
      expect(['ru', 'uk']).toContain(lock.sourceLocale);
      expect(['lesson', 'audio_metadata']).toContain(lock.surface);
      expect(lock.lessonId).toBe(1);
      expect(lock.requiredPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(lock.requiredPayloadByteSize).toBeGreaterThan(0);
      expect(lock.requiredServerPath.startsWith(`course-packs/fr/${lock.sourceLocale}/${lock.surface}/lesson01_blueprint_rebuild/`)).toBe(true);
      expect(lock.requiredRollbackScope).toBe(`course-packs/fr/${lock.sourceLocale}/`);
      expect(lock.requiredFields).toEqual(expect.arrayContaining([
        'studyTarget:fr',
        'targetContentLang:fr',
        'payloadSha256',
        'payloadByteSize',
        'activationApproved:false',
      ]));
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-payload-hash-lock-gate-audit-v1');
    expect(audit.status).toBe('HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(audit.blockers).toEqual(['blocked_pending_audio_checksums_payload_materialization_hash_lock']);
    expect(audit.summary).toMatchObject({
      serverManifestEntries: 4,
      expectedPayloads: 4,
      sourceLocaleScopedPayloads: 4,
      localOutputAllowlistedPayloads: 4,
      manifestArtifactHashRealEntries: 4,
      existingPayloadFiles: 0,
      payloadShaMatchesManifestArtifact: 0,
      payloadByteSizeMatchesManifestArtifact: 0,
      payloadsReadyForHashLock: 0,
      expectedHashLocks: 4,
      hashLockManifestExists: false,
      hashLockManifestReady: false,
      checksumReadySlots: 0,
      audioChecksumReady: false,
      materializationAllowedNow: false,
      hashLockMaterializationAllowedNow: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'AUDIO_TTS_NOT_GENERATED',
      'AUDIO_SHA256_CHECKSUMS_MISSING',
      'PAYLOAD_MATERIALIZATION_CLOSED',
      'HASH_LOCK_MANIFEST_NOT_WRITTEN',
      'SERVER_UPLOAD_NOT_ALLOWED',
      'RUNTIME_DELIVERY_NOT_APPROVED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      payloadFilesWrittenByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(markdown).toContain('Expected payloads: 4');
    expect(markdown).toContain('Existing payload files: 0');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildPayloadHashLockStatus).toBe('HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(state.lesson01BlueprintRebuildPayloadHashLockGateAudit).toBe('docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildPayloadHashLockSummary).toMatchObject({
      expectedPayloads: 4,
      expectedHashLocks: 4,
      payloadsReadyForHashLock: 0,
      activationApproved: false,
    });
  });
});
