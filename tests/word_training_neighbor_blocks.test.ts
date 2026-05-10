import { buildNeighborBlockMap } from '../app/word_training_neighbor_blocks';

describe('word_training_neighbor_blocks', () => {
  it('блокирует существительное ↔ форма с -s (letter ↔ letters)', () => {
    const flat = [
      { en: 'letter', pos: 'nouns' },
      { en: 'letters', pos: 'nouns' },
      { en: 'book', pos: 'nouns' },
      { en: 'books', pos: 'nouns' },
      { en: 'food', pos: 'nouns' },
    ];
    const m = buildNeighborBlockMap(flat);
    expect(m.get('letter')?.has('letters')).toBe(true);
    expect(m.get('letters')?.has('letter')).toBe(true);
    expect(m.get('food')).toBeUndefined();
  });

  it('не считает парой new ↔ news', () => {
    const flat = [
      { en: 'new', pos: 'nouns' },
      { en: 'news', pos: 'nouns' },
    ];
    const m = buildNeighborBlockMap(flat);
    expect(m.get('new')).toBeUndefined();
  });

  it('блокирует глагол ↔ he/she … -s и do/does', () => {
    const flat = [
      { en: 'use', pos: 'verbs' },
      { en: 'uses', pos: 'verbs' },
      { en: 'do', pos: 'irregular_verbs' },
      { en: 'does', pos: 'verbs' },
    ];
    const m = buildNeighborBlockMap(flat);
    expect(m.get('use')?.has('uses')).toBe(true);
    expect(m.get('do')?.has('does')).toBe(true);
  });
});
