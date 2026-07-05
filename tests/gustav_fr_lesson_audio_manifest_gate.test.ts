import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_manifest_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_manifest_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_audio_manifest_gate.mjs');

describe('Gustav French lesson audio manifest gate', () => {
  it('plans all lesson audio slots but blocks TTS/server/runtime until LLM acceptance is complete', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('ttsApiCalledByThisScript: false');
    expect(script).toContain('audioFilesGeneratedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('blocked_pending_1600_accepted_llm_review_decisions');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson-audio-manifest-v1');
    expect(manifest.status).toBe('HOLD_PENDING_LLM_ACCEPTANCE');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.targetContentLang).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.activationApproved).toBe(false);
    expect(manifest.ttsProvider).toBe('openai');
    expect(manifest.ttsModel).toBe('gpt-4o-mini-tts');
    expect(manifest.voiceId).toBe('openai:alloy');
    expect(manifest.slots).toHaveLength(1600);
    expect(manifest.safety).toMatchObject({
      manifestOnly: true,
      ttsApiCalledByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });

    for (const slot of [manifest.slots[0], manifest.slots[799], manifest.slots[1599]]) {
      expect(slot.studyTarget).toBe('fr');
      expect(slot.targetContentLang).toBe('fr');
      expect(slot.sourceLocaleCoverage).toEqual(['ru', 'uk']);
      expect(slot.textForTts).toBeTruthy();
      expect(slot.textForTtsSource).toBe('candidate_pending_llm_review');
      expect(slot.storageObjectPath).toMatch(/^course-packs\/fr\/audio\/lessons\/lesson\d{2}\/fr_lesson\d+_phrase_\d{3}\.mp3$/);
      expect(slot.expectedSha256).toBe('');
      expect(slot.generatedAt).toBe('');
      expect(slot.ttsGenerationAllowed).toBe(false);
      expect(slot.serverUploadAllowed).toBe(false);
      expect(slot.runtimeDeliveryAllowed).toBe(false);
      expect(slot.activationApproved).toBe(false);
      expect(slot.blockers).toContain('blocked_pending_1600_accepted_llm_review_decisions');
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-audio-manifest-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.reviewQueueRows).toBe(1600);
    expect(audit.summary.importDryRunReadyForAudioManifestGate).toBe(false);
    expect(audit.summary.audioSlots).toBe(1600);
    expect(audit.summary.ttsGenerationAllowedSlots).toBe(0);
    expect(audit.summary.ttsGenerationBlockedSlots).toBe(1600);
    expect(audit.summary.serverUploadAllowedSlots).toBe(0);
    expect(audit.summary.runtimeDeliveryAllowedSlots).toBe(0);
    expect(audit.summary.activationApprovedSlots).toBe(0);
    expect(audit.summary.readyForTtsGeneration).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(audit.warnings).toContain('audio manifest generation is blocked until import dry-run reports readyForAudioManifestGate=true');
  });
});
