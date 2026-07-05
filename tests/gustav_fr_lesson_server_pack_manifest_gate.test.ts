import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_server_pack_manifest_gate.mjs');

describe('Gustav French lesson server pack manifest gate', () => {
  it('creates source-locale-scoped French server manifest drafts without publishing or enabling runtime downloads', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('course-packs/fr/ru/');
    expect(script).toContain('course-packs/fr/uk/');
    expect(script).toContain('downloadablePacksPublished: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('requiresExplicitActivationApproval: true');
    expect(script).toContain('AUDIO_CHECKSUM_GATE_PATH');
    expect(script).toContain('checksumReadySlots === EXPECTED_ROWS');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson-server-pack-manifest-v1');
    expect(manifest.status).toBe('HOLD_PENDING_REVIEW_AUDIO_AND_PAYLOADS');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.targetContentLang).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.activationApproved).toBe(false);
    expect(manifest.coursePackSchemaVersion).toBe('course-pack-v1');
    expect(manifest.serverDelivery).toMatchObject({
      manifestOnly: true,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
    expect(manifest.uploadPolicy.allowedStoragePathPrefixes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(manifest.uploadPolicy.deniedStoragePathPrefixes).toEqual(expect.arrayContaining([
      'course-packs/en/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
    ]));
    expect(manifest.entries).toHaveLength(4);

    for (const entry of manifest.entries) {
      expect(entry.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(entry.sourceLocale);
      expect(entry.packId.startsWith(`fr.${entry.sourceLocale}.${entry.surface}.`)).toBe(true);
      expect(entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`)).toBe(true);
      expect(entry.serverPath).not.toContain('uiLocale');
      expect(entry.serverPath).not.toContain('sourceLocale');
      expect(entry.serverPath).not.toContain('course-packs/en/');
      expect(entry.serverPath).not.toContain('..');
      expect(entry.serverUploadAllowed).toBe(false);
      expect(entry.firebaseUploadAllowed).toBe(false);
      expect(entry.downloadablePacksPublished).toBe(false);
      expect(entry.runtimeDownloadsEnabled).toBe(false);
      expect(entry.activationApproved).toBe(false);
      expect(entry.blockers).toContain('blocked_pending_llm_review_audio_tts_and_checksum');
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-server-pack-manifest-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.reviewRows).toBe(1600);
    expect(audit.summary.allRowsAccepted).toBe(false);
    expect(audit.summary.audioSlots).toBe(1600);
    expect(audit.summary.audioManifestReadyForServerUpload).toBe(false);
    expect(audit.summary.audioChecksumReadyForServerUpload).toBe(false);
    expect(audit.summary.audioChecksumReadySlots).toBe(0);
    expect(audit.summary.audioChecksumMissingFiles).toBe(1600);
    expect(audit.summary.audioReadyForServerUpload).toBe(false);
    expect(audit.summary.serverManifestEntries).toBe(4);
    expect(audit.summary.sourceLocaleScopedEntries).toBe(4);
    expect(audit.summary.ruEntries).toBe(2);
    expect(audit.summary.ukEntries).toBe(2);
    expect(audit.summary.serverUploadAllowedEntries).toBe(0);
    expect(audit.summary.firebaseUploadAllowedEntries).toBe(0);
    expect(audit.summary.downloadablePublishedEntries).toBe(0);
    expect(audit.summary.runtimeDownloadsEnabledEntries).toBe(0);
    expect(audit.summary.activationApprovedEntries).toBe(0);
    expect(audit.summary.readyForServerPackManifest).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(audit.warnings).toEqual(expect.arrayContaining([
      'server pack manifest blocked until all 1600 lesson rows are accepted by LLM review/import dry-run',
      'server pack manifest blocked until audio manifest gate is ready for server upload',
      'server pack manifest blocked until audio checksum gate has 1600 checksum-ready mp3 files',
    ]));
  });
});
