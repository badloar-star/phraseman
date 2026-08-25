import { collectibleSets } from '../app/collectibles/catalog';
import { ioniconForSetIcon } from '../app/collectibles/set_icons';

// Набор валидных имён Ionicons, которые реально используются в маппинге.
// Если карта вернёт что-то вне этого набора — тест поймает опечатку.
const KNOWN_IONICONS = new Set([
  'paw',
  'restaurant',
  'cloud',
  'cash',
  'flame',
  'time',
  'hand-left',
  'airplane',
  'briefcase',
  'home',
  'heart',
  'trophy',
  'musical-notes',
  'book',
  'color-palette',
  'shirt',
  'water',
  'star',
  'leaf',
  'business',
  'moon',
  'scale',
  'shield',
  'bulb',
  'chatbubbles',
  'people',
  'gift',
  'heart-circle',
  'flag',
  'albums', // фолбэк
]);

describe('ioniconForSetIcon', () => {
  it('every catalog set icon maps to a known Ionicons name (no silent fallback)', () => {
    const fallbackUsed: string[] = [];
    for (const set of collectibleSets()) {
      const name = ioniconForSetIcon(set.icon);
      expect(KNOWN_IONICONS.has(name)).toBe(true);
      // Реальный набор иконок каталога должен иметь явный маппинг — фолбэк здесь
      // означал бы незамапленную иконку. Собираем такие, чтобы тест указал на них.
      if (name === 'albums') fallbackUsed.push(set.icon);
    }
    expect(fallbackUsed).toEqual([]);
  });

  it('all 30 sets resolve to an icon', () => {
    expect(collectibleSets().length).toBe(30);
    for (const set of collectibleSets()) {
      expect(typeof ioniconForSetIcon(set.icon)).toBe('string');
      expect(ioniconForSetIcon(set.icon).length).toBeGreaterThan(0);
    }
  });

  it('unknown icon name falls back to a neutral icon', () => {
    expect(ioniconForSetIcon('definitely-not-a-real-icon')).toBe('albums');
    expect(ioniconForSetIcon('')).toBe('albums');
  });
});
