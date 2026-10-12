// зачем (координатор 12.10, dialogs-003): dev_state?dialogsDone=N|reset отмечает первые N диалогов каталога пройденными (локальная запись, только одноразовый гость) для кадра хаба «пройдено ✓».
const disk: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in disk ? disk[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { disk[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete disk[k]; }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => { delete disk[k]; }); }),
    multiSet: jest.fn(), multiGet: jest.fn(async () => []),
    getAllKeys: jest.fn(async () => Object.keys(disk)),
  },
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => undefined), getCurrentUid: () => null, waitForAnonAuth: async () => false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/account_generation', () => ({ ...jest.requireActual('../app/account_generation'), captureAccountGeneration: () => ({ phase: 'active', generation: 1, stableId: 'guest-1' }) }));
let guestOk = true;
jest.mock('../app/dev_state_account_guard', () => ({
  assertDisposableGuest: () => { if (!guestOk) throw new Error('not_anonymous'); },
}));

import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_state dialogsDone', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.dontMock('../app/config');
    jest.resetModules();
    for (const k of Object.keys(disk)) delete disk[k];
    guestOk = true;
  });
  afterEach(() => jest.restoreAllMocks());

  it('parses N (0..76) and reset; rejects the rest', () => {
    expect(parseDevStateParams({ dialogsDone: '3' }).request.dialogsDone).toBe(3);
    expect(parseDevStateParams({ dialogsDone: 'reset' }).request.dialogsDone).toBe('reset');
    expect(parseDevStateParams({ dialogsDone: '99' }).rejected).toHaveProperty('dialogsDone');
    expect(parseDevStateParams({ dialogsDone: 'all' }).rejected).toHaveProperty('dialogsDone');
  });

  it('marks the first N catalogue scenarios on a disposable guest, and reset wipes them', async () => {
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const store = require('../app/dialogue_v2_done_store') as typeof import('../app/dialogue_v2_done_store');
    const { DIALOGUE_V2_CATALOGUE_INDEX } = require('../shared/dialogue_v2_catalogue_index') as typeof import('../shared/dialogue_v2_catalogue_index');
    await fixtures.applyDevState({ dialogsDone: 3 });
    const ids = DIALOGUE_V2_CATALOGUE_INDEX.slice(0, 3).map((entry) => entry.id);
    expect([...store.peekDialogueV2DoneIds('en')].sort()).toEqual([...ids].sort());
    await fixtures.applyDevState({ dialogsDone: 'reset' });
    expect(store.peekDialogueV2DoneIds('en').size).toBe(0);
  });

  it('on a real (non-guest) account nothing is marked', async () => {
    guestOk = false;
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const store = require('../app/dialogue_v2_done_store') as typeof import('../app/dialogue_v2_done_store');
    await fixtures.applyDevState({ dialogsDone: 3 });
    expect(store.peekDialogueV2DoneIds('en').size).toBe(0);
  });
});
