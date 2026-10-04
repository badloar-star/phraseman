// ЗАФИКСИРОВАНО владельцем 04.10: дизайн карточек и ползунок масштаба из docs/design/v2-app/cards-gallery.html менять нельзя без его прямого слова.
// Тест считает хэш двух помеченных блоков (CSS карточки, движок масштаба) и сравнивает с docs/design/v2-app/cards-gallery.lock.json.
// Если правка осознанная и разрешена владельцем — обновить хэши в lock-файле тем же коммитом и записать слова владельца в CARDS_LOCKED.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-app/cards-gallery.lock.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, lock.file), 'utf8').replace(/\r\n/g, '\n');

function block(name) {
  const open = `/* LOCKED:${name}:start */\n`;
  const a = html.indexOf(open);
  const b = html.indexOf(`/* LOCKED:${name}:end */`);
  assert.ok(a >= 0 && b > a, `блок ${name} не найден — метки LOCKED удалены`);
  return html.slice(a + open.length, b);
}

for (const name of Object.keys(lock.blocks)) {
  test(`зафиксированный блок «${name}» не изменён (дизайн карточек и ползунок утверждены владельцем)`, () => {
    const hash = crypto.createHash('sha256').update(block(name), 'utf8').digest('hex');
    assert.equal(hash, lock.blocks[name], `блок ${name} изменён: ${lock.about}`);
  });
}

test('ключевые параметры карточки на месте: радиусы 24/22/18/14, 1–4 колонки, переворот, стекло и блик', () => {
  const engine = block('cards-engine');
  const css = block('cards-css');
  assert.match(engine, /const RAD = \[24, 22, 18, 14\]/);
  assert.match(engine, /const RATIO = \[0\.27, 0\.8, 1\.0, 1\.15\]/);
  assert.match(engine, /Math\.min\(3\.999, v \* 3\.999\)/);
  assert.match(css, /backdrop-filter: blur\(20px\) saturate\(150%\)/);
  assert.match(css, /rotateY\(180deg\)/);
  assert.match(css, /color-mix\(in srgb, var\(--g2\) 40%/);
});
