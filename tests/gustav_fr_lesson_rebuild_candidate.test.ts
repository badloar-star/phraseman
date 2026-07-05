import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson1_row_ledger.json');
const LESSON2_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson2_row_ledger.json');
const LESSON3_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson3_row_ledger.json');
const LESSON4_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson4_row_ledger.json');
const LESSON5_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson5_row_ledger.json');
const LESSON6_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson6_row_ledger.json');
const LESSON7_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson7_row_ledger.json');
const LESSON8_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson8_row_ledger.json');
const LESSON9_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson9_row_ledger.json');
const LESSON10_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson10_row_ledger.json');
const LESSON11_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson11_row_ledger.json');
const LESSON12_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson12_row_ledger.json');
const LESSON13_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson13_row_ledger.json');
const LESSON14_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson14_row_ledger.json');
const LESSON15_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson15_row_ledger.json');
const LESSON16_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson16_row_ledger.json');
const LESSON17_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson17_row_ledger.json');
const LESSON18_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson18_row_ledger.json');
const LESSON19_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson19_row_ledger.json');
const LESSON20_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson20_row_ledger.json');
const LESSON21_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson21_row_ledger.json');
const LESSON22_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson22_row_ledger.json');
const LESSON23_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson23_row_ledger.json');
const LESSON24_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson24_row_ledger.json');
const LESSON25_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson25_row_ledger.json');
const LESSON26_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson26_row_ledger.json');
const LESSON27_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson27_row_ledger.json');
const LESSON28_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson28_row_ledger.json');
const LESSON29_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson29_row_ledger.json');
const LESSON30_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson30_row_ledger.json');
const LESSON31_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson31_row_ledger.json');
const LESSON32_LEDGER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'lesson32_row_ledger.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'lessons', 'fr_lesson_rebuild_candidate_audit.json');
const BUILDER_INPUTS_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'core_lessons_32',
  'fr_lesson_builder_inputs_v1.json',
);
const MOJIBAKE_RE = /(?:Ã|Ð|Ñ|�|ï¿½|Â|â€)/;

