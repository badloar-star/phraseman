import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/settings_themes.tsx', 'utf8');

test('locked Plus theme CTA uses the candidate theme material without changing its gate', () => {
  assert.match(source, /colors=\{\[candidatePalette\.accent, candidatePalette\.accentBg\]\}/);
  assert.match(source, /candidateLocked \? candidatePalette\.correctText/);
  assert.match(source, /pathname: '\/premium_modal', params: \{ context: 'theme', source: 'settings_theme_picker' \}/);
  assert.doesNotMatch(source, /#F2F1F6/);
  assert.doesNotMatch(source, /#C9CBD2/);
});
