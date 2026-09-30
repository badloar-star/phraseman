import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/ai_dialog_consent_gate.tsx', import.meta.url), 'utf8');

test('declined AI-dialog gate is a safe-area Liquid Glass screen', () => {
  assert.match(source, /useStableSafeAreaInsets/);
  assert.match(source, /liquidGlassTokens/);
  assert.match(source, /paddingTop:\s*insets\.top/);
  assert.match(source, /paddingBottom:\s*Math\.max\(insets\.bottom,\s*24\)/);
  assert.match(source, /LinearGradient/);
});

test('declined AI-dialog gate keeps the existing recoverable actions', () => {
  assert.match(source, /onPress=\{onAccept\}/);
  assert.match(source, /router\.push\('\/privacy_settings'/);
  assert.match(source, /safeRouterBack\(router, '\/\(tabs\)\/lessons'/);
});
