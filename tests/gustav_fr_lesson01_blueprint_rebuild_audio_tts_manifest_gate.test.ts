import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01_blueprint_rebuild');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const MD_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild audio/TTS manifest gate', () => {
  it('creates isolated RU/UK TTS slots while keeping audio generation, upload, runtime, and activation closed', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('blocked_pending_openai_tts_generation_and_checksum');
    expect(script).toContain('ttsApiCalledByThisScript: false');
    expect(script).toContain('audioFilesWrittenByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-audio-tts-manifest-v1');
    expect(manifest.status).toBe('HOLD_PENDING_TTS_GENERATION');
    expect(manifest.studyTarget).toBe('fr');
    expect(manifest.targetContentLang).toBe('fr');
    expect(manifest.sourceLocales).toEqual(['ru', 'uk']);
    expect(manifest.lessonId).toBe(1);
    expect(manifest.voicePolicy).toMatchObject({
      provider: 'openai',
      voiceFamily: 'french_friendly_clear_a1',
      requiredFormat: 'mp3',
      requiredSampleRateHz: 24000,
      exactVoiceMustBeChosenBeforeExecution: true,
    });
    expect(manifest.sourcePacks.ru.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.sourcePacks.uk.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.sourceAudits.packDraft.status).toBe('PASS_PACK_DRAFT_WRITTEN');
    expect(manifest.sourceAudits.theoryVocab.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(manifest.slots).toHaveLength(100);

    const ruSlots = manifest.slots.filter((slot: { sourceLocale: string }) => slot.sourceLocale === 'ru');
    const ukSlots = manifest.slots.filter((slot: { sourceLocale: string }) => slot.sourceLocale === 'uk');
    expect(ruSlots).toHaveLength(50);
    expect(ukSlots).toHaveLength(50);
    expect(new Set(manifest.slots.map((slot: { phraseId: string; textForTts: string }) => `${slot.phraseId}:${slot.textForTts}`)).size).toBe(50);

    for (const slot of manifest.slots) {
      expect(slot.studyTarget).toBe('fr');
      expect(slot.targetContentLang).toBe('fr');
      expect(['ru', 'uk']).toContain(slot.sourceLocale);
      expect(slot.textForTts).not.toMatch(/[А-Яа-яЁёІіЇїЄєҐґ]/u);
      expect(slot.textForTts).not.toMatch(/[�ÃƒÃÃ‘Ã’]/u);
      expect(slot.expectedAudioPath).toMatch(/^course-packs\/fr\/(ru|uk)\/audio\/lesson01_blueprint_rebuild\/fr_lesson01_blueprint_rebuild_\d{2}\.mp3$/);
      expect(slot.ttsProvider).toBe('openai');
      expect(slot.requiredFormat).toBe('mp3');
      expect(slot.requiredSampleRateHz).toBe(24000);
      expect(slot.audioGenerated).toBe(false);
      expect(slot.checksumReady).toBe(false);
      expect(slot.localAudioPath).toBe('');
      expect(slot.sha256).toBe('');
      expect(slot.byteSize).toBe(0);
      expect(slot.blockers).toEqual(['blocked_pending_openai_tts_generation_and_checksum']);
    }

    expect(ruSlots[0].textForTts).toBe('Je suis ici.');
    expect(ruSlots[20].textForTts).toBe("Je suis à l'intérieur.");
    expect(ruSlots[31].textForTts).toBe("C'est facile.");
    expect(ruSlots[49].textForTts).toBe("C'est possible.");
    expect(ukSlots[0].textForTts).toBe('Je suis ici.');
    expect(ukSlots[0].sourceMeaning).toBe('Я тут.');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-audio-tts-manifest-gate-audit-v1');
    expect(audit.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audit.blockers).toEqual(['blocked_pending_openai_tts_generation_and_checksum']);
    expect(audit.summary).toMatchObject({
      audioSlots: 100,
      expectedSourceLocaleSlots: 100,
      uniqueTargetPhraseTexts: 50,
      generatedSlots: 0,
      checksumReadySlots: 0,
      readyForTtsGeneration: true,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'OPENAI_TTS_NOT_EXECUTED',
      'AUDIO_FILES_NOT_WRITTEN',
      'AUDIO_SHA256_CHECKSUMS_MISSING',
      'SERVER_PACK_NOT_BUILT',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));
    expect(audit.safety).toMatchObject({
      manifestOnly: true,
      ttsApiCalledByThisScript: false,
      audioFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('Status: HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(markdown).toContain('Audio slots: 100');
    expect(markdown).toContain('Generated slots: 0');
    expect(markdown).toContain('activationApproved: false');

    expect(state.lesson01BlueprintRebuildAudioTtsManifestStatus).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(state.lesson01BlueprintRebuildAudioTtsManifestGateAudit).toBe('docs/gustav/generated/fr/audio/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
    expect(state.lesson01BlueprintRebuildAudioTtsManifestSummary).toMatchObject({
      audioSlots: 100,
      generatedSlots: 0,
      checksumReadySlots: 0,
      activationApproved: false,
    });
  });
});
