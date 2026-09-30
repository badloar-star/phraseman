import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const explain = readFileSync(new URL('../components/ExplainReportButton.tsx', import.meta.url), 'utf8');
const error = readFileSync(new URL('../components/ReportErrorButton.tsx', import.meta.url), 'utf8');

for (const [name, src] of [['ExplainReportButton', explain], ['ReportErrorButton', error]]) {
  test(`${name}: Liquid Glass tokens, opaque sheet, neutral CTA, no thick/coloured borders`, () => {
    assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme registry');
    assert.ok(src.includes('glass.opaqueSheet'), 'opaque sheet base');
    assert.ok(src.includes('backgroundColor: glass.cta'), 'neutral theme CTA');
    assert.ok(src.includes('color: glass.ctaInk'), 'CTA ink from tokens');
    assert.ok(!src.includes('t.correct'), 'no brand-green surfaces or ink');
    assert.ok(!src.includes('t.border'), 'no legacy theme border');
    assert.ok(!src.includes('TonalSurface'), 'no legacy tonal overlay');
    assert.ok(!src.includes('adjustsFontSizeToFit'));
    for (const m of src.matchAll(/(?:border\w*Width)\s*:\s*([^,}\n]+)/g)) {
      for (const n of m[1].match(/\d+(?:\.\d+)?/g) ?? []) assert.ok(Number(n) <= 1, `${name}: border width ${n} must be <= 1`);
    }
    assert.ok(src.includes('KeyboardAvoidingView') && src.includes('keyboardShouldPersistTaps="handled"'), 'keyboard-safe scrollable form');
    assert.ok(src.includes('minHeight: 44') || src.includes('minHeight: 48'), 'touch targets >= 44dp');
    assert.ok(src.includes('t.wrong'), 'error semantics kept');
  });
}

test('ExplainReportButton keeps API, guards, limits and reason whitelist', () => {
  for (const token of [
    "kind = 'phrase'", 'userAnswer', 'langProp', "['unclear', 'incorrect', 'wrong_language', 'other']",
    'COMMENT_MAX_LEN = 300', 'maxLength={COMMENT_MAX_LEN}', 'if (sending) return;', 'if (sent) return;',
    'callSubmitExplainReport', "name={sent ? 'checkmark-circle' : 'flag'}", 'setFailed(true)', 'accessibilityRole="radio"',
  ]) assert.ok(explain.includes(token), `keeps ${token}`);
  assert.ok(explain.includes('Отправляем…') && explain.includes("pl: 'Wysyłanie…'"), 'sending label in all languages');
});

test('ReportErrorButton keeps API, validation, throttle/failed/sent branches and no thick validation border', () => {
  for (const token of [
    'submitOverride', 'if (sending) return;', 'ERROR_REPORT_COMMENT_MIN_LEN',
    'maxLength={500}', "result === 'throttled'", "result === 'failed'", "result === 'invalid_comment'",
    "variant = 'default'", 'textColor', 'export function reportErrorCategoriesForLang', 'setSent(true)',
  ]) assert.ok(error.includes(token), `keeps ${token}`);
  assert.ok(!/borderWidth:\s*commentRequiredError/.test(error), 'validation error does not thicken the border');
  // зачем (2026-09-30): XP и жемчуг удалены — ни начисления за жалобу, ни обещания жемчужины.
  assert.ok(!error.includes('onSuccess'), 'no XP callback');
  assert.ok(!/жемчуж|перлин/.test(error), 'no pearl copy');
});
