import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

test('shared confirm modal uses the active 13-theme glass palette and the approved two-action layout', () => {
  const source = read('components/ThemedConfirmModal.tsx');

  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /<BlurView/);
  assert.match(source, /Platform\.OS === 'android' \? glass\.opaqueSheet : glass\.sheet/);
  assert.match(source, /colors=\{\[glass\.selected, 'transparent'\]\}/);
  assert.match(source, /flexDirection: 'row'/);
  assert.match(source, /accessibilityRole="header"/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityState=\{\{ disabled: false \}\}/);
  // зачем (владелец 13.10, №35): опасная кнопка — токены кнопок темы (dangerFill / dangerInk), а не t.wrongBg / t.wrong и не зашитые #3A1E1C/#FF8C82
  assert.match(source, /glass\.dangerFill/);
  assert.match(source, /glass\.dangerInk/);
  assert.match(source, /glass\.buttonFill/);
  assert.doesNotMatch(source, /maxFontSizeMultiplier/);
  assert.doesNotMatch(source, /GOLD_GRADIENTS|OLIVE_GRADIENTS|GoldBevel/);
  assert.doesNotMatch(source, /borderWidth:\s*1/);
});

test('shared choice modal is the approved safe-area bottom action sheet with icon-leading glass rows', () => {
  const source = read('components/ThemedChoiceModal.tsx');

  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /<BlurView/);
  assert.match(source, /placement="bottom"/);
  assert.match(source, /useStableSafeAreaInsets\(\)/);
  assert.match(source, /paddingBottom:\s*Math\.max\(18, insets\.bottom \+ 10\)/);
  assert.match(source, /c\.icon \? \(/);
  assert.match(source, /accessibilityElementsHidden/);
  assert.match(source, /accessibilityRole="header"/);
  assert.match(source, /accessibilityRole="button"/);
  assert.doesNotMatch(source, /maxFontSizeMultiplier/);
  assert.doesNotMatch(source, /GOLD_GRADIENTS|OLIVE_GRADIENTS|GoldBevel/);
  assert.doesNotMatch(source, /borderWidth:\s*1/);
});

test('hybrid alert shell keeps center as the compatibility default and adds bottom placement without changing dismissal', () => {
  const source = read('components/modal_fx/HybridAlertShell.tsx');

  assert.match(source, /placement\?: 'center' \| 'bottom'/);
  assert.match(source, /placement = 'center'/);
  assert.match(source, /const bottomSheet = placement === 'bottom'/);
  assert.match(source, /bottomSheet \? styles\.bottomViewport : undefined/);
  assert.match(source, /bottomSheet \? styles\.bottomPanel : undefined/);
  assert.match(source, /onRequestClose=\{dismissHandler\}/);
  assert.match(source, /if \(reduceMotion\)/);
  // зачем (c9556310c, шторка «Изменить имя»; тест устарел, поведение по умолчанию то же): нижняя шторка при avoidKeyboard поднимается на перекрытие клавиатуры,
  // иначе прежнее: нижняя — 0, центральная — Math.max(24, insets.bottom, keyboardInset).
  assert.match(source, /paddingBottom: bottomSheetKeyboardLift \?\? \(bottomSheet \? 0 : Math\.max\(24, insets\.bottom, keyboardInset\)\)/);
});
