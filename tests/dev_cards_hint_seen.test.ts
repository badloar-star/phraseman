// зачем (Макеты cards-section-012, 12.10): разовая подсказка «Зажми карточку…» не должна висеть на кадрах свежего гостя — фикстуры карточек помечают её увиденной, hint=show возвращает (cards-033).
// Только анонимный гость: ключ синхронизируется (cloud_sync). Плавающая «Тренировать» на экране набора не рисуется (кнопка уже в шапке набора).
import fs from 'node:fs';
import path from 'node:path';

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete store[k]; }),
    multiSet: jest.fn(), multiGet: jest.fn(async () => []), multiRemove: jest.fn(), getAllKeys: jest.fn(async () => Object.keys(store)),
  },
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => undefined), getCurrentUid: () => null, waitForAnonAuth: async () => false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
let guestOk = true;
jest.mock('../app/dev_state_account_guard', () => ({
  assertDisposableGuest: () => { if (!guestOk) throw new Error('not_anonymous'); },
}));

import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_state hint', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.dontMock('../app/config');
    jest.resetModules();
    for (const k of Object.keys(store)) delete store[k];
    guestOk = true;
  });
  afterEach(() => jest.restoreAllMocks());

  it('parses hint=show|seen; rejects the rest', () => {
    expect(parseDevStateParams({ hint: 'show' }).request.hint).toBe('show');
    expect(parseDevStateParams({ hint: 'seen' }).request.hint).toBe('seen');
    expect(parseDevStateParams({ hint: 'x' }).rejected).toHaveProperty('hint');
  });

  it('hint=seen writes the flag, hint=show removes it, on a disposable guest', async () => {
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    const keys = require('../app/target_storage_keys') as typeof import('../app/target_storage_keys');
    const key = keys.flashcardsDeleteHintSeenKey('en');
    await demo.applyDeleteHintState('seen');
    expect(store[key]).toBe('1');
    await demo.applyDeleteHintState('show');
    expect(key in store).toBe(false);
  });

  it('on a real account nothing is written', async () => {
    guestOk = false;
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    await expect(demo.applyDeleteHintState('seen')).rejects.toThrow('not_anonymous');
    expect(Object.keys(store)).toHaveLength(0);
  });

  it('the cards view-prefs reset marks the hint seen; the pack screen has no floating train button', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(read('app/dev_state_cards_demo.ts')).toContain("await AsyncStorage.setItem(flashcardsDeleteHintSeenKey(TARGET), '1');");
    expect(read('app/flashcards_collection.tsx')).toContain('onTrain={listCards.length > 0 && !packSurface && !undoEntry && !packUndo ? onTrainGallery : null}');
  });
});
