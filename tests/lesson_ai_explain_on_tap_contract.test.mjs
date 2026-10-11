// зачем (владелец 11.10, журнал 15; макет learn D5): на экране результата «Неверно» в уроке ИИ-разбор запускается ТОЛЬКО по тапу
// «Разобрать мой ответ» — автозапуска нет, рядом вторая кнопка «Объяснить проще». «Мои ошибки» сохраняют прежнюю автозагрузку (autoStart).
// Сторож смотрит на исходники: по умолчанию хук не стартует сам, урок не просит autoStart, карточка рисует две кнопки, офлайн-тап не молчит.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));

test('hook does not start the AI breakdown by itself unless a screen asks for autoStart', () => {
  const hook = read('app', 'use_mistake_explain.ts');
  assert.match(hook, /autoStart\?: boolean;/);
  assert.match(hook, /autoStart = false,/);
  assert.match(hook, /if \(!autoStart\) return;/, 'автозагрузка за флагом');
  assert.match(hook, /\[MISTAKE-EXPLAIN\] manual_only/, 'ожидание тапа оставляет след в логе');
  assert.match(hook, /\[MISTAKE-EXPLAIN\] tap:offline/, 'тап офлайн не молчит');
  assert.match(hook, /\[MISTAKE-EXPLAIN\] tap:request/, 'запрос по тапу логируется');
});

test('lesson result screen asks for the breakdown on tap; mistakes practice keeps its autoload', () => {
  const lesson = read('app', 'lesson1.tsx');
  const call = lesson.slice(lesson.indexOf('useMistakeExplain({'), lesson.indexOf('useMistakeExplain({') + 600);
  assert.ok(!/autoStart/.test(call), 'урок не просит автозапуск');
  assert.match(lesson, /onExplain=\{explainCurrentMistake\}/);
  assert.match(lesson, /onOpenSimple=\{openEli5Modal\}/);
  const practice = read('app', 'mistake_practice_session.tsx');
  assert.match(practice, /autoStart: true,/);
});

test('mistake card shows two buttons side by side in the idle state', () => {
  const card = read('components', 'AiMistakeCard.tsx');
  assert.match(card, /state === 'idle' \?[\s\S]{0,400}styles\.actionRow/);
  assert.match(card, /testID="ai-mistake-explain-button"/);
  assert.match(card, /testID="ai-mistake-simple-button"/);
  assert.match(card, /ru: 'Разобрать мой ответ'/);
  assert.match(card, /ru: 'Объяснить проще'/);
});
