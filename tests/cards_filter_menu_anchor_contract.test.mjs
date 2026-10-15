import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// зачем (cards-gap-023, Макеты 15.10): меню фильтра Карточек стояло на константе top: 56 и ложилось на кнопки шапки
// (экран начинается от верха окна, шапка — ниже статус-бара). Теперь верх меню = измеренный низ шапки + зазор образца;
// без замера — insets.top + 56 (как у меню действий в CollectionHeader). Сторож держит эту привязку и журнал [CARDS-FILTER-MENU].
const read = (...parts) => readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n');
const dropdown = read('app', 'flashcards', 'FlashcardsFilterDropdown.tsx');
const screen = read('app', 'flashcards_collection.tsx');

test('filter menu top is derived from the measured header bottom, not a bare constant', () => {
  assert.doesNotMatch(dropdown, /top: 56,/, 'bare top: 56 must be gone');
  assert.match(dropdown, /const FILTER_MENU_GAP = 11;/);
  assert.match(dropdown, /anchor != null \? anchor \+ FILTER_MENU_GAP : insets\.top \+ 56/);
  assert.match(dropdown, /top: menuTop,/);
});

test('filter menu logs header height and final top under [CARDS-FILTER-MENU]', () => {
  assert.match(dropdown, /\[CARDS-FILTER-MENU\]/);
  assert.match(dropdown, /headerBottom=/);
  assert.match(dropdown, /menuTop=/);
  assert.match(dropdown, /insets\.top=/);
});

test('every early exit of the header measure is logged (no silent return)', () => {
  assert.match(dropdown, /measure skipped: no header ref/);
  assert.match(dropdown, /measure ignored: bad value/);
});

test('collection screen wraps the header in a measured view and passes refs to the dropdown', () => {
  assert.match(screen, /const filterHeaderRef = useRef<View>\(null\);/);
  assert.match(screen, /const filterHeaderBottomRef = useRef<number \| null>\(null\);/);
  assert.match(screen, /ref=\{filterHeaderRef\}/);
  assert.match(screen, /filterHeaderBottomRef\.current = y \+ h;/);
  assert.match(screen, /headerRef=\{filterHeaderRef\}/);
  assert.match(screen, /anchorBottomRef=\{filterHeaderBottomRef\}/);
});
