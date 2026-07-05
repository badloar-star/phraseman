import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson30_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson30_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson30_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson30_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson30_blueprint_rebuild');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson30_blueprint_rebuild_with_delivery.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const normalizeText = (value: unknown) =>
  String(value).toLowerCase().normalize('NFC').replace(/[\u2019']/g, "'");

describe('Gustav French lesson 30 blueprint rebuild with delivery', () => {
  it('rebuilds Lesson 30 as French-native relative pronouns and keeps production delivery closed', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const candidate = JSON.parse(fs.readFileSync(path.join(REVIEW_DIR, 'lesson30_blueprint_rebuild_candidate_v1.json'), 'utf8'));
    const review = JSON.parse(fs.readFileSync(path.join(REVIEWER_DIR, 'fr_lesson30_blueprint_rebuild_review_gate_v1.json'), 'utf8'));
    const ruPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson30_blueprint_rebuild_ru_pack_draft_v1.json'), 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson30_blueprint_rebuild_uk_pack_draft_v1.json'), 'utf8'));
    const theory = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson30_blueprint_rebuild_theory_vocab_pack_v1.json'), 'utf8'));
    const audio = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson30_blueprint_rebuild_audio_tts_manifest_v1.json'), 'utf8'));
    const audioAudit = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson30_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'), 'utf8'));
    const server = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson30_blueprint_rebuild_server_pack_manifest_v1.json'), 'utf8'));
    const serverAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson30_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'), 'utf8'));
    const payloadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson30_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'), 'utf8'));
    const rollbackAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson30_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'), 'utf8'));
    const uploadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson30_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'), 'utf8'));
    const runtimeAudit = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson30_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'), 'utf8'));
    const cacheGate = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson30_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'), 'utf8'));
    const activationAudit = JSON.parse(fs.readFileSync(path.join(ACTIVATION_DIR, 'fr_lesson30_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'), 'utf8'));
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain("englishTopic: 'Relative Clauses'");
    expect(script).toContain("appCourseLevel: 'B2'");
    expect(script).toContain('humanReviewRequired: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(candidate.schemaVersion).toBe('gustav-fr-lesson30-blueprint-rebuild-candidate-v1');
    expect(candidate.lessonId).toBe(30);
    expect(candidate.appCourseLevel).toBe('B2');
    expect(candidate.englishTopic).toBe('Relative Clauses');
    expect(candidate.frenchTopic).toBe('Pronoms relatifs: qui, que, où, dont, lequel');
    expect(candidate.frenchNativeTransferRule).toContain('Do not map who/which/that one-to-one');
    expect(JSON.stringify(candidate) + JSON.stringify(theory)).not.toMatch(/\u00c3|\u00d0|\u00d1|\u00e2\u20ac/);
    expect(candidate.summary).toMatchObject({
      rows: 50,
      wordsFrSlots: 182,
      distractorSlots: 910,
      distractorsPerSlot: 5,
      relativeCategoryCounts: {
        mainSubject: 36,
        mainVerb: 17,
        antecedent: 34,
        relativePronoun: 50,
        relativeVerb: 16,
        objectPlace: 12,
        possessionNoun: 9,
        questionMarker: 3,
        imperativeVerb: 5,
      },
      rowTypeCounts: {
        quiSubjectPeople: 10,
        queObject: 10,
        ouPlaceTime: 10,
        dontPossession: 8,
        prepositionLequel: 5,
        mixedReview: 7,
      },
      activationApproved: false,
    });
    expect(candidate.sources).toHaveProperty('lawless_relative_pronouns');
    expect(candidate.sources).toHaveProperty('tv5monde_pronoms_relatifs');
    expect(candidate.sources).toHaveProperty('le_robert_pronoms_relatifs');
    expect(candidate.sources).toHaveProperty('tex_french_relative_pronouns');
    expect(candidate.sources).toHaveProperty('phraseman_english_lesson30_blueprint');

    const phrases = new Set<string>();
    for (const row of candidate.rows) {
      phrases.add(row.phraseFr);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.sourceLocales).toEqual(['ru', 'uk']);
      expect(row.phraseFr).toMatch(/[.!?]$/);
      expect(row.phraseFr).not.toMatch(/\b(who|which|that|whose|where|relative clauses)\b/i);
      expect(row.ru).toMatch(/[\u0400-\u04ff]/);
      expect(row.uk).toMatch(/[\u0400-\u04ff]/);
      expect(row.wordsFr.some((slot: any) => slot.category === 'relativePronoun')).toBe(true);
      if (row.rowType === 'quiSubjectPeople') {
        expect(row.wordsFr.some((slot: any) => slot.correct === 'qui')).toBe(true);
      }
      if (row.rowType === 'queObject') {
        expect(row.wordsFr.some((slot: any) => ['que', "qu'"].includes(slot.correct))).toBe(true);
      }
      if (row.rowType === 'ouPlaceTime') {
        expect(row.wordsFr.some((slot: any) => slot.correct === 'où')).toBe(true);
      }
      if (row.rowType === 'dontPossession') {
        expect(row.wordsFr.some((slot: any) => slot.correct === 'dont')).toBe(true);
        expect(row.wordsFr.some((slot: any) => slot.category === 'possessionNoun')).toBe(true);
      }
      if (row.rowType === 'prepositionLequel') {
        expect(row.wordsFr.some((slot: any) => ['avec lequel', 'dans laquelle', 'sur lequel', 'pour laquelle', 'à qui'].includes(slot.correct))).toBe(true);
      }
      if (row.rowType === 'mixedReview') {
        expect(row.wordsFr.some((slot: any) => ['questionMarker', 'imperativeVerb'].includes(slot.category))).toBe(true);
      }
      for (const slot of row.wordsFr) {
        expect(normalizeText(row.phraseFr).includes(normalizeText(slot.correct))).toBe(true);
        expect(slot.distractors).toHaveLength(5);
        expect(new Set(slot.distractors).size).toBe(5);
        expect(slot.distractors).not.toContain(slot.correct);
      }
    }
    expect(phrases.size).toBe(50);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Je connais un homme qui travaille ici.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Le livre que je lis est clair.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Voici la ville où je suis né.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Je connais une fille dont le père est médecin.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'C’est le dossier sur lequel je travaille.')).toBe(true);

    expect(review.status).toBe('PASS_LESSON30_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(review.reviewer).toMatchObject({ kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true });
    expect(review.summary).toMatchObject({ rows: 50, acceptedRows: 50, llmTrustedSourceReviewDone: true, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false });

    expect(ruPack.sourceLocale).toBe('ru');
    expect(ukPack.sourceLocale).toBe('uk');
    expect(ruPack.rows).toHaveLength(50);
    expect(ukPack.rows).toHaveLength(50);
    expect(theory.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(theory.theory).toHaveLength(5);
    expect(theory.vocabulary).toHaveLength(85);
    expect(theory.practiceHooks).toHaveLength(3);
    const normalizedVocabulary = theory.vocabulary.map((item: string) => normalizeText(item));
    expect(normalizedVocabulary).toEqual(expect.arrayContaining(['qui', 'que', 'où', 'dont', 'sur lequel', 'pour laquelle'].map(normalizeText)));

    expect(audio.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audio.slots).toHaveLength(100);
    expect(audioAudit.summary).toMatchObject({ audioSlots: 100, generatedSlots: 0, checksumReadySlots: 0, activationApproved: false });
    expect(server.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(server.entries).toHaveLength(4);
    expect(serverAudit.summary).toMatchObject({ entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: 4, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, activationApproved: false });
    for (const entry of server.entries) {
      expect(entry.lessonId).toBe(30);
      expect(entry.serverPath).toMatch(new RegExp(`^course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson30_blueprint_rebuild/`));
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
      expect(row.expectedCacheKey).toMatch(new RegExp(`^fr/${row.sourceLocale}/${row.surface}/course-pack-v1/fr-lesson30-blueprint-rebuild-v1\\.reviewed\\.pending/[a-f0-9]{64}$`));
      expect(row.deniedTokenHits).toEqual([]);
      expect(row.cacheWriteAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.activationApproved).toBe(false);
    }
    expect(activationAudit.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(activationAudit.summary).toMatchObject({ prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, readyForProductionActivation: false, activationApproved: false });

    expect(state.lesson30BlueprintRebuildStatus).toBe('PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD');
    expect(state.lesson30BlueprintRebuildSummary).toMatchObject({ rows: 50, wordsFrSlots: 182, distractorSlots: 910, acceptedRows: 50, theorySections: 5, vocabularyItems: 85, activationApproved: false });
    expect(state.lesson30BlueprintRebuildExplicitActivationReceiptStatus).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(state.activationApproved).toBe(false);
  });
});
