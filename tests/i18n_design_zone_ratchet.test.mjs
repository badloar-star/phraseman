// зачем (координатор 13.10, к EN-интерфейсу и 9 языкам): зонный сторож «тексты вне переводов» для зоны Дизайна (scripts/scan_i18n_design_zone.mjs) — храповик по файлам:
// число русских литералов вне переводчика и языковых объектов неполной ширины (<9 языков) может только падать. Обновить базу после чистки: node scripts/scan_i18n_design_zone.mjs --update
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { scanSource } from '../scripts/scan_i18n_design_zone.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('зона Дизайна: число текстов вне переводов и неполных переводов не растёт (храповик)', () => {
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'scan_i18n_design_zone.mjs')], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /^OK/);
});

const NINE = "{ ru: 'a', uk: 'b', en: 'c', es: 'd', 'pt-BR': 'e', vi: 'f', id: 'g', tr: 'h', pl: 'i' }";

test('сканер ловит неполный языковой объект в переводном вызове и называет недостающие языки', () => {
  const found = scanSource(`const t = triLang(lang, { ru: 'Привет', uk: 'Привіт', en: 'Hello', es: 'Hola' });`);
  assert.equal(found.incomplete.length, 1);
  assert.deepEqual(found.incomplete[0].missing, ['pt-BR', 'vi', 'id', 'tr', 'pl']);
});

test('сканер не ругается на полный набор из девяти языков и на таблицы вне переводного вызова', () => {
  assert.equal(scanSource(`const t = triLang(lang, ${NINE});`).incomplete.length, 0);
  assert.equal(scanSource(`const T = { ru: 'Привет', uk: 'Привіт', es: 'Hola' };`).incomplete.length, 0);
});

test('сканер ловит одинокую русскую строку и JSX-текст, но не комментарии, журнал и тексты с английским рядом', () => {
  const lone = scanSource(`const x = <Text accessibilityLabel="Закрыть">Привет</Text>;`);
  assert.ok(lone.literals.length >= 1);
  assert.equal(scanSource(`// Привет\nconsole.log('Привет');`).literals.length, 0);
  assert.equal(scanSource(`const x = pick('Привет, друг', 'Hello there');`).literals.length, 0);
});
