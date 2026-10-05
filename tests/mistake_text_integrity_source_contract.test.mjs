import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hub = readFileSync(new URL('../app/mistakes_hub.tsx', import.meta.url), 'utf8');
const finale = readFileSync(new URL('../components/mistake-practice/MistakeSessionFinale.tsx', import.meta.url), 'utf8');

test('active mistake surfaces never cut learner-visible text', () => {
  assert.doesNotMatch(hub, /numberOfLines/);
  assert.doesNotMatch(finale, /numberOfLines/);
});

// зачем (владелец: полный перевод не режем): после сверки по макету «Панель» плитки fixedRow/sourceLabel заменены общей строкой
// PanelRow из PanelKit — высота minHeight (растёт вокруг длинного перевода), текст в колонке flex:1 minWidth:0 без numberOfLines.
const panelKit = readFileSync(new URL('../components/mistakes-panel/PanelKit.tsx', import.meta.url), 'utf8');

test('mistake rows are allowed to grow around complete translations', () => {
  assert.match(finale, /<PanelRow\b/, 'финал рисует список ошибок общей строкой PanelRow');
  assert.match(panelKit, /row: \{ minHeight: 64, flexDirection: 'row'/, 'строка растёт: minHeight, а не height');
  assert.match(panelKit, /rowText: \{ flex: 1, minWidth: 0 \}/, 'текст переносится в своей колонке');
  assert.doesNotMatch(panelKit, /numberOfLines/, 'PanelKit ничего не обрезает');
});
