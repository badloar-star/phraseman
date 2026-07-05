import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02_blueprint_rebuild');
const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson02_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_VOCAB_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_VOCAB_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson02_blueprint_rebuild_pack.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 2 blueprint rebuild pack', () => {
  it('creates a French-native negation/question lesson with isolated RU/UK packs and production closed', () => {
    const candidate = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
    const reviewGate = JSON.parse(fs.readFileSync(REVIEW_GATE_PATH, 'utf8'));
    const ruPack = JSON.parse(fs.readFileSync(RU_PACK_PATH, 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(UK_PACK_PATH, 'utf8'));
    const packAudit = JSON.parse(fs.readFileSync(PACK_AUDIT_PATH, 'utf8'));
    const theoryPack = JSON.parse(fs.readFileSync(THEORY_VOCAB_PATH, 'utf8'));
    const theoryAudit = JSON.parse(fs.readFileSync(THEORY_VOCAB_AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('humanReviewRequired: false');
    expect(script).toContain('codex_llm_trusted_source_review');
    expect(script).toContain('activationApproved: false');
    expect(script).toContain('appBundleModifiedByThisScript: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(candidate.schemaVersion).toBe('gustav-fr-lesson02-blueprint-rebuild-candidate-v1');
    expect(candidate.status).toBe('HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK');
    expect(candidate.studyTarget).toBe('fr');
    expect(candidate.targetContentLang).toBe('fr');
    expect(candidate.sourceLocales).toEqual(['ru', 'uk']);
    expect(candidate.lessonId).toBe(2);
    expect(candidate.appCourseLevel).toBe('A1');
    expect(candidate.englishTopic).toBe('To be negation and questions');
    expect(candidate.frenchTopic).toBe('Etre: negation and beginner yes/no questions');
    expect(candidate.summary).toMatchObject({
      rows: 50,
      wordsFrSlots: 234,
      distractorSlots: 1170,
      distractorsPerSlot: 5,
      negativeRows: 28,
      estCeQueRows: 20,
      intonationQuestionRows: 6,
      shortAnswerRows: 4,
      activationApproved: false,
    });
    expect(Object.keys(candidate.sources)).toEqual(expect.arrayContaining([
      'le_robert_etre_present',
      'tv5monde_negation_a1',
      'tv5monde_questions_a1',
      'coe_cefr_a1_short_simple_phrases',
      'phraseman_english_lesson2_blueprint',
    ]));

    expect(candidate.rows).toHaveLength(50);
    const phrases = new Set<string>();
    for (const row of candidate.rows) {
      phrases.add(row.phraseFr);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.sourceLocales).toEqual(['ru', 'uk']);
      expect(row.ru).toMatch(/[А-Яа-яЁё]/);
      expect(row.uk).toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
      expect(row.phraseFr).not.toMatch(/\b(pret|prete|prets|pretes|etes|securite|occupe|occupee|casse|serieux)\b/);
      for (const slot of row.wordsFr) {
        expect(slot.correct).not.toMatch(/\b(pret|prete|prets|pretes|etes|securite|occupe|occupee|casse|serieux)\b/);
        expect(slot.distractors).toHaveLength(5);
        expect(new Set(slot.distractors).size).toBe(5);
        expect(slot.distractors).not.toContain(slot.correct);
      }
      if (row.phraseFr.includes(' pas')) {
        expect(row.wordsFr.some((slot: any) => slot.correct === 'ne' || slot.correct === "n'")).toBe(true);
      }
      if (row.phraseFr.startsWith('Est-ce')) {
        expect(row.wordsFr[0].correct.startsWith('Est-ce')).toBe(true);
      }
    }
    expect(phrases.size).toBe(50);
    expect(candidate.rows.some((row: any) => row.phraseFr.includes('prêt'))).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr.includes('êtes'))).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr.includes('là'))).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr.includes('sécurité'))).toBe(true);
    expect(candidate.rows.some((row: any) => row.phraseFr.includes('sûr'))).toBe(true);

    expect(reviewGate.schemaVersion).toBe('gustav-fr-lesson02-blueprint-rebuild-review-gate-v1');
    expect(reviewGate.status).toBe('PASS_LESSON2_REVIEW_ACCEPTED_FOR_NEXT_GATE');
    expect(reviewGate.reviewer).toMatchObject({
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
    });
    expect(reviewGate.summary).toMatchObject({
      rows: 50,
      acceptedRows: 50,
      revisionRows: 0,
      wordsFrSlots: 234,
      distractorSlots: 1170,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    });
    expect(reviewGate.rowDecisions.every((row: any) => row.acceptedForProduction === false)).toBe(true);

    expect(ruPack.sourceLocale).toBe('ru');
    expect(ukPack.sourceLocale).toBe('uk');
    expect(ruPack.rows).toHaveLength(50);
    expect(ukPack.rows).toHaveLength(50);
    expect(ruPack.rows[0].supportMeaning).toBe(candidate.rows[0].ru);
    expect(ukPack.rows[0].supportMeaning).toBe(candidate.rows[0].uk);
    expect(ruPack.activationApproved).toBe(false);
    expect(ukPack.activationApproved).toBe(false);

    expect(packAudit.status).toBe('PASS_PACK_DRAFT_WRITTEN');
    expect(packAudit.summary).toMatchObject({
      rowsPerPack: 50,
      sourceLocales: ['ru', 'uk'],
      wordsFrSlots: 234,
      distractorSlots: 1170,
      reviewGateStatus: 'PASS_LESSON2_REVIEW_ACCEPTED_FOR_NEXT_GATE',
      activationApproved: false,
    });
    expect(theoryPack.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(theoryPack.theory).toHaveLength(5);
    expect(theoryPack.vocabulary).toEqual(expect.arrayContaining(['ne', "n'", 'pas', 'Est-ce que', 'êtes', 'prêt']));
    expect(theoryPack.activationApproved).toBe(false);
    expect(theoryAudit.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');

    expect(state.lesson02BlueprintRebuildStatus).toBe('PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD');
    expect(state.lesson02BlueprintRebuildSummary).toMatchObject({
      rows: 50,
      wordsFrSlots: 234,
      distractorSlots: 1170,
      acceptedRows: 50,
      theorySections: 5,
      activationApproved: false,
    });
    expect(state.nextPassPlan.length).toBeGreaterThan(0);
  });
});
