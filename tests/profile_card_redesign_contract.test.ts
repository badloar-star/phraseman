import {
  PROFILE_CARD_GRADIENTS,
  PROFILE_CARD_LEVELS,
  PROFILE_CARD_LEVEL_COSTS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_SELLING_POINTS,
  PROFILE_CARD_SURFACES,
  PROFILE_CARD_THEME_COLORS,
  fxKindForProfileCard,
  themeForProfileCardLevel,
  sellingPointText,
  type ProfileCardLevel,
} from '../app/profile_card_system';

const APP_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const ALL_LEVELS: ProfileCardLevel[] = [0, 1, 2, 3, 4, 5];

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));

describe('fxKindForProfileCard — a distinct living effect per paid level', () => {
  // РЕШЕНИЕ 2026-07-05: прошлый холд фичи был «уровни визуально не отличаются».
  // Контракт: у каждого платного уровня СВОЙ эффект, база — без анимации.
  it('keeps the base card still and gives every paid level its own effect', () => {
    expect(fxKindForProfileCard(0, 'none')).toBe('none');
    expect(fxKindForProfileCard(1, 'none')).toBe('sheen');
    expect(fxKindForProfileCard(2, 'none')).toBe('emerald');
    expect(fxKindForProfileCard(3, 'none')).toBe('sapphire');
    expect(fxKindForProfileCard(4, 'none')).toBe('amethyst');
    expect(fxKindForProfileCard(5, 'none')).toBe('legend');
  });

  it('every paid level has a unique fx kind', () => {
    const kinds = ALL_LEVELS.slice(1).map((lvl) => fxKindForProfileCard(lvl, 'none'));
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe('themes — a distinct visual identity per level', () => {
  it('maps every level to its own theme with its own colors and gradient', () => {
    const themes = ALL_LEVELS.map((lvl) => themeForProfileCardLevel(lvl));
    expect(themes).toEqual(['classic', 'gold', 'emerald', 'sapphire', 'amethyst', 'legend']);
    expect(new Set(themes).size).toBe(themes.length);
    const accents = themes.map((theme) => PROFILE_CARD_THEME_COLORS[theme].accent);
    expect(new Set(accents).size).toBe(accents.length);
    themes.forEach((theme) => {
      expect(PROFILE_CARD_GRADIENTS[theme]).toHaveLength(3);
      expect(PROFILE_CARD_SURFACES[theme].surface).toBeTruthy();
      expect(PROFILE_CARD_SURFACES[theme].surfaceBorder).toBeTruthy();
    });
  });
});

describe('PROFILE_CARD_LEVEL_NAME_RU — the 5-level ladder', () => {
  it('has a name for every level of the ladder', () => {
    expect(PROFILE_CARD_LEVEL_NAME_RU[0]).toBe('Стандарт');
    expect(PROFILE_CARD_LEVEL_NAME_RU[1]).toBe('Phraseman Pro');
    expect(PROFILE_CARD_LEVEL_NAME_RU[2]).toBe('Изумруд');
    expect(PROFILE_CARD_LEVEL_NAME_RU[3]).toBe('Сапфир');
    expect(PROFILE_CARD_LEVEL_NAME_RU[4]).toBe('Аметист');
    expect(PROFILE_CARD_LEVEL_NAME_RU[5]).toBe('Легенда');
    expect(Object.keys(PROFILE_CARD_LEVEL_NAME_RU).sort()).toEqual(['0', '1', '2', '3', '4', '5']);
  });
});

describe('PROFILE_CARD_LEVEL_COSTS — ascending ladder prices', () => {
  it('every next level costs strictly more than the previous', () => {
    expect(PROFILE_CARD_LEVEL_COSTS).toEqual({ 1: 200, 2: 450, 3: 800, 4: 1400, 5: 2400 });
    const prices = [1, 2, 3, 4, 5].map((lvl) => PROFILE_CARD_LEVEL_COSTS[lvl as 1 | 2 | 3 | 4 | 5]);
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });
});

describe('PROFILE_CARD_SELLING_POINTS — value props per level', () => {
  it('has bullets for the base card and every upgrade', () => {
    ALL_LEVELS.forEach((lvl) => {
      expect(PROFILE_CARD_SELLING_POINTS[lvl].length).toBeGreaterThanOrEqual(2);
    });
    ALL_LEVELS.slice(1).forEach((lvl) => {
      expect(PROFILE_CARD_SELLING_POINTS[lvl].some((p) => p.isNew)).toBe(true);
    });
  });

  it('translates every bullet for all app languages', () => {
    ALL_LEVELS.forEach((lvl) => {
      PROFILE_CARD_SELLING_POINTS[lvl].forEach((p) => {
        APP_LANGS.forEach((lang) => {
          const txt = (p.text as Record<string, string>)[lang];
          expect(typeof txt).toBe('string');
          expect(txt.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  it('sellingPointText returns requested language or falls back to ru', () => {
    const p = PROFILE_CARD_SELLING_POINTS[1][0];
    expect(sellingPointText(p, 'es')).toBe(p.text.es);
    expect(sellingPointText(p, 'tr')).toBe(p.text.tr);
    expect(sellingPointText(p, 'xx')).toBe(p.text.ru);
  });
});

describe('consistency with PROFILE_CARD_LEVELS', () => {
  it('has exactly max + 1 definitions and no hidden levels', () => {
    expect(PROFILE_CARD_MAX_LEVEL).toBe(5);
    expect(PROFILE_CARD_LEVELS.length).toBe(PROFILE_CARD_MAX_LEVEL + 1);
    expect(PROFILE_CARD_LEVELS.map((def) => def.level)).toEqual([0, 1, 2, 3, 4, 5]);
    PROFILE_CARD_LEVELS.forEach((def) => {
      expect(PROFILE_CARD_LEVEL_NAME_RU[def.level]).toBeDefined();
      expect(PROFILE_CARD_SELLING_POINTS[def.level]).toBeDefined();
    });
  });
});
