import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson02_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson02_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson02_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson02_blueprint_rebuild');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson02_delivery_gate_chain.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson02_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson02_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_MANIFEST_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_DELIVERY_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const RUNTIME_CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const RUNTIME_CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');
const ACTIVATION_RECEIPT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_v1.json');
const ACTIVATION_HASH_LOCK_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_hash_lock_v1.json');

describe('Gustav French lesson 2 delivery gate chain', () => {
  it('creates closed audio/server/runtime/cache/activation gates without opening production delivery', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const audioManifest = JSON.parse(fs.readFileSync(AUDIO_MANIFEST_PATH, 'utf8'));
    const audioAudit = JSON.parse(fs.readFileSync(AUDIO_AUDIT_PATH, 'utf8'));
    const serverManifest = JSON.parse(fs.readFileSync(SERVER_MANIFEST_PATH, 'utf8'));
    const serverAudit = JSON.parse(fs.readFileSync(SERVER_MANIFEST_AUDIT_PATH, 'utf8'));
    const payloadAudit = JSON.parse(fs.readFileSync(PAYLOAD_AUDIT_PATH, 'utf8'));
    const rollbackAudit = JSON.parse(fs.readFileSync(ROLLBACK_AUDIT_PATH, 'utf8'));
    const uploadAudit = JSON.parse(fs.readFileSync(UPLOAD_AUDIT_PATH, 'utf8'));
    const runtimeDeliveryAudit = JSON.parse(fs.readFileSync(RUNTIME_DELIVERY_AUDIT_PATH, 'utf8'));
    const runtimeCacheGate = JSON.parse(fs.readFileSync(RUNTIME_CACHE_GATE_PATH, 'utf8'));
    const runtimeCacheAudit = JSON.parse(fs.readFileSync(RUNTIME_CACHE_AUDIT_PATH, 'utf8'));
    const activationGate = JSON.parse(fs.readFileSync(ACTIVATION_GATE_PATH, 'utf8'));
    const activationAudit = JSON.parse(fs.readFileSync(ACTIVATION_AUDIT_PATH, 'utf8'));
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('cacheWriteAllowedNow: false');
    expect(script).toContain('activationReceiptWrittenByThisScript: false');
    expect(script).toContain('activationApproved: false');
    expect(script).toContain('course-packs/fr/ru/');
    expect(script).toContain('course-packs/fr/uk/');
    expect(script).toContain('course-packs/en');

    expect(audioManifest.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audioManifest.slots).toHaveLength(100);
    expect(audioAudit.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audioAudit.summary).toMatchObject({
      audioSlots: 100,
      sourceLocaleScopedSlots: 100,
      uniqueFrenchTexts: 50,
      generatedSlots: 0,
      checksumReadySlots: 0,
      readyForServerManifest: false,
      activationApproved: false,
    });
    for (const slot of audioManifest.slots) {
      expect(slot.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(slot.sourceLocale);
      expect(slot.generated).toBe(false);
      expect(slot.audioSha256).toBe('');
      expect(slot.activationApproved).toBe(false);
    }

    expect(serverManifest.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(serverManifest.entries).toHaveLength(4);
    expect(serverAudit.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(serverAudit.summary).toMatchObject({
      entries: 4,
      sourceLocaleScopedEntries: 4,
      appKnownSurfaces: 4,
      openUploadEntries: 0,
      runtimeDownloadsEnabledEntries: 0,
      activationApprovedEntries: 0,
      readyForUpload: false,
      activationApproved: false,
    });
    const expectedPairs = new Set(['ru:lesson', 'ru:audio_metadata', 'uk:lesson', 'uk:audio_metadata']);
    for (const entry of serverManifest.entries) {
      expectedPairs.delete(`${entry.sourceLocale}:${entry.surface}`);
      expect(entry.studyTarget).toBe('fr');
      expect(entry.targetContentLang).toBe('fr');
      expect(entry.serverPath).toMatch(new RegExp(`^course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson02_blueprint_rebuild/`));
      expect(entry.localArtifactSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.localArtifactByteSize).toBeGreaterThan(0);
      expect(entry.serverUploadAllowed).toBe(false);
      expect(entry.firebaseUploadAllowed).toBe(false);
      expect(entry.runtimeDownloadsEnabled).toBe(false);
      expect(entry.productionApplyApproved).toBe(false);
      expect(entry.activationApproved).toBe(false);
    }
    expect([...expectedPairs]).toEqual([]);

    expect(payloadAudit.status).toBe('HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(payloadAudit.summary).toMatchObject({
      expectedPayloads: 4,
      expectedHashLocks: 4,
      payloadsWritten: 0,
      hashLocksWritten: 0,
      payloadHashLockReady: false,
      activationApproved: false,
    });
    expect(rollbackAudit.status).toBe('HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(rollbackAudit.summary).toMatchObject({
      rollbackEntries: 4,
      safeRollbackScopes: 2,
      deniedRollbackScopeHits: 0,
      rollbackExecutionAllowedEntries: 0,
      runtimeCacheInvalidationAllowedEntries: 0,
      readyForRollbackExecution: false,
      activationApproved: false,
    });
    expect(uploadAudit.status).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(uploadAudit.summary).toMatchObject({
      expectedObjects: 4,
      uploadEvidenceFileExists: false,
      acceptedObjects: 0,
      missingEvidenceObjects: 4,
      uploadEvidenceReady: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForRuntimeDelivery: false,
    });

    expect(runtimeDeliveryAudit.status).toBe('HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED');
    expect(runtimeDeliveryAudit.summary).toMatchObject({
      serverManifestEntries: 4,
      readinessRows: 4,
      appKnownRuntimeSurfaceRows: 4,
      embeddedFrenchIndexEntries: 0,
      legacyRemoteLoaderDisabled: true,
      productionStudyTargetsAreEnglishOnly: true,
      internalFrenchDeclared: true,
      serverUploadEvidenceReadyRows: 0,
      runtimeIndexEntryAllowedRows: 0,
      cacheKeyAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      activationApprovedRows: 0,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    });

    expect(runtimeCacheGate.status).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(runtimeCacheGate.cacheRows).toHaveLength(4);
    expect(runtimeCacheAudit.status).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(runtimeCacheAudit.summary).toMatchObject({
      serverManifestEntries: 4,
      cacheRows: 4,
      uniqueCacheKeys: 4,
      deniedTokenHitRows: 0,
      cacheWriteAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      rollbackCacheInvalidationAllowedRows: 0,
      readyForRuntimeCacheUse: false,
      activationApproved: false,
    });
    for (const row of runtimeCacheGate.cacheRows) {
      expect(row.expectedCacheKey).toMatch(new RegExp(`^fr/${row.sourceLocale}/${row.surface}/course-pack-v1/fr-lesson02-blueprint-rebuild-v1\\.reviewed\\.pending/[a-f0-9]{64}$`));
      expect(row.deniedTokenHits).toEqual([]);
      expect(row.cacheWriteAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.activationApproved).toBe(false);
    }

    expect(fs.existsSync(ACTIVATION_RECEIPT_PATH)).toBe(false);
    expect(fs.existsSync(ACTIVATION_HASH_LOCK_PATH)).toBe(false);
    expect(activationGate.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(activationGate.requiredReceiptContract).toMatchObject({
      requiresLlmTrustedSourceReview: true,
      humanReviewRequired: false,
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackReady: true,
      requiresServerUploadEvidence: true,
      requiresRuntimeDelivery: true,
      requiresRuntimeCacheIntegrity: true,
      requiresFull32LessonParityBeforeGlobalFrenchActivation: true,
    });
    expect(activationAudit.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(activationAudit.summary).toMatchObject({
      prerequisiteGatesTotal: 10,
      prerequisiteGatesPassed: 4,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      activationReceiptExists: false,
      activationReceiptHashLockExists: false,
      readyForProductionActivation: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(state.lesson02BlueprintRebuildAudioTtsStatus).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(state.lesson02BlueprintRebuildServerPackManifestStatus).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(state.lesson02BlueprintRebuildRuntimeCacheIntegrityStatus).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(state.lesson02BlueprintRebuildExplicitActivationReceiptStatus).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(state.nextPassPlan.length).toBeGreaterThan(0);
  });
});
