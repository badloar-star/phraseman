import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../components/IntroFullAccessModal.tsx', import.meta.url), 'utf8');

test('IntroFullAccessModal — Liquid Glass без градиентов и hex-россыпи', () => {
  assert.ok(src.includes("from '../constants/liquidGlassThemePalette'"));
  assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(src.includes('glass.opaqueSheet') || src.includes('glass.opaqueCard'), 'непрозрачная основа');
  assert.ok(src.includes('glass.cta') && src.includes('glass.ctaInk'));
  assert.equal(src.includes('LinearGradient'), false, 'градиентов нет');
  assert.equal(src.includes('RewardModalBackdrop'), false, 'старая награда-подложка убрана');
  assert.equal(/t\.correct(Text)?\b/.test(src), false);
  assert.equal(/#[0-9a-fA-F]{6}\b/.test(src.replace(/rgba?\([^)]*\)/g, '')), false, 'нет захардкоженных hex');
});

test('нет обводок, adjustsFontSizeToFit и старых обещаний Plus', () => {
  assert.equal(/border(?:Top|Bottom)?(?:Width|Color):/.test(src), false);
  assert.equal(src.includes('adjustsFontSizeToFit'), false);
});

test('публичные пропсы и поведение на месте', () => {
  for (const s of ['visible', 'variant', 'onPrimaryPress', 'accessibilityViewIsModal', 'ScrollView'])
    assert.ok(src.includes(s), `нет: ${s}`);
});