describe('Gustav French lesson rebuild candidate', () => {
  it('creates a real isolated Lesson 1 candidate without app activation', () => {
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const lesson2 = JSON.parse(fs.readFileSync(LESSON2_LEDGER_PATH, 'utf8'));
    const lesson3 = JSON.parse(fs.readFileSync(LESSON3_LEDGER_PATH, 'utf8'));
    const lesson4 = JSON.parse(fs.readFileSync(LESSON4_LEDGER_PATH, 'utf8'));
    const lesson5 = JSON.parse(fs.readFileSync(LESSON5_LEDGER_PATH, 'utf8'));
    const lesson6 = JSON.parse(fs.readFileSync(LESSON6_LEDGER_PATH, 'utf8'));
    const lesson7 = JSON.parse(fs.readFileSync(LESSON7_LEDGER_PATH, 'utf8'));
    const lesson8 = JSON.parse(fs.readFileSync(LESSON8_LEDGER_PATH, 'utf8'));
    const lesson9 = JSON.parse(fs.readFileSync(LESSON9_LEDGER_PATH, 'utf8'));
    const lesson10 = JSON.parse(fs.readFileSync(LESSON10_LEDGER_PATH, 'utf8'));
    const lesson11 = JSON.parse(fs.readFileSync(LESSON11_LEDGER_PATH, 'utf8'));
    const lesson12 = JSON.parse(fs.readFileSync(LESSON12_LEDGER_PATH, 'utf8'));
    const lesson13 = JSON.parse(fs.readFileSync(LESSON13_LEDGER_PATH, 'utf8'));
    const lesson14 = JSON.parse(fs.readFileSync(LESSON14_LEDGER_PATH, 'utf8'));
    const lesson15 = JSON.parse(fs.readFileSync(LESSON15_LEDGER_PATH, 'utf8'));
    const lesson16 = JSON.parse(fs.readFileSync(LESSON16_LEDGER_PATH, 'utf8'));
    const lesson17 = JSON.parse(fs.readFileSync(LESSON17_LEDGER_PATH, 'utf8'));
    const lesson18 = JSON.parse(fs.readFileSync(LESSON18_LEDGER_PATH, 'utf8'));
    const lesson19 = JSON.parse(fs.readFileSync(LESSON19_LEDGER_PATH, 'utf8'));
    const lesson20 = JSON.parse(fs.readFileSync(LESSON20_LEDGER_PATH, 'utf8'));
    const lesson21 = JSON.parse(fs.readFileSync(LESSON21_LEDGER_PATH, 'utf8'));
    const lesson22 = JSON.parse(fs.readFileSync(LESSON22_LEDGER_PATH, 'utf8'));
    const lesson23 = JSON.parse(fs.readFileSync(LESSON23_LEDGER_PATH, 'utf8'));
    const lesson24 = JSON.parse(fs.readFileSync(LESSON24_LEDGER_PATH, 'utf8'));
    const lesson25 = JSON.parse(fs.readFileSync(LESSON25_LEDGER_PATH, 'utf8'));
    const lesson26 = JSON.parse(fs.readFileSync(LESSON26_LEDGER_PATH, 'utf8'));
    const lesson27 = JSON.parse(fs.readFileSync(LESSON27_LEDGER_PATH, 'utf8'));
    const lesson28 = JSON.parse(fs.readFileSync(LESSON28_LEDGER_PATH, 'utf8'));
    const lesson29 = JSON.parse(fs.readFileSync(LESSON29_LEDGER_PATH, 'utf8'));
    const lesson30 = JSON.parse(fs.readFileSync(LESSON30_LEDGER_PATH, 'utf8'));
    const lesson31 = JSON.parse(fs.readFileSync(LESSON31_LEDGER_PATH, 'utf8'));
    const lesson32 = JSON.parse(fs.readFileSync(LESSON32_LEDGER_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const builderInputs = JSON.parse(fs.readFileSync(BUILDER_INPUTS_PATH, 'utf8'));
    const lesson1Input = builderInputs.lessons.find((lesson: any) => lesson.lessonId === 1);

    expect(ledger.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(ledger.studyTarget).toBe('fr');
    expect(ledger.targetContentLang).toBe('fr');
    expect(ledger.aiOutputLang).toBe('fr');
    expect(ledger.sourceLocales).toEqual(['ru', 'uk']);
    expect(ledger.lessonId).toBe(1);
    expect(ledger.action).toBe('BUILD_NEW');
    expect(ledger.targetConcepts).toEqual(expect.arrayContaining(['greetings']));
    expect(ledger.targetGrammarFocus).toEqual(expect.arrayContaining(['greetings', 'classroom survival', 'tu/vous']));
    expect(ledger.activationApproved).toBe(false);
    expect(ledger.activeAppSeedAllowed).toBe(false);
    expect(ledger.activationStatus).toBe('blocked_pending_llm_source_review_audio_packaging');
    expect(ledger.gates.official_source_evidence_gate).toBe('PASS');
    expect(ledger.gates.target_sequence_fit_gate).toBe('PASS');
    expect(ledger.gates.no_english_order_copy_gate).toBe('PASS');
    expect(ledger.gates.source_locale_isolation_gate).toBe('PASS');
    expect(ledger.gates.llm_source_review_gate).toBe('HOLD');
    expect(ledger.gates.audio_manifest_gate).toBe('HOLD');
    expect(ledger.gates.server_pack_gate).toBe('HOLD');
    expect(ledger.rows).toHaveLength(50);
    expect(lesson1Input.outputLedgerPath).toBe('docs/gustav/generated/fr/lessons/lesson1_row_ledger.json');

    const phraseIds = new Set<string>();
    const sourceIds = new Set(ledger.sourceEvidence.map((source: any) => source.sourceId));
    expect(sourceIds).toEqual(
      new Set(['coe_cefr_main', 'coe_cefr_companion_2020', 'tv5monde_a1', 'le_robert_conjugation']),
    );

    for (const row of ledger.rows) {
      expect(phraseIds.has(row.phraseId)).toBe(false);
      phraseIds.add(row.phraseId);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.sourceLocales).toEqual(['ru', 'uk']);
      expect(row.russianMeaning).toBeTruthy();
      expect(row.ukrainianMeaning).toBeTruthy();
      expect(row.proposedFrench).toBeTruthy();
      expect(row.wordsFr).toHaveLength(1);
      expect(row.wordsFr[0].text).toContain('___');
      expect(row.wordsFr[0].correct).toBeTruthy();
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['coe_cefr_companion_2020', 'tv5monde_a1']));
      expect(row.requiredEvidence).toEqual(
        expect.arrayContaining([
          'official_source_evidence_gate',
          'target_sequence_fit_gate',
          'source_locale_isolation_gate',
          'llm_source_review_gate',
        ]),
      );
      expect(row.reviewerStatus).toBe('needs_llm_source_review');
      expect(row.activationStatus).toBe('blocked');

      const learnerText = [
        row.englishBase,
        row.russianMeaning,
        row.ukrainianMeaning,
        row.proposedFrench,
        row.wordsFr[0].text,
        row.wordsFr[0].correct,
        ...row.wordsFr[0].distractors,
      ].join('\n');
      expect(learnerText).not.toMatch(/\bTODO\b|placeholder|заглуш/i);
      expect(learnerText).not.toMatch(MOJIBAKE_RE);
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-rebuild-candidate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.reconciliationReport).toBe(
      'docs/gustav/generated/fr/core_lessons_32/fr_lesson_sequence_reconciliation_report.json',
    );
    expect(audit.reconciliationSummary.rebuildRequired).toBeGreaterThan(0);
    expect(audit.gates.candidate_ledgers_present_gate).toBe('PASS');
    expect(audit.postRebuildScopeReconciliation.expectedLessons).toBe(32);
    expect(audit.postRebuildScopeReconciliation.checkedLedgers).toBe(32);
    expect(audit.postRebuildScopeReconciliation.mismatchCount).toBe(0);
    expect(audit.gates.scope_sequence_reconciliation_gate).toBe('PASS');
    expect(lesson2.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson2.lessonId).toBe(2);
    expect(lesson2.action).toBe('MERGE_AND_REBUILD');
    expect(lesson2.targetConcepts).toEqual(expect.arrayContaining(['etre', 'adjectives']));
    expect(lesson2.targetGrammarFocus).toEqual(
      expect.arrayContaining(['etre present', 'c est / il est contrast', 'basic adjective agreement']),
    );
    expect(lesson2.activationApproved).toBe(false);
    expect(lesson2.activeAppSeedAllowed).toBe(false);
    expect(lesson2.gates.llm_source_review_gate).toBe('HOLD');
    expect(lesson2.rows).toHaveLength(50);

    const lesson2Text = JSON.stringify(lesson2.rows);
    expect(lesson2Text).toContain('Tu es prêt.');
    expect(lesson2Text).toContain('La réponse est claire.');
    expect(lesson2Text).toContain('Elle est à la maison.');
    expect(lesson2Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson2.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_dictionary']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson3.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson3.lessonId).toBe(3);
    expect(lesson3.action).toBe('MERGE_AND_REBUILD');
    expect(lesson3.targetConcepts).toEqual(expect.arrayContaining(['articles_gender']));
    expect(lesson3.targetGrammarFocus).toEqual(
      expect.arrayContaining(['gender', 'definite articles', 'indefinite articles', 'plural basics']),
    );
    expect(lesson3.activationApproved).toBe(false);
    expect(lesson3.activeAppSeedAllowed).toBe(false);
    expect(lesson3.rows).toHaveLength(50);

    const lesson3Text = JSON.stringify(lesson3.rows);
    expect(lesson3Text).toContain("L'école est ouverte.");
    expect(lesson3Text).toContain("L'étudiant écoute.");
    expect(lesson3Text).toContain("C'est la question.");
    expect(lesson3Text).toContain('Les leçons sont utiles.');
    expect(lesson3Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson3.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_dictionary']));
      expect(row.activationStatus).toBe('blocked');
      expect(row.wordsFr[0].correct).not.toBe('là');
    }

    expect(lesson4.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson4.lessonId).toBe(4);
    expect(lesson4.action).toBe('MERGE_AND_REBUILD');
    expect(lesson4.targetConcepts).toEqual(expect.arrayContaining(['avoir']));
    expect(lesson4.targetGrammarFocus).toEqual(
      expect.arrayContaining(['avoir present', 'age with avoir', 'possession', 'common avoir expressions']),
    );
    expect(lesson4.activationApproved).toBe(false);
    expect(lesson4.activeAppSeedAllowed).toBe(false);
    expect(lesson4.rows).toHaveLength(50);

    const lesson4Text = JSON.stringify(lesson4.rows);
    expect(lesson4Text).toContain("J'ai vingt ans.");
    expect(lesson4Text).toContain('Nous avons le même âge.');
    expect(lesson4Text).toContain("J'ai un frère.");
    expect(lesson4Text).toContain("Il a besoin d'aide.");
    expect(lesson4Text).toContain("J'ai mal à la tête.");
    expect(lesson4Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson4.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['le_robert_conjugation', 'tv5monde_grammar']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson5.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson5.lessonId).toBe(5);
    expect(lesson5.action).toBe('MERGE_AND_REBUILD');
    expect(lesson5.targetConcepts).toEqual(expect.arrayContaining(['regular_present']));
    expect(lesson5.targetGrammarFocus).toEqual(
      expect.arrayContaining(['regular -er present', 'subject pronouns', 'basic sentence order']),
    );
    expect(lesson5.activationApproved).toBe(false);
    expect(lesson5.activeAppSeedAllowed).toBe(false);
    expect(lesson5.rows).toHaveLength(50);

    const lesson5Text = JSON.stringify(lesson5.rows);
    expect(lesson5Text).toContain('Je parle français.');
    expect(lesson5Text).toContain("J'étudie chaque jour.");
    expect(lesson5Text).toContain("J'écoute la leçon.");
    expect(lesson5Text).toContain("Ils regardent l'écran.");
    expect(lesson5Text).toContain('Je répète la phrase.');
    expect(lesson5Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson5.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['le_robert_conjugation', 'tv5monde_grammar']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson6.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson6.lessonId).toBe(6);
    expect(lesson6.action).toBe('MERGE_AND_REBUILD');
    expect(lesson6.targetConcepts).toEqual(expect.arrayContaining(['negation']));
    expect(lesson6.targetGrammarFocus).toEqual(
      expect.arrayContaining(['negation ne...pas', 'article changes after negation', 'basic adverbs']),
    );
    expect(lesson6.activationApproved).toBe(false);
    expect(lesson6.activeAppSeedAllowed).toBe(false);
    expect(lesson6.rows).toHaveLength(50);

    const lesson6Text = JSON.stringify(lesson6.rows);
    expect(lesson6Text).toContain('Je ne parle pas français.');
    expect(lesson6Text).toContain("Je n'étudie pas aujourd'hui.");
    expect(lesson6Text).toContain("Je n'ai pas de livre.");
    expect(lesson6Text).toContain("Ils n'ont pas d'amis.");
    expect(lesson6Text).toContain("Ce n'est pas un livre.");
    expect(lesson6Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson6.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson7.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson7.lessonId).toBe(7);
    expect(lesson7.action).toBe('MERGE_AND_REBUILD');
    expect(lesson7.targetConcepts).toEqual(expect.arrayContaining(['questions']));
    expect(lesson7.targetGrammarFocus).toEqual(
      expect.arrayContaining(['yes/no questions', 'est-ce que']),
    );
    expect(lesson7.activationApproved).toBe(false);
    expect(lesson7.activeAppSeedAllowed).toBe(false);
    expect(lesson7.rows).toHaveLength(50);

    const lesson7Text = JSON.stringify(lesson7.rows);
    expect(lesson7Text).toContain('Est-ce que tu parles français ?');
    expect(lesson7Text).toContain("Est-ce qu'il a un livre ?");
    expect(lesson7Text).toContain("Est-ce qu'elle écoute ?");
    expect(lesson7Text).toContain('Vous pouvez répéter ?');
    expect(lesson7Text).toContain("Vous n'avez pas de livre ?");
    expect(lesson7Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson7.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson8.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson8.lessonId).toBe(8);
    expect(lesson8.action).toBe('MERGE_AND_REBUILD');
    expect(lesson8.targetConcepts).toEqual(expect.arrayContaining(['questions']));
    expect(lesson8.targetGrammarFocus).toEqual(
      expect.arrayContaining(['question words', 'qui/quoi/ou/quand/comment/pourquoi', 'word order patterns']),
    );
    expect(lesson8.activationApproved).toBe(false);
    expect(lesson8.activeAppSeedAllowed).toBe(false);
    expect(lesson8.rows).toHaveLength(50);

    const lesson8Text = JSON.stringify(lesson8.rows);
    expect(lesson8Text).toContain('Qui est ici ?');
    expect(lesson8Text).toContain("Qu'est-ce que tu étudies ?");
    expect(lesson8Text).toContain('Où est le livre ?');
    expect(lesson8Text).toContain('Comment ça va ?');
    expect(lesson8Text).toContain("Combien d'étudiants sont ici ?");
    expect(lesson8Text).toContain('Tu as quel âge ?');
    expect(lesson8Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson8.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson9.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson9.lessonId).toBe(9);
    expect(lesson9.action).toBe('BUILD_NEW');
    expect(lesson9.targetConcepts).toEqual(expect.arrayContaining(['aller_future_proche']));
    expect(lesson9.targetGrammarFocus).toEqual(
      expect.arrayContaining(['aller present', 'near future aller + infinitive', 'a / au / aux']),
    );
    expect(lesson9.activationApproved).toBe(false);
    expect(lesson9.activeAppSeedAllowed).toBe(false);
    expect(lesson9.rows).toHaveLength(50);

    const lesson9Text = JSON.stringify(lesson9.rows);
    expect(lesson9Text).toContain('Je vais au cours.');
    expect(lesson9Text).toContain("Je vais à l'école.");
    expect(lesson9Text).toContain("Nous allons à l'université.");
    expect(lesson9Text).toContain('Je vais parler.');
    expect(lesson9Text).toContain('Tu vas être prêt.');
    expect(lesson9Text).toContain('Tu vas où ?');
    expect(lesson9Text).toContain('Elles vont être prêtes.');
    expect(lesson9Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson9.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    const prepositionRows = lesson9.rows.filter((row: any) => row.wordsFr[0].category.startsWith('preposition_a'));
    expect(prepositionRows.length).toBeGreaterThan(0);
    expect(prepositionRows.some((row: any) => row.wordsFr[0].correct === 'à')).toBe(true);

    expect(lesson10.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson10.lessonId).toBe(10);
    expect(lesson10.action).toBe('MERGE_AND_REBUILD');
    expect(lesson10.targetConcepts).toEqual(expect.arrayContaining(['faire']));
    expect(lesson10.targetGrammarFocus).toEqual(expect.arrayContaining(['faire present', 'weather with faire']));
    expect(lesson10.activationApproved).toBe(false);
    expect(lesson10.activeAppSeedAllowed).toBe(false);
    expect(lesson10.rows).toHaveLength(50);

    const lesson10Text = JSON.stringify(lesson10.rows);
    expect(lesson10Text).toContain('Je fais un exercice.');
    expect(lesson10Text).toContain('Vous faites un exercice.');
    expect(lesson10Text).toContain('Il fait beau.');
    expect(lesson10Text).toContain('Il y a du soleil.');
    expect(lesson10Text).toContain('Il pleut.');
    expect(lesson10Text).toContain('Demain, il va faire beau.');
    expect(lesson10Text).toContain('Où faisons-nous l’exercice ?');
    expect(lesson10Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson10.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson11.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson11.lessonId).toBe(11);
    expect(lesson11.action).toBe('MERGE_AND_REBUILD');
    expect(lesson11.targetConcepts).toEqual(expect.arrayContaining(['modals_infinitive']));
    expect(lesson11.targetGrammarFocus).toEqual(
      expect.arrayContaining(['modal pouvoir', 'modal vouloir', 'modal devoir', 'verb + infinitive']),
    );
    expect(lesson11.activationApproved).toBe(false);
    expect(lesson11.activeAppSeedAllowed).toBe(false);
    expect(lesson11.rows).toHaveLength(50);

    const lesson11Text = JSON.stringify(lesson11.rows);
    expect(lesson11Text).toContain('Je peux parler français.');
    expect(lesson11Text).toContain('Je veux étudier maintenant.');
    expect(lesson11Text).toContain('Je dois écouter la leçon.');
    expect(lesson11Text).toContain('Nous savons écrire ce mot.');
    expect(lesson11Text).toContain('Vous devez faire attention.');
    expect(lesson11Text).toContain('Est-ce que tu peux répéter ?');
    expect(lesson11Text).toContain("Qu'est-ce que nous pouvons faire ?");
    expect(lesson11Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson11.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson12.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson12.lessonId).toBe(12);
    expect(lesson12.action).toBe('MERGE_AND_REBUILD');
    expect(lesson12.targetConcepts).toEqual(expect.arrayContaining(['prepositions_place']));
    expect(lesson12.targetGrammarFocus).toEqual(
      expect.arrayContaining(['prepositions of place', 'de / du / de la / des', 'chez', 'dans/sur/a']),
    );
    expect(lesson12.activationApproved).toBe(false);
    expect(lesson12.activeAppSeedAllowed).toBe(false);
    expect(lesson12.rows).toHaveLength(50);

    const lesson12Text = JSON.stringify(lesson12.rows);
    expect(lesson12Text).toContain('Le livre est sur la table.');
    expect(lesson12Text).toContain("L'exercice est dans la leçon.");
    expect(lesson12Text).toContain("L'école est à côté du musée.");
    expect(lesson12Text).toContain("Le sac est à côté de l'ordinateur.");
    expect(lesson12Text).toContain('Les chaises sont en face des tables.');
    expect(lesson12Text).toContain('Je suis chez Marie.');
    expect(lesson12Text).toContain('Je suis à la maison.');
    expect(lesson12Text).toContain('Ils vont aux toilettes.');
    expect(lesson12Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson12.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson13.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson13.lessonId).toBe(13);
    expect(lesson13.action).toBe('MERGE_AND_REBUILD');
    expect(lesson13.targetConcepts).toEqual(expect.arrayContaining(['partitives_food']));
    expect(lesson13.targetGrammarFocus).toEqual(
      expect.arrayContaining(['partitive articles', 'food quantities', 'negative de']),
    );
    expect(lesson13.activationApproved).toBe(false);
    expect(lesson13.activeAppSeedAllowed).toBe(false);
    expect(lesson13.rows).toHaveLength(50);

    const lesson13Text = JSON.stringify(lesson13.rows);
    expect(lesson13Text).toContain('Je mange du pain.');
    expect(lesson13Text).toContain('Je mange de la soupe.');
    expect(lesson13Text).toContain("Je bois de l'eau.");
    expect(lesson13Text).toContain('Nous voulons des pâtes.');
    expect(lesson13Text).toContain("J'achète un kilo de pommes.");
    expect(lesson13Text).toContain('Je ne mange pas de pain.');
    expect(lesson13Text).toContain("Il ne boit pas d'eau.");
    expect(lesson13Text).toContain('Nous achetons des pommes, mais pas de bananes.');
    expect(lesson13Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson13.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson14.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson14.lessonId).toBe(14);
    expect(lesson14.action).toBe('KEEP_WITH_REVIEW');
    expect(lesson14.targetConcepts).toEqual(expect.arrayContaining(['adjectives']));
    expect(lesson14.targetGrammarFocus).toEqual(
      expect.arrayContaining(['adjective position', 'agreement', 'common irregular adjectives']),
    );
    expect(lesson14.activationApproved).toBe(false);
    expect(lesson14.activeAppSeedAllowed).toBe(false);
    expect(lesson14.rows).toHaveLength(50);

    const lesson14Text = JSON.stringify(lesson14.rows);
    expect(lesson14Text).toContain('La chemise est rouge.');
    expect(lesson14Text).toContain('La page est blanche.');
    expect(lesson14Text).toContain('Il est fatigué.');
    expect(lesson14Text).toContain("C'est une grande table.");
    expect(lesson14Text).toContain("C'est un beau manteau.");
    expect(lesson14Text).toContain("C'est un bel homme.");
    expect(lesson14Text).toContain("C'est un nouvel hôtel.");
    expect(lesson14Text).toContain("C'est un vieil ami.");
    expect(lesson14Text).toContain('Ce sont de vieilles maisons.');
    expect(lesson14Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson14.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson15.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson15.lessonId).toBe(15);
    expect(lesson15.action).toBe('KEEP_WITH_REVIEW');
    expect(lesson15.targetConcepts).toEqual(expect.arrayContaining(['possessives_demonstratives']));
    expect(lesson15.targetGrammarFocus).toEqual(
      expect.arrayContaining(['possessive adjectives', 'demonstrative adjectives']),
    );
    expect(lesson15.activationApproved).toBe(false);
    expect(lesson15.activeAppSeedAllowed).toBe(false);
    expect(lesson15.rows).toHaveLength(50);

    const lesson15Text = JSON.stringify(lesson15.rows);
    expect(lesson15Text).toContain("C'est mon père.");
    expect(lesson15Text).toContain("C'est mon amie.");
    expect(lesson15Text).toContain("C'est notre maison.");
    expect(lesson15Text).toContain('Ce sont vos enfants.');
    expect(lesson15Text).toContain('Mon livre est ici.');
    expect(lesson15Text).toContain('Cet homme est prêt.');
    expect(lesson15Text).toContain('Cet hôtel est nouveau.');
    expect(lesson15Text).toContain('Ces livres sont utiles.');
    expect(lesson15Text).toContain('Je choisis ce livre.');
    expect(lesson15Text).toContain('Je choisis ces livres.');
    expect(lesson15Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson15.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson16.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson16.lessonId).toBe(16);
    expect(lesson16.action).toBe('MERGE_AND_REBUILD');
    expect(lesson16.targetConcepts).toEqual(expect.arrayContaining(['reflexive']));
    expect(lesson16.targetGrammarFocus).toEqual(
      expect.arrayContaining(['reflexive verbs present', 'daily routine', 'pronoun placement basics']),
    );
    expect(lesson16.activationApproved).toBe(false);
    expect(lesson16.activeAppSeedAllowed).toBe(false);
    expect(lesson16.rows).toHaveLength(50);

    const lesson16Text = JSON.stringify(lesson16.rows);
    expect(lesson16Text).toContain('Je me lève tôt.');
    expect(lesson16Text).toContain('Nous nous levons tôt.');
    expect(lesson16Text).toContain("Je m'habille vite.");
    expect(lesson16Text).toContain('Je me couche tard.');
    expect(lesson16Text).toContain('Je me brosse les dents.');
    expect(lesson16Text).toContain('Tu te réveilles à sept heures.');
    expect(lesson16Text).toContain('Tu ne te couches pas tard.');
    expect(lesson16Text).toContain('Je vais me coucher.');
    expect(lesson16Text).toContain('Nous allons nous habiller.');
    expect(lesson16Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson16.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson17.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson17.lessonId).toBe(17);
    expect(lesson17.action).toBe('MERGE_AND_REBUILD');
    expect(lesson17.targetConcepts).toEqual(expect.arrayContaining(['imperative']));
    expect(lesson17.targetGrammarFocus).toEqual(
      expect.arrayContaining(['imperative', 'polite commands', 'negative imperative']),
    );
    expect(lesson17.activationApproved).toBe(false);
    expect(lesson17.activeAppSeedAllowed).toBe(false);
    expect(lesson17.rows).toHaveLength(50);

    const lesson17Text = JSON.stringify(lesson17.rows);
    expect(lesson17Text).toContain('Écoute.');
    expect(lesson17Text).toContain('Répète.');
    expect(lesson17Text).toContain('Ouvre le livre.');
    expect(lesson17Text).toContain('Écris le mot.');
    expect(lesson17Text).toContain('Va au tableau.');
    expect(lesson17Text).toContain('Sois prêt.');
    expect(lesson17Text).toContain("Écoutez, s'il vous plaît.");
    expect(lesson17Text).toContain('Tournez à gauche.');
    expect(lesson17Text).toContain('Ne parle pas.');
    expect(lesson17Text).toContain("N'ouvre pas le livre.");
    expect(lesson17Text).toContain('Ne soyez pas en retard.');
    expect(lesson17Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson17.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson18.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson18.lessonId).toBe(18);
    expect(lesson18.action).toBe('BUILD_NEW');
    expect(lesson18.targetConcepts).toEqual(expect.arrayContaining(['object_pronouns']));
    expect(lesson18.targetGrammarFocus).toEqual(
      expect.arrayContaining(['object pronouns le/la/les', 'me/te/nous/vous', 'placement before verb']),
    );
    expect(lesson18.activationApproved).toBe(false);
    expect(lesson18.activeAppSeedAllowed).toBe(false);
    expect(lesson18.rows).toHaveLength(50);

    const lesson18Text = JSON.stringify(lesson18.rows);
    expect(lesson18Text).toContain('Je le vois.');
    expect(lesson18Text).toContain('Je la vois.');
    expect(lesson18Text).toContain("Je l'aperçois.");
    expect(lesson18Text).toContain("Elle l'ouvre.");
    expect(lesson18Text).toContain('Je les lis.');
    expect(lesson18Text).toContain("Il m'appelle.");
    expect(lesson18Text).toContain('Je ne le vois pas.');
    expect(lesson18Text).toContain('Je vais le lire.');
    expect(lesson18Text).toContain("Je peux t'aider.");
    expect(lesson18Text).toContain('Montre-moi le livre.');
    expect(lesson18Text).toContain('Ne les montre pas.');
    expect(lesson18Text).toContain('Je la connais.');
    expect(lesson18Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson18.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson19.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson19.lessonId).toBe(19);
    expect(lesson19.action).toBe('MERGE_AND_REBUILD');
    expect(lesson19.targetConcepts).toEqual(expect.arrayContaining(['passe_compose_avoir']));
    expect(lesson19.targetGrammarFocus).toEqual(
      expect.arrayContaining(['passe compose with avoir', 'regular participles', 'time markers']),
    );
    expect(lesson19.activationApproved).toBe(false);
    expect(lesson19.activeAppSeedAllowed).toBe(false);
    expect(lesson19.rows).toHaveLength(50);

    const lesson19Text = JSON.stringify(lesson19.rows);
    expect(lesson19Text).toContain("J'ai parlé hier.");
    expect(lesson19Text).toContain('Tu as regardé la vidéo hier.');
    expect(lesson19Text).toContain('Nous avons étudié ce matin.');
    expect(lesson19Text).toContain('Ils ont répondu à la question.');
    expect(lesson19Text).toContain("J'ai fait les devoirs.");
    expect(lesson19Text).toContain('Vous avez écrit la phrase.');
    expect(lesson19Text).toContain("Je n'ai pas mangé.");
    expect(lesson19Text).toContain("Elle n'a pas compris.");
    expect(lesson19Text).toContain('Est-ce que tu as vu ?');
    expect(lesson19Text).toContain("Qu'est-ce que tu as fait ?");
    expect(lesson19Text).toContain('La semaine dernière, nous avons pratiqué.');
    expect(lesson19Text).toContain("Ils ont utilisé l'application.");
    expect(lesson19Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson19.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson20.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson20.lessonId).toBe(20);
    expect(lesson20.action).toBe('MOVE_AND_REBUILD');
    expect(lesson20.targetConcepts).toEqual(expect.arrayContaining(['reflexive', 'passe_compose_etre_reflexive']));
    expect(lesson20.targetGrammarFocus).toEqual(
      expect.arrayContaining(['passe compose with etre', 'movement verbs', 'reflexive past']),
    );
    expect(lesson20.activationApproved).toBe(false);
    expect(lesson20.activeAppSeedAllowed).toBe(false);
    expect(lesson20.rows).toHaveLength(50);

    const lesson20Text = JSON.stringify(lesson20.rows);
    expect(lesson20Text).toContain('Je suis allé à la gare.');
    expect(lesson20Text).toContain('Elle est allée à la gare.');
    expect(lesson20Text).toContain('Nous sommes allés à Paris.');
    expect(lesson20Text).toContain('Elles sont allées chez elles.');
    expect(lesson20Text).toContain('Elle est arrivée en avance.');
    expect(lesson20Text).toContain('Elles sont sorties après le cours.');
    expect(lesson20Text).toContain("Ils sont restés à l'hôtel.");
    expect(lesson20Text).toContain('Je me suis réveillé tôt.');
    expect(lesson20Text).toContain("Elle s'est réveillée tôt.");
    expect(lesson20Text).toContain('Nous nous sommes arrêtés à la gare.');
    expect(lesson20Text).toContain('Je ne me suis pas levé tôt.');
    expect(lesson20Text).toContain("Elle ne s'est pas couchée tard.");
    expect(lesson20Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson20.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson21.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson21.lessonId).toBe(21);
    expect(lesson21.action).toBe('MERGE_AND_REBUILD');
    expect(lesson21.targetConcepts).toEqual(expect.arrayContaining(['adjectives', 'irregular_participles']));
    expect(lesson21.targetGrammarFocus).toEqual(
      expect.arrayContaining(['irregular past participles', 'avoir/etre review', 'agreement awareness']),
    );
    expect(lesson21.activationApproved).toBe(false);
    expect(lesson21.activeAppSeedAllowed).toBe(false);
    expect(lesson21.rows).toHaveLength(50);

    const lesson21Text = JSON.stringify(lesson21.rows);
    expect(lesson21Text).toContain("J'ai eu une journée calme.");
    expect(lesson21Text).toContain("Elle a fait l'exercice.");
    expect(lesson21Text).toContain("J'ai pris le train.");
    expect(lesson21Text).toContain("J'ai compris la règle.");
    expect(lesson21Text).toContain("J'ai écrit la phrase.");
    expect(lesson21Text).toContain("Elle a vu le film.");
    expect(lesson21Text).toContain("J'ai dû attendre.");
    expect(lesson21Text).toContain("J'ai reçu le message.");
    expect(lesson21Text).toContain("Elle a ouvert la porte.");
    expect(lesson21Text).toContain('Elle est fatiguée après le voyage.');
    expect(lesson21Text).toContain('Les portes sont ouvertes.');
    expect(lesson21Text).toContain('La leçon est comprise.');
    expect(lesson21Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson21.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson22.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson22.lessonId).toBe(22);
    expect(lesson22.action).toBe('MERGE_AND_REBUILD');
    expect(lesson22.targetConcepts).toEqual(expect.arrayContaining(['imparfait']));
    expect(lesson22.targetGrammarFocus).toEqual(
      expect.arrayContaining(['imparfait introduction', 'habit/background', 'passe compose vs imparfait contrast']),
    );
    expect(lesson22.activationApproved).toBe(false);
    expect(lesson22.activeAppSeedAllowed).toBe(false);
    expect(lesson22.rows).toHaveLength(50);

    const lesson22Text = JSON.stringify(lesson22.rows);
    expect(lesson22Text).toContain("Quand j'étais petit, je jouais dehors.");
    expect(lesson22Text).toContain("J'avais un vélo.");
    expect(lesson22Text).toContain("Chaque été, j'allais à la campagne.");
    expect(lesson22Text).toContain('Il faisait froid.');
    expect(lesson22Text).toContain('Il pleuvait.');
    expect(lesson22Text).toContain('Je lisais quand tu as appelé.');
    expect(lesson22Text).toContain('Il pleuvait quand nous sommes sortis.');
    expect(lesson22Text).toContain("J'étudiais quand la lumière s'est éteinte.");
    expect(lesson22Text).toContain("Avant, je travaillais le samedi ; hier, j'ai dormi.");
    expect(lesson22Text).toContain('Nous devions rentrer tôt.');
    expect(lesson22Text).toContain('Je ne comprenais pas.');
    expect(lesson22Text).toContain("Quand j'étais enfant, je voulais voyager.");
    expect(lesson22Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson22.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson23.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson23.lessonId).toBe(23);
    expect(lesson23.action).toBe('BUILD_NEW');
    expect(lesson23.targetConcepts).toEqual(expect.arrayContaining(['future_simple_si']));
    expect(lesson23.targetGrammarFocus).toEqual(
      expect.arrayContaining(['future proche review', 'simple future introduction', 'si + present/future']),
    );
    expect(lesson23.activationApproved).toBe(false);
    expect(lesson23.activeAppSeedAllowed).toBe(false);
    expect(lesson23.rows).toHaveLength(50);

    const lesson23Text = JSON.stringify(lesson23.rows);
    expect(lesson23Text).toContain('Je vais étudier ce soir.');
    expect(lesson23Text).toContain("J'étudierai demain.");
    expect(lesson23Text).toContain('Je serai prêt.');
    expect(lesson23Text).toContain("J'aurai le temps.");
    expect(lesson23Text).toContain("J'irai à Paris.");
    expect(lesson23Text).toContain('Ils viendront demain.');
    expect(lesson23Text).toContain('Nous pourrons partir.');
    expect(lesson23Text).toContain("S'il pleut, je resterai chez moi.");
    expect(lesson23Text).toContain('Si nous avons le temps, nous visiterons la ville.');
    expect(lesson23Text).toContain('Demain, je t’appellerai.');
    expect(lesson23Text).toContain("Nous n'oublierons pas.");
    expect(lesson23Text).toContain('Si nous finissons tôt, nous sortirons.');
    expect(lesson23Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson23.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson24.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson24.lessonId).toBe(24);
    expect(lesson24.action).toBe('MERGE_AND_REBUILD');
    expect(lesson24.targetConcepts).toEqual(expect.arrayContaining(['adjectives']));
    expect(lesson24.targetGrammarFocus).toEqual(
      expect.arrayContaining(['comparatives', 'superlatives', 'meilleur/mieux']),
    );
    expect(lesson24.activationApproved).toBe(false);
    expect(lesson24.activeAppSeedAllowed).toBe(false);
    expect(lesson24.rows).toHaveLength(50);

    const lesson24Text = JSON.stringify(lesson24.rows);
    expect(lesson24Text).toContain('Ce livre est plus intéressant que celui-là.');
    expect(lesson24Text).toContain("Cette phrase est aussi utile que l'autre.");
    expect(lesson24Text).toContain('Ce plan est meilleur que le premier.');
    expect(lesson24Text).toContain('Ces réponses sont meilleures que les miennes.');
    expect(lesson24Text).toContain("Tu parles mieux qu'avant.");
    expect(lesson24Text).toContain('Ce restaurant est le meilleur du quartier.');
    expect(lesson24Text).toContain('Elle chante le mieux.');
    expect(lesson24Text).toContain('Cette méthode est meilleure.');
    expect(lesson24Text).toContain('Cette méthode fonctionne mieux.');
    expect(lesson24Text).toContain("Il y a plus de monde qu'hier.");
    expect(lesson24Text).toContain("J'aime mieux cette version.");
    expect(lesson24Text).toContain('Il vaut mieux partir maintenant.');
    expect(lesson24Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson24.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson25.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson25.lessonId).toBe(25);
    expect(lesson25.action).toBe('MERGE_AND_REBUILD');
    expect(lesson25.targetConcepts).toEqual(expect.arrayContaining(['y_en_pronouns']));
    expect(lesson25.targetGrammarFocus).toEqual(
      expect.arrayContaining(['pronouns y and en', 'de/a complements', 'quantity reference']),
    );
    expect(lesson25.activationApproved).toBe(false);
    expect(lesson25.activeAppSeedAllowed).toBe(false);
    expect(lesson25.rows).toHaveLength(50);

    const lesson25Text = JSON.stringify(lesson25.rows);
    expect(lesson25Text).toContain("J'y vais.");
    expect(lesson25Text).toContain("J'y pense.");
    expect(lesson25Text).toContain("J'en veux.");
    expect(lesson25Text).toContain('Ils en reviennent.');
    expect(lesson25Text).toContain("J'en viens.");
    expect(lesson25Text).toContain("Elle s'y intéresse.");
    expect(lesson25Text).toContain("Elle s'en souvient.");
    expect(lesson25Text).toContain("Il n'y en a plus.");
    expect(lesson25Text).toContain('Je vais y aller.');
    expect(lesson25Text).toContain("N'en prends pas.");
    expect(lesson25Text).toContain('Pense-y.');
    expect(lesson25Text).toContain("Si tu y vas, je viendrai.");
    expect(lesson25Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson25.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson26.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson26.lessonId).toBe(26);
    expect(lesson26.action).toBe('BUILD_NEW');
    expect(lesson26.targetConcepts).toEqual(expect.arrayContaining(['double_pronouns']));
    expect(lesson26.targetGrammarFocus).toEqual(
      expect.arrayContaining(['double pronoun awareness', 'direct/indirect object contrast']),
    );
    expect(lesson26.activationApproved).toBe(false);
    expect(lesson26.activeAppSeedAllowed).toBe(false);
    expect(lesson26.rows).toHaveLength(50);

    const lesson26Text = JSON.stringify(lesson26.rows);
    expect(lesson26Text).toContain('Je le lui donne.');
    expect(lesson26Text).toContain('Nous les leur envoyons.');
    expect(lesson26Text).toContain('Je te la donne.');
    expect(lesson26Text).toContain('Ils nous l’envoient.');
    expect(lesson26Text).toContain('Nous le lui avons donné.');
    expect(lesson26Text).toContain('Je veux le lui donner.');
    expect(lesson26Text).toContain('Donne-le-lui.');
    expect(lesson26Text).toContain('Ne le lui donne pas.');
    expect(lesson26Text).toContain('Il lui en donne.');
    expect(lesson26Text).toContain("Je l'y mets.");
    expect(lesson26Text).toContain("Elle l'y a laissé.");
    expect(lesson26Text).toContain('Je ne le leur demande pas.');
    expect(lesson26Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson26.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson27.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson27.lessonId).toBe(27);
    expect(lesson27.action).toBe('MERGE_AND_REBUILD');
    expect(lesson27.targetConcepts).toEqual(expect.arrayContaining(['relative_basic']));
    expect(lesson27.targetGrammarFocus).toEqual(
      expect.arrayContaining(['relative pronouns qui/que/ou', 'que elision']),
    );
    expect(lesson27.activationApproved).toBe(false);
    expect(lesson27.activeAppSeedAllowed).toBe(false);
    expect(lesson27.rows).toHaveLength(50);

    const lesson27Text = JSON.stringify(lesson27.rows);
    expect(lesson27Text).toContain('La personne qui parle est mon professeur.');
    expect(lesson27Text).toContain('La personne que je connais est ici.');
    expect(lesson27Text).toContain("La réponse qu'elle donne est claire.");
    expect(lesson27Text).toContain("La ville où j'habite est grande.");
    expect(lesson27Text).toContain("L'année où j'ai appris le français était difficile.");
    expect(lesson27Text).toContain("L'homme qui attend est mon père.");
    expect(lesson27Text).toContain("L'homme qu'elle attend est en retard.");
    expect(lesson27Text).toContain("L'ami qui m'appelle est drôle.");
    expect(lesson27Text).toContain("L'ami que j'appelle est occupé.");
    expect(lesson27Text).toContain("L'endroit où nous nous sommes arrêtés est beau.");
    expect(lesson27Text).toContain("L'objet qu'il ouvre est fragile.");
    expect(lesson27Text).toContain("L'hôtel où ils restent est calme.");
    expect(lesson27Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson27.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson28.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson28.lessonId).toBe(28);
    expect(lesson28.action).toBe('MOVE_AND_REBUILD');
    expect(lesson28.targetConcepts).toEqual(expect.arrayContaining(['avoir', 'relative_dont']));
    expect(lesson28.targetGrammarFocus).toEqual(
      expect.arrayContaining(['relative dont', 'de-linked relatives', 'possession/need links']),
    );
    expect(lesson28.activationApproved).toBe(false);
    expect(lesson28.activeAppSeedAllowed).toBe(false);
    expect(lesson28.rows).toHaveLength(50);

    const lesson28Text = JSON.stringify(lesson28.rows);
    expect(lesson28Text).toContain('La personne dont je parle est mon voisin.');
    expect(lesson28Text).toContain("Le livre dont j'ai besoin est sur la table.");
    expect(lesson28Text).toContain('Le sujet dont nous discutons est important.');
    expect(lesson28Text).toContain("L'homme dont le frère travaille ici est gentil.");
    expect(lesson28Text).toContain('Le livre dont la couverture est bleue est nouveau.');
    expect(lesson28Text).toContain("J'ai trois amis, dont deux parlent français.");
    expect(lesson28Text).toContain('La clé dont tu as besoin est ici.');
    expect(lesson28Text).toContain("Le bruit dont l'enfant a peur vient de la rue.");
    expect(lesson28Text).toContain('Le résultat dont je suis content est clair.');
    expect(lesson28Text).toContain('Le livre qui est sur la table est à moi.');
    expect(lesson28Text).toContain('Le livre que je lis est court.');
    expect(lesson28Text).toContain("L'idée dont tu parles est utile.");
    expect(lesson28Text).toContain("Le sac dont j'ai besoin est léger.");
    expect(lesson28Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson28.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson29.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson29.lessonId).toBe(29);
    expect(lesson29.action).toBe('MERGE_AND_REBUILD');
    expect(lesson29.targetConcepts).toEqual(expect.arrayContaining(['conditionnel']));
    expect(lesson29.targetGrammarFocus).toEqual(
      expect.arrayContaining(['conditionnel present', 'polite requests', 'advice']),
    );
    expect(lesson29.activationApproved).toBe(false);
    expect(lesson29.activeAppSeedAllowed).toBe(false);
    expect(lesson29.rows).toHaveLength(50);

    const lesson29Text = JSON.stringify(lesson29.rows);
    expect(lesson29Text).toContain("Je voudrais un café, s'il vous plaît.");
    expect(lesson29Text).toContain("J'aimerais parler avec le professeur.");
    expect(lesson29Text).toContain("Pourriez-vous m'aider, s'il vous plaît ?");
    expect(lesson29Text).toContain('Tu devrais te reposer.');
    expect(lesson29Text).toContain('Je prendrais le train.');
    expect(lesson29Text).toContain("J'aurais le temps demain.");
    expect(lesson29Text).toContain("Si j'avais le temps, je viendrais.");
    expect(lesson29Text).toContain('Si tu étais libre, que ferais-tu ?');
    expect(lesson29Text).toContain("J'aimerais poser une question.");
    expect(lesson29Text).toContain('Il vaudrait mieux commencer maintenant.');
    expect(lesson29Text).toContain('Serait-il possible de payer par carte ?');
    expect(lesson29Text).toContain('Je vous serais très reconnaissant.');
    expect(lesson29Text).toContain("Pourriez-vous m'envoyer l'adresse ?");
    expect(lesson29Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson29.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson30.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson30.lessonId).toBe(30);
    expect(lesson30.action).toBe('BUILD_NEW');
    expect(lesson30.targetConcepts).toEqual(expect.arrayContaining(['subjunctive_awareness']));
    expect(lesson30.targetGrammarFocus).toEqual(
      expect.arrayContaining(['subjunctive awareness', 'il faut que', 'wishes/necessity']),
    );
    expect(lesson30.activationApproved).toBe(false);
    expect(lesson30.activeAppSeedAllowed).toBe(false);
    expect(lesson30.rows).toHaveLength(50);

    const lesson30Text = JSON.stringify(lesson30.rows);
    expect(lesson30Text).toContain('Il faut que je parle avec le professeur.');
    expect(lesson30Text).toContain("Il faut que j'aille à la banque.");
    expect(lesson30Text).toContain('Il faut que tu sois prudent.');
    expect(lesson30Text).toContain('Il faut que nous fassions le travail.');
    expect(lesson30Text).toContain('Faut-il que je prenne le train ?');
    expect(lesson30Text).toContain('Je veux que tu viennes demain.');
    expect(lesson30Text).toContain("J'aimerais que vous m'appeliez par mon prénom.");
    expect(lesson30Text).toContain('Il faut que les enfants fassent leurs devoirs.');
    expect(lesson30Text).toContain('Il est dommage qu’elle ne puisse pas venir.');
    expect(lesson30Text).toContain('Je ne pense pas qu’il vienne.');
    expect(lesson30Text).toContain('Je pense qu’il vient.');
    expect(lesson30Text).toContain('Je ne crois pas qu’elle ait raison.');
    expect(lesson30Text).toContain('Il n’est pas certain qu’il vienne.');
    expect(lesson30Text).toContain('Je te donne les clés pour que tu puisses entrer.');
    expect(lesson30Text).toContain("Il faut que j'aie mon passeport.");
    expect(lesson30Text).toContain('Il faut que nous sachions la vérité.');
    expect(lesson30Text).toContain('Il faut qu’elles aient le temps.');
    expect(lesson30Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson30.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson31.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson31.lessonId).toBe(31);
    expect(lesson31.action).toBe('KEEP_WITH_REVIEW');
    expect(lesson31.targetConcepts).toEqual(expect.arrayContaining(['faire_causative']));
    expect(lesson31.targetGrammarFocus).toEqual(
      expect.arrayContaining(['faire causative', 'laisser + infinitive', 'advanced verb chains']),
    );
    expect(lesson31.activationApproved).toBe(false);
    expect(lesson31.activeAppSeedAllowed).toBe(false);
    expect(lesson31.rows).toHaveLength(50);

    const lesson31Text = JSON.stringify(lesson31.rows);
    expect(lesson31Text).toContain('Je fais réparer la voiture.');
    expect(lesson31Text).toContain('Je vais faire faire une clé.');
    expect(lesson31Text).toContain('Nous avons fait envoyer le colis.');
    expect(lesson31Text).toContain('Je fais tondre le gazon à mon fils.');
    expect(lesson31Text).toContain('Je le fais réparer.');
    expect(lesson31Text).toContain("Je l'ai fait réparer hier.");
    expect(lesson31Text).toContain('Je le lui fais lire.');
    expect(lesson31Text).toContain('Je me fais couper les cheveux.');
    expect(lesson31Text).toContain('Ils se sont fait critiquer.');
    expect(lesson31Text).toContain('Laisse-moi étudier.');
    expect(lesson31Text).toContain('Ne les laisse pas partir.');
    expect(lesson31Text).toContain('Nous les laissons travailler tranquillement.');
    expect(lesson31Text).toContain('Je fais faire le travail.');
    expect(lesson31Text).toContain('Elle fait réparer le téléphone.');
    expect(lesson31Text).toContain("Il laisse lire l'enfant.");
    expect(lesson31Text).toContain('Ils vont faire traduire les documents.');
    expect(lesson31Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson31.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(lesson32.schemaVersion).toBe('gustav-french-lesson-row-ledger-v1-candidate');
    expect(lesson32.lessonId).toBe(32);
    expect(lesson32.action).toBe('KEEP_WITH_REVIEW');
    expect(lesson32.targetConcepts).toEqual(expect.arrayContaining(['mixed_review']));
    expect(lesson32.targetGrammarFocus).toEqual(
      expect.arrayContaining(['mixed review', 'dialogue integration', 'exam readiness', 'targeted weak spots']),
    );
    expect(lesson32.activationApproved).toBe(false);
    expect(lesson32.activeAppSeedAllowed).toBe(false);
    expect(lesson32.rows).toHaveLength(50);

    const lesson32Text = JSON.stringify(lesson32.rows);
    expect(lesson32Text).toContain("Pourriez-vous répéter plus lentement, s'il vous plaît ?");
    expect(lesson32Text).toContain('Il faut que je fasse réparer mon téléphone.');
    expect(lesson32Text).toContain('Le problème dont je parle est urgent.');
    expect(lesson32Text).toContain('Je le lui donne.');
    expect(lesson32Text).toContain('Quand je suis arrivé, elle attendait déjà.');
    expect(lesson32Text).toContain('Je fais traduire les documents.');
    expect(lesson32Text).toContain('Je ne le connais pas.');
    expect(lesson32Text).toContain('Le garçon dont les parents sont ici est calme.');
    expect(lesson32Text).toContain('Il est important que vous répondiez.');
    expect(lesson32Text).toContain('Je pense qu’il a raison.');
    expect(lesson32Text).toContain('Je ne pense pas qu’il ait raison.');
    expect(lesson32Text).toContain("Si j'avais plus de temps, je pratiquerais davantage.");
    expect(lesson32Text).toContain("J'ai commencé hier, mais j'étais fatigué.");
    expect(lesson32Text).toContain('Elle nous laisse choisir la date.');
    expect(lesson32Text).toContain("C'est ce dont j'ai peur.");
    expect(lesson32Text).toContain("Avant de partir, j'ai vérifié l'adresse.");
    expect(lesson32Text).toContain("Révision finale : j'aimerais que tu me l'envoies.");
    expect(lesson32Text).toContain("Révision finale : si c'est prêt, envoie-le-nous.");
    expect(lesson32Text).not.toMatch(MOJIBAKE_RE);

    for (const row of lesson32.rows) {
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.wordsFr[0].distractors).toHaveLength(3);
      expect(row.wordsFr[0].distractors).not.toContain(row.wordsFr[0].correct);
      expect(row.evidenceClaimIds).toEqual(expect.arrayContaining(['tv5monde_grammar', 'le_robert_conjugation']));
      expect(row.activationStatus).toBe('blocked');
    }

    expect(audit.ledgers.map((item: any) => item.lessonId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
    ]);
    expect(audit.ledgers.map((item: any) => item.rowCount)).toEqual([
      50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50,
    ]);
    expect(audit.nextRequiredLedgers).toEqual([]);
    expect(audit.preRebuildReconciliationRequiredLedgers).toHaveLength(audit.reconciliationSummary.rebuildRequired);
    expect(audit.preRebuildReconciliationRequiredLedgers.map((item: any) => item.lessonId)).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8]),
    );
    expect(audit.reconciliationRequiredLedgers).toEqual([]);
    expect(audit.nextRequiredGates).toEqual(
      expect.arrayContaining([
        'llm_source_review_gate',
        'audio_manifest_gate',
        'server_pack_gate',
        'runtime_loader_gate',
      ]),
    );
    expect(audit.nextRequiredGates).not.toContain('scope_sequence_reconciliation_gate');
  });
});
