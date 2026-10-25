// зачем (координатор 26.10, аудит «назад» — пункт 5): Арена удалена (D54/D83), но маршрут /arena не удаляем — на него ведут старые
// ссылки, пуши и сборки до OTA. Мягкий переход уже есть: (tabs)/arena.tsx — пустой якорь, вкладки отображают /arena на Главную.
// Сторож держит именно это: обе таблицы вкладок дают /arena → 0, а вкладка 0 — Главная. Арену не восстанавливать.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = fs.readFileSync(path.join(ROOT, 'app/(tabs)/_layout.tsx'), 'utf8');

const block = (name) => {
  const at = layout.indexOf(`const ${name}`);
  assert.ok(at >= 0, `${name} не найден в (tabs)/_layout.tsx`);
  return layout.slice(at, layout.indexOf('};', at));
};

test('старый адрес /arena и сегмент arena ведут на вкладку Главной', () => {
  assert.match(block('PATHNAME_TO_IDX'), /'\/arena':\s*0,/);
  assert.match(block('SEGMENT_TO_TAB_IDX'), /\barena:\s*0,/);
  assert.match(block('IDX_TO_TAB_ROUTE'), /0:\s*'\/\(tabs\)\/home',/);
  assert.match(layout, /const TAB_PATH_SUFFIXES = \[[^\]]*'\/arena'/);
});

test('якорь маршрута остаётся (иначе старый URL упадёт в not-found) и ничего не рендерит', () => {
  const anchor = fs.readFileSync(path.join(ROOT, 'app/(tabs)/arena.tsx'), 'utf8');
  assert.match(anchor, /export default function \w+\(\)\s*\{\s*return null;\s*\}/);
});
