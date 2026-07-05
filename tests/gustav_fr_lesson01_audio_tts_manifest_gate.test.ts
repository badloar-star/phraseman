import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01', 'fr_lesson01_audio_tts_manifest_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01', 'fr_lesson01_audio_tts_manifest_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_audio_tts_manifest_gate.mjs');

describe('Gustav French lesson 1 audio TTS manifest gate', () => {
  it('prepares source-locale TTS slots but keeps audio/server/runtime/apply closed until mp3 checksums exist', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('blocked_pending_openai_tts_generation_and_checksum');
    expect(script).toContain('ttsApiCalledByThisScript: false');
    expect(script).toContain('audioFilesWrittenByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson01-audio-tts-manifest-v1');
    expect(manifest.status).toBe('HOLD_PENDING_TTS_GENERATION');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.targetContentLang).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.lessonId).toBe(1);
    expect(manifest.voicePolicy).toMatchObject({
      provider: 'openai',
      requiredFormat: 'mp3',
      requiredSampleRateHz: 24000,
      exactVoiceMustBeChosenBeforeExecution: true,
    });
    expect(manifest.slots).toHaveLength(100);
    expect(manifest.safety).toMatchObject({
      manifestOnly: true,
      ttsApiCalledByThisScript: false,
      audioFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    const ruSlots = manifest.slots.filter((slot: any) => slot.sourceLocale === 'ru');
    const ukSlots = manifest.slots.filter((slot: any) => slot.sourceLocale === 'uk');
    expect(ruSlots).toHaveLength(50);
    expect(ukSlots).toHaveLength(50);
    expect(new Set(manifest.slots.map((slot: any) => `${slot.phraseId}:${slot.textForTts}`)).size).toBe(50);

    for (const slot of [manifest.slots[0], manifest.slots[7], manifest.slots[49], manifest.slots[50], manifest.slots[99]]) {
      expect(slot.studyTarget).toBe('fr');
      expect(slot.targetContentLang).toBe('fr');
      expect(['ru', 'uk']).toContain(slot.sourceLocale);
      expect(slot.textForTts).toBeTruthy();
      expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(slot.textForTts)).toBe(false);
      expect(/[�ÃÐÑÒ]/u.test(slot.textForTts + slot.sourceMeaning)).toBe(false);
      expect(slot.expectedAudioPath).toMatch(/^course-packs\/fr\/(ru|uk)\/audio\/lesson01\/fr_lesson1_phrase_\d{3}\.mp3$/);
      expect(slot.localAudioPath).toBe('');
      expect(slot.audioGenerated).toBe(false);
      expect(slot.checksumReady).toBe(false);
      expect(slot.sha256).toBe('');
      expect(slot.byteSize).toBe(0);
      expect(slot.blockers).toEqual(['blocked_pending_openai_tts_generation_and_checksum']);
    }

    expect(manifest.slots[7].textForTts).toBe("S'il vous plaît.");
    expect(manifest.slots[31].textForTts).toBe("J'habite à Lyon.");
    expect(manifest.slots[49].textForTts).toBe('Je suis prêt.');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-audio-tts-manifest-gate-audit-v1');
    expect(audit.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audit.blockers).toEqual(['blocked_pending_openai_tts_generation_and_checksum']);
    expect(audit.summary).toMatchObject({
      audioSlots: 100,
      expectedSourceLocaleSlots: 100,
      uniqueTargetPhraseTexts: 50,
      generatedSlots: 0,
      checksumReadySlots: 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
  });
});
