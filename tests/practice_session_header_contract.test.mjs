// зачем (координатор 11.10, «дизайн везде»: экран без макета равняется на соседний с макетом): шапка swipe-сессии — одна строка
// «назад · заголовок · сердца · монеты» через общий PracticeSessionHeader (как Блиц/«Вспомни»), а не отдельный стек.
// Контракт: компонент общий, действия и testID шапки swipe сохранены, старого рыхлого стека (пустая заглушка вместо кнопки справа) нет.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));

test('PracticeChrome exports the shared one-row session header', () => {
  const src = read('components', 'practice', 'PracticeChrome.tsx');
  assert.match(src, /export function PracticeSessionHeader/);
  assert.match(src, /PracticeBackButton large=\{!compact\}/);
  assert.match(src, /sessionTools/);
});

test('swipe session header uses the shared component and keeps its actions and testIDs', () => {
  const src = read('app', 'flashcards_swipe.tsx');
  assert.match(src, /PracticeSessionHeader,?\s*[\s\S]{0,40}from '..\/components\/practice\/PracticeChrome'|PracticeSessionHeader \} from/);
  assert.match(src, /<PracticeSessionHeader[\s\S]*?onBack=\{exitTraining\}/);
  for (const id of ['flashcards-swipe-attempts-hud', 'flashcards-swipe-practice-runes']) assert.ok(src.includes(`testID="${id}"`), id);
  assert.ok(src.includes('ref={runeFlight.counterRef}'), 'счётчик монет остаётся целью полёта наград');
  assert.ok(!src.includes('accessible={false} importantForAccessibility="no-hide-descendants" />\n        </View>\n\n        <View style={[styles.progressTrack'), 'пустая заглушка справа удалена');
});
