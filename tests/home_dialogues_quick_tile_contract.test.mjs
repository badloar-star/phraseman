import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');
// зачем (51б): раздел MAX удалён целиком (владелец 04.10) — проверки шара MAX сняты, порядок плиток охраняется.

test('home keeps three quick tiles: lesson, Dialogues, flashcards', () => {
  const start = source.indexOf('const quickItems = [');
  assert.ok(start > -1);
  const end = source.slice(start).search(/\r?\n {8}\];/);
  assert.ok(end > -1);
  const quickItems = source.slice(start, start + end);

  assert.ok(quickItems.includes("key: 'lesson'"));
  assert.ok(quickItems.includes("key: 'dialogs'"));
  assert.ok(quickItems.includes("key: 'flashcards'"));
  assert.ok(quickItems.indexOf("key: 'lesson'") < quickItems.indexOf("key: 'dialogs'"));
  assert.ok(quickItems.indexOf("key: 'dialogs'") < quickItems.indexOf("key: 'flashcards'"));
  assert.ok(quickItems.includes("ru: 'Диалоги'"));
  assert.ok(quickItems.includes("nav.push('/ai_dialog_home' as never)"));
  assert.ok(!source.includes('max_home_orb_assets'), 'MAX удалён — Главная его не тянет');
  assert.ok(!source.includes('<MaxHomeOrb'));
});
