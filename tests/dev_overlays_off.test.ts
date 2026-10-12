// зачем (координатор 12.10, cards-009/010): dev_state?overlays=off гасит окна рассылок/объявлений/сообщений на корневом экране (только память), а onboarding=done ставит
// отметку завершения онбординга, чтобы тестовый гость вёл себя как настоящий новичок (ворота app/fresh_install_gate.ts) и просил повторную сверку окон.
import fs from 'node:fs';
import path from 'node:path';

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete store[k]; }),
    multiSet: jest.fn(), multiGet: jest.fn(async () => []), multiRemove: jest.fn(),
  },
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => undefined), getCurrentUid: () => null, waitForAnonAuth: async () => false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_overlays_off', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.dontMock('../app/config');
    jest.resetModules();
    for (const key of Object.keys(store)) delete store[key];
  });
  afterEach(() => jest.restoreAllMocks());

  it('parses overlays=on|off; rejects anything else', () => {
    expect(parseDevStateParams({ overlays: 'off' }).request.overlays).toBe('off');
    expect(parseDevStateParams({ overlays: 'on' }).request.overlays).toBe('on');
    expect(parseDevStateParams({ overlays: 'maybe' }).rejected).toHaveProperty('overlays');
  });

  it('in a dev build the flag is on after overlays=off, notifies subscribers and returns to normal on overlays=on', () => {
    const dev = require('../app/dev_overlays_off') as typeof import('../app/dev_overlays_off');
    const seen: string[] = [];
    const unsubscribe = dev.subscribeDevOverlays(() => seen.push(dev.getDevOverlaysSnapshot()));
    expect(dev.isDevOverlaysOff()).toBe(false);
    expect(dev.setDevOverlaysOff(true)).toBe(true);
    expect(dev.isDevOverlaysOff()).toBe(true);
    expect(dev.setDevOverlaysOff(false)).toBe(true);
    expect(dev.isDevOverlaysOff()).toBe(false);
    unsubscribe();
    expect(seen).toEqual(['1:0', '0:0']);
  });

  it('onboarding=done writes the completion timestamp "now", so the fresh-install gate calls the guest a newcomer, and asks for a re-check', async () => {
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const gate = require('../app/fresh_install_gate') as typeof import('../app/fresh_install_gate');
    const dev = require('../app/dev_overlays_off') as typeof import('../app/dev_overlays_off');
    expect((await gate.readFreshInstallVerdict()).reason).toBe('no_timestamp');
    const before = dev.getDevOverlaysSnapshot();
    const result = await fixtures.applyDevState({ onboarding: 'done' });
    expect(result.applied).toHaveProperty('onboarding');
    expect(store.onboarding_done).toBe('1');
    expect(Number(store[gate.ONBOARDING_COMPLETED_AT_KEY])).toBeGreaterThan(Date.now() - 60_000);
    const verdict = await gate.readFreshInstallVerdict();
    expect(verdict.fresh).toBe(true);
    expect(verdict.reason).toBe('recent');
    expect(dev.getDevOverlaysSnapshot()).not.toBe(before); // счётчик повторной сверки вырос
  });

  it('in a store build the setter refuses, the flag stays off and the snapshot is constant', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: true, IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
    const dev = require('../app/dev_overlays_off') as typeof import('../app/dev_overlays_off');
    expect(dev.setDevOverlaysOff(true)).toBe(false);
    expect(dev.isDevOverlaysOff()).toBe(false);
    dev.requestDevOverlayRecheck('store');
    expect(dev.getDevOverlaysSnapshot()).toBe('0:0');
  });

  it('the module writes nothing: no storage, cloud or message-read marks', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_overlays_off.ts'), 'utf8');
    expect(source).not.toMatch(/AsyncStorage|firebase|firestore|httpsCallable|markRead|fetch\(/);
  });
});
