// зачем (координатор 15.10, R57 #9/#9b → ffc854a0e): «Сохранённое» и каталог сообщества получали язык, сведённый к ru/uk/es —
// интерфейсы en/pt-BR/vi/id/tr/pl видели «Удалено · Вернуть», «К списку», «Нет сети», «Повторить», «Ничего не нашли» по-русски.
// Сторож: (1) экраны передают язык интерфейса, а не урезанный; (2) подписи компонентов на не-ru/uk языках — без кириллицы.
import fs from 'fs';
import path from 'path';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const NON_SLAVIC_KEYS = ['en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl'] as const;

/** Значения ключей не-ru/uk языков во всех литеральных объектах вида { ru: '…', …, pl: '…' }. */
function nonSlavicValues(src: string): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  for (const key of NON_SLAVIC_KEYS) {
    const re = new RegExp(`(?:^|[\\s,{])${key.replace(/[-']/g, (c) => (c === '-' ? '\\-' : "'"))}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g');
    for (const m of src.matchAll(re)) out.push({ key, value: m[1]! });
  }
  return out;
}

describe('язык интерфейса не урезается до ru/uk/es (Сохранённое и каталог сообщества)', () => {
  it('каталог сообщества: FlashcardsCategoryHub получает lang={lang}, урезанного hubCategoryLang нет', () => {
    const src = read('app/flashcards_packs.tsx');
    expect(src).not.toContain('hubCategoryLang');
    expect(src).toMatch(/<FlashcardsCategoryHub\s+lang=\{lang\}/);
  });

  it('Сохранённое: пустое состояние, колода, список и плашки «Удалено · Вернуть» получают strLang', () => {
    const src = read('app/flashcards_collection.tsx');
    for (const component of ['CollectionEmptyState', 'CollectionDeckView', 'CollectionListView', 'UndoDeleteSnackbar']) {
      const blocks = [...src.matchAll(new RegExp(`<${component}\\b[\\s\\S]*?\\/>`, 'g'))].map((m) => m[0]);
      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block).toMatch(/\blang=\{strLang\}/);
        expect(block).not.toMatch(/\blang=\{cardContentLang\}/);
      }
    }
  });

  it('проп lang у списка и колоды — язык интерфейса (Lang), перевод карточек — отдельный cardContentLang', () => {
    for (const file of ['app/flashcards/CollectionListView.tsx', 'app/flashcards/CollectionDeckView.tsx']) {
      const src = read(file);
      expect(src).not.toMatch(/^\s+lang: FlashcardContentLang;/m);
      expect(src).toMatch(/^\s+lang: Lang;/m);
    }
  });

  it('подписи компонентов на en/es/pt-BR/vi/id/tr/pl — без кириллицы', () => {
    for (const file of ['app/flashcards/CollectionListView.tsx', 'app/flashcards/CollectionDeckView.tsx', 'app/flashcards/FlashcardsCategoryHub.tsx']) {
      const values = nonSlavicValues(read(file));
      // зачем: сторож не должен проходить вхолостую — в каждом файле десятки подписей на 7 языках.
      expect(values.length).toBeGreaterThan(20);
      const bad = values.filter(({ value }) => CYRILLIC.test(value));
      expect({ file, bad }).toEqual({ file, bad: [] });
    }
  });
});
