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

// зачем (координатор 13.10, №34): «Пик» допустим в окне «Что нового» ТОЛЬКО как необязательная строка `peak` у ru/uk, а показывает её окно лишь
// при включённом рубильнике и интерфейсе ru/uk (isSpireTabEnabled). Остальным семи языкам — ни слова, иначе обещаем то, чего у человека нет.
const rawCopy = normalizeEol(readFileSync(new URL('../components/release_notes_v2_copy.ts', import.meta.url), 'utf8'));
const PEAK_WORDS = /Пик|Пік|\bPeak\b|\bPico\b|\bZirve\b|Đỉnh|Puncak|Szczyt/;

test('Peak is mentioned only in the optional peak line of ru and uk', () => {
  const body = rawCopy.replace(/\/\/[^\n]*/g, '');
  const peakLines = body.split('\n').filter((l) => PEAK_WORDS.test(l));
  assert.equal(peakLines.length, 2, `expected exactly the ru and uk peak lines, got: ${peakLines.join(' | ')}`);
  for (const line of peakLines) assert.match(line, /^\s*peak: \{ icon: 'trophy-outline'/);
  const ruBlock = body.slice(body.indexOf('  ru: {'), body.indexOf('  uk: {'));
  const ukBlock = body.slice(body.indexOf('  uk: {'), body.indexOf('  en: {'));
  assert.match(ruBlock, /peak: \{/);
  assert.match(ukBlock, /peak: \{/);
});

test('the modal shows the peak line only under the spire tab lock (flag + ru/uk)', () => {
  const modal = normalizeEol(readFileSync(new URL('../components/ReleaseNotesV2Modal.tsx', import.meta.url), 'utf8'));
  assert.match(modal, /import \{ isSpireTabEnabled \} from '\.\.\/app\/spire_tab_flag';/);
  assert.match(modal, /visible && copy\.peak && isSpireTabEnabled\(\)/);
});
