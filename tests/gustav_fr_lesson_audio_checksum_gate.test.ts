import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_checksum_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_audio_checksum_gate.mjs');

describe('Gustav French lesson audio checksum gate', () => {
  it('keeps server/runtime closed until all 1600 mp3 files exist and match checksums', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('audioFilesGeneratedByThisScript: false');
    expect(script).toContain('serverPackManifestModifiedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-audio-checksum-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.audioSlots).toBe(1600);
    expect(audit.summary.existingAudioFiles).toBe(0);
    expect(audit.summary.missingAudioFiles).toBe(1600);
    expect(audit.summary.validMp3Signatures).toBe(0);
    expect(audit.summary.sha256Matches).toBe(0);
    expect(audit.summary.checksumReadySlots).toBe(0);
    expect(audit.summary.ttsExecutionReady).toBe(false);
    expect(audit.summary.allChecksumsReady).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'TTS_EXECUTION_NOT_READY_OR_NOT_COMPLETE',
      'AUDIO_FILES_MISSING',
      'MP3_SIGNATURES_INCOMPLETE',
      'SHA256_MATCHES_INCOMPLETE',
      'CHECKSUM_READY_SLOTS_INCOMPLETE',
    ]));
    expect(audit.sampleInspections).toHaveLength(3);
    for (const sample of audit.sampleInspections) {
      expect(sample.exists).toBe(false);
      expect(sample.sizeBytes).toBe(0);
      expect(sample.actualSha256).toBe('');
      expect(sample.expectedShaMatches).toBe(false);
      expect(sample.mp3SignatureValid).toBe(false);
      expect(sample.checksumReady).toBe(false);
      expect(sample.localOutputPath).toMatch(/^\.codex-tmp\/gustav\/fr\/audio\/lessons\/lesson\d{2}\//);
    }
    expect(audit.safety).toMatchObject({
      readOnly: true,
      audioFilesGeneratedByThisScript: false,
      audioManifestModifiedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
