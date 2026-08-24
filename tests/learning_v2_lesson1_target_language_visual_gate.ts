import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const builderPath = resolve(
  process.cwd(),
  'scripts/build_learning_v2_lesson1_real_session_mock.mjs',
);
const source = readFileSync(builderPath, 'utf8');
const reviewBuilderSource = readFileSync(
  resolve(process.cwd(), 'scripts/build_learning_v2_lesson1_review_mock.mjs'),
  'utf8',
);

const requiredContracts: readonly (readonly [string, RegExp])[] = [
  ['explicit target-term projection', /targetTerms:/u],
  ['semantic renderer', /function semanticText\(/u],
  ['target-language class', /\.target-language/u],
  ['explanation-language class', /\.explanation-language/u],
  ['intro question semantic rendering', /semanticText\(qh,loc\(page\.prompt\),page\.targetTerms\)/u],
  ['intro choice semantic rendering', /semanticText\(b,loc\(choice\),page\.targetTerms,true\)/u],
  ['practice prompt semantic rendering', /semanticText\(p,loc\(t\.promptByLocale\),t\.targetTerms\)/u],
  ['practice option semantic rendering', /semanticText\(b,o\.text,t\.targetTerms,t\.responseLanguage==='target'\)/u],
  ['feedback semantic rendering', /semanticText\(e,text,task\(\)\?\.targetTerms\?\?session\(\)\.targetTerms\)/u],
  ['session summary semantic rendering', /semanticText\(\$\('#sessionSubtitle'\),loc\(s\.summary\),s\.targetTerms\)/u],
];

for (const [label, pattern] of requiredContracts) {
  assert.match(source, pattern, `learning_v2_target_language_visual_missing:${label}`);
}

assert.match(
  source,
  /\.target-language\{[^}]*color:var\(--target\)[^}]*font-weight:900/u,
  'learning_v2_target_language_must_use_theme_color_and_heavy_weight',
);
assert.match(
  source,
  /\.explanation-language\{[^}]*color:inherit[^}]*font-weight:inherit/u,
  'learning_v2_explanation_language_style_missing',
);
assert.match(
  reviewBuilderSource,
  /\.targetCorrect,\.target-language\{[^}]*color:var\(--accent\)[^}]*font-weight:900/u,
  'learning_v2_material_review_target_language_style_missing',
);
assert.match(
  reviewBuilderSource,
  /\.choice\{[^}]*color:var\(--accent\)[^}]*font-weight:900/u,
  'learning_v2_material_review_target_choices_must_be_visually_distinct',
);
assert.match(
  reviewBuilderSource,
  /semanticText\(exp,localizedDetails\.explanation,terms\)/u,
  'learning_v2_material_review_explanations_must_highlight_target_terms',
);

console.log('PASS learning_v2_lesson1_target_language_visual_gate');
