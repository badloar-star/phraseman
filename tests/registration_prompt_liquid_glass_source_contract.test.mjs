import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../components/RegistrationPromptModal.tsx', import.meta.url), 'utf8');
const styleBlock = src.slice(src.indexOf('const styles = StyleSheet.create'));

test('RegistrationPromptModal берёт материал из активных токенов Liquid Glass (13 тем)', () => {
  assert.ok(src.includes("from '../constants/liquidGlassThemePalette'"), 'импорт токенов');
  assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'), 'токены активной темы');
  assert.ok(src.includes('glass.opaqueSheet'), 'непрозрачная основа листа');
  // зачем ([BLEND-AUTH] 18.10): CTA — гарантированная пара темы ctaFill/ctaFillInk (сырой accent в светлых градиентных темах сливался со шторкой)
  assert.ok(src.includes('glass.ctaFill'), 'CTA — токен темы с гарантированным контрастом');
  assert.ok(src.includes('glass.ctaFillInk'), 'подпись CTA — пара ctaFillInk');
});

test('нет зелёных фирменных CTA: t.correct / t.correctText не используются', () => {
  assert.equal(/t\.correct(Text)?\b/.test(src), false);
});

test('нет толстых обводок и сжатия шрифта', () => {
  const widths = [...styleBlock.matchAll(/border(?:Top|Bottom|Left|Right)?Width:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  assert.ok(widths.every((w) => w <= 1), `borderWidth > 1: ${widths.join(',')}`);
  assert.equal(/borderWidth:\s*1\b/.test(styleBlock), false, 'контейнеры без обводки: тон/фон, а не рамка');
  assert.equal(src.includes('adjustsFontSizeToFit'), false);
});

test('публичные пропсы и обработчики входа/восстановления на месте', () => {
  for (const s of [
    'export default', 'onClose', 'handleSignIn', 'handleLater', 'dismissSheet',
    'testID="auth-prompt-later"', 'testID="auth-recovery-entry"', 'testID="auth-clean-recovery-entry"',
    "testID={signInSlow ? 'auth-prompt-slow' : 'auth-prompt-busy'}",
    'keyboardShouldPersistTaps="handled"', 'GoogleSignInButton', 'AppleSignInButton',
  ]) assert.ok(src.includes(s), `нет: ${s}`);
});

test('поля ввода не перекрываются клавиатурой', () => {
  assert.ok(src.includes('useKeyboardBottomInset(') || src.includes('Keyboard.addListener') || src.includes('keyboardHeight'), 'обработка клавиатуры');
});
