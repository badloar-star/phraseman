import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const toast = readFileSync(new URL('../components/ActionToast.tsx', import.meta.url), 'utf8');

test('ActionToast applies one active Liquid Glass material to all five real tones without changing behavior', () => {
  assert.ok(toast.includes("'success' | 'error' | 'info' | 'warning' | 'reward'"), 'all five production tones remain');
  assert.ok(toast.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(toast.includes('actionToastGlassChrome(actionToastGlass)'), 'both card variants receive the local glass chrome');
  assert.ok(toast.includes('glass.card'), 'toast surface uses translucent glass');
  assert.ok(toast.includes('glass.glassEdge'), 'toast keeps a visible glass edge');
  assert.ok(toast.includes('chrome={chrome}'), 'hybrid branch receives the active passive glass chrome');
  assert.ok(toast.includes('colors={chrome.cardColors}'), 'classic rollback branch receives the active passive glass chrome');
  assert.ok(toast.includes('handleActionPress'), 'existing action callback remains present');
  assert.ok(toast.includes("pointerEvents={actionLabel ? 'box-none' : 'none'}"), 'existing action touch policy remains present');
  assert.ok(toast.includes('backgroundColor: actionToastLegacyChrome.closeBg'), 'classic action material remains on the legacy safety-reviewed chrome');
  assert.ok(toast.includes('color: actionToastLegacyChrome.accent'), 'classic action label contrast remains on the legacy safety-reviewed chrome');
  assert.ok(toast.includes('AUTO_DISMISS_MS = 3200'), 'existing lifecycle duration remains unchanged');
});
