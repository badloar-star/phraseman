import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

// зачем (2026-09-30, D78): тесты Liquid Glass-оболочки A–G удалены вместе с ней;
// новый пейвол сторожит tests/paywall_v3_source_contract.test.mjs.
test('onboarding keeps the exact midnight chrome while non-onboarding remains theme-derived', () => {
  const source = read('components/paywall/paywallShared.tsx');
  assert.ok(source.includes('if (overrideThemeMode)'), 'explicit onboarding override has a fixed branch');
  assert.ok(source.includes('bgColors: screenBgTuple(mode)'), 'override resolves its own midnight gradient');
  assert.ok(source.includes("textPrimary: light ? SAGE_PORCELAIN.textPrimary : '#FFFFFF'"), 'override keeps legacy midnight text');
  assert.ok(source.includes("colors={['#010102', '#050713', '#0A1025']}"), 'onboarding background remains exact midnight');
  assert.ok(source.includes("backgroundColor: '#010102'"), 'onboarding dim remains exact midnight');
  assert.ok(source.includes('bgColors: [theme.bgPrimary, theme.bgSurface, theme.bgPrimary]'), 'non-onboarding still follows the active theme');
});
