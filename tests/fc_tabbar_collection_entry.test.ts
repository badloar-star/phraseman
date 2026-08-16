/**
 * Сторож входа в КОЛЛЕКЦИЮ из таббара раздела «Карточки».
 *
 * зачем (владелец, 2026-08-16): «входа в коллекцию просто нет кнопки». Капсула
 * таббара — это три слота-ГРУППЫ (train/+/packs); отдельного слота под коллекцию
 * в ней не осталось, а уход в наборы идёт через `replace`, поэтому «назад» к
 * сохранённым карточкам не возвращал. Коллекция живёт ПЕРВЫМ пунктом группы
 * «Наборы» — этот тест не даёт ей снова пропасть.
 */
import fs from 'fs';
import path from 'path';
import {
  buildFcPacksRoute,
  FC_CARDS_ROUTE,
  FC_MY_PACKS_ROUTE,
  FC_PACKS_OPTIONS,
  FC_PACKS_ROUTE,
} from '../app/flashcards/tabbar_state';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('вход в коллекцию из таббара карточек', () => {
  it('коллекция — первый пункт группы «Наборы»', () => {
    expect(FC_PACKS_OPTIONS[0]).toBe('collection');
    expect(FC_PACKS_OPTIONS).toEqual(['collection', 'mine', 'community']);
  });

  it('каждый пункт группы ведёт на свой экран', () => {
    expect(buildFcPacksRoute('collection').pathname).toBe(FC_CARDS_ROUTE);
    expect(buildFcPacksRoute('mine').pathname).toBe(FC_MY_PACKS_ROUTE);
    expect(buildFcPacksRoute('community').pathname).toBe(FC_PACKS_ROUTE);
  });

  it('у пункта коллекции есть подпись и иконка — иначе он не отрисуется', () => {
    const tabbar = read('app', 'flashcards', 'FlashcardsTabBar.tsx');
    expect(tabbar).toMatch(/collection: \{ icon: '[a-z-]+', label: labels\.collection \}/);
    expect(tabbar).toMatch(/collection: triLang\(lang, \{/);
  });

  it('открытая коллекция подсвечивает слот группы, а не «нигде»', () => {
    const tabbar = read('app', 'flashcards', 'FlashcardsTabBar.tsx');
    // Обе точки подсветки (стартовая и текущая) обязаны знать про 'cards'.
    const highlightMentions = tabbar.match(/active === 'cards'/g) ?? [];
    expect(highlightMentions.length).toBeGreaterThanOrEqual(2);
  });

  it('повторный тап по коллекции из коллекции не делает лишний переход', () => {
    const tabbar = read('app', 'flashcards', 'FlashcardsTabBar.tsx');
    expect(tabbar).toContain("(option === 'collection' && active === 'cards')");
  });
});
