import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync(new URL('../components/PremiumCelebrationModal.tsx', import.meta.url), 'utf8');
const copy = readFileSync(new URL('../components/premium_celebration/celebrationLiquidCopy.ts', import.meta.url), 'utf8');
const vip = readFileSync(new URL('../components/VipCelebrationModal.tsx', import.meta.url), 'utf8');

test('celebration uses Liquid Glass tokens, no gradients, no legacy tier palettes', () => {
  assert.ok(src.includes("from '../constants/liquidGlassThemePalette'"));
  assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'));
  for (const token of ['glass.bg', 'glass.opaqueControl', 'glass.accent', 'glass.accentInk', 'glass.text', 'glass.secondary'])
    assert.ok(src.includes(token), `missing ${token}`);
  assert.equal(src.includes('LinearGradient'), false, 'gradients removed');
  assert.equal(src.includes('CELEBRATION_PALETTES'), false, 'gold/green/blue palettes are not used');
  assert.equal(/palette\./.test(src), false);
  assert.equal(/#[0-9a-fA-F]{6}\b/.test(src.replace(/rgba?\([^)]*\)/g, '')), false, 'no hardcoded hex');
});

test('no borders (rings became fills), no adjustsFontSizeToFit, 44dp targets', () => {
  assert.equal(/border(?:Top|Bottom)?(?:Width|Color):/.test(src), false);
  assert.equal(src.includes('adjustsFontSizeToFit'), false);
  assert.ok(src.includes('minHeight: 44'), 'skip button >= 44dp');
  assert.ok(src.includes('minHeight: 52'), 'primary button >= 44dp');
});

test('public props, lifecycle, audio and close rules stay intact', () => {
  for (const s of ['visible', 'onClose', "variant = 'premium'", 'promoCode = null', 'startCelebrationBackground()', 'letCelebrationBackgroundFinish', 'stopAllCelebrationSceneSounds', 'hapticSuccess', 'useReducedMotion', 'ScrollView', 'accessibilityViewIsModal', '`${variant}-celebration-cta`', 'insets.top', 'bottomInset'])
    assert.ok(src.includes(s), `missing ${s}`);
  assert.ok(src.includes('`pm.celebration.${name}`'), 'sound family template stays');
  assert.match(vip, /variant="vip"/);
  assert.match(vip, /promoCode/);
});

test('mock states covered: intro / benefits / finale / promo with only confirmed benefit', () => {
  for (const s of ["'intro'", "'benefits'", "'finale'", "'promo'"]) assert.ok(src.includes(s));
  // зачем (голос PhraseMan, VOICE.md, 25.10): «Доступ подтверждён» / «Промокод применён» → «Plus включён» / «Промокод сработал!»
  for (const s of ['Plus включён', 'Занимайся без ожидания', 'Без расхода энергии', 'Всё готово', 'Промокод сработал!', 'К занятиям', 'Пропустить'])
    assert.ok(copy.includes(s), `copy: ${s}`);
  for (const lang of ['uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:'])
    assert.ok(copy.includes(lang));
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Безлимит|Все уроки|AI-диалог|Всё открыто/i.test(stripComments(src) + stripComments(copy)), false, 'no unconfirmed promises');
});
