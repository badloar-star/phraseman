import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const BANK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_native_bank_candidate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice', 'fr_personal_practice_native_bank_candidate_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_personal_practice_native_bank_candidate.mjs');

describe('Gustav French personal practice native bank candidate', () => {
  it('materializes 56 French-native practice slots without opening runtime or activation', () => {
    const bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('mayUseEnglishTrainingAsShapeOnly: true');
    expect(script).toContain('mayTranslateEnglishTrainingText: false');
    expect(script).toContain('mustKeepRuUkExplanationsSeparate: true');
    expect(script).toContain('activationApproved: false');

    expect(bank.schemaVersion).toBe('gustav-fr-personal-practice-native-bank-candidate-v1');
    expect(bank.status).toBe('HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW');
    expect(bank.studyTarget).toBe('fr');
    expect(bank.sourceStudyTarget).toBe('en');
    expect(bank.sourceLocales).toEqual(['ru', 'uk']);
    expect(bank.activationApproved).toBe(false);
    expect(bank.rows).toHaveLength(56);

    expect(bank.rows[0]).toMatchObject({
      schemaVersion: 'gustav-fr-personal-practice-native-bank-row-v1',
      slotIndex: 1,
      sourceEnglishTrainingId: 'article_a_an',
      frenchTrainingId: 'fr_partitive_indefinite_articles',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      aiOutputLang: 'fr',
      sourceLocales: ['ru', 'uk'],
      candidateStatus: 'candidate_requires_llm_trusted_source_review',
    });
    expect(bank.rows[0].generationContract).toMatchObject({
      mayUseEnglishTrainingAsShapeOnly: true,
      mayTranslateEnglishTrainingText: false,
      mustUseFrenchNativeGrammar: true,
      mustCiteTrustedSourceIds: true,
      mustKeepRuUkExplanationsSeparate: true,
      mustKeepTargetAnswersFrenchOnly: true,
    });

    for (const row of bank.rows) {
      expect(row.frenchTrainingId).not.toBe(row.sourceEnglishTrainingId);
      expect(row.frenchTrainingId.startsWith('fr_')).toBe(true);
      expect(row.sourceEvidenceIds.length).toBeGreaterThanOrEqual(3);
      expect(row.requiredTrainingShape).toMatchObject({
        introBlocksMin: 2,
        stepsMin: 4,
        answerLanguage: 'fr',
        explanationLocales: ['ru', 'uk'],
        smartTrainerRequired: true,
      });
      expect(row.safety).toMatchObject({
        candidateOnly: true,
        appBundleModified: false,
        serverUploadAllowed: false,
        runtimeApplyAllowed: false,
        activationApproved: false,
      });
    }

    expect(audit.schemaVersion).toBe('gustav-fr-personal-practice-native-bank-candidate-gate-v1');
    expect(audit.status).toBe('HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW');
    expect(audit.summary).toMatchObject({
      englishBlueprintRows: 56,
      frenchBankCandidateRows: 56,
      duplicateFrenchTrainingIds: 0,
      rowsWithEnglishIdReuse: 0,
      rowsMissingSources: 0,
      rowsWithUnsafeFlags: 0,
      readyForLlmTrustedSourceReview: true,
      readyForImport: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    });
    expect(audit.blockers).toEqual([]);
    expect(audit.productionHoldsRemaining).toEqual(expect.arrayContaining([
      'french_personal_practice_native_bank_llm_review',
      'french_personal_practice_mistake_taxonomy_llm_review',
      'ru_uk_personal_practice_prompt_review',
      'server_upload_and_runtime_apply_approval',
    ]));
    expect(audit.safety).toMatchObject({
      candidateOnly: true,
      appBundleModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      serverUploadAllowed: false,
      runtimeApplyAllowed: false,
      adminWritesOpened: false,
      audioGenerated: false,
      activationApproved: false,
    });
  });
});
