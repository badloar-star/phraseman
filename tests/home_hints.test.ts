import {
  DEV_HOME_HINT_FIXTURES,
  normalizeCursor,
  resolveHomeHintText,
  selectNextHomeHint,
  type HomeHintCursor,
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
  it('keeps all hints available to both audiences and isolates specialized queues', () => {
    const free = selectNextHomeHint(snapshot, 'free', normalizeCursor(null, snapshot));
    const plus = selectNextHomeHint(snapshot, 'plus', normalizeCursor(null, snapshot));
    expect(free.hint?.id).toBe('all-1');
    expect(plus.hint?.id).toBe('all-1');
    expect(selectNextHomeHint(snapshot, 'free', free.cursor).hint?.id).toBe('free-1');
    expect(selectNextHomeHint(snapshot, 'plus', plus.cursor).hint?.id).toBe('plus-1');
  });

  it('wraps deterministically and resets indices for a new snapshot version', () => {
    let cursor: HomeHintCursor = normalizeCursor({ snapshotVersion: 'v1', nextIndexByAudience: { all: 2, free: 2, plus: 0 } }, snapshot);
    const first = selectNextHomeHint(snapshot, 'free', cursor);
    expect(first.hint?.id).toBe('all-2');
    const second = selectNextHomeHint(snapshot, 'free', first.cursor);
    expect(second.hint?.id).toBe('all-1');
    const changed = normalizeCursor(second.cursor, { ...snapshot, version: 'v2' });
    expect(changed.snapshotVersion).toBe('v2');
    expect(changed.nextIndexByAudience.free).toBe(0);
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
