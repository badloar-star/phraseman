import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const survey = readFileSync(new URL('../components/survey/SurveySheetModal.tsx', import.meta.url), 'utf8');
const maxBorderWidth = (source) => Math.max(0, ...[...source.matchAll(/borderWidth:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])));

test('survey sheet applies opaque Liquid Glass with active theme tokens', () => {
  assert.ok(survey.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(survey.includes('material="liquid-glass-opaque"'), 'opaque glass shell');
  assert.ok(survey.includes('glass.opaqueControl') || survey.includes('glass.selected'), 'option/control surfaces from tokens');
  assert.ok(survey.includes('glass.cta') && survey.includes('glass.ctaInk'), 'neutral CTA tokens');
  assert.ok(!/\bt\.correct/.test(survey), 'no brand green');
  assert.ok(!survey.includes('SURVEY_PURPLE_TONE.surfaceOverlay'), 'selected option uses theme tone, not purple');
  assert.ok(maxBorderWidth(survey) <= 1, 'only hairline borders');
  assert.ok(!survey.includes('adjustsFontSizeToFit'));
});

test('survey sheet keeps every flow handler, prop and test hook', () => {
  for (const needle of [
    'onDurablyReconciled', 'onDismissed={handleDismissed}', 'onDismissRequested={deactivateActiveFlow}',
    'flow.retrySubmit', 'controller.pickOption(question.id, option.id)', 'controller.setComment(question.id, value)',
    'maxLength={500}', 'keyboardShouldPersistTaps="handled"', 'testID="survey-sheet-cta"', 'testID="survey-sheet-close"',
    'testID="survey-sheet-back"', 'testID="survey-question-comment"', 'accessibilityRole="radio"', 'handleAdvance',
    'pearlBalance', 'SurveyRewardPanel', 'collectSurveyFollowUps',
  ]) assert.ok(survey.includes(needle), `missing ${needle}`);
});

test('survey controls are at least 44dp', () => {
  assert.match(survey, /closeButton: \{ minWidth: 48, minHeight: 48 \}/);
  assert.match(survey, /option: \{ minHeight: 56/);
  assert.match(survey, /cta: \{ minHeight: 52/);
});
