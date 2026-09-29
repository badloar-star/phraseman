import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const why = readFileSync(new URL('../components/dialogs/DialogWhySheet.tsx', import.meta.url), 'utf8');
const goals = readFileSync(new URL('../components/dialogs/DialogGoalsSheet.tsx', import.meta.url), 'utf8');
const session = readFileSync(new URL('../app/ai_dialog_session.tsx', import.meta.url), 'utf8');

const hint = readFileSync(new URL('../components/dialogs/DialogHintModal.tsx', import.meta.url), 'utf8');

const maxBorderWidth = (source) => Math.max(0, ...[...source.matchAll(/borderWidth:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])));

for (const [name, source] of [['why', why], ['goals', goals]]) {
  test(`${name} sheet uses active Liquid Glass tokens on the opaque shared shell`, () => {
    assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
    assert.ok(source.includes('HybridSheetShell'), 'shared sheet shell');
    assert.ok(source.includes('material="liquid-glass-opaque"'), 'opaque glass base');
    assert.ok(source.includes('glass.text') && source.includes('glass.secondary'), 'text tokens');
    assert.ok(!/\bt\.correct/.test(source), 'no brand green');
    assert.ok(maxBorderWidth(source) <= 1, 'only hairline borders');
    assert.ok(!source.includes('adjustsFontSizeToFit'), 'no font shrinking');
    assert.ok(source.includes('accessibilityLabel={closeLabel}'), 'close is labelled');
    assert.ok(source.includes('maxFontSizeMultiplier'), 'large text is bounded, not shrunk');
  });
}

test('why sheet keeps gate, unlock, denial and content branches', () => {
  assert.match(why, /gate\.onUnlock/);
  assert.match(why, /gate && !gate\.revealed/);
  assert.match(why, /\(!gate \|\| gate\.revealed\) && coach\.note/);
  assert.match(why, /\(!gate \|\| gate\.revealed\) && coach\.translation/);
  assert.match(why, /gate\.denied === 'no_runes'/);
  assert.match(why, /testID="ai-dialog-why-unlock"/);
  assert.match(why, /freeLeft/);
  assert.match(why, /onClose: \(\) => void/);
  assert.ok(!/onUseSuggestion[?]?:/.test(why), 'cancelled prop stays removed');
});

test('goals sheet keeps counts, done/not-done labels and props', () => {
  assert.match(goals, /objectivesMet\.has\(o\.id\)/);
  assert.match(goals, /\$\{doneCount\} \/ \$\{objectives\.length\}/);
  assert.match(goals, /objective\.labelRu/);
  assert.match(goals, /Ещё не выполнено/);
  assert.match(goals, /objectives: readonly DialogObjective\[\]/);
  assert.match(goals, /objectivesMet: ReadonlySet<string>/);
});

test('AI hint modal is a Liquid Glass centered card that closes on backdrop and stays wired in the session', () => {
  assert.ok(hint.includes('liquidGlassTokens(liquidGlassThemeId)'), 'tokens');
  assert.ok(hint.includes('glass.opaqueSheet'), 'opaque base');
  assert.ok(hint.includes('glass.text') && hint.includes('glass.secondary'), 'text tokens');
  assert.ok(!/t\.correct/.test(hint), 'no brand green in hint');
  assert.ok(maxBorderWidth(hint) <= 1, 'hairline only');
  assert.ok(!hint.includes('adjustsFontSizeToFit'));
  assert.ok(hint.includes('HybridAlertShell') && hint.includes('onRequestClose={onClose}'), 'shared centered shell closes on backdrop and back');
  assert.ok(hint.includes('onAccessibilityEscape={onClose}'), 'screen-reader escape closes');
  assert.match(session, /<DialogHintModal\s+visible=\{hintOpen\}\s+onClose=\{\(\) => setHintOpen\(false\)\}/);
  assert.match(session, /hint=\{presentation\?\.hint \?\? ''\}/);
  assert.ok(!/<Modal[\s\S]{0,40}visible=\{hintOpen\}/.test(session), 'inline modal gone');
});
