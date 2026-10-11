// зачем (Карточки 2.0, «В набор» для одной карточки): формат карточки набора и нумерация c1, c2… совпадают с тем, что собирает «Создать набор из выбранных».
import { nextPackCardId, packCardFromCardItem } from '../app/community_packs/localPackCardAdd';
import type { CardItem } from '../app/flashcards/types';

const base: CardItem = {
  id: 'saved-1',
  en: 'Layover',
  ru: 'пересадка',
  uk: 'пересадка (uk)',
  categoryId: 'saved',
  isSystem: false,
  description: 'Заметка',
  packLanguage: 'en',
};

describe('packCardFromCardItem', () => {
  test('maps target text, translation and the note like the staged-card builder', () => {
    const card = packCardFromCardItem(base, 'c3');
    expect(card.id).toBe('c3');
    expect(card.en).toBe('Layover');
    expect(card.ru).toBe('пересадка');
    expect(card.uk).toBe('Заметка');
    expect(card.translationUk).toBe('пересадка (uk)');
    expect(card.origin).toEqual({ source: 'lesson', sourceId: '', sourceTitle: '' });
  });

  test('keeps explicit origin and trims empty spanish text', () => {
    const card = packCardFromCardItem({ ...base, es: '  ', origin: { source: 'video', sourceId: 'v1', sourceTitle: 'T' } }, 'c1');
    expect(card.origin).toEqual({ source: 'video', sourceId: 'v1', sourceTitle: 'T' });
    expect(card.es).toBeUndefined();
  });
});

describe('nextPackCardId', () => {
  test('continues after the highest c<N> and never reuses a number', () => {
    expect(nextPackCardId([])).toBe('c1');
    expect(nextPackCardId([{ id: 'c1' }, { id: 'c2' }])).toBe('c3');
    expect(nextPackCardId([{ id: 'c1' }, { id: 'c7' }])).toBe('c8');
    expect(nextPackCardId([{ id: 'x' }, { id: 'y' }, { id: 'z' }])).toBe('c4');
  });
});
