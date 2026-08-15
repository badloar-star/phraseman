/**
 * E11 (§3.2): поиск по коллекции — чистая функция searchCards (debounce живёт в UI).
 * Substring по en/ru/uk/es, регистронезависимо, ё→е, пустой запрос — исходный массив.
 */
import { normalizeSearchText, searchCards } from '../app/flashcards/selectors';
import type { CardItem } from '../app/flashcards/types';

const card = (over: Partial<CardItem>): CardItem => ({
  id: 'x',
  en: '',
  ru: '',
  uk: '',
  categoryId: 'custom',
  isSystem: false,
  ...over,
});

const CARDS: CardItem[] = [
  card({ id: 'c1', en: 'hit the road', ru: 'отправиться в путь', uk: 'вирушити в дорогу' }),
  card({ id: 'c2', en: 'piece of cake', ru: 'проще простого', uk: 'простіше простого' }),
  card({ id: 'c3', en: 'under the weather', ru: 'неважно себя чувствовать', uk: 'почуватися зле' }),
  card({ id: 'c4', en: 'greenhorn', ru: 'новичок', uk: 'новачок', es: 'novato' }),
  card({ id: 'c5', en: 'hedgehog', ru: 'ёжик', uk: 'їжак' }),
];

describe('normalizeSearchText', () => {
  it('lowercase + trim + ё→е', () => {
    expect(normalizeSearchText('  Ёжик  ')).toBe('ежик');
    expect(normalizeSearchText('HIT The Road')).toBe('hit the road');
    expect(normalizeSearchText(undefined as unknown as string)).toBe('');
  });
});

describe('searchCards (E11)', () => {
  it('пустой/пробельный запрос → исходный массив (та же ссылка)', () => {
    expect(searchCards(CARDS, '')).toBe(CARDS);
    expect(searchCards(CARDS, '   ')).toBe(CARDS);
  });

  it('находит по EN-подстроке без учёта регистра', () => {
    const res = searchCards(CARDS, 'ROAD');
    expect(res.map((c) => c.id)).toEqual(['c1']);
  });

  it('находит по RU-подстроке', () => {
    expect(searchCards(CARDS, 'прощ').map((c) => c.id)).toEqual(['c2']);
  });

  it('находит по UK-подстроке', () => {
    expect(searchCards(CARDS, 'їжак').map((c) => c.id)).toEqual(['c5']);
  });

  it('находит по ES-подстроке (если есть)', () => {
    expect(searchCards(CARDS, 'novato').map((c) => c.id)).toEqual(['c4']);
  });

  it('ё и е эквивалентны в запросе и в карточке', () => {
    expect(searchCards(CARDS, 'ежик').map((c) => c.id)).toEqual(['c5']);
    expect(searchCards(CARDS, 'Ёжик').map((c) => c.id)).toEqual(['c5']);
  });

  it('запрос с пробелами по краям триммится', () => {
    expect(searchCards(CARDS, '  cake  ').map((c) => c.id)).toEqual(['c2']);
  });

  it('нет совпадений → пустой массив', () => {
    expect(searchCards(CARDS, 'zzz-none')).toEqual([]);
  });

  it('несколько совпадений сохраняют порядок исходного массива', () => {
    // 'прост' matches c2 (ru/uk 'простого/простіше')
    const res = searchCards(CARDS, 'the');
    expect(res.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('null-безопасность полей и массива', () => {
    expect(searchCards([] as CardItem[], 'x')).toEqual([]);
    expect(searchCards(null as unknown as CardItem[], 'x')).toEqual([]);
    const noEs = card({ id: 'n1', en: 'abc', ru: 'абв', uk: 'абв' });
    expect(searchCards([noEs], 'nov')).toEqual([]);
  });
});
