import fs from 'node:fs';
import path from 'node:path';

import { savedLoadBranch, type SavedLoadBranchInput } from '../app/flashcards/saved_load_branch';

// зачем (cards-039, Сверка 46232ea76, координатор 18.10): «пусто + ошибка» не должно давать вечный скелетон — ошибка важнее скелетона (D158).
const base: SavedLoadBranchInput = { savedCategory: true, packDeeplink: false, loading: false, loadError: false, packCardsPending: false, listCardsCount: 0 };
const pick = (patch: Partial<SavedLoadBranchInput>) => savedLoadBranch({ ...base, ...patch }).branch;

describe('ветка «Сохранённые» при пустом списке', () => {
  it('пусто + ошибка: состояние (тихий повтор → «Сейчас недоступно»), а не скелетон', () => {
    expect(pick({ loadError: true })).toBe('state');
  });
  it('пусто + ошибка, пока идёт повтор (loading true): всё равно состояние — ошибка важнее скелетона', () => {
    expect(pick({ loadError: true, loading: true })).toBe('state');
    expect(savedLoadBranch({ ...base, loadError: true, loading: true }).reason).toContain('ошибка важнее скелетона');
  });
  it('пусто + загрузка без ошибки: скелетон', () => {
    expect(pick({ loading: true })).toBe('skeleton');
  });
  it('загрузка закончилась, карточек нет, ошибки нет: состояние «Пусто»', () => {
    expect(pick({})).toBe('state');
  });
  it('карточки есть (кэш или хранилище): список, даже при ошибке повтора и загрузке (cards=demo верно)', () => {
    expect(pick({ listCardsCount: 3 })).toBe('list');
    expect(pick({ listCardsCount: 3, loadError: true })).toBe('list');
    expect(pick({ listCardsCount: 3, loading: true })).toBe('list');
  });
  it('набор по ссылке и чужая категория — не «Сохранённые»: список', () => {
    expect(pick({ packDeeplink: true, loadError: true })).toBe('list');
    expect(pick({ savedCategory: false, loadError: true })).toBe('list');
  });
  it('ждут карточки набора и загрузки нет: список (пустым экран считать рано)', () => {
    expect(pick({ packCardsPending: true })).toBe('list');
  });
});

describe('экран и данные подключены к выбору ветки', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

  it('flashcards_collection: ветку решает savedLoadBranch, журнал [CARDS-LOAD] называет значения и причину', () => {
    const src = read('app/flashcards_collection.tsx');
    expect(src).toContain("import { savedLoadBranch } from './flashcards/saved_load_branch';");
    expect(src).toContain('savedLoadBranch({');
    expect(src).toContain("console.log('[CARDS-LOAD] branch'");
    expect(src).toMatch(/savedBranch\.branch === 'skeleton' \? \(\s*<SavedCollectionLoading/);
    expect(src).toMatch(/savedBranch\.branch === 'state' \? \(\s*<SavedCollectionState/);
  });

  it('useCollectionData: потолок загрузки без кэша переводит экран в ошибку и пишет [CARDS-LOAD]', () => {
    const src = read('app/flashcards/useCollectionData.ts');
    expect(src).toContain('CARDS_LOAD_CEILING_MS');
    expect(src).toContain("console.warn('[CARDS-LOAD] ceiling");
    expect(src).toContain("console.log('[CARDS-LOAD] load:start'");
    expect(src).toContain("console.log('[CARDS-LOAD] load:ok'");
    expect(src).toContain("console.warn('[CARDS-LOAD] load:failed'");
  });
});
