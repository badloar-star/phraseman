import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const TAXONOMY_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_mistake_taxonomy_candidate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_mistake_taxonomy_candidate_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_personal_practice_mistake_taxonomy_candidate.mjs');

describe('Gustav French personal practice mistake taxonomy candidate', () => {
  it('materializes a French-native mistake taxonomy for all 56 personal-practice slots without opening runtime or activation', () => {
    const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('English ids remain product-shape evidence only');
    expect(script).toContain('mustKeepRuUkExplanationsSeparate: true');
    expect(script).toContain('mustNotUseEnglishAsFallbackContent: true');
    expect(script).toContain('activationApproved: false');

    expect(taxonomy.schemaVersion).toBe('gustav-fr-personal-practice-mistake-taxonomy-candidate-v1');
    expect(taxonomy.status).toBe('HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW');
    expect(taxonomy.studyTarget).toBe('fr');
    expect(taxonomy.sourceStudyTarget).toBe('en');
    expect(taxonomy.sourceLocales).toEqual(['ru', 'uk']);
    expect(taxonomy.activationApproved).toBe(false);
    expect(taxonomy.rows).toHaveLength(56);

    expect(taxonomy.rows[0]).toMatchObject({
      schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-row-v1',
      taxonomyIndex: 1,
      sourceNativeBankSlotIndex: 1,
      sourceEnglishTrainingId: 'article_a_an',
      frenchTrainingId: 'fr_partitive_indefinite_articles',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      aiOutputLang: 'fr',
      sourceLocales: ['ru', 'uk'],
      mistakeId: 'fr_mistake_partitive_indefinite_articles',
      promptIds: [
        'fr_prompt_partitive_indefinite_articles_ru',
        'fr_prompt_partitive_indefinite_articles_uk',
      ],
      mistakeFamily: 'articles_determiners',
      reviewStatus: 'candidate_requires_llm_trusted_source_review',
    });

    for (const row of taxonomy.rows) {
      expect(row.frenchTrainingId).not.toBe(row.sourceEnglishTrainingId);
      expect(row.mistakeId.startsWith('fr_mistake_')).toBe(true);
      expect(row.mistakeId).not.toBe(row.sourceEnglishTrainingId);
      expect(row.promptIds.some((id: string) => id.endsWith('_ru'))).toBe(true);
      expect(row.promptIds.some((id: string) => id.endsWith('_uk'))).toBe(true);
      expect(row.feedbackContract).toMatchObject({
        answerLanguage: 'fr',
        explanationLocales: ['ru', 'uk'],
        mustKeepRuUkExplanationsSeparate: true,
        mustKeepTargetAnswersFrenchOnly: true,
        mustNotUseEnglishAsFallbackContent: true,
        mustCiteTrustedSourceIds: true,
      });
      expect(row.safety).toMatchObject({
        candidateOnly: true,
        appBundleModified: false,
        serverUploadAllowed: false,
        runtimeApplyAllowed: false,
        activationApproved: false,
      });
    }

    expect(audit.schemaVersion).toBe('gustav-fr-personal-practice-mistake-taxonomy-candidate-gate-v1');
    expect(audit.status).toBe('HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW');
    expect(audit.summary).toMatchObject({
      bankRows: 56,
      taxonomyRows: 56,
      duplicateMistakeIds: 0,
      duplicatePromptIds: 0,
      rowsWithMissingBankLink: 0,
      rowsWithMissingMistakeId: 0,
      rowsWithMissingRuPromptId: 0,
      rowsWithMissingUkPromptId: 0,
      rowsWithEnglishIdReuse: 0,
      rowsWithUnsafeFlags: 0,
      readyForLlmTrustedSourceReview: true,
      readyForImport: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    });
    expect(audit.blockers).toEqual([]);
    expect(audit.productionHoldsRemaining).toEqual(expect.arrayContaining([
      'french_personal_practice_mistake_taxonomy_llm_review',
      'ru_uk_personal_practice_prompt_review',
      'server_upload_and_runtime_apply_approval',
    ]));
  });
});
