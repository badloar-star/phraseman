import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const goals = readFileSync(new URL('../components/dialogs/DialogGoalsSheet.tsx', import.meta.url), 'utf8');
const howToSay = readFileSync(new URL('../components/dialogs/DialogHowToSaySheet.tsx', import.meta.url), 'utf8');

// зачем: «Задания» перенесены на общую HybridSheetShell с непрозрачным стеклом (Liquid Glass 2.0,
// макет C6) — прежняя проверка glassFill/paddingBottom относилась к самописному каркасу; safe area
// и клавиатуру теперь держит оболочка (её контракт в motion_hybrid/HybridSheetShell).
test('goals dialog sheet uses the shared opaque Liquid Glass shell', () => {
  assert.match(goals, /import HybridSheetShell from '\.\.\/modal_fx\/HybridSheetShell';/);
  assert.match(goals, /material="liquid-glass-opaque"/);
  assert.match(goals, /liquidGlassTokens\(liquidGlassThemeId\)/);
});

for (const [name, source] of [['how-to-say', howToSay]]) {
  test(`${name} dialog helper sheet uses a glass base and keeps safe-area sizing`, () => {
    assert.match(source, /import \{ glassFill \} from '\.\.\/GlassSurface';/);
    assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\)/);
    assert.match(source, /paddingBottom: 20 \+ (?:Math\.max\(bottomInset, keyboardBottomInset\)|bottomInset)/);
    assert.match(source, /maxHeight: viewportHeight \* 0\.(?:8|82)/);
    assert.match(source, /onRequestClose=\{dismissSheet\}/);
  });
}

test('how-to-say still inserts a selected live result and never auto-sends it', () => {
  assert.match(howToSay, /onUse\(variant\.text\)/);
  assert.match(howToSay, /dismissSheet\(\)/);
  assert.match(howToSay, /direction: 'to_study'/);
});
