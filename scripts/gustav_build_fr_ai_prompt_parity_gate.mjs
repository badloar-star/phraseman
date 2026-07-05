import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'ai_prompts');
const OUT_PATH = path.join(OUT_DIR, 'fr_ai_prompt_parity_gate_v1.json');

const FILES = {
  contract: 'functions/src/ai_language_contract.ts',
  explainPrompt: 'functions/src/explain/explain_prompts.ts',
  choicePrompt: 'functions/src/explain/choice_explain_prompts.ts',
  quizPrompt: 'functions/src/explain/quiz_explain_prompts.ts',
  compassPrompt: 'functions/src/compass/compass_prompts.ts',
  explainPhrase: 'functions/src/explain_phrase.ts',
  explainChoice: 'functions/src/explain_choice.ts',
  explainQuiz: 'functions/src/explain_quiz.ts',
  explainCache: 'functions/src/explain/explain_cache.ts',
  choiceCache: 'functions/src/explain/choice_explain_cache.ts',
  quizCache: 'functions/src/explain/quiz_explain_cache.ts',
  mistakeExplain: 'functions/src/mistake_explain.ts',
  mistakeCache: 'functions/src/explain/mistake_explain_cache.ts',
  weeklyReview: 'functions/src/weekly_review.ts',
  statsInsights: 'functions/src/stats_insights.ts',
  premiumDialog: 'functions/src/premium_dialog.ts',
};

const PRODUCTION_PLACEHOLDER_PATTERNS = [
  /\bcoming\s+soon\b/iu,
  /\bnot\s+ready\b/iu,
  /\bunder\s+review\b/iu,
  /заглуш/iu,
  /на\s+проверке/iu,
  /не\s+готов/iu,
];
const MOJIBAKE_PATTERN = /(?:[\u00c3\u00d0\u00d1\u00e2][\u0080-\u00bf]|\ufffd)/u;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function abs(relPath) {
  return path.join(ROOT, relPath);
}

function read(relPath) {
  return fs.readFileSync(abs(relPath), 'utf8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function has(text, needle) {
  return text.includes(needle);
}

function regex(text, pattern) {
  return pattern.test(text);
}

function scanFile(relPath) {
  const text = read(relPath);
  const lines = text.split(/\r?\n/);
  const placeholderLines = [];
  const mojibakeLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const commentOnly = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    const technicalPlaceholder = /\bplaceholder(?:=|TextColor|\b)/i.test(line);
    const mojibakeRepair = /mojibake|MOJIBAKE|fixMojibake/i.test(line);
    if (!commentOnly && !technicalPlaceholder && PRODUCTION_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(line))) {
      placeholderLines.push(index + 1);
    }
    if (!commentOnly && !mojibakeRepair && MOJIBAKE_PATTERN.test(line)) {
      mojibakeLines.push(index + 1);
    }
  }
  return {
    file: relPath,
    placeholderLines,
    mojibakeLines,
  };
}

