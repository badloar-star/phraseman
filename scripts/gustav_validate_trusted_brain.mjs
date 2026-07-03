import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BRAIN_PATH = path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md');
const SOURCE_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');
const FEATURE_MATRIX_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'feature_parity', 'english_feature_atlas_french_gap_matrix.json');

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

assert(brain.includes('reasoningLevel=high'), 'Trusted brain must require reasoningLevel=high');
assert(brain.includes('reasoningLevel=deep'), 'Trusted brain must define reasoningLevel=deep');
assert(brain.includes('Research-First Rule'), 'Trusted brain must include research-first rule');
assert(brain.includes('Copy/Do-Not-Copy Rule'), 'Trusted brain must include copy/do-not-copy rule');
assert(brain.includes('Feature Parity Matrix has no `BLOCK` or `HOLD` rows'), 'Trusted brain must define trust threshold');

assert(sources.schemaVersion === 'gustav-trusted-source-library-v1', 'Trusted sources schema mismatch');
assert(sources.studyTarget === 'fr', 'Trusted sources must target fr');
assert(sources.reasoningLevelRequired === 'high', 'Trusted sources must require high reasoning');
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

console.log('Gustav trusted brain validation: PASS');
console.log(`Trusted sources: ${sources.sources.length}`);
console.log(`Feature matrix status: ${matrix.status}`);
