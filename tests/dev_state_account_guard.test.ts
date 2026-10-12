// зачем (координатор 12.10, безопасность): фикстуры cards=* пишут в синхронизируемые ключи карточек/наборов — на настоящем аккаунте
// (№2/№3) они запрещены. Проверяем: чистая классификация, отказ БЕЗ единой записи, успех на анонимном госте, fail-closed без пользователя.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mockStore.set(k, v)); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStore.has(k) ? mockStore.get(k)! : null])),
  },
}));

let mockCurrentUser: unknown = null;
jest.mock('@react-native-firebase/auth', () => ({ __esModule: true, default: () => ({ currentUser: mockCurrentUser }) }), { virtual: true });

import { assertDisposableGuest, classifyGuestUser } from '../app/dev_state_account_guard';

describe('dev_state_account_guard', () => {
  beforeEach(() => {
    mockStore.clear();
    mockCurrentUser = null;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('classifies users: anonymous without providers is a disposable guest, everything else is not', () => {
    expect(classifyGuestUser({ isAnonymous: true, uid: 'abc123456', providerData: [] })).toEqual({ ok: true, uid: 'abc123456' });
    expect(classifyGuestUser({ isAnonymous: true, uid: 'x', providerData: [{ providerId: 'google.com' }] })).toEqual({ ok: false, reason: 'linked_providers_1' });
    expect(classifyGuestUser({ isAnonymous: false, uid: 'x', providerData: [] })).toEqual({ ok: false, reason: 'not_anonymous' });
    expect(classifyGuestUser({ uid: 'x' })).toEqual({ ok: false, reason: 'not_anonymous' });
    expect(classifyGuestUser(null)).toEqual({ ok: false, reason: 'no_auth_user' });
    expect(classifyGuestUser(undefined)).toEqual({ ok: false, reason: 'no_auth_user' });
  });

  it('assertDisposableGuest is fail-closed with an injected reader', () => {
    expect(() => assertDisposableGuest('cards=empty', () => null)).toThrow('not a disposable guest (no_auth_user)');
    expect(() => assertDisposableGuest('cards=empty', () => ({ isAnonymous: false }))).toThrow('not_anonymous');
    expect(() => assertDisposableGuest('cards=empty', () => ({ isAnonymous: true, uid: 'guest-1', providerData: [] }))).not.toThrow();
  });

  it('every card-writing fixture refuses a signed-in account and writes NOTHING to storage', async () => {
    mockCurrentUser = { isAnonymous: false, uid: 'real-user', providerData: [{ providerId: 'google.com' }] };
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    await expect(demo.applyCustomCards()).rejects.toThrow('not a disposable guest');
    await expect(demo.applyDemoPublished('stable-1')).rejects.toThrow('not a disposable guest');
    await expect(demo.applyNoTranslationCards()).rejects.toThrow('not a disposable guest');
    const empty = await demo.applyCardsEmpty();
    expect(empty.applied).toEqual({});
    expect(Object.keys(empty.skipped)).toEqual(['refused']);
    const full = await demo.applyCardsDemo();
    expect(full.applied).toEqual({});
    expect(Object.keys(full.skipped)).toEqual(['refused']);
    const lessons = await demo.applyCardsDemo({ lessons: true });
    expect(lessons.applied).toEqual({});
    expect(Object.keys(lessons.skipped)).toEqual(['refused']);
    expect(mockStore.size).toBe(0);
    // координатор 12.10: каждая из 6 фикстур (demo, demo_lessons, empty, custom50, demo_published, notranslation) пишет в лог отказ
    const warned = (console.warn as jest.Mock).mock.calls.map((call) => String(call[0]));
    for (const what of ['cards=custom50', 'cards=demo_published', 'cards=notranslation', 'cards=empty', 'cards=demo', 'cards=demo_lessons']) {
      expect(warned.some((line) => line.includes(`[DEV-STATE] ${what} refused: real account`))).toBe(true);
    }
  });

  it('with no auth user (state unknown) the fixtures also refuse — fail-closed', async () => {
    mockCurrentUser = null;
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    const empty = await demo.applyCardsEmpty();
    expect(empty.skipped.refused).toContain('no_auth_user');
    expect(mockStore.size).toBe(0);
  });

  it('the guard module is the only place that touches Firebase Auth (fixture sources stay network-free)', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    for (const file of ['dev_state_fixtures.ts', 'dev_state_cards_demo.ts']) {
      expect(fs.readFileSync(path.join(__dirname, '..', 'app', file), 'utf8')).not.toMatch(/@react-native-firebase/);
    }
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state_cards_demo.ts'), 'utf8')).toMatch(/dev_state_account_guard/);
  });
});
