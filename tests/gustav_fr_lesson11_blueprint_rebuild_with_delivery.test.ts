import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson11_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson11_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson11_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson11_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson11_blueprint_rebuild');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson11_blueprint_rebuild_with_delivery.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 11 blueprint rebuild with delivery', () => {
  it('rebuilds Lesson 11 as French-native passe compose with avoir and keeps delivery closed', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const candidate = JSON.parse(fs.readFileSync(path.join(REVIEW_DIR, 'lesson11_blueprint_rebuild_candidate_v1.json'), 'utf8'));
    const review = JSON.parse(fs.readFileSync(path.join(REVIEWER_DIR, 'fr_lesson11_blueprint_rebuild_review_gate_v1.json'), 'utf8'));
    const ruPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson11_blueprint_rebuild_ru_pack_draft_v1.json'), 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson11_blueprint_rebuild_uk_pack_draft_v1.json'), 'utf8'));
    const theory = JSON.parse(fs.readFileSync(path.join(MATERIALIZED_DIR, 'fr_lesson11_blueprint_rebuild_theory_vocab_pack_v1.json'), 'utf8'));
    const audio = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson11_blueprint_rebuild_audio_tts_manifest_v1.json'), 'utf8'));
    const audioAudit = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, 'fr_lesson11_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'), 'utf8'));
    const server = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson11_blueprint_rebuild_server_pack_manifest_v1.json'), 'utf8'));
    const serverAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson11_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'), 'utf8'));
    const payloadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson11_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'), 'utf8'));
    const rollbackAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson11_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'), 'utf8'));
    const uploadAudit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'fr_lesson11_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'), 'utf8'));
    const runtimeAudit = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson11_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'), 'utf8'));
    const cacheGate = JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, 'fr_lesson11_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'), 'utf8'));
    const activationAudit = JSON.parse(fs.readFileSync(path.join(ACTIVATION_DIR, 'fr_lesson11_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'), 'utf8'));
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain("englishTopic: 'Past Simple regular verbs'");
    expect(script).toContain('humanReviewRequired: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(candidate.schemaVersion).toBe('gustav-fr-lesson11-blueprint-rebuild-candidate-v1');
    expect(candidate.lessonId).toBe(11);
    expect(candidate.appCourseLevel).toBe('A2');
    expect(candidate.englishTopic).toBe('Past Simple regular verbs');
    expect(candidate.frenchTopic).toBe('Passe compose with avoir and regular past participles');
    expect(candidate.summary).toMatchObject({
      rows: 50,
      wordsFrSlots: 289,
      distractorSlots: 1445,
      distractorsPerSlot: 5,
      auxiliaryCategoryCounts: { auxAvoir: 42, auxQuestion: 8 },
      participleCategoryCounts: { participleEr: 40, participleOther: 10 },
      rowTypeCounts: { affirmative: 32, negative: 10, question: 8 },
      activationApproved: false,
    });
    expect(candidate.sources).toHaveProperty('le_robert_avoir');
    expect(candidate.sources).toHaveProperty('le_robert_participe_passe');
    expect(candidate.sources).toHaveProperty('phraseman_english_lesson11_blueprint');

    const phrases = new Set<string>();
    for (const row of candidate.rows) {
      phrases.add(row.phraseFr);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.sourceLocales).toEqual(['ru', 'uk']);
      expect(row.phraseFr).toMatch(/[.?]$/);
      expect(row.phraseFr).toMatch(/^(J'ai|Je n'ai|Tu|Il|Elle|Nous|Vous|Ils|Elles|As-tu|Avez-vous|A-t-il|A-t-elle|Avons-nous|Ont-ils|Ont-elles)/);
      expect(row.phraseFr).not.toMatch(/\b(worked|helped|called|cooked|watched|played|did|didn't)\b/i);
      expect(row.phraseFr).not.toMatch(/J' |j' |n' |qu' |d' |l' /);
      expect(row.ru).toMatch(/[А-Яа-яЁё]/);
      expect(row.uk).toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
      for (const slot of row.wordsFr) {
        expect(slot.distractors).toHaveLength(5);
        expect(new Set(slot.distractors).size).toBe(5);
        expect(slot.distractors).not.toContain(slot.correct);
      }
    }
    expect(phrases.size).toBe(50);
    expect(candidate.rows.some((row: any) => row.phraseFr === "J'ai travaillé hier.")).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Nous avons commencé la leçon cette semaine.')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === "Je n'ai pas travaillé hier.")).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === "Elles n'ont pas répondu à la question.")).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'As-tu travaillé hier ?')).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr === 'Ont-elles répondu à la question ?')).toBe(true);

    expect(review.status).toBe('PASS_LESSON11_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(review.reviewer).toMatchObject({
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
    });
    expect(review.summary).toMatchObject({
      rows: 50,
      acceptedRows: 50,
      llmTrustedSourceReviewDone: true,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    });

    expect(ruPack.sourceLocale).toBe('ru');
    expect(ukPack.sourceLocale).toBe('uk');
    expect(ruPack.lessonId).toBe(11);
    expect(ukPack.lessonId).toBe(11);
    expect(ruPack.rows).toHaveLength(50);
    expect(ukPack.rows).toHaveLength(50);
    expect(theory.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(theory.theory).toHaveLength(5);
    expect(theory.vocabulary).toEqual(expect.arrayContaining(['ai', 'as', 'a', 'avons', 'avez', 'ont', 'travaillé', 'aidé', 'répondu', 'fini', 'hier']));

    expect(audio.status).toBe('HOLD_AUDIO_TTS_NOT_GENERATED');
    expect(audio.slots).toHaveLength(100);
    expect(audioAudit.summary).toMatchObject({ audioSlots: 100, generatedSlots: 0, checksumReadySlots: 0, activationApproved: false });
    expect(server.status).toBe('HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED');
    expect(server.entries).toHaveLength(4);
    expect(serverAudit.summary).toMatchObject({ entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: 4, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, activationApproved: false });
    for (const entry of server.entries) {
      expect(entry.lessonId).toBe(11);
      expect(entry.serverPath).toMatch(new RegExp(`^course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson11_blueprint_rebuild/`));
      expect(entry.serverUploadAllowed).toBe(false);
      expect(entry.runtimeDownloadsEnabled).toBe(false);
      expect(entry.activationApproved).toBe(false);
    }

    expect(payloadAudit.status).toBe('HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(rollbackAudit.status).toBe('HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED');
    expect(uploadAudit.status).toBe('HOLD_UPLOAD_EVIDENCE_MISSING');
    expect(runtimeAudit.status).toBe('HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED');
    expect(cacheGate.status).toBe('HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED');
    expect(cacheGate.cacheRows).toHaveLength(4);
    for (const row of cacheGate.cacheRows) {
      expect(row.expectedCacheKey).toMatch(new RegExp(`^fr/${row.sourceLocale}/${row.surface}/course-pack-v1/fr-lesson11-blueprint-rebuild-v1\\.reviewed\\.pending/[a-f0-9]{64}$`));
      expect(row.deniedTokenHits).toEqual([]);
      expect(row.cacheWriteAllowedNow).toBe(false);
      expect(row.runtimeDownloadAllowedNow).toBe(false);
      expect(row.activationApproved).toBe(false);
    }
    expect(activationAudit.status).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(activationAudit.summary).toMatchObject({ prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false });

    expect(state.lesson11BlueprintRebuildStatus).toBe('PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD');
    expect(state.lesson11BlueprintRebuildSummary).toMatchObject({ rows: 50, wordsFrSlots: 289, distractorSlots: 1445, acceptedRows: 50, activationApproved: false });
    expect(state.lesson11BlueprintRebuildExplicitActivationReceiptStatus).toBe('HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING');
    expect(state.activationApproved).toBe(false);
  });
});
