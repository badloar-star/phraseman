import fs from 'node:fs';
import path from 'node:path';

// зачем (PM-096-A2/A3): сортировка «Моих наборов» сохраняется на устройстве, и на повторном
// заходе первый кадр сразу рисует сохранённый порядок — без перетасовки «по дате → по имени».
const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'flashcards_my_packs.tsx'), 'utf8');

describe('My packs sort: persisted and not reshuffled on open', () => {
  test('choice is written locally under its own key (no network)', () => {
    expect(source).toContain("const MY_PACKS_SORT_KEY = 'fc_my_packs_sort_v1';");
    expect(source).toMatch(/AsyncStorage\.setItem\(MY_PACKS_SORT_KEY, sort\)/);
  });

  test('first frame reads the process memo before the disk', () => {
    expect(source).toContain('let myPacksSortMemo: MyPacksSort | null = null;');
    expect(source).toContain("useState<MyPacksSort>(() => myPacksSortMemo ?? 'updated')");
    expect(source).toContain('if (myPacksSortMemo !== null) return;');
  });

  test('both read and write keep the memo in sync', () => {
    const getter = source.slice(source.indexOf('async function getStoredMyPacksSort'), source.indexOf('async function setStoredMyPacksSort'));
    const setter = source.slice(source.indexOf('async function setStoredMyPacksSort'), source.indexOf('function sortMyPacks'));
    expect(getter).toContain('myPacksSortMemo = sort;');
    expect(setter).toContain('myPacksSortMemo = sort;');
  });
});
