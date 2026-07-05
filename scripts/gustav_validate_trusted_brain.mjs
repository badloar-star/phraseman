import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BRAIN_PATH = path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
const SOURCE_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');
const FEATURE_MATRIX_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'feature_parity', 'english_feature_atlas_french_gap_matrix.json');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
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

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const brain = readText(BRAIN_PATH);
const sources = readJson(SOURCE_PATH);
const operator = readText(OPERATOR_PATH);
const matrix = readJson(FEATURE_MATRIX_PATH);
const state = readJson(STATE_PATH);
const decisionProgress = readJson(DECISION_PROGRESS_PATH);
const activationCompletion = readJson(ACTIVATION_COMPLETION_PATH);

assert(brain.includes('reasoningLevel=deep'), 'Trusted brain must require reasoningLevel=deep');
assert(brain.includes('maximum_extended_reasoning'), 'Trusted brain must require maximum extended reasoning for production language work');
assert(brain.includes('App-Atlas-First Brain Rule'), 'Trusted brain must include app-atlas-first rule');
assert(brain.includes('French-Unique Curriculum Rule'), 'Trusted brain must include French-unique curriculum rule');
assert(brain.includes('Research-First Rule'), 'Trusted brain must include research-first rule');
assert(brain.includes('Copy/Do-Not-Copy Rule'), 'Trusted brain must include copy/do-not-copy rule');
assert(brain.includes('Feature Parity Matrix has no `BLOCK` or `HOLD` rows'), 'Trusted brain must define trust threshold');

assert(sources.schemaVersion === 'gustav-trusted-source-library-v1', 'Trusted sources schema mismatch');
assert(sources.studyTarget === 'fr', 'Trusted sources must target fr');
assert(sources.reasoningLevelRequired === 'deep', 'Trusted sources must require deep reasoning');
assert(sources.reasoningContract?.productionLanguageDefault === 'maximum_extended_reasoning', 'Trusted sources must require maximum extended reasoning by default');
assert(sources.reasoningContract?.cannotApproveWith?.includes('high'), 'Trusted sources must reject high as sufficient for production approval');
assert(sources.reasoningContract?.mustUseDeepFor?.includes('content_generation'), 'Trusted sources must require deep reasoning for content generation');
assert(Array.isArray(sources.sources) && sources.sources.length >= 10, 'Trusted sources must include at least 10 sources');

const ids = new Set(sources.sources.map((source) => source.id));
for (const required of [
  'coe_cefr_companion_2020',
  'tv5monde_apprendre',
  'tv5monde_grammar',
  'alliance_francaise_paris_courses',
  'le_robert_dictionary',
  'le_robert_conjugation',
  'phraseman_english_feature_atlas',
  'phraseman_admin_parity_atlas',
]) {
  assert(ids.has(required), `Missing trusted source: ${required}`);
}

for (const source of sources.sources) {
  assert(source.id && source.title && source.url, `Source ${source.id || '<missing>'} must have id/title/url`);
  assert(source.trustTier === 1 || source.trustTier === 2, `Source ${source.id} must have trustTier 1 or 2`);
  assert(Array.isArray(source.covers) && source.covers.length > 0, `Source ${source.id} must declare covers`);
  assert(Array.isArray(source.allowedUses) && source.allowedUses.length > 0, `Source ${source.id} must declare allowedUses`);
}

assert(matrix.schemaVersion === 'gustav-english-feature-atlas-french-gap-matrix-v1', 'Feature matrix schema missing');
assert(matrix.status === 'HOLD', 'Feature matrix should remain HOLD until blockers close');
assert(operator.includes('GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md'), 'OPERATOR must link trusted brain contract');
assert(operator.includes('trusted_sources/fr_trusted_sources.json'), 'OPERATOR must link French trusted source library');
assert(operator.includes('No blind translation'), 'OPERATOR must include the no blind translation rule');
assert(operator.includes('reasoningLevel=deep'), 'OPERATOR must require deep reasoning');

const fr = state.languages?.fr;
assert(fr, 'state.json must include languages.fr');
assert(fr.reasoningLevelRequired === 'deep', 'state languages.fr must require deep reasoning');
assert(
  fr.reasoningLevelContract?.productionDefaultExpanded === 'maximum_extended_reasoning',
  'state languages.fr must expand production reasoning to maximum_extended_reasoning',
);
assert(
  fr.reasoningLevelContract?.cannotApproveWith?.includes('high'),
  'state languages.fr must reject high reasoning as sufficient for production approval',
);
assert(fr.trustedBrain === 'docs/gustav/GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md', 'state must point to the trusted brain contract');

assert(
  state.largePassContract?.mode === 'large_objective_per_continuation',
  'state.json must define the large pass objective contract',
);
assert(
  state.largePassContract?.reasoningLevel === 'deep',
  'large pass objective contract must require deep reasoning',
);
assert(
  state.largePassContract?.requiresNextPassPlan === true,
  'large pass objective contract must require a next pass plan',
);

const progressSummary = decisionProgress.summary ?? {};
const stateProgress = fr.lessonLlmReviewDecisionProgressSummary ?? {};
for (const key of ['decisionRows', 'validDecisionRows', 'missingDecisionRows', 'nextResumeStartIndex']) {
  assert(
    stateProgress[key] === progressSummary[key],
    `state lesson progress is stale for ${key}: state=${stateProgress[key]} audit=${progressSummary[key]}`,
  );
}

const activationSummary = activationCompletion.summary ?? {};
const stateActivation = fr.activationCompletionSummary ?? {};
for (const key of ['decisionRows', 'missingDecisionRows', 'acceptedRows', 'requirementsPassed', 'hardBlockersTotal']) {
  assert(
    stateActivation[key] === activationSummary[key],
    `state activation summary is stale for ${key}: state=${stateActivation[key]} audit=${activationSummary[key]}`,
  );
}

const nextActions = Array.isArray(state.nextActions) ? state.nextActions : [];
assert(nextActions.length > 0, 'state.nextActions must include the next large pass objective');
assert(
  nextActions[0].includes(`from_${progressSummary.nextResumeStartIndex}`) ||
    nextActions[0].includes(`rows ${progressSummary.nextResumeStartIndex}-`),
  'first nextAction must point at the current reviewer resume index',
);
assert(
  new Set(nextActions.slice(0, 5)).size === Math.min(nextActions.length, 5),
  'first five nextActions must not be duplicate stale objectives',
);

console.log('Gustav trusted brain validation: PASS');
console.log(`Trusted sources: ${sources.sources.length}`);
console.log(`Feature matrix status: ${matrix.status}`);
console.log(`Large pass next objective: ${nextActions[0]}`);
