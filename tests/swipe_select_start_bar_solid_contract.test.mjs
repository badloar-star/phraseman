import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// зачем (журнал 27, «подложка под кнопкой просвечивает»): панель «▶ Начать» на экране выбора наборов (selectStartBar) была
// glassFill(bgSurface, .94) — серая плита светлее/темнее страницы и просвет строк списка. Теперь это сплошной цвет низа
// фона экрана (bgGradient[1]) без прозрачности; прозрачным остаётся только короткое затухание НАД панелью.
const src = readFileSync(fileURLToPath(new URL('../app/flashcards_swipe.tsx', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

test('select start bar is a solid page-background colour, not a translucent surface', () => {
  const start = src.indexOf('styles.selectStartBar,');
  assert.ok(start > 0, 'selectStartBar usage');
  const block = src.slice(start, start + 600);
  assert.match(block, /backgroundColor: selectStartBarColor/);
  assert.doesNotMatch(block, /glassFill|bgSurface|rgba\(/);
  assert.match(src, /const selectStartBarColor = \(t\.bgGradient\?\.\[1\] \?\? t\.bgPrimary\)\.slice\(0, 7\);/);
});

test('the fade above the bar is a separate non-interactive strip', () => {
  assert.match(src, /<View pointerEvents="none" style=\{\[styles\.selectStartFade, \{ bottom: selectStartBarHeight \}\]\}>/);
});
