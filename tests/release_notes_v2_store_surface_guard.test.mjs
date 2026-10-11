import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEol } from './helpers/read_source_esm.mjs';
import { readFileSync } from 'node:fs';

// зачем (координатор 06:50, §CORE-0168): окно «Что нового» 2.0 видят люди со стор-сборкой. Оно не обещает того, чего
// в ней нет: Шпиль скрыт рубильником spire_tab_enabled, Learning V2 вырезан из стор-сборки, Арена и лиги удалены (D54/D78).
// И никаких служебных заглушек вроде «legacy reward» в тексте для людей.
const source = normalizeEol(readFileSync(new URL('../components/release_notes_v2_copy.ts', import.meta.url), 'utf8'))
  .replace(/\/\/[^\n]*/g, '');

const NOT_IN_STORE = [
  /Шпил|Spire|Aguja|\bTorre\b|Tháp|Menara|\bKule\b|Iglica/i,
  /Learning\s*V2|Обучени[ея] V2/i,
  /Арен|Arena|\bлиг[аиу]|\bліг|leagues?\b|\bligas?\b|\bligi\b|\blig\b|bảng xếp hạng/i,
];

test('release notes 2.0 promise only what the store build has', () => {
  for (const pattern of NOT_IN_STORE) {
    assert.doesNotMatch(source, pattern, `release notes mention something missing from the store build: ${pattern}`);
  }
});

test('release notes 2.0 carry no placeholder words', () => {
  assert.doesNotMatch(source, /legacy reward|TODO|lorem/i);
});
