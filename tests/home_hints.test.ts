import {
  DEV_HOME_HINT_FIXTURES,
  pickRandomHomeHint,
  resolveHomeHintText,
  type PublishedHomeHints,
} from '../app/home_hints';
import { SELECTED_HOME_HINTS_RU, SELECTED_HOME_HINTS_SNAPSHOT } from '../app/home_hints_selected';
import { parsePublishedHomeHints } from '../app/home_hints_client';

const snapshot: PublishedHomeHints = {
  schemaVersion: 1,
  version: 'v1',
  items: [
    { id: 'all-1', category: 'home', audience: 'all', textRu: 'Общая 1', textByLocale: { en: 'General 1' } },
    { id: 'free-1', category: 'energy', audience: 'free', textRu: 'Free 1', textByLocale: { en: 'Free 1' } },
    { id: 'plus-1', category: 'plus', audience: 'plus', textRu: 'Plus 1', textByLocale: { en: 'Plus 1' } },
    { id: 'all-2', category: 'results', audience: 'all', textRu: 'Общая 2', textByLocale: { en: 'General 2' } },
  ],
};

describe('home hint rotation', () => {
  it('keeps the owner-selected Russian starter set intact', () => {
    expect(SELECTED_HOME_HINTS_RU.length).toBe(92);
    expect(new Set(SELECTED_HOME_HINTS_RU.map((item) => item.id)).size).toBe(92);
    expect(SELECTED_HOME_HINTS_RU[0].textRu).toBe('Маленький шаг тоже попадает в большую историю.');
    expect(SELECTED_HOME_HINTS_RU[59].audience).toBe('plus');
    expect(SELECTED_HOME_HINTS_SNAPSHOT.schemaVersion).toBe(1);
  });

  it('does not expose developer wording in the random hint copy', () => {
    expect(DEV_HOME_HINT_FIXTURES.every((item) => !/^DEV:/i.test(item.textRu))).toBe(true);
  });
  it('selects any item directly from its random offset', () => {
    expect(pickRandomHomeHint(snapshot.items, () => 0)?.id).toBe('all-1');
    expect(pickRandomHomeHint(snapshot.items, () => 0.5)?.id).toBe('plus-1');
    expect(pickRandomHomeHint(snapshot.items, () => 0.999)?.id).toBe('all-2');
  });

  it('uses the requested translation and never leaks Russian into a missing locale', () => {
    const hint = snapshot.items[0];
    expect(resolveHomeHintText(hint, 'en', 'Localized fallback')).toBe('General 1');
    expect(resolveHomeHintText(hint, 'ru', 'Localized fallback')).toBe('Общая 1');
    expect(resolveHomeHintText(hint, 'es', 'Localized fallback')).toBe('Localized fallback');
  });

  it('rejects malformed or oversized published snapshots', () => {
    expect(parsePublishedHomeHints({ schemaVersion: 1, version: 'v1', items: [] })).toBeNull();
    expect(parsePublishedHomeHints({ schemaVersion: 1, version: 'v1', items: [{ id: 'x', category: 'home', audience: 'free', textRu: '' }] })).toBeNull();
    expect(parsePublishedHomeHints({ schemaVersion: 2, version: 'v2', items: [] })).toBeNull();
    expect(parsePublishedHomeHints(snapshot)).toEqual(snapshot);
  });
});
