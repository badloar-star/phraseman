import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson27_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson27_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson27_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson27_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson27_blueprint_rebuild');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson27_blueprint_rebuild_with_delivery.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 27 blueprint rebuild with delivery', () => {
  it('rebuilds Lesson 27 as French-native discours indirect and keeps production delivery closed', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const candidate = JSON.parse(fs.readFileSync(path.join(REVIEW_DIR, 'lesson27_blueprint_rebuild_candidate_v1.json'), 'utf8'));
    const review = JSON.parse(fs.readFileSync(path.join(REVIEWER_DIR, 'fr_lesson27_blueprint_rebuild_review_gate_v1.json'), 'utf8'));
    const ruPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson27_blueprint_rebuild_ru_pack_draft_v1.json'), 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson27_blueprint_rebuild_uk_pack_draft_v1.json'), 'utf8'));
    const theory = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson27_blueprint_rebuild_theory_vocab_pack_v1.json'), 'utf8'));
    const audio = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson27_blueprint_rebuild_audio_tts_manifest_v1.json'), 'utf8'));
    const audioAudit = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson27_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'), 'utf8'));
    const server = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson27_blueprint_rebuild_server_pack_manifest_v1.json'), 'utf8'));
    const serverAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson27_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'), 'utf8'));
    const payloadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson27_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'), 'utf8'));
    const rollbackAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson27_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'), 'utf8'));
    const uploadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson27_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'), 'utf8'));
    const runtimeAudit = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson27_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'), 'utf8'));
    const cacheGate = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson27_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'), 'utf8'));
    const activationAudit = JSON.parse(fs.readFileSync(path.join(ACTIVATION_DIR, 'fr_lesson27_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'), 'utf8'));
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain("englishTopic: 'Reported speech'");
    expect(script).toContain("appCourseLevel: 'B1'");
    expect(script).toContain('humanReviewRequired: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(candidate.schemaVersion).toBe('gustav-fr-lesson27-blueprint-rebuild-candidate-v1');
    expect(candidate.lessonId).toBe(27);
    expect(candidate.appCourseLevel).toBe('B1');
    expect(candidate.englishTopic).toBe('Reported speech');
    expect(candidate.frenchTopic).toBe('Discours indirect: que, si, mots interrogatifs, temps et repères transformés');
    expect(candidate.frenchNativeTransferRule).toContain('Do not copy English said/that/if mechanics');
    expect(JSON.stringify(candidate) + JSON.stringify(theory)).not.toMatch(/Ã|Ð|Ñ|â€™|â€œ|â€/);
    expect(candidate.summary).toMatchObject({
      rows: 50,
      wordsFrSlots: 224,
      distractorSlots: 1120,
      distractorsPerSlot: 5,
      reportedCategoryCounts: {
        reportVerb: 50,
        subordinator: 50,
        pronounShift: 41,
        tenseShift: 22,
        negation: 2,
        futureInPast: 12,
        timeShift: 13,
        pastPerfect: 14,
      },
      rowTypeCounts: {
        statementQue: 10,
        futureInPast: 10,
        yesNoQuestion: 10,
        whQuestion: 10,
        pastTimeShift: 10,
      },
      activationApproved: false,
    });
    expect(candidate.sources).toHaveProperty('lawless_reported_speech');
    expect(candidate.sources).toHaveProperty('le_robert_discours_indirect');
    expect(candidate.sources).toHaveProperty('tv5monde_discours_rapporte');
    expect(candidate.sources).toHaveProperty('university_tex_reported_speech');
    expect(candidate.sources).toHaveProperty('phraseman_english_lesson27_blueprint');

    const phrases = new Set<string>();
    for (const row of candidate.rows) {
      phrases.add(row.phraseFr);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.sourceLocales).toEqual(['ru', 'uk']);
      expect(row.phraseFr).toMatch(/[.!?]$/);
      expect(row.phraseFr).not.toMatch(/\b(he said that|she asked if|reported speech|said that he|would call me)\b/i);
      expect(row.ru).toMatch(/[А-Яа-яЁё]/);
      expect(row.uk).toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
      expect(row.wordsFr.some((slot: any) => slot.category === 'reportVerb')).toBe(true);
      expect(row.wordsFr.some((slot: any) => slot.category === 'subordinator')).toBe(true);
      if (row.rowType === 'statementQue') {
        expect(row.wordsFr.some((slot: any) => ['que', "qu'"].includes(slot.correct))).toBe(true);
        expect(row.wordsFr.some((slot: any) => ['tenseShift', 'negation'].includes(slot.category))).toBe(true);
      }
      if (row.rowType === 'futureInPast') {
        expect(row.wordsFr.some((slot: any) => slot.category === 'futureInPast')).toBe(true);
      }
      if (row.rowType === 'yesNoQuestion') {
        expect(row.wordsFr.some((slot: any) => ['si', "s'ils"].includes(slot.correct))).toBe(true);
      }
      if (row.rowType === 'whQuestion') {
        expect(row.wordsFr.some((slot: any) => ['où', 'pourquoi', 'quand', 'comment', 'ce que', 'qui', 'combien'].includes(slot.correct))).toBe(true);
      }
      if (row.rowType === 'pastTimeShift') {
        expect(row.wordsFr.some((slot: any) => slot.category === 'pastPerfect')).toBe(true);
      }
      for (const slot of row.wordsFr) {
        const plain = row.phraseFr.toLowerCase().normalize('NFC').replace(/[’']/g, "'");
        const correct = String(slot.correct).toLowerCase().normalize('NFC').replace(/[’']/g, "'");
        expect(plain.includes(correct)).toBe(true);
        expect(slot.distractors).toHaveLength(5);
        expect(new Set(slot.distractors).size).toBe(5);
        expect(slot.distractors).not.toContain(slot.correct);
      }
    }
    expect(phrases.size).toBe(50);
    expect(candidate.rows.some((row: any) => row.phraseFr === "Il a dit qu'il était fatigué.")).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === "Elle a demandé si je travaillais là-bas.")).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === "Il a dit qu'il avait vu Marie la veille.")).toBe(true);

    expect(review.status).toBe('PASS_LESSON27_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(review.reviewer).toMatchObject({ kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true });
    expect(review.summary).toMatchObject({ rows: 50, acceptedRows: 50, llmTrustedSourceReviewDone: true, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false });

    expect(ruPack.sourceLocale).toBe('ru');
    expect(ukPack.sourceLocale).toBe('uk');
    expect(ruPack.rows).toHaveLength(50);
    expect(ukPack.rows).toHaveLength(50);
    expect(theory.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(theory.theory).toHaveLength(5);
    expect(theory.vocabulary).toHaveLength(99);
    expect(theory.practiceHooks).toHaveLength(3);
    const normalizedVocabulary = theory.vocabulary.map((item: string) => item.toLowerCase());
    expect(normalizedVocabulary).toEqual(expect.arrayContaining(['a dit', "qu'", 'si', 'viendrait', 'avait vu', 'la veille', "j'ai demandé"]));

    expect(audio.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audio.slots).toHaveLength(100);
    expect(audioAudit.summary).toMatchObject({ audioSlots: 100, generatedSlots: 0, checksumReadySlots: 0, activationApproved: false });
    expect(server.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(server.entries).toHaveLength(4);
    expect(serverAudit.summary).toMatchObject({ entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: 4, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, activationApproved: false });
    for (const entry of server.entries) {
      expect(entry.lessonId).toBe(27);
      expect(entry.serverPath).toMatch(new RegExp(`^course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson27_blueprint_rebuild/`));
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
      expect(row.expectedCacheKey).toMatch(new RegExp(`^fr/${row.sourceLocale}/${row.surface}/course-pack-v1/fr-lesson27-blueprint-rebuild-v1\\.reviewed\\.pending/[a-f0-9]{64}$`));
      expect(row.deniedTokenHits).toEqual([]);
      expect(row.cacheWriteAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.activationApproved).toBe(false);
    }
    expect(activationAudit.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(activationAudit.summary).toMatchObject({ prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, readyForProductionActivation: false, activationApproved: false });

    expect(state.lesson27BlueprintRebuildStatus).toBe('PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD');
    expect(state.lesson27BlueprintRebuildSummary).toMatchObject({ rows: 50, wordsFrSlots: 224, distractorSlots: 1120, acceptedRows: 50, theorySections: 5, vocabularyItems: 99, activationApproved: false });
    expect(state.lesson27BlueprintRebuildExplicitActivationReceiptStatus).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(state.activationApproved).toBe(false);
  });
});
