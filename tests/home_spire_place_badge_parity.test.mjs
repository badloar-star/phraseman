// зачем (координатор 18.10): подпись бейджа места на плитке Пика вынесена в лёгкий модуль, чтобы Главная не тянула модуль моментов Пика.
// Тест держит ту же строку на тех же 9 языках, что ключ placeBadge в моментах, и запрещает плитке снова импортировать модуль моментов.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const ORDER = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

test('placeBadge: лёгкий модуль совпадает со строкой моментов на всех 9 языках', () => {
  const moments = read('components/spire/moments/moments_strings.ts');
  const row = moments.match(/placeBadge:\s*\[([^\]]+)\]/);
  assert.ok(row, 'в моментах есть ключ placeBadge');
  const expected = [...row[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  assert.equal(expected.length, 9);
  const light = read('components/home/v2/home_spire_place_badge.ts');
  for (const [i, lang] of ORDER.entries()) {
    const key = lang.includes('-') ? `'${lang}'` : lang;
    const found = light.match(new RegExp(`^\\s*${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'm'));
    assert.ok(found, `есть строка для ${lang}`);
    assert.equal(found[1], expected[i], `${lang}: строка совпадает с моментом`);
  }
});

test('плитки Главной не импортируют модуль моментов Пика', () => {
  const tiles = read('components/home/v2/HomeV2FeatureTiles.tsx');
  assert.ok(!/spire\/moments\//.test(tiles), 'нет импорта components/spire/moments');
  assert.ok(tiles.includes("from './home_spire_place_badge'"));
  assert.ok(tiles.includes('spirePlaceBadgeText(uiLang, spirePlace)'));
});
