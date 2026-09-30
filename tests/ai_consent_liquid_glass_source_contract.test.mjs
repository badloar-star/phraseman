import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/AiConsentSheetModalHybrid.tsx', import.meta.url), 'utf8');

test('AI dialog consent uses the shared Liquid Glass sheet without changing the consent actions', () => {
  assert.match(source, /material="liquid-glass"/);
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /backgroundColor: glass\.cta/);
  assert.match(source, /color: glass\.ctaInk/);
  assert.match(source, /onClose=\{onDecline\}/);
  assert.match(source, /onPress=\{handleAccept\}/);
  assert.match(source, /onPress=\{handleDecline\}/);
});

test('AI dialog consent keeps disclosure and decisions outside a scroll fold', () => {
  const scrollEnd = source.indexOf('</ScrollView>');
  const disclosure = source.indexOf('{body}');
  const footer = source.indexOf('style={styles.footer}');

  assert.ok(scrollEnd >= 0);
  assert.ok(disclosure > scrollEnd);
  assert.ok(footer > disclosure);
});