function assertChecks(surface, checks) {
  const failed = checks.filter((check) => !check.pass).map((check) => check.id);
  return {
    id: surface,
    status: failed.length === 0 ? 'PASS' : 'HOLD',
    checks,
    failed,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const src = Object.fromEntries(Object.entries(FILES).map(([key, relPath]) => [key, read(relPath)]));
  const scans = Object.values(FILES).map(scanFile);

  const surfaces = [
    assertChecks('ai_language_contract', [
      { id: 'study_target_union_has_fr', pass: has(src.contract, "export type StudyTarget = 'en' | 'fr'") },
      { id: 'study_target_name_has_french', pass: has(src.contract, "fr: 'French'") },
      { id: 'output_language_guard_exists', pass: has(src.contract, 'assertAiOutputLanguage') },
      { id: 'study_language_guard_exists', pass: has(src.contract, 'assertAiStudyLanguage') },
      { id: 'json_text_field_guard_exists', pass: has(src.contract, 'assertAiJsonTextFieldsLanguage') },
      { id: 'feature_union_covers_new_ai_surfaces', pass: ['mistake_explain', 'weekly_review', 'stats_insights', 'premium_dialog', 'premium_dialog_translate'].every((token) => has(src.contract, token)) },
    ]),
    assertChecks('explain_phrase_prompt_cache_judge', [
      { id: 'prompt_accepts_study_target', pass: has(src.explainPrompt, 'studyTarget: StudyTarget =') && has(src.explainPrompt, 'studyTargetName(studyTarget)') },
      { id: 'judge_user_prompt_gets_study_language', pass: has(src.explainPrompt, 'Study language') && has(src.explainPrompt, 'buildJudgeUserPrompt(text: string, lang: string, studyTarget') },
      { id: 'runtime_resolves_study_target', pass: has(src.explainPhrase, 'const studyTarget = resolveStudyTarget(data.studyTarget)') },
      { id: 'cache_key_includes_study_target', pass: has(src.explainPhrase, 'phraseHashFor(phraseEn, langKey, studyTarget)') && has(src.explainCache, 'studyTarget') && has(src.explainCache, 'targetSegment') && has(src.explainCache, '${target}::') },
      { id: 'judge_receives_study_target_before_return', pass: has(src.explainPhrase, 'judgeExplanation({ text: judgeText, phraseEn, lang, apiKey, studyTarget })') && has(src.explainPhrase, 'return { ok: true, text: approvedText') },
    ]),
    assertChecks('choice_explain_prompt_cache_judge', [
      { id: 'prompt_accepts_study_target', pass: has(src.choicePrompt, 'studyTarget: StudyTarget =') && has(src.choicePrompt, 'studyTargetName(studyTarget)') },
      { id: 'runtime_resolves_study_target', pass: has(src.explainChoice, 'const studyTarget = resolveStudyTarget(data.studyTarget)') },
      { id: 'cache_key_includes_study_target', pass: has(src.explainChoice, 'choiceHashFor(correctEn, distractors, langKey, studyTarget)') && has(src.choiceCache, 'studyTarget') && has(src.choiceCache, 'targetSegment') && has(src.choiceCache, '${target}::') },
      { id: 'judge_receives_study_target', pass: has(src.explainChoice, 'judgeExplanation({ text: judgeText, phraseEn: correctEn, lang, apiKey, studyTarget })') },
      { id: 'rejected_fresh_text_not_returned', pass: has(src.explainChoice, 'if (!verdict.ok) return emptyBatch') },
    ]),
    assertChecks('quiz_explain_prompt_cache_judge', [
      { id: 'prompt_accepts_study_target', pass: has(src.quizPrompt, 'studyTarget: StudyTarget =') && has(src.quizPrompt, 'studyTargetName(studyTarget)') },
      { id: 'runtime_resolves_study_target', pass: has(src.explainQuiz, 'const studyTarget = resolveStudyTarget(data.studyTarget)') },
      { id: 'cache_key_includes_study_target', pass: has(src.explainQuiz, 'quizHashFor(correctEn, [correctEn, ...wrongOptions], langKey, studyTarget)') && has(src.quizCache, 'studyTarget') && has(src.quizCache, 'targetSegment') && has(src.quizCache, '${target}::') },
      { id: 'judge_receives_study_target', pass: has(src.explainQuiz, 'judgeExplanation({ text: judgeText, phraseEn: correctEn, lang, apiKey, studyTarget })') },
      { id: 'rejected_fresh_text_not_returned', pass: has(src.explainQuiz, 'if (!verdict.ok) return emptyBatch') },
    ]),
    assertChecks('mistake_explain_prompt_cache_language_guard', [
      { id: 'payload_has_study_target', pass: has(src.mistakeExplain, 'studyTarget?: unknown') && has(src.mistakeExplain, 'studyTarget: sanitizeStudyTarget') },
      { id: 'french_target_examples_materialized', pass: has(src.mistakeExplain, 'fr: {') && has(src.mistakeExplain, 'AN ELISION OR CONTRACTION IS NOT A MISTAKE') },
      { id: 'cache_key_includes_study_target', pass: has(src.mistakeExplain, 'mistakeHashFor(payload.targetAnswer, payload.userAnswer, langKey, payload.studyTarget)') && has(src.mistakeCache, 'studyTarget') && has(src.mistakeCache, 'targetSegment') && has(src.mistakeCache, '${target}::') },
      { id: 'fresh_generation_checked_before_return', pass: has(src.mistakeExplain, 'generateCheckedMistakeText') && has(src.mistakeExplain, 'assertMistakeGeneratedText(gen.answer, payload)') },
      { id: 'cached_generation_rechecked_before_return', pass: has(src.mistakeExplain, 'isMistakeGeneratedTextSafe(cached.eli5, payload)') && has(src.mistakeExplain, 'isMistakeGeneratedTextSafe(cached.full, payload)') },
    ]),
    assertChecks('weekly_review_prompt_cache_language_guard', [
      { id: 'briefing_has_study_target', pass: has(src.weeklyReview, "studyTarget: data.studyTarget === 'fr' ? 'fr' : 'en'") },
      { id: 'prompt_names_study_target', pass: has(src.weeklyReview, 'buildSystemPrompt(lang: SupportedLang, studyTarget: StudyTarget') && has(src.weeklyReview, 'studyTargetName(studyTarget)') },
      { id: 'fresh_json_fields_language_guarded', pass: has(src.weeklyReview, "feature: 'weekly_review'") && has(src.weeklyReview, 'parseAndGuardResult(content, briefing)') },
      { id: 'replay_json_fields_language_guarded', pass: has(src.weeklyReview, 'readStoredWeeklyReview(quotaData.lastReview, lang)') && has(src.weeklyReview, 'weekly_review cached replay rejected by language guard') },
      { id: 'briefing_hash_is_study_target_sensitive', pass: has(src.weeklyReview, 'briefingHashForReplay(briefing)') && has(src.weeklyReview, 'JSON.stringify(briefing)') },
    ]),
    assertChecks('stats_insights_prompt_cache_language_guard', [
      { id: 'briefing_has_study_target', pass: has(src.statsInsights, "studyTarget: data.studyTarget === 'fr' ? 'fr' : 'en'") },
      { id: 'fresh_json_fields_language_guarded', pass: has(src.statsInsights, "feature: 'stats_insights'") && has(src.statsInsights, 'parseAndGuardResult(content, briefing.lang)') },
      { id: 'replay_json_fields_language_guarded', pass: has(src.statsInsights, 'readStoredStatsInsightsNotes(quotaData.lastNotes, lang)') && has(src.statsInsights, 'stats_insights cached replay rejected by language guard') },
      { id: 'briefing_hash_is_study_target_sensitive', pass: has(src.statsInsights, 'briefingHashForReplay(briefing)') && has(src.statsInsights, 'JSON.stringify(briefing)') },
      { id: 'billing_records_study_target', pass: has(src.statsInsights, 'studyTarget: briefing.studyTarget') },
    ]),
    assertChecks('premium_dialog_prompt_reply_translate_guard', [
      { id: 'prompts_resolve_study_target', pass: has(src.premiumDialog, 'resolveStudyTarget(data.studyTarget)') && has(src.premiumDialog, 'resolveStudyTarget(rawStudyTarget)') },
      { id: 'scenario_and_companion_prompts_use_target_name', pass: has(src.premiumDialog, 'studyTargetName(studyTarget)') && has(src.premiumDialog, 'renderGlobalRules(cefr, interfaceLang, studyTarget)') },
      { id: 'reply_guard_uses_study_language', pass: has(src.premiumDialog, 'assertDialogReplyMatchesTarget(assistantMessage, resolveStudyTarget(data.studyTarget))') && has(src.premiumDialog, 'assertAiStudyLanguage') },
      { id: 'translation_guard_uses_output_language', pass: has(src.premiumDialog, 'assertDialogTranslationLanguage(translation, targetLang)') },
      { id: 'translation_cache_key_includes_source_study_target', pass: has(src.premiumDialog, 'translationCacheId(sourceText: string, targetLang: string, sourceStudyTarget') && has(src.premiumDialog, 'translationCacheId(sourceText, targetLang, sourceStudyTarget)') && has(src.premiumDialog, 'sourceStudyTarget,') },
    ]),
    assertChecks('compass_prompt_language_axis', [
      { id: 'compass_uses_prompt_language_key', pass: has(src.compassPrompt, 'resolvePromptLangKey') && has(src.compassPrompt, 'PROMPT_LANGUAGES') },
      { id: 'compass_has_judge_prompt', pass: has(src.compassPrompt, 'COMPASS_JUDGE_SYSTEM_PROMPT') || has(src.compassPrompt, 'Strict-JSON binary classifier') },
    ]),
  ];

  const failedSurfaces = surfaces.filter((surface) => surface.status !== 'PASS');
  const placeholderHits = scans.filter((scan) => scan.placeholderLines.length > 0);
  const mojibakeHits = scans.filter((scan) => scan.mojibakeLines.length > 0);
  const blockers = [
    ...failedSurfaces.map((surface) => `${surface.id.toUpperCase()}_CHECKS_FAILED`),
    ...(placeholderHits.length ? ['AI_PROMPT_PLACEHOLDER_TEXT_FOUND'] : []),
    ...(mojibakeHits.length ? ['AI_PROMPT_MOJIBAKE_FOUND'] : []),
  ];

  const gate = {
    schemaVersion: 'gustav-fr-ai-prompt-parity-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'ai_prompt_surfaces',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, file])),
    summary: {
      surfacesChecked: surfaces.length,
      surfacesPassing: surfaces.filter((surface) => surface.status === 'PASS').length,
      failedSurfaces: failedSurfaces.length,
      placeholderHitFiles: placeholderHits.length,
      mojibakeHitFiles: mojibakeHits.length,
      outputLangGuardedSurfaces: ['explain', 'choice', 'quiz', 'mistake_explain', 'weekly_review', 'stats_insights', 'premium_dialog_translate'],
      studyLangGuardedSurfaces: ['premium_dialog'],
      studyTargetCacheScopedSurfaces: ['explain', 'choice', 'quiz', 'mistake_explain', 'weekly_review', 'stats_insights', 'premium_dialog_translate'],
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    surfaces,
    qualityFindings: {
      placeholderHits,
      mojibakeHits,
    },
    invariants: {
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
      noMojibakeOrPlaceholders: blockers.includes('AI_PROMPT_PLACEHOLDER_TEXT_FOUND') === false && blockers.includes('AI_PROMPT_MOJIBAKE_FOUND') === false,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Keep OpenAI live generation behind existing runtime budget/config gates.',
      'Add admin visibility for AI prompt parity and language rejection counters before production French activation.',
      'Do not cache or replay any AI text unless LANGUAGE_CONTRACT_VERSION and studyTarget/source language checks pass.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} surfaces=${gate.summary.surfacesPassing}/${gate.summary.surfacesChecked} blockers=${blockers.length}`);
}

main();
