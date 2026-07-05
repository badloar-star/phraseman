import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_full_review_draft.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_full_review_draft.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_review_draft.mjs');

describe('Gustav French lesson 1 full review draft', () => {
  it('creates a readable no-apply draft with 50 French-native rows, wordsFr, distractors, theory, and sources', () => {
    const draft = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('validateDraft');
    expect(script).toContain('sourceEvidence');
    expect(script).toContain('productionApplyApproved: false');

    expect(draft.schemaVersion).toBe('gustav-fr-lesson01-full-review-draft-v2');
    expect(draft.status).toBe('REVIEW_DRAFT_HOLD');
    expect(draft.studyTarget).toBe('fr');
    expect(draft.lessonId).toBe(1);
    expect(draft.appCourseLevel).toBe('A1');
    expect(draft.activationApproved).toBe(false);
    expect(draft.readyForApply).toBe(false);
    expect(draft.validation).toMatchObject({
      status: 'PASS',
      rowCount: 50,
    });
    expect(draft.validation.wordsFrSlots).toBeGreaterThan(100);
    expect(draft.rows).toHaveLength(50);

    for (const row of draft.rows) {
      expect(row.wordsFr.length).toBeGreaterThan(0);
      expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(row.french)).toBe(false);
      expect(/[�ÃÐÑÒ]/u.test(row.french)).toBe(false);
      expect(/[�ÃÐÑÒ]/u.test(row.russian)).toBe(false);
      expect(/[�ÃÐÑÒ]/u.test(row.ukrainian)).toBe(false);
      for (const word of row.wordsFr) {
        expect(word.distractors).toHaveLength(5);
        expect(word.distractors.map((item: string) => item.toLowerCase())).not.toContain(word.correct.toLowerCase());
        expect(word.distractors.some((item: string) => /[А-Яа-яЁёІіЇїЄєҐґ]/.test(item))).toBe(false);
        expect(word.distractors.some((item: string) => /[�ÃÐÑÒ]/u.test(item))).toBe(false);
      }
    }

    const allFrenchText = [
      ...draft.rows.map((row: { french: string }) => row.french),
      ...draft.rows.flatMap((row: { wordsFr: Array<{ text: string; correct: string; distractors: string[] }> }) =>
        row.wordsFr.flatMap((word) => [word.text, word.correct, ...word.distractors]),
      ),
    ].join('\n');
    for (const forbidden of ['A bientot', 'S il', 'm appelle', 't appelles', 'c est', 'C est', 'francais', 'francaise', 'etudiant', 'etudiante', 'etes', 'pret', 'Tu es la.', 'Elle est la.', 'J habite a']) {
      expect(allFrenchText).not.toContain(forbidden);
    }

    expect(draft.rows[0]).toMatchObject({
      phraseId: 'fr_lesson1_phrase_001',
      french: 'Bonjour.',
    });
    expect(draft.rows[4]).toMatchObject({
      phraseId: 'fr_lesson1_phrase_005',
      french: 'À bientôt.',
    });
    expect(draft.rows[7]).toMatchObject({
      phraseId: 'fr_lesson1_phrase_008',
      french: "S'il vous plaît.",
    });
    expect(draft.rows[14]).toMatchObject({
      phraseId: 'fr_lesson1_phrase_015',
      french: "Je m'appelle Marie.",
    });
    expect(draft.rows[31]).toMatchObject({
      phraseId: 'fr_lesson1_phrase_032',
      french: "J'habite à Lyon.",
    });
    expect(draft.rows[49]).toMatchObject({
      phraseId: 'fr_lesson1_phrase_050',
      french: 'Je suis prêt.',
    });

    expect(draft.sourceEvidence.map((source: { id: string }) => source.id)).toEqual(expect.arrayContaining([
      'coe_cefr_a1_global_scale',
      'tv5monde_introducing_yourself',
      'tv5monde_greetings_a1',
      'le_robert_etre_present',
    ]));
    expect(draft.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });

    expect(markdown).toContain('# French Lesson 1 Full Review Draft');
    expect(markdown).toContain('## Theory Draft');
    expect(markdown).toContain('### 01. Bonjour.');
    expect(markdown).toContain("Je m'appelle ... / Moi, c'est ...");
    expect(markdown).toContain('### 50. Je suis prêt.');
  });
});
