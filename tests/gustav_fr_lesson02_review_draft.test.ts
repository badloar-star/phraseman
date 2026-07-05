import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson02_full_review_draft.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson02_full_review_draft.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson02_review_draft.mjs');

describe('Gustav French lesson 2 full review draft', () => {
  it('creates a no-apply A1 French-native negation/question draft with 50 rows and slot distractors', () => {
    const draft = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('READY_FOR_LESSON02_REVIEW_DRAFT');
    expect(script).toContain("frenchNativeScope: ['ne ... pas'");
    expect(script).toContain('Est-ce que');
    expect(script).toContain('productionApplyApproved: false');

    expect(draft.schemaVersion).toBe('gustav-fr-lesson02-full-review-draft-v1');
    expect(draft.status).toBe('REVIEW_DRAFT_HOLD');
    expect(draft.studyTarget).toBe('fr');
    expect(draft.targetContentLang).toBe('fr');
    expect(draft.sourceLocales).toEqual(['ru', 'uk']);
    expect(draft.lessonId).toBe(2);
    expect(draft.appCourseLevel).toBe('A1');
    expect(draft.internalFrenchBand).toBe('A1.1');
    expect(draft.activationApproved).toBe(false);
    expect(draft.readyForApply).toBe(false);
    expect(draft.validation).toMatchObject({
      status: 'PASS',
      rowCount: 50,
      wordsFrSlots: 188,
      negationRows: 26,
      questionRows: 27,
    });
    expect(draft.rows).toHaveLength(50);
    expect(new Set(draft.rows.map((row: { french: string }) => row.french)).size).toBe(50);

    for (const row of draft.rows) {
      expect(row.lessonId).toBe(2);
      expect(row.wordsFr.length).toBeGreaterThanOrEqual(2);
      expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(row.french)).toBe(false);
      expect(/[�ÃÐÑÒ]/u.test(row.french + row.russian + row.ukrainian)).toBe(false);
      for (const word of row.wordsFr) {
        expect(word.text).toBeTruthy();
        expect(word.correct).toBe(word.text);
        expect(word.distractors).toHaveLength(5);
        expect(new Set(word.distractors.map((item: string) => item.toLowerCase())).size).toBe(5);
        expect(word.distractors.map((item: string) => item.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase())).not.toContain(
          word.correct.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(),
        );
        expect(word.distractors.some((item: string) => /[А-Яа-яЁёІіЇїЄєҐґ]/.test(item))).toBe(false);
        expect(word.distractors.some((item: string) => /[�ÃÐÑÒ]/u.test(item))).toBe(false);
      }
    }

    expect(draft.rows[0]).toMatchObject({
      phraseId: 'fr_lesson2_phrase_001',
      french: 'Je ne suis pas prêt.',
    });
    expect(draft.rows[20]).toMatchObject({
      phraseId: 'fr_lesson2_phrase_021',
      french: 'Est-ce que tu es prêt ?',
    });
    expect(draft.rows[22]).toMatchObject({
      phraseId: 'fr_lesson2_phrase_023',
      french: "Est-ce qu'il est ici ?",
    });
    expect(draft.rows[31]).toMatchObject({
      phraseId: 'fr_lesson2_phrase_032',
      french: 'Vous êtes prêts ?',
    });
    expect(draft.rows[49]).toMatchObject({
      phraseId: 'fr_lesson2_phrase_050',
      french: "Est-ce que c'est ton ami ?",
    });

    const allFrench = draft.rows.flatMap((row: any) => [
      row.french,
      ...row.wordsFr.flatMap((word: any) => [word.text, word.correct, ...word.distractors]),
    ]).join('\n');
    for (const forbidden of ['etes', 'pret', 'francais', 'etudiant', ' a Lyon', 'Tu es la', 'Elle est la']) {
      expect(allFrench).not.toContain(forbidden);
    }

    expect(draft.sourceEvidence.map((source: { id: string }) => source.id)).toEqual(expect.arrayContaining([
      'coe_cefr_a1_global_scale',
      'tv5monde_negation',
      'tv5monde_answering_negative_question',
      'le_robert_etre_present',
      'lawless_est_ce_que',
    ]));
    expect(draft.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('# French Lesson 2 Full Review Draft');
    expect(markdown).toContain('### 01. Je ne suis pas prêt.');
    expect(markdown).toContain("### 23. Est-ce qu'il est ici ?");
    expect(markdown).toContain("### 50. Est-ce que c'est ton ami ?");
  });
});
