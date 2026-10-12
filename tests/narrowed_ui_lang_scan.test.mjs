// зачем (координатор 12.10, EN-проход Сверки cards-007/010/021): тексты переведены на 9 языков, а английский интерфейс видел русский —
// сужен был ВЫБОР языка. Сторож ловит обе исходные ошибки и не трогает полный язык интерфейса и одноимённую переменную в другой функции.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findNarrowedUiLangUses } from '../scripts/narrowed_ui_lang_scan.mjs';

test('cards-007/010: подписи по языку контента (FlashcardContentLang) в triLang — находка', () => {
  const src = [
    "import { type FlashcardContentLang } from './types';",
    'const copyFor = (lang: FlashcardContentLang) => triLang(lang, { ru: { train: \'Тренировать\' }, en: { train: \'Train\' } });',
  ].join('\n');
  const hits = findNarrowedUiLangUses(src, 'CollectionGalleryView.tsx');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, 'translator');
});

test('cards-021: тернарник с запасным ru индексирует словарь — находка (и в переменной, и прямо в скобках)', () => {
  const viaVar = [
    'function Editor({ lang }: { lang: Lang }) {',
    "  const strLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';",
    '  const s = STR[strLang];',
    '}',
  ].join('\n');
  assert.deepEqual(findNarrowedUiLangUses(viaVar, 'e.tsx').map((h) => h.kind), ['dictionary']);
  const untyped = "function E(lang: Lang) { const pick = lang === 'uk' ? 'uk' : 'ru'; return STR[pick]; }";
  assert.equal(findNarrowedUiLangUses(untyped, 'e.ts').length, 1);
  const inline = "function E(lang: Lang) { return triLang(lang === 'uk' ? 'uk' : 'ru', COPY); }";
  assert.equal(findNarrowedUiLangUses(inline, 'e.ts').length, 1);
});

test('полный язык интерфейса и одноимённая суженная переменная в ДРУГОЙ функции — не находка', () => {
  const src = [
    "type Props = { lang: FlashcardContentLang };",
    'const copyFor = (lang: Lang) => triLang(lang, { ru: \'a\', en: \'b\' });',
    'function speak(lang: FlashcardContentLang) { return VOICES_BY_LANG[lang]; }',
    'function label(lang: Lang) { return STR[lang]; }',
  ].join('\n');
  const hits = findNarrowedUiLangUses(src, 'x.tsx');
  // единственная находка — VOICES_BY_LANG[lang] внутри speak (контентная озвучка: такие места живут в базе храповика)
  assert.deepEqual(hits.map((h) => h.text), ['VOICES_BY_LANG[lang]']);
});

test('сторож поймал бы обе исходные ошибки: версии файлов до починки из git', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const fixtures = path.join(root, 'tests', 'fixtures', 'narrowed_ui_lang');
  for (const [file, expected] of [['CollectionGalleryView.before.txt', 3], ['flashcards_card_editor.before.txt', 1]]) {
    const src = fs.readFileSync(path.join(fixtures, file), 'utf8');
    assert.equal(findNarrowedUiLangUses(src, file.replace(/\.txt$/, '.tsx')).length, expected, file);
  }
});

test('сторож подключён: скрипт храповика и база есть', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config', 'narrowed-ui-lang-baseline.json'), 'utf8'));
  assert.equal(typeof baseline.total, 'number');
  const cli = fs.readFileSync(path.join(root, 'scripts', 'scan_narrowed_ui_lang.mjs'), 'utf8');
  assert.match(cli, /import \{ findNarrowedUiLangUses \} from '\.\/narrowed_ui_lang_scan\.mjs';/);
});
