import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_server_pack_manifest_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild server pack manifest gate', () => {
  it('drafts source-locale-scoped server entries while keeping upload, runtime delivery, and activation closed', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('course-packs/fr/ru/');
    expect(script).toContain('course-packs/fr/uk/');
    expect(script).toContain('requiresAudioChecksums: true');
    expect(script).toContain('requiresPayloadHashLock: true');
    expect(script).toContain('requiresRuntimeDeliveryGate: true');
    expect(script).toContain('requiresExplicitActivationApproval: true');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1');
    expect(manifest.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.targetContentLang).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.lessonId).toBe(1);
    expect(manifest.appCourseLevel).toBe('A1');
    expect(manifest.coursePackSchemaVersion).toBe('course-pack-v1');
    expect(manifest.contentVersion).toBe('fr-lesson01-blueprint-rebuild-v1.reviewed.pending');
    expect(manifest.sourceArtifacts.ruPack.rows).toBe(50);
    expect(manifest.sourceArtifacts.ukPack.rows).toBe(50);
    expect(manifest.sourceArtifacts.theoryPack.sections).toBe(5);
    expect(manifest.sourceArtifacts.audioManifest.slots).toBe(100);
    expect(manifest.sourceArtifacts.audioAudit.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(manifest.uploadPolicy.allowedStoragePathPrefixes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(manifest.uploadPolicy.deniedStoragePathPrefixes).toEqual(expect.arrayContaining([
      'course-packs/en/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
    ]));
    expect(manifest.uploadPolicy).toMatchObject({
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackManifest: true,
      requiresRuntimeDeliveryGate: true,
      requiresExplicitActivationApproval: true,
    });
    expect(manifest.entries).toHaveLength(4);

    for (const entry of manifest.entries) {
      expect(entry.studyTarget).toBe('fr');
      expect(entry.targetContentLang).toBe('fr');
      expect(['ru', 'uk']).toContain(entry.sourceLocale);
      expect(['lesson', 'audio_metadata']).toContain(entry.surface);
      expect(entry.packId.startsWith(`fr.${entry.sourceLocale}.lesson01.blueprint_rebuild.${entry.surface}.`)).toBe(true);
      expect(entry.localArtifactPath).toContain('docs/gustav/generated/fr/');
      expect(entry.localArtifactSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.localArtifactByteSize).toBeGreaterThan(0);
      expect(entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`)).toBe(true);
      expect(entry.serverPath).not.toContain('course-packs/en/');
      expect(entry.serverPath).not.toContain('uiLocale');
      expect(entry.serverPath).not.toContain('sourceLocale');
      expect(entry.serverPath).not.toContain('..');
      expect(entry.serverUploadAllowed).toBe(false);
      expect(entry.firebaseUploadAllowed).toBe(false);
      expect(entry.downloadablePacksPublished).toBe(false);
      expect(entry.runtimeDownloadsEnabled).toBe(false);
      expect(entry.productionApplyApproved).toBe(false);
      expect(entry.activationApproved).toBe(false);
      expect(entry.blockers).toEqual(['blocked_pending_audio_tts_checksum_payload_hash_lock_runtime_delivery']);
      if (entry.surface === 'lesson') {
        expect(entry.relatedArtifacts).toHaveLength(1);
        expect(entry.relatedArtifacts[0]).toMatchObject({ role: 'theory_vocab' });
        expect(entry.relatedArtifacts[0].sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(entry.relatedArtifacts[0].byteSize).toBeGreaterThan(0);
      } else {
        expect(entry.relatedArtifacts).toEqual([]);
      }
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-gate-audit-v1');
    expect(audit.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(audit.blockers).toEqual(['blocked_pending_audio_tts_checksum_payload_hash_lock_runtime_delivery']);
    expect(audit.summary).toMatchObject({
      serverManifestEntries: 4,
      sourceLocaleScopedEntries: 4,
      ruEntries: 2,
      ukEntries: 2,
      lessonEntries: 2,
      audioMetadataEntries: 2,
      lessonEntriesWithTheoryArtifact: 2,
      sourceRows: 100,
      theorySections: 5,
      audioSlots: 100,
      generatedAudioSlots: 0,
      checksumReadySlots: 0,
      serverUploadAllowedEntries: 0,
      firebaseUploadAllowedEntries: 0,
      downloadablePublishedEntries: 0,
      runtimeDownloadsEnabledEntries: 0,
      activationApprovedEntries: 0,
      readyForPayloadMaterialization: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'AUDIO_TTS_NOT_GENERATED',
      'AUDIO_SHA256_CHECKSUMS_MISSING',
      'SERVER_PAYLOAD_HASH_LOCK_NOT_WRITTEN',
      'SERVER_UPLOAD_NOT_ALLOWED',
      'RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      manifestOnly: true,
      payloadFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(markdown).toContain('Server entries: 4');
    expect(markdown).toContain('Upload allowed entries: 0');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildServerPackManifestStatus).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(state.lesson01BlueprintRebuildServerPackManifestGateAudit).toBe('docs/gustav/generated/fr/server/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildServerPackManifestSummary).toMatchObject({
      serverManifestEntries: 4,
      sourceLocaleScopedEntries: 4,
      serverUploadAllowedEntries: 0,
      runtimeDownloadsEnabledEntries: 0,
      activationApproved: false,
    });
  });
});
