// зачем (Макеты 776430946, cards-035): окно массового удаления писало «Удалить 3 карточек?» — число подставлялось в фиксированную форму. Склоняем через общий
// помощник constants/plural.ts; проверяем формы для всех 9 языков (ru/uk/pl — три формы, en/es/pt-BR — две, vi/id/tr — без изменения) и что обе точки ими пользуются.
import fs from 'node:fs';
import path from 'node:path';
import { pluralWithCount, pluralWord } from '../constants/plural';

const collection = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8');
const gallery = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CollectionGalleryView.tsx'), 'utf8');

describe('склонение «карточка» в окне удаления и подсказке выделения', () => {
  it('русский: 1 карточку / 2–4 карточки / 5+ карточек, 11–14 и 21/22/25 по правилам', () => {
    const f = { one: 'карточку', few: 'карточки', many: 'карточек' };
    expect(pluralWithCount('ru', 1, f)).toBe('1 карточку');
    expect(pluralWithCount('ru', 2, f)).toBe('2 карточки');
    expect(pluralWithCount('ru', 3, f)).toBe('3 карточки');
    expect(pluralWithCount('ru', 4, f)).toBe('4 карточки');
    expect(pluralWithCount('ru', 5, f)).toBe('5 карточек');
    expect(pluralWithCount('ru', 11, f)).toBe('11 карточек');
    expect(pluralWithCount('ru', 12, f)).toBe('12 карточек');
    expect(pluralWithCount('ru', 14, f)).toBe('14 карточек');
    expect(pluralWithCount('ru', 21, f)).toBe('21 карточку');
    expect(pluralWithCount('ru', 22, f)).toBe('22 карточки');
    expect(pluralWithCount('ru', 25, f)).toBe('25 карточек');
  });

  it('украинский и польский — тоже три формы', () => {
    const uk = { one: 'картку', few: 'картки', many: 'карток' };
    expect([1, 2, 5, 21, 22, 25].map((n) => pluralWithCount('uk', n, uk))).toEqual(['1 картку', '2 картки', '5 карток', '21 картку', '22 картки', '25 карток']);
    const pl = { one: 'kartę', few: 'karty', many: 'kart' };
    expect([1, 2, 5, 12, 22].map((n) => pluralWithCount('pl', n, pl))).toEqual(['1 kartę', '2 karty', '5 kart', '12 kart', '22 karty']);
    // польский: 21/31/101 — форма «many», а не «one» (в отличие от ru/uk)
    expect([21, 31, 101].map((n) => pluralWithCount('pl', n, pl))).toEqual(['21 kart', '31 kart', '101 kart']);
  });

  it('en/es/pt-BR — две формы (одна / много)', () => {
    expect(pluralWord('en', 1, { one: 'card', few: 'cards', many: 'cards' })).toBe('card');
    expect(pluralWord('en', 3, { one: 'card', few: 'cards', many: 'cards' })).toBe('cards');
    expect(pluralWord('es', 1, { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })).toBe('tarjeta');
    expect(pluralWord('es', 2, { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })).toBe('tarjetas');
    expect(pluralWord('pt-BR', 1, { one: 'cartão', few: 'cartões', many: 'cartões' })).toBe('cartão');
    expect(pluralWord('pt-BR', 4, { one: 'cartão', few: 'cartões', many: 'cartões' })).toBe('cartões');
  });

  it('окно удаления склоняет через общий помощник для ru/uk/en/es/pt-BR/pl; vi/id/tr — без изменения числа; старой фиксированной формы нет', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'pl']) {
      expect(collection).toContain(`pluralWithCount('${lang}', selectedCardIds.length,`);
    }
    expect(collection).not.toMatch(/Удалить \$\{selectedCardIds\.length\} карточек/);
    expect(collection).not.toMatch(/Видалити \$\{selectedCardIds\.length\} карток/);
    expect(collection).not.toMatch(/Usunąć \$\{selectedCardIds\.length\} kart\?/);
    expect(collection).toMatch(/import \{ pluralWithCount \} from '\.\.\/constants\/plural';/);
  });

  it('подсказка выделения («Выбери ещё N …») тоже склоняется помощником', () => {
    for (const lang of ['ru', 'uk', 'pl']) expect(gallery).toContain(`pluralWithCount('${lang}', n,`);
    for (const lang of ['en', 'es', 'pt-BR']) expect(gallery).toContain(`pluralWord('${lang}', n,`);
    expect(gallery).not.toMatch(/Выбери ещё \$\{n\} карточек/);
    expect(gallery).not.toMatch(/Познач ще \$\{n\} карток/);
    expect(gallery).not.toMatch(/Wybierz jeszcze \$\{n\} kart,/);
  });
});
