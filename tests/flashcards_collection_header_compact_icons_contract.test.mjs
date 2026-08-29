import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), 'utf8');

test('flashcards collection header keeps action icons visually compact', () => {
  const header = read('app', 'flashcards', 'CollectionHeader.tsx');
  const energyBadge = read('components', 'EnergyCostBadge.tsx');

  assert.match(header, /const MODE_BUTTON_SIZE = 30;/);
  assert.match(header, /const MODE_ICON_SIZE = 14;/);
  assert.match(header, /const VIEW_TOGGLE_ICON_SIZE = 13;/);
  assert.match(header, /hitSlop=\{\{ top:11,bottom:11,left:9,right:9 \}\}/);
  assert.match(header, /<EnergyCostBadge\s+micro/);
  assert.match(energyBadge, /badgeMicro: \{ width: 24, height: 24 \}/);
  assert.match(energyBadge, /assetMicro: \{ width: 24, height: 24 \}/);
});
