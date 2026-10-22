import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// зачем (11.10): рабочая копия в CRLF (autocrlf) — сторож сверяет многострочный текст, нормализуем переносы.
const read = (...parts) => readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n');

// зачем (PM-086, владелец 2026-09-24; коммит ac9c8e31d «ценники энергии убраны со всех кнопок», общий снимок efe19ae9d): ценник энергии и кнопки режимов
// (MODE_BUTTON_SIZE/MODE_ICON_SIZE) из шапки коллекции убраны намеренно — сторожить их размеры больше нечего. Тест теперь стережёт ТЕКУЩУЮ шапку:
// иконки действий остаются компактными (переключатель вида 40 с иконкой 18), а зона нажатия каждой кнопки не меньше 44 pt (размер + hitSlop / minHeight).
const header = read('app', 'flashcards', 'CollectionHeader.tsx');

test('flashcards collection header keeps action icons visually compact and the energy price gone', () => {
  assert.match(header, /const VIEW_TOGGLE_SIZE = 40;/);
  assert.match(header, /const VIEW_TOGGLE_ICON_SIZE = 18;/);
  assert.doesNotMatch(header, /<EnergyCostBadge/);
  assert.doesNotMatch(header, /MODE_BUTTON_SIZE|MODE_ICON_SIZE/, 'mode buttons left the header (PM-086)');
});

test('every header button keeps a tap zone of at least 44 pt', () => {
  // переключатель вида: 40 + hitSlop 11/11 по высоте и 9/9 по ширине = 62 × 58
  assert.match(header, /hitSlop=\{\{ top:11,bottom:11,left:9,right:9 \}\}/);
  assert.ok(40 + 11 + 11 >= 44 && 40 + 9 + 9 >= 44, 'view toggle tap zone');
  // «назад» (22.10, закон владельца «назад везде в одном месте»): своей кнопки в шапке нет — её место (ScreenBackSlot), а сама
  // кнопка — общая ScreenBackButton экрана коллекции: круг 48 + hitSlop 6
  assert.match(header, /<ScreenBackSlot \/>/);
  assert.doesNotMatch(header, /flashcards-header-back/);
  assert.match(read('app', 'flashcards_collection.tsx'), /<ScreenBackButton screen="flashcards_collection"/);
  // «Отмена» выбора и меню действий: самостоятельные 64×44 и 44×44
  assert.match(header, /minWidth: 64, minHeight: 44/);
  assert.match(header, /testID="fc-saved-actions"[\s\S]*?width: 44, height: 44/);
  // фильтр: minHeight 40 + hitSlop 8/8 = 56
  assert.match(header, /hitSlop=\{\{ top:8,bottom:8,left:8,right:8 \}\}[\s\S]*?minHeight: 40/);
  assert.ok(40 + 8 + 8 >= 44, 'filter tap zone');
});
