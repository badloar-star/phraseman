import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson32_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson32_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson32_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson32_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson32_blueprint_rebuild');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson32_blueprint_rebuild_with_delivery.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const normalizeText = (value: unknown) =>
  String(value).toLowerCase().normalize('NFC').replace(/[\u2019']/g, "'");

describe('Gustav French lesson 32 blueprint rebuild with delivery', () => {
  it('rebuilds Lesson 32 as French-native final review and keeps production delivery closed', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const candidate = JSON.parse(fs.readFileSync(path.join(REVIEW_DIR, 'lesson32_blueprint_rebuild_candidate_v1.json'), 'utf8'));
    const review = JSON.parse(fs.readFileSync(path.join(REVIEWER_DIR, 'fr_lesson32_blueprint_rebuild_review_gate_v1.json'), 'utf8'));
    const ruPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson32_blueprint_rebuild_ru_pack_draft_v1.json'), 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson32_blueprint_rebuild_uk_pack_draft_v1.json'), 'utf8'));
    const theory = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson32_blueprint_rebuild_theory_vocab_pack_v1.json'), 'utf8'));
    const audio = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson32_blueprint_rebuild_audio_tts_manifest_v1.json'), 'utf8'));
    const audioAudit = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson32_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'), 'utf8'));
    const server = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson32_blueprint_rebuild_server_pack_manifest_v1.json'), 'utf8'));
    const serverAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson32_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'), 'utf8'));
    const payloadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson32_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'), 'utf8'));
    const rollbackAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson32_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'), 'utf8'));
    const uploadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson32_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'), 'utf8'));
    const runtimeAudit = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson32_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'), 'utf8'));
    const cacheGate = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson32_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'), 'utf8'));
    const activationAudit = JSON.parse(fs.readFileSync(path.join(ACTIVATION_DIR, 'fr_lesson32_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'), 'utf8'));
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain("englishTopic: 'Final review'");
    expect(script).toContain("appCourseLevel: 'B2'");
    expect(script).toContain('humanReviewRequired: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(candidate.schemaVersion).toBe('gustav-fr-lesson32-blueprint-rebuild-candidate-v1');
    expect(candidate.lessonId).toBe(32);
    expect(candidate.appCourseLevel).toBe('B2');
    expect(candidate.englishTopic).toBe('Final review');
    expect(candidate.frenchTopic).toBe('Révision finale: habitudes, relatifs, discours indirect, si, depuis, passif, subjonctif');
    expect(candidate.frenchNativeTransferRule).toContain('Do not review English forms directly');
    expect(JSON.stringify(candidate) + JSON.stringify(theory)).not.toMatch(/\u00c3|\u00d0|\u00d1|\u00e2\u20ac/);
    expect(candidate.summary).toMatchObject({
      rows: 50,
      wordsFrSlots: 159,
      distractorSlots: 795,
      distractorsPerSlot: 5,
      finalReviewCategoryCounts: {
        subject: 37,
        habit: 8,
        infinitive: 14,
        timePlace: 19,
        object: 16,
        relativePronoun: 8,
        reportedVerb: 8,
        subordinator: 8,
        reportedTense: 8,
        conditionalMarker: 8,
        futureConditionnel: 8,
        perceptionCausative: 6,
        passive: 2,
        preference: 3,
        subjunctive: 6,
      },
      rowTypeCounts: {
        habitReview: 8,
        relativeReview: 8,
        reportedReview: 8,
        conditionReview: 8,
        complexReview: 6,
        depuisReview: 4,
        passiveProgressive: 2,
        preferenceResult: 6,
      },
      activationApproved: false,
    });
    expect(candidate.sources).toHaveProperty('lawless_relative_pronouns');
    expect(candidate.sources).toHaveProperty('lawless_si_clauses');
    expect(candidate.sources).toHaveProperty('lawless_reported_speech');
    expect(candidate.sources).toHaveProperty('lawless_depuis');
    expect(candidate.sources).toHaveProperty('lawless_passive_voice');
    expect(candidate.sources).toHaveProperty('phraseman_english_lesson32_blueprint');

    const phrases = new Set<string>();
    for (const row of candidate.rows) {
      phrases.add(row.phraseFr);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.sourceLocales).toEqual(['ru', 'uk']);
      expect(row.phraseFr).toMatch(/[.!?]$/);
      expect(row.phraseFr).not.toMatch(/\b(be used to|relative clauses|reported speech|would rather|present perfect continuous)\b/i);
      expect(row.ru).toMatch(/[\u0400-\u04ff]/);
      expect(row.uk).toMatch(/[\u0400-\u04ff]/);
      if (row.rowType === 'habitReview') expect(row.wordsFr.some((slot: any) => slot.category === 'habit')).toBe(true);
      if (row.rowType === 'relativeReview') expect(row.wordsFr.some((slot: any) => slot.category === 'relativePronoun')).toBe(true);
      if (row.rowType === 'reportedReview') {
        expect(row.wordsFr.some((slot: any) => slot.category === 'reportedVerb')).toBe(true);
        expect(row.wordsFr.some((slot: any) => slot.category === 'reportedTense')).toBe(true);
      }
      if (row.rowType === 'conditionReview') {
        expect(row.wordsFr.some((slot: any) => slot.category === 'conditionalMarker')).toBe(true);
        expect(row.wordsFr.some((slot: any) => slot.category === 'futureConditionnel')).toBe(true);
      }
      if (row.rowType === 'complexReview') expect(row.wordsFr.some((slot: any) => slot.category === 'perceptionCausative')).toBe(true);
      if (row.rowType === 'depuisReview') expect(row.wordsFr.some((slot: any) => slot.correct.includes('depuis'))).toBe(true);
      if (row.rowType === 'passiveProgressive') expect(row.wordsFr.some((slot: any) => slot.category === 'passive')).toBe(true);
      if (row.rowType === 'preferenceResult') expect(row.wordsFr.some((slot: any) => slot.category === 'subjunctive')).toBe(true);
      for (const slot of row.wordsFr) {
        expect(normalizeText(row.phraseFr).includes(normalizeText(slot.correct))).toBe(true);
        expect(slot.distractors).toHaveLength(5);
        expect(new Set(slot.distractors).size).toBe(5);
        expect(slot.distractors).not.toContain(slot.correct);
      }
    }
    expect(phrases.size).toBe(50);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Je suis habitué à travailler la nuit.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Il a dit qu’il était fatigué.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Si j’avais su, j’aurais aidé.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Les documents sont en train d’être vérifiés maintenant.')).toBe(true);

    expect(review.status).toBe('PASS_LESSON32_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(review.reviewer).toMatchObject({ kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true });
    expect(review.summary).toMatchObject({ rows: 50, acceptedRows: 50, llmTrustedSourceReviewDone: true, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false });

    expect(ruPack.sourceLocale).toBe('ru');
    expect(ukPack.sourceLocale).toBe('uk');
    expect(ruPack.rows).toHaveLength(50);
    expect(ukPack.rows).toHaveLength(50);
    expect(theory.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(theory.theory).toHaveLength(5);
    expect(theory.vocabulary).toHaveLength(105);
    expect(theory.practiceHooks).toHaveLength(3);
    const normalizedVocabulary = theory.vocabulary.map((item: string) => normalizeText(item));
    expect(normalizedVocabulary).toEqual(expect.arrayContaining(['suis habitué à', 'qui', 'a dit', 'si', 'depuis une heure', 'soit résolu'].map(normalizeText)));

    expect(audio.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audio.slots).toHaveLength(100);
    expect(audioAudit.summary).toMatchObject({ audioSlots: 100, generatedSlots: 0, checksumReadySlots: 0, activationApproved: false });
    expect(server.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(server.entries).toHaveLength(4);
    expect(serverAudit.summary).toMatchObject({ entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: 4, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, activationApproved: false });
    for (const entry of server.entries) {
      expect(entry.lessonId).toBe(32);
      expect(entry.serverPath).toMatch(new RegExp(`^course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson32_blueprint_rebuild/`));
      expect(entry.serverUploadAllowed).toBe(false);
      expect(entry.runtimeDownloadsEnabled).toBe(false);
      expect(entry.activationApproved).toBe(false);
    }

    expect(payloadAudit.status).toBe('HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(rollbackAudit.status).toBe('HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(uploadAudit.status).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(runtimeAudit.status).toBe('HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED');
    expect(cacheGate.status).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    for (const row of cacheGate.cacheRows) {
      expect(row.expectedCacheKey).toMatch(new RegExp(`^fr/${row.sourceLocale}/${row.surface}/course-pack-v1/fr-lesson32-blueprint-rebuild-v1\\.reviewed\\.pending/[a-f0-9]{64}$`));
      expect(row.deniedTokenHits).toEqual([]);
      expect(row.cacheWriteAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.activationApproved).toBe(false);
    }
    expect(activationAudit.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(activationAudit.summary).toMatchObject({ prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, readyForProductionActivation: false, activationApproved: false });

    expect(state.lesson32BlueprintRebuildStatus).toBe('PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD');
    expect(state.lesson32BlueprintRebuildSummary).toMatchObject({ rows: 50, wordsFrSlots: 159, distractorSlots: 795, acceptedRows: 50, theorySections: 5, vocabularyItems: 105, activationApproved: false });
    expect(state.coreLessons32BlueprintRebuildStatus).toBe('PASS_32_OF_32_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD');
    expect(state.lesson32BlueprintRebuildExplicitActivationReceiptStatus).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(state.activationApproved).toBe(false);
  });
});
