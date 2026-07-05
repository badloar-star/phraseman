import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const BRAIN_PATH = path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
const SOURCE_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const BUILDERS_PATH = path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TARGET_CONTENT_BUILDERS_CONTRACT.md');
const DECISION_PROGRESS_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'reviewer',
  'fr_lesson_llm_review_decision_progress_gate_audit_v1.json',
);
const ACTIVATION_COMPLETION_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'activation',
  'fr_activation_completion_audit_v2.json',
);

describe('Gustav trusted brain contract', () => {
  it('requires deep reasoning and trusted sources before French content can leave HOLD', () => {
    const brain = fs.readFileSync(BRAIN_PATH, 'utf8');
    const sources = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    const builders = fs.readFileSync(BUILDERS_PATH, 'utf8');
    const decisionProgress = JSON.parse(fs.readFileSync(DECISION_PROGRESS_PATH, 'utf8'));
    const activationCompletion = JSON.parse(fs.readFileSync(ACTIVATION_COMPLETION_PATH, 'utf8'));

    expect(brain).toContain('Gustav production-language work requires `reasoningLevel=deep` by default.');
    expect(brain).toContain('`maximum_extended_reasoning`');
    expect(brain).toMatch(/combined app architect, target-language curriculum\s+designer, prompt engineer/);
    expect(brain).toContain('Use `reasoningLevel=deep` for every production-language decision');
    expect(brain).toContain('Research-First Rule');
    expect(brain).toContain('Copy/Do-Not-Copy Rule');
    expect(brain).toContain('App-Atlas-First Brain Rule');
    expect(brain).toContain('French-Unique Curriculum Rule');
    expect(brain).toContain('English as a product-shape reference, not as a');
    expect(brain).toContain('Every continuation pass must begin by selecting one large pass objective');
    expect(brain).toContain('Feature Parity Matrix has no `BLOCK` or `HOLD` rows');

    expect(sources.schemaVersion).toBe('gustav-trusted-source-library-v1');
    expect(sources.studyTarget).toBe('fr');
    expect(sources.reasoningLevelRequired).toBe('deep');
    expect(sources.reasoningContract.productionLanguageDefault).toBe('maximum_extended_reasoning');
    expect(sources.reasoningContract.cannotApproveWith).toEqual(expect.arrayContaining([
      'standard',
      'normal',
      'fast',
      'high',
      'unspecified',
    ]));
    expect(sources.reasoningContract.mustUseDeepFor).toEqual(expect.arrayContaining([
      'app_atlas_mapping',
      'curriculum_order',
      'content_generation',
      'trusted_source_evidence_mapping',
      'ai_prompt_porting',
      'server_runtime_storage_cloud_admin_activation',
      'language_isolation',
    ]));
    expect(sources.sources.length).toBeGreaterThanOrEqual(10);

    const sourceIds = new Set(sources.sources.map((source: any) => source.id));
    for (const required of [
      'coe_cefr_companion_2020',
      'tv5monde_grammar',
      'cambridge_french_english_dictionary',
      'academie_francaise_dictionary_9e',
      'alliance_francaise_paris_courses',
      'le_robert_dictionary',
      'le_robert_conjugation',
      'collins_english_french_dictionary',
      'wordreference_english_french_dictionary',
      'phraseman_english_feature_atlas',
      'phraseman_admin_parity_atlas',
    ]) {
      expect(sourceIds.has(required)).toBe(true);
    }

    expect(sources.requiredForPass.vocabulary_bank).toEqual(expect.arrayContaining([
      'le_robert_dictionary',
      'cambridge_french_english_dictionary',
    ]));
    expect(sources.requiredForPass.translation_cross_check).toEqual(expect.arrayContaining([
      'cambridge_french_english_dictionary',
      'collins_english_french_dictionary',
      'wordreference_english_french_dictionary',
    ]));

    expect(operator).toContain('GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
    expect(operator).toContain('trusted_sources/fr_trusted_sources.json');
    expect(operator).toContain('scripts/gustav_validate_trusted_brain.mjs');
    expect(operator).toContain('No blind translation');
    expect(operator).toContain('reasoningLevel=deep');
    expect(state.languages.fr.reasoningLevelRequired).toBe('deep');
    expect(state.languages.fr.reasoningLevelContract.defaultForProductionLanguageWork).toBe('deep_extended_reasoning');
    expect(state.languages.fr.reasoningLevelContract.mustEscalateToMaximumFor).toEqual(expect.arrayContaining([
      'target_language_curriculum_ordering',
      'language_specific_content_generation_rules',
      'trusted_source_research_and_evidence_mapping',
      'llm_official_source_review_decisions',
      'prompt_porting_for_ai_explanations_mistake_review_dialogues_arena_and_practice',
      'server_runtime_storage_cloud_admin_activation_gates',
      'any_change_that_could_mix_studyTarget_sourceLocale_uiLocale_cache_cloud_or_prompts',
    ]));
    expect(state.languages.fr.trustedBrain).toBe('docs/gustav/GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
    expect(state.largePassContract).toMatchObject({
      mode: 'large_objective_per_continuation',
      reasoningLevel: 'deep',
      requiresNextPassPlan: true,
    });
    for (const key of ['decisionRows', 'validDecisionRows', 'missingDecisionRows', 'nextResumeStartIndex']) {
      expect(state.languages.fr.lessonLlmReviewDecisionProgressSummary[key]).toBe(decisionProgress.summary[key]);
    }
    for (const key of ['decisionRows', 'missingDecisionRows', 'acceptedRows', 'requirementsPassed', 'hardBlockersTotal']) {
      expect(state.languages.fr.activationCompletionSummary[key]).toBe(activationCompletion.summary[key]);
    }
    expect(state.nextActions[0]).toEqual(expect.stringContaining(`from_${decisionProgress.summary.nextResumeStartIndex}`));
    expect(new Set(state.nextActions.slice(0, 5)).size).toBe(Math.min(state.nextActions.length, 5));
    expect(builders).toContain('Every production-language builder requires `reasoningLevel=deep`');
    expect(builders).toContain('`arena_question_builder`');
    expect(builders).toContain('`collectible_card_builder`');
    expect(builders).toContain('`audio_tts_manifest_builder`');
    expect(builders).toContain('Surface-specific verifiers are required');
  });
});
