import {
  PROFILE_CARD_LEVELS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_SELLING_POINTS,
  fxKindForProfileCard,
  sellingPointText,
  type ProfileCardLevel,
  type ProfileCardMotion,
} from '../app/profile_card_system';

const APP_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));

const ALL_LEVELS: ProfileCardLevel[] = [0, 1, 2, 3, 4, 5];

describe('fxKindForProfileCard — маппинг уровень → визуальный эффект', () => {
  it('уровень 0 не даёт никакого эффекта при любом motion', () => {
    expect(fxKindForProfileCard(0, 'none')).toBe('none');
    expect(fxKindForProfileCard(0, 'elite')).toBe('none');
  });

  it('уровень 1 = sheen (проблеск канта)', () => {
    expect(fxKindForProfileCard(1, 'none')).toBe('sheen');
  });

  it('уровень 2 = breath (дыхание ореола)', () => {
    expect(fxKindForProfileCard(2, 'none')).toBe('breath');
  });

  it('уровень 3 = runner, но только если выбран motion (не none)', () => {
    expect(fxKindForProfileCard(3, 'gleam')).toBe('runner');
    expect(fxKindForProfileCard(3, 'particles')).toBe('runner');
    expect(fxKindForProfileCard(3, 'none')).toBe('none');
  });

  it('уровень 4 = holo при выбранном motion, но breath при Calm (выбор уважается)', () => {
    expect(fxKindForProfileCard(4, 'gleam')).toBe('holo');
    expect(fxKindForProfileCard(4, 'none')).toBe('breath');
  });

  it('уровень 5 = elite при выбранном motion, но breath при Calm (выбор уважается)', () => {
    expect(fxKindForProfileCard(5, 'elite')).toBe('elite');
    expect(fxKindForProfileCard(5, 'none')).toBe('breath');
  });

  it('эффект усиливается монотонно по уровню при выбранном motion (none → sheen → breath → … → elite)', () => {
    const order = ['none', 'sheen', 'breath', 'runner', 'holo', 'elite'];
    const motion: ProfileCardMotion = 'gleam'; // даём motion, чтобы уровень 3 был runner
    const got = ALL_LEVELS.map((lvl) => fxKindForProfileCard(lvl, motion));
    expect(got).toEqual(order);
  });

  it('Calm (motion=none) уважается на всех уровнях: ур.3 без движения, ур.4-5 спокойный breath', () => {
    expect(fxKindForProfileCard(3, 'none')).toBe('none');
    expect(fxKindForProfileCard(4, 'none')).toBe('breath');
    expect(fxKindForProfileCard(5, 'none')).toBe('breath');
  });
});

describe('PROFILE_CARD_LEVEL_NAME_RU — русские имена уровней', () => {
  it('есть имя для каждого из 6 уровней', () => {
    ALL_LEVELS.forEach((lvl) => {
      expect(typeof PROFILE_CARD_LEVEL_NAME_RU[lvl]).toBe('string');
      expect(PROFILE_CARD_LEVEL_NAME_RU[lvl].length).toBeGreaterThan(0);
    });
  });

  it('имена различны (нет двух одинаковых уровней)', () => {
    const names = ALL_LEVELS.map((lvl) => PROFILE_CARD_LEVEL_NAME_RU[lvl]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('PROFILE_CARD_SELLING_POINTS — продающие буллеты', () => {
  it('у каждого уровня есть хотя бы 2 пункта', () => {
    ALL_LEVELS.forEach((lvl) => {
      expect(PROFILE_CARD_SELLING_POINTS[lvl].length).toBeGreaterThanOrEqual(2);
    });
  });

  it('каждый платный уровень (1–5) содержит хотя бы один NEW-пункт — есть за что платить', () => {
    ([1, 2, 3, 4, 5] as ProfileCardLevel[]).forEach((lvl) => {
      const hasNew = PROFILE_CARD_SELLING_POINTS[lvl].some((p) => p.isNew);
      expect(hasNew).toBe(true);
    });
  });

  it('каждый буллет переведён на ВСЕ 8 языков приложения, тексты непустые', () => {
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

  it('sellingPointText отдаёт перевод по языку, с откатом на ru для неизвестного', () => {
    const p = PROFILE_CARD_SELLING_POINTS[1][0];
    expect(sellingPointText(p, 'es')).toBe(p.text.es);
    expect(sellingPointText(p, 'tr')).toBe(p.text.tr);
    expect(sellingPointText(p, 'xx')).toBe(p.text.ru); // неизвестный язык → ru-фолбэк
  });
});

describe('консистентность с PROFILE_CARD_LEVELS', () => {
  it('число уровней = MAX_LEVEL + 1, и для каждого есть имя и буллеты', () => {
    expect(PROFILE_CARD_LEVELS.length).toBe(PROFILE_CARD_MAX_LEVEL + 1);
    PROFILE_CARD_LEVELS.forEach((def) => {
      expect(PROFILE_CARD_LEVEL_NAME_RU[def.level]).toBeDefined();
      expect(PROFILE_CARD_SELLING_POINTS[def.level]).toBeDefined();
    });
  });
});
