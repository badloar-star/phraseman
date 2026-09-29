import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: в проде ExplainSheet рендерится classic-веткой (вызовы без motionVariant="hybrid"),
// поэтому Liquid Glass обязан жить именно в ней; hybrid-ветка согласована тем же видом.
const sheet = readFileSync(new URL('../components/ExplainSheet.tsx', import.meta.url), 'utf8');
const hybrid = readFileSync(new URL('../components/ExplainSheetHybrid.tsx', import.meta.url), 'utf8');
const lesson = readFileSync(new URL('../app/lesson1.tsx', import.meta.url), 'utf8');
const button = readFileSync(new URL('../components/ExplainButton.tsx', import.meta.url), 'utf8');

const classicBranch = sheet.slice(sheet.indexOf('function ExplainSheetClassic'));

test('production callers still render the classic branch (no hybrid switch changed)', () => {
  assert.ok(!/<ExplainSheet[^>]*motionVariant="hybrid"/.test(lesson), 'lesson1 does not opt into hybrid');
  assert.ok(!/<ExplainSheet[^>]*motionVariant="hybrid"/.test(button), 'ExplainButton does not opt into hybrid');
  assert.ok(sheet.includes("motionVariant = 'classic'"), 'classic stays the default');
});

test('the really rendered classic branch uses active Liquid Glass tokens', () => {
  assert.ok(classicBranch.includes('liquidGlassTokens(liquidGlassThemeId)'), 'classic reads the 13-theme registry');
  assert.ok(classicBranch.includes('glass.opaqueSheet'), 'opaque sheet base');
  assert.ok(classicBranch.includes('glass.selected'), 'neutral close/skeleton material');
  assert.ok(classicBranch.includes('glass.line'), 'hairline divider from tokens');
  assert.ok(!classicBranch.includes('t.border'), 'no legacy theme border in classic');
  assert.ok(!classicBranch.includes('LinearGradient'), 'no legacy accent glow gradient');
  assert.ok(!classicBranch.includes('TonalSurface'), 'no legacy tonal overlay');
});

test('hybrid branch matches the same look', () => {
  assert.ok(hybrid.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(hybrid.includes('material="liquid-glass-opaque"'));
  assert.ok(!hybrid.includes('t.border'));
});

test('no thick borders and no font shrinking', () => {
  for (const [name, src] of [['ExplainSheet', sheet], ['ExplainSheetHybrid', hybrid]]) {
    for (const m of src.matchAll(/(?:border\w*Width)\s*:\s*(\d+(?:\.\d+)?)/g)) {
      assert.ok(Number(m[1]) <= 1, `${name}: border width ${m[1]} must be <= 1`);
    }
    assert.ok(!src.includes('adjustsFontSizeToFit'), `${name}: no adjustsFontSizeToFit`);
  }
});

test('props, handlers, analytics and gestures are preserved', () => {
  for (const token of [
    'onResolved', 'phraseMeaning', 'useExplainRequest', "trackEvent('explain_sheet_opened'",
    "trackEvent('explain_sheet_closed'", 'ty < 0 ? ty * 0.12 : ty', '> 88', '> 900',
    '<ExplainReportButton phraseEn={phraseEn}', 'dismissSheet', 'closeLabel',
  ]) {
    assert.ok(sheet.includes(token), `ExplainSheet keeps ${token}`);
  }
  assert.ok(sheet.includes('minHeight: 44') || sheet.includes('width: 44'), 'touch targets >= 44dp');
});
