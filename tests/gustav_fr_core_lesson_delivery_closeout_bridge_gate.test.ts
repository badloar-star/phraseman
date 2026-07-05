import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'core_lessons_32',
  'fr_core_lesson_delivery_closeout_bridge_gate_v1.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_core_lesson_delivery_closeout_bridge_gate.mjs');

describe('Gustav French core lesson delivery closeout bridge gate', () => {
  it('summarizes the remaining core lesson production blockers without opening activation', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('MOJIBAKE_PATTERN');
    expect(script).toContain('AUDIO_MANIFEST_TEXT_MOJIBAKE_PRESENT');
    expect(script).toContain('SERVER_MANIFEST_SHA_PLACEHOLDERS_REMAIN');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(gate.schemaVersion).toBe('gustav-fr-core-lesson-delivery-closeout-bridge-gate-v1');
    expect(gate.status).toBe('HOLD_CORE_LESSON_DELIVERY_NOT_READY');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.surface).toBe('core_lesson_delivery_closeout');
    expect(gate.activationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);

    expect(gate.summary).toMatchObject({
      requestRows: 1600,
      decisionRows: 1263,
      missingDecisionRows: 337,
      nextBatchStartIndex: 1264,
      acceptedRows: 870,
      regenerationRows: 303,
      skippedRows: 90,
      nonAcceptedRows: 393,
      missingDecisionBatches: 14,
      firstMissingDecisionBatchStartIndex: 1264,
      firstMissingDecisionBatchLimit: 25,
      missingReviewBatchArtifacts: 14,
      missingReviewWorkOrderReady: true,
      audioSlots: 1600,
      existingAudioFiles: 0,
      checksumReadySlots: 0,
      expectedServerObjects: 4,
      payloadsReadyForManifest: 0,
      uploadEvidenceAcceptedObjects: 0,
      runtimeDownloadAllowedRows: 0,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(gate.summary.audioMojibakeSlots).toBe(0);

    expect(gate.perLessonEvidence).toMatchObject({
      expectedLessons: 32,
      review: { total: 32 },
      audio: { total: 32, statuses: { HOLD_AUDIO_TTS_NOT_GENERATED: 32 } },
      serverPack: { total: 32, statuses: { HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED: 32 } },
      payloadHashLock: { total: 32, statuses: { HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED: 32 } },
      runtimeDelivery: { total: 32, statuses: { HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED: 32 } },
    });

    expect(gate.invariants).toMatchObject({
      noHumanReviewGate: true,
      llmTrustedSourceReviewInstead: true,
      serverPackBasedDeliveryOnly: true,
      noAppBundleFrenchProductionContentApplied: true,
      noFirebaseOrServerUploadStarted: true,
      runtimeDownloadsClosed: true,
      activationRemainsClosed: true,
      audioMustBeRealMp3WithShaBeforeServer: true,
      payloadHashesMustBeRealBeforeRuntime: true,
      mojibakeBlocksAudioAndProduction: true,
    });

    expect(gate.blockers).toEqual(expect.arrayContaining([
      'LLM_REVIEW_DECISIONS_INCOMPLETE',
      'LLM_REVIEW_DECISIONS_MISSING',
      'REVIEW_IMPORT_NOT_ACCEPTED_FOR_ALL_1600_ROWS',
      'REGENERATION_ROWS_REMAIN',
      'SKIPPED_ROWS_REMAIN',
      'NON_ACCEPTED_ROWS_BLOCK_AUDIO',
      'AUDIO_TTS_GENERATION_NOT_READY',
      'AUDIO_CHECKSUMS_NOT_READY',
      'AUDIO_FILES_MISSING',
      'SERVER_PAYLOADS_NOT_READY_FOR_MANIFEST',
      'SERVER_MANIFEST_SHA_PLACEHOLDERS_REMAIN',
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_DELIVERY_NOT_READY',
      'FINAL_ACTIVATION_AUDIT_NOT_READY',
    ]));
    expect(gate.safety).toMatchObject({
      readOnly: true,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });
    expect(gate.evidenceSamples.firstBlockedLessons[0]).toMatchObject({
      lessonId: 1,
      decisionRows: 50,
      missingDecisionRows: 0,
    });
    expect(gate.evidenceSamples.firstMissingDecisionBatches[0]).toMatchObject({
      startIndex: 1264,
      limit: 25,
    });
    expect(gate.evidenceSamples.missingReviewWorkOrder).toBe(
      'docs/gustav/generated/fr/reviewer/fr_lesson_missing_review_batch_work_order_audit_v1.json',
    );
  });
});
