/**
 * Regression for RU / UK / ES branching (triples, bundles, arena toasts, in-app review copy).
 */

const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => asyncStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      asyncStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete asyncStore[key];
    }),
  },
}));

jest.mock('expo-store-review', () => ({
  hasAction: jest.fn(async () => false),
  requestReview: jest.fn(async () => {}),
}));

import { actionToastTri } from '../app/events';
import { getReviewVariant } from '../app/review_utils';
import {
  arenaBilingualFirst,
  arenaGameStr,
  arenaSecondsSuffix,
  arenaToasts,
  arenaUiLang,
} from '../constants/arena_i18n';
import { bundleLang, legacyRuUk, triLang, type Lang } from '../constants/i18n';

beforeEach(() => {
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
});

const triple = { ru: 'RU', uk: 'UK', es: 'ES' };

describe('triLang', () => {
  it.each<[Lang, string]>([
    ['ru', 'RU'],
    ['uk', 'UK'],
    ['es', 'ES'],
  ])('lang=%s → %s', (lang, expected) => {
    expect(triLang(lang, triple)).toBe(expected);
  });
});

describe('legacyRuUk / bundleLang (UiBundle parity)', () => {
  it.each<[Lang, 'ru' | 'uk' | 'es']>([
    ['ru', 'ru'],
    ['uk', 'uk'],
    ['es', 'es'],
  ])('legacyRuUk(%s)', (lang, code) => {
    expect(legacyRuUk(lang)).toBe(code);
  });

  it.each<[Lang, 'ru' | 'uk' | 'es']>([
    ['ru', 'ru'],
    ['uk', 'uk'],
    ['es', 'es'],
  ])('bundleLang(%s)', (lang, code) => {
    expect(bundleLang(lang)).toBe(code);
  });
});

describe('actionToastTri', () => {
  it('maps ru/uk/es to toast payload shape', () => {
    expect(
      actionToastTri('success', {
        ru: 'Готово',
        uk: 'Готово',
        es: 'Listo',
      }),
    ).toEqual({
      type: 'success',
      messageRu: 'Готово',
      messageUk: 'Готово',
      messageEs: 'Listo',
    });
  });
});

describe('arena_i18n', () => {
  it.each<[Lang, 'ru' | 'uk' | 'es']>([
    ['ru', 'ru'],
    ['uk', 'uk'],
    ['es', 'es'],
  ])('arenaUiLang(%s)', (lang, code) => {
    expect(arenaUiLang(lang)).toBe(code);
  });

  it('arenaBilingualFirst picks segment by lang', () => {
    const s = 'A · B · C';
    expect(arenaBilingualFirst(s, 'ru')).toBe('A');
    expect(arenaBilingualFirst(s, 'uk')).toBe('B');
    expect(arenaBilingualFirst(s, 'es')).toBe('C');
    expect(arenaBilingualFirst('solo', 'es')).toBe('solo');
  });

  it('arenaSecondsSuffix uses spaced s only for ES', () => {
    expect(arenaSecondsSuffix('ru')).toMatch(/с$/);
    expect(arenaSecondsSuffix('es')).toBe(' s');
  });

  it('arenaGameStr returns localized string', () => {
    expect(arenaGameStr('es', 'accept')).toBe('ACEPTAR');
    expect(arenaGameStr('uk', 'decline')).toBe('Відмовити');
  });

  it('every arenaToasts entry includes messageEs', () => {
    for (const [key, row] of Object.entries(arenaToasts)) {
      expect(row.messageRu.length).toBeGreaterThan(0);
      expect(row.messageUk!.length).toBeGreaterThan(0);
      expect(row.messageEs!.length).toBeGreaterThan(0);
      expect(key).toBeTruthy();
    }
  });
});

describe('getReviewVariant (localized by Lang)', () => {
  it('perfect_lesson in Spanish uses es strings', async () => {
    const v = await getReviewVariant('perfect_lesson', 'es');
    expect(v.title).toContain('Cero errores');
    expect(v.btnYes).toContain('reseña');
  });

  it('arena_win in Ukrainian uses uk strings', async () => {
    const v = await getReviewVariant('arena_win', 'uk');
    expect(v.title).toContain('Переможець');
    expect(v.subtitle).toMatch(/App Store/);
  });

  it('general uses AsyncStorage rotation index modulo variant count', async () => {
    asyncStore.review_show_count = '5';
    const v = await getReviewVariant('general', 'es');
    // 5 % 3 → variant index 2 (emoji 🚫)
    expect(v.emoji).toBe('🚫');
    expect(v.title).toContain('botón');
  });
});
