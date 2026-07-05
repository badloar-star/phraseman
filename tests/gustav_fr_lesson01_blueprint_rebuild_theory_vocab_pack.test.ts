import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_blueprint_rebuild_theory_vocab_pack.mjs');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

describe('Gustav French lesson 1 blueprint rebuild theory/vocab pack', () => {
  it('builds theory, vocabulary groups, and practice hooks from the reviewed Lesson 1 pack', () => {
    const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    expect(script).toContain('REVIEW_GATE_NOT_PASS');
    expect(script).toContain('PACK_DRAFT_NOT_READY');
    expect(script).toContain('REQUIRED_VOCAB_MISSING_');

    expect(pack.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-theory-vocab-pack-v1');
    expect(pack.status).toBe('THEORY_VOCAB_PACK_HOLD_READY_FOR_NEXT_GATES');
    expect(pack.studyTarget).toBe('fr');
    expect(pack.targetContentLang).toBe('fr');
    expect(pack.lessonId).toBe(1);
    expect(pack.appCourseLevel).toBe('A1');
    expect(pack.sourceCandidatePath).toBe('docs/gustav/generated/fr/review/lesson01_blueprint_rebuild_candidate_v1.json');
    expect(pack.sourceReviewGatePath).toBe('docs/gustav/generated/fr/reviewer/fr_lesson01_blueprint_rebuild_review_gate_v1.json');
    expect(pack.sourcePackAuditPath).toBe('docs/gustav/generated/fr/materialized/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');

    expect(pack.theory.sections).toHaveLength(5);
    expect(pack.vocabulary.subjectPronouns).toEqual(expect.arrayContaining(['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles']));
    expect(pack.vocabulary.etreForms).toEqual(expect.arrayContaining(['suis', 'es', 'est', 'sommes', 'êtes', 'sont']));
    expect(pack.vocabulary.placeWords).toEqual(expect.arrayContaining(['ici', 'là', 'à', "l'intérieur"]));
    expect(pack.vocabulary.fixedExpressions).toEqual(expect.arrayContaining([
      'Nous sommes en sécurité.',
      'Vous êtes en retard.',
    ]));
    expect(pack.vocabulary.adjectiveAndStateWords).toEqual(expect.arrayContaining(['prêt', 'facile', 'amis']));
    expect(pack.vocabulary.adjectiveAndStateWords).not.toEqual(expect.arrayContaining(['Je', 'Tu', 'Il', 'Elle']));
    expect(pack.vocabulary.allItems.length).toBeGreaterThanOrEqual(50);
    expect(pack.practiceHooks).toHaveLength(3);
    expect(pack.practiceHooks.map((hook: { id: string }) => hook.id)).toEqual(expect.arrayContaining([
      'etre_present_forms',
      'adjective_gender_number_awareness',
      'c_est_neutral_statement',
    ]));
    expect(pack.safety).toMatchObject({
      theoryVocabPackOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-blueprint-rebuild-theory-vocab-pack-audit-v1');
    expect(audit.status).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(audit.blockers).toEqual([]);
    expect(audit.summary).toMatchObject({
      theorySections: 5,
      vocabularyItems: pack.vocabulary.allItems.length,
      subjectPronouns: 8,
      etreForms: 6,
      fixedExpressions: 6,
      practiceHooks: 3,
      readyForAudioManifest: true,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
    expect(audit.summary.placeWords).toBeGreaterThanOrEqual(4);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'AUDIO_TTS_NOT_GENERATED',
      'SERVER_PACK_NOT_BUILT',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ]));

    expect(markdown).toContain('# French Lesson 1 Theory/Vocabulary Pack');
    expect(markdown).toContain('Être forms:');
    expect(markdown).toContain('Nous sommes en sécurité.');

    expect(state.lesson01BlueprintRebuildTheoryVocabPackStatus).toBe('PASS_THEORY_VOCAB_PACK_WRITTEN');
    expect(state.lesson01BlueprintRebuildTheoryVocabPackAudit).toBe('docs/gustav/generated/fr/materialized/lesson01_blueprint_rebuild/fr_lesson01_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
  });
});
