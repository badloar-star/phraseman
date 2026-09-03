import {
  buildCardsTrainingRoute,
  parseCardsTrainingMode,
} from '../app/flashcards/training_entry';

describe('Cards whole-pack training entry', () => {
  test.each([
    ['blitz', 'blitz'],
    ['speaking', 'speaking'],
    ['truefalse', 'truefalse'],
    ['listening', 'listening'],
  ] as const)('parses the supported mode %s', (raw, expected) => {
    expect(parseCardsTrainingMode(raw)).toBe(expected);
  });

  test('rejects missing, repeated and unknown mode values', () => {
    expect(parseCardsTrainingMode(undefined)).toBeNull();
    expect(parseCardsTrainingMode(['blitz', 'speaking'])).toBeNull();
    expect(parseCardsTrainingMode('listen')).toBeNull();
  });

  test('blitz receives the normalized union of whole packs', () => {
    expect(buildCardsTrainingRoute('blitz', ['saved', 'pack:travel', 'saved'])).toEqual({
      pathname: '/flashcards_blitz_session',
      params: { deck: 'saved,pack:travel' },
    });
  });

  test('oral training uses every card in the selected packs', () => {
    expect(buildCardsTrainingRoute('speaking', ['saved', 'custom'])).toEqual({
      pathname: '/flashcards_speaking_session',
      params: { deck: 'saved,custom', size: 'all' },
    });
  });

  test('true/false quick-starts the existing trainer without a size limit', () => {
    expect(buildCardsTrainingRoute('truefalse', ['pack:one', 'pack:two'])).toEqual({
      pathname: '/flashcards_swipe',
      params: { deck: 'pack:one,pack:two', quick: '1' },
    });
  });

  test('listening reuses the existing listening session for all selected packs', () => {
    expect(buildCardsTrainingRoute('listening', ['saved', 'pack:travel'])).toEqual({
      pathname: '/flashcards_listening_session',
      params: { deck: 'saved,pack:travel', size: 'all' },
    });
  });

  test('does not build an empty training route', () => {
    expect(buildCardsTrainingRoute('blitz', [])).toBeNull();
  });
});
