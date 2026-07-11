import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'ai_prompts', 'fr_ai_prompt_parity_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_ai_prompt_parity_gate.mjs');
const PREMIUM_DIALOG_PATH = path.join(ROOT, 'functions', 'src', 'premium_dialog.ts');

describe('Gustav French AI prompt parity gate', () => {
  it('proves French AI prompt/cache/language guards are locally ready while activation stays closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const premiumDialog = fs.readFileSync(PREMIUM_DIALOG_PATH, 'utf8');

    expect(script).toContain('translation_cache_key_includes_source_study_target');
    expect(script).toContain('rejected_fresh_text_not_returned');
    expect(script).toContain('cached_generation_rechecked_before_return');

    expect(gate.schemaVersion).toBe('gustav-fr-ai-prompt-parity-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      surfacesChecked: 8,
      surfacesPassing: 8,
      failedSurfaces: 0,
      placeholderHitFiles: 0,
      mojibakeHitFiles: 0,
      activationApproved: false,
      globalFrenchStillHold: true,
    });
    expect(gate.summary.outputLangGuardedSurfaces).toEqual([
      'explain',
      'choice',
      'quiz',
      'mistake_explain',
      'weekly_review',
      'stats_insights',
      'premium_dialog_translate',
    ]);
    expect(gate.summary.studyLangGuardedSurfaces).toEqual(['premium_dialog']);
    expect(gate.summary.studyTargetCacheScopedSurfaces).toEqual([
      'explain',
      'choice',
      'quiz',
      'mistake_explain',
      'weekly_review',
      'stats_insights',
      'premium_dialog_translate',
    ]);

    for (const surface of gate.surfaces) {
      expect(surface.status).toBe('PASS');
      expect(surface.failed).toEqual([]);
    }

    expect(gate.invariants).toMatchObject({
      noHumanReviewGate: true,
      llmTrustedSourceReviewInstead: true,
      frenchStudyTargetPromptedByContract: true,
      sourceLocaleNotUsedAsStudyTarget: true,
      uiOutputLanguageSeparateFromStudyTarget: true,
      promptCacheKeysIncludeStudyTargetWhereLearnerFacingGeneratedTextIsCached: true,
      rejectedFreshAiTextNotReturnedWhereGeneratedTextCouldLeak: true,
      cachedGeneratedTextRecheckedBeforeReplay: true,
      translationCacheSeparatesSourceStudyTarget: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      noMojibakeOrPlaceholders: true,
      activationRemainsClosed: true,
    });

    expect(premiumDialog).toContain('translationCacheId(sourceText: string, targetLang: string, sourceStudyTarget');
    expect(premiumDialog).toContain('translationCacheId(sourceText, targetLang, sourceStudyTarget)');
    expect(premiumDialog).toContain('sourceStudyTarget,');
  });
});
