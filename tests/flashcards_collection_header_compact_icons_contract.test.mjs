import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), 'utf8');

// зачем (PM-086, владелец 2026-09-24): components/EnergyCostBadge.tsx удалён
// целиком — ценник энергии в шапке коллекции убран вместе с ним раньше нас;
// проверки его micro-размера сторожить больше нечего.
test('flashcards collection header keeps action icons visually compact', () => {
  const header = read('app', 'flashcards', 'CollectionHeader.tsx');

  assert.match(header, /const MODE_BUTTON_SIZE = 30;/);
  assert.match(header, /const MODE_ICON_SIZE = 14;/);
  assert.match(header, /const VIEW_TOGGLE_ICON_SIZE = 13;/);
  assert.match(header, /hitSlop=\{\{ top:11,bottom:11,left:9,right:9 \}\}/);
  assert.doesNotMatch(header, /<EnergyCostBadge/);
});
