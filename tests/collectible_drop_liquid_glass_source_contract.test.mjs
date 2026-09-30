import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/CollectibleDropModal.tsx', import.meta.url), 'utf8');

test('collectible drop uses Liquid Glass tokens (13 themes), opaque base, no glassFill/legacy card', () => {
  assert.ok(source.includes("from '../constants/liquidGlassThemePalette'"));
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(source.includes('glass.opaqueSheet'), 'opaque sheet base');
  assert.ok(source.includes('glass.accent') && source.includes('glass.accentInk'));
  assert.equal(source.includes('glassFill'), false);
  assert.equal(source.includes('t.bgCard'), false);
  assert.equal(source.includes('DuoPressable'), false);
});

test('no borders, no rarity glow, no adjustsFontSizeToFit, no hardcoded palette', () => {
  assert.equal(/border(?:Top|Bottom)?(?:Width|Color):/.test(source), false);
  assert.equal(source.includes('adjustsFontSizeToFit'), false);
  assert.equal(source.includes('shadowColor={rarityColor}'), false, 'rarity colour is not a card glow');
  assert.equal(/\$\{rarityColor\}[0-9A-Fa-f]{2}/.test(source), false, 'no rarity-tinted fills');
  assert.equal(source.includes('#FBBF24'), false);
  assert.equal(source.includes('LinearGradient'), false);
});

test('removed pearl reward promise is gone from set-complete copy', () => {
  assert.equal(/\+15/.test(source.replace(/\/\/.*$/gm, '')), false);
  assert.ok(source.includes("en: 'Set complete!'"));
});

test('props, handlers, test ids, safe area, scroll and 44dp targets stay intact', () => {
  for (const s of ['outcome', 'onClose', 'onOpenCollection', "motionVariant = 'hybrid'", 'collectible-drop-claim', 'collectible-drop-open-collection', 'collectible-drop-claim-hybrid', 'collectible-drop-open-collection-hybrid', 'ScrollView', 'minHeight: 44'])
    assert.ok(source.includes(s), `missing: ${s}`);
  assert.match(source, /<SafeAreaView style=\{styles\.overlay\} edges=\{\['top', 'bottom', 'left', 'right'\]\}>/);
  assert.match(source, /onPress=\{onClose\}/);
  assert.match(source, /onPress=\{onOpenCollection\}/);
  assert.ok(source.includes('RewardImpactRings') && source.includes('useRewardImpactHybrid'), 'reward impact wiring kept');
});
