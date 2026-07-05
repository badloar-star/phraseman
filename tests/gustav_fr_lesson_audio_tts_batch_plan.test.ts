import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_tts_batch_plan_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_tts_batch_plan_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_audio_tts_batch_plan.mjs');

describe('Gustav French lesson audio TTS batch plan', () => {
  it('plans resumable TTS batches but blocks live audio until all rows are accepted and spend guard is open', () => {
    const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('openAiCallsMadeByThisScript: false');
    expect(script).toContain('audioFilesGeneratedByThisScript: false');
    expect(script).toContain('serverPackManifestModifiedByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(plan.schemaVersion).toBe('gustav-fr-lesson-audio-tts-batch-plan-v1');
    expect(plan.studyTarget).toBe('fr');
    expect(plan.sourceLocales).toEqual(['ru', 'uk']);
    expect(plan.targetContentLang).toBe('fr');
    expect(plan.activationApproved).toBe(false);
    expect(plan.batchSize).toBe(50);
    expect(plan.estimatedCostPerSlotUsd).toBe(0.0006);
    expect(plan.ttsProvider).toBe('openai');
    expect(plan.ttsModel).toBe('gpt-4o-mini-tts');
    expect(plan.voiceId).toBe('openai:alloy');
    expect(plan.batches).toHaveLength(32);
    expect(plan.batches[0]).toMatchObject({
      batchNumber: 1,
      startSlotIndex: 1,
      endSlotIndex: 50,
      limit: 50,
      estimatedCostUsd: 0.03,
    });
    expect(plan.batches[31]).toMatchObject({
      batchNumber: 32,
      startSlotIndex: 1551,
      endSlotIndex: 1600,
      limit: 50,
      estimatedCostUsd: 0.03,
    });
    expect(plan.batches[0].executeCommand).toContain('--start-slot 1 --limit 50 --execute --validate-after');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-audio-tts-batch-plan-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.audioSlots).toBe(1600);
    expect(audit.summary.ttsGenerationAllowedSlots).toBe(0);
    expect(audit.summary.ttsGenerationBlockedSlots).toBe(1600);
    expect(audit.summary.plannedBatches).toBe(32);
    expect(audit.summary.estimatedPendingCostUsd).toBe(0.96);
    expect(audit.summary.openaiTtsApiKeyPresent).toBe(true);
    expect(audit.summary.spendGuardOpen).toBe(false);
    expect(audit.summary.allRowsAcceptedForAudio).toBe(false);
    expect(audit.summary.manifestReadyForTts).toBe(false);
    expect(audit.summary.canExecuteLiveTtsNow).toBe(false);
    expect(audit.summary.readyForAudioChecksumGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.blockers).toEqual(expect.arrayContaining([
      'PHRASEMAN_ALLOW_OPENAI_DEV_SPEND_NOT_SET',
      'ALL_1600_ACCEPTED_ROWS_NOT_PROVEN',
      'AUDIO_MANIFEST_NOT_READY_FOR_TTS',
      'TTS_GENERATION_NOT_ALLOWED_FOR_ALL_SLOTS',
    ]));
    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      audioManifestModifiedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      productionApplyApproved: false,
    });
  });
});
