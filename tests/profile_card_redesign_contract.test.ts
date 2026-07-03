import {
  PROFILE_CARD_LEVELS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_SELLING_POINTS,
  fxKindForProfileCard,
  sellingPointText,
  type ProfileCardLevel,
} from '../app/profile_card_system';

const APP_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const ALL_LEVELS: ProfileCardLevel[] = [0, 1];

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));

describe('fxKindForProfileCard — one-step Pro effect', () => {
  it('keeps the base card still and gives Pro a single sheen effect', () => {
    expect(fxKindForProfileCard(0, 'none')).toBe('none');
    expect(fxKindForProfileCard(1, 'none')).toBe('sheen');
  });
});

describe('PROFILE_CARD_LEVEL_NAME_RU — one paid level', () => {
  it('has a name for base and Pro only', () => {
    expect(PROFILE_CARD_LEVEL_NAME_RU[0]).toBe('Стандарт');
    expect(PROFILE_CARD_LEVEL_NAME_RU[1]).toBe('Phraseman Pro');
    expect(Object.keys(PROFILE_CARD_LEVEL_NAME_RU).sort()).toEqual(['0', '1']);
  });
});

describe('PROFILE_CARD_SELLING_POINTS — Pro value props', () => {
  it('has bullets for the base card and new Pro upgrade', () => {
    ALL_LEVELS.forEach((lvl) => {
      expect(PROFILE_CARD_SELLING_POINTS[lvl].length).toBeGreaterThanOrEqual(2);
    });
    expect(PROFILE_CARD_SELLING_POINTS[1].some((p) => p.isNew)).toBe(true);
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
    expect(PROFILE_CARD_MAX_LEVEL).toBe(1);
    expect(PROFILE_CARD_LEVELS.length).toBe(PROFILE_CARD_MAX_LEVEL + 1);
    expect(PROFILE_CARD_LEVELS.map((def) => def.level)).toEqual([0, 1]);
    PROFILE_CARD_LEVELS.forEach((def) => {
      expect(PROFILE_CARD_LEVEL_NAME_RU[def.level]).toBeDefined();
      expect(PROFILE_CARD_SELLING_POINTS[def.level]).toBeDefined();
    });
  });
});
