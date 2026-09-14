import {
  buildCardsTrainingRoute,
  parseCardsTrainingMode,
} from '../app/flashcards/training_entry';

describe('Cards whole-pack training entry', () => {
  test.each([
    ['blitz', 'blitz'],
    ['speaking', 'speaking'],
    ['truefalse', 'truefalse'],
    ['recall', 'recall'],
  ] as const)('parses the supported mode %s', (raw, expected) => {
    expect(parseCardsTrainingMode(raw)).toBe(expected);
  });

  test('rejects missing, repeated and unknown mode values', () => {
    expect(parseCardsTrainingMode(undefined)).toBeNull();
    expect(parseCardsTrainingMode(['blitz', 'speaking'])).toBeNull();
    expect(parseCardsTrainingMode('listen')).toBeNull();
  });

  test('does not expose the removed passive listening mode', () => {
    expect(parseCardsTrainingMode('listening')).toBeNull();
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

  test('recall opens the full-phrase writing session for the whole selected packs', () => {
    expect(buildCardsTrainingRoute('recall', ['saved', 'custom'])).toEqual({
      pathname: '/flashcards_recall_session',
      params: { deck: 'saved,custom', size: 'all' },
    });
  });

  // зачем (владелец 2026-09-14): механизм ежедневной практики удалён навсегда —
  // ни один маршрут карточек не имеет права нести параметр daily.
  test('no cards training route carries the removed daily parameter', () => {
    for (const mode of ['blitz', 'speaking', 'truefalse', 'recall'] as const) {
      const route = buildCardsTrainingRoute(mode, ['saved']);
      expect(route).not.toBeNull();
      expect(Object.keys(route!.params)).not.toContain('daily');
    }
  });

  test('does not build an empty training route', () => {
    expect(buildCardsTrainingRoute('blitz', [])).toBeNull();
  });
});
