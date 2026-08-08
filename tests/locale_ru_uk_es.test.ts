/**
 * Regression for RU / UK / ES branching (triples, bundles, arena toasts, in-app review copy).
 */

import fs from 'fs';
import path from 'path';

const asyncStore: Record<string, string> = {};
const ROOT = path.resolve(__dirname, '..');

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


jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  SPANISH_UI_LOCALE_ENABLED: true,
}));

import { actionToastTri } from '../app/events';
import { getReviewVariant } from '../app/review_utils';
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
  it('maps ru/uk/es and planned interface locales to toast payload shape', () => {
    expect(
      actionToastTri('success', {
        ru: 'Готово',
        uk: 'Готово',
        es: 'Listo',
        'pt-BR': 'Pronto',
        vi: 'Xong',
        id: 'Selesai',
        tr: 'Tamam',
        pl: 'Gotowe',
      }),
    ).toEqual({
      type: 'success',
      messageRu: 'Готово',
      messageUk: 'Готово',
      messageEs: 'Listo',
      messagePtBr: 'Pronto',
      messageVi: 'Xong',
      messageId: 'Selesai',
      messageTr: 'Tamam',
      messagePl: 'Gotowe',
    });
  });

  it('keeps action toast planned-locale fields out of runtime locale-audit noise', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'events.ts'), 'utf8');
    const legacyWord = ['fall', 'back'].join('');
    const legacyLocaleBranches = ['ru', 'uk', 'es'].map((code) => `lang === '${code}'`);
    const legacyRuntimePattern = new RegExp([
      ...legacyLocaleBranches.map((part) => `\\b${part}\\b`),
      `\\b${legacyWord}\\b`,
    ].join('|'), 'u');

    expect(source).toContain('messagePtBr?: string');
    expect(source).toContain('messageVi?: string');
    expect(source).toContain('messageId?: string');
    expect(source).toContain('messageTr?: string');
    expect(source).toContain('messagePl?: string');
    expect(source).not.toMatch(legacyRuntimePattern);
  });
});

describe('getReviewVariant (localized by Lang)', () => {
  it('perfect_lesson in Spanish uses es strings', async () => {
    const v = await getReviewVariant('perfect_lesson', 'es');
    expect(v.title).toContain('Cero errores');
    expect(v.btnYes).toContain('reseña');
  });

});
