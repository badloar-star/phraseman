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

describe('arena_i18n', () => {
  it.each<[Lang, Lang]>([
    ['ru', 'ru'],
    ['uk', 'uk'],
    ['es', 'es'],
    ['pt-BR', 'pt-BR'],
    ['vi', 'vi'],
    ['id', 'id'],
    ['tr', 'tr'],
    ['pl', 'pl'],
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
    expect(arenaSecondsSuffix('vi')).toBe(' giây');
    expect(arenaSecondsSuffix('tr')).toBe(' sn');
  });

  it('arenaGameStr returns localized string', () => {
    expect(arenaGameStr('es', 'accept')).toBe('ACEPTAR');
    expect(arenaGameStr('uk', 'decline')).toBe('Відмовити');
    expect(arenaGameStr('pt-BR', 'accept')).toBe('ACEITAR');
    expect(arenaGameStr('vi', 'decline')).toBe('Từ chối');
  });

  it('every arenaToasts entry includes planned interface locales', () => {
    for (const [key, row] of Object.entries(arenaToasts)) {
      expect(row.messageRu.length).toBeGreaterThan(0);
      expect(row.messageUk!.length).toBeGreaterThan(0);
      expect(row.messageEs!.length).toBeGreaterThan(0);
      expect(row.messagePtBr.length).toBeGreaterThan(0);
      expect(row.messageVi.length).toBeGreaterThan(0);
      expect(row.messageId.length).toBeGreaterThan(0);
      expect(row.messageTr.length).toBeGreaterThan(0);
      expect(row.messagePl.length).toBeGreaterThan(0);
      expect(key).toBeTruthy();
    }
  });

  it('keeps arena runtime toasts on localized payload helpers', () => {
    for (const file of ['app/arena_lobby.tsx', 'app/arena_game.tsx']) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).not.toMatch(/emitAppEvent\('action_toast',\s*\{[\s\S]{0,300}\bmessageRu:/);
      expect(source).not.toMatch(/emitAppEvent\('action_toast',\s*\{[\s\S]{0,300}\bmessageUk:/);
      expect(source).not.toMatch(/emitAppEvent\('action_toast',\s*\{[\s\S]{0,300}\bmessageEs:/);
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
    expect(v.subtitle).toMatch(/магазині застосунку/);
  });

  it('general uses AsyncStorage rotation index modulo variant count', async () => {
    asyncStore.review_show_count = '5';
    const v = await getReviewVariant('general', 'es');
    expect(v.emoji).toBe('🚫');
    expect(v.title).toContain('botón');
  });
});
