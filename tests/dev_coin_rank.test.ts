// зачем (координатор 12.10): dev_state?coinRank=N подменяет ТОЛЬКО показываемое значение хука useMyCoinRank (память процесса), чтобы у гостя
// открывались диалоги. Монеты и ранг в хранилище/облаке не пишутся; в стор-сборке подмена невозможна.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(), removeItem: jest.fn(), multiSet: jest.fn(), multiGet: jest.fn(async () => []), multiRemove: jest.fn() },
}));

import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_coin_rank', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.dontMock('../app/config'); // doMock из теста про стор-сборку не должен переживать в соседние тесты
    jest.resetModules();
  });
  afterEach(() => jest.restoreAllMocks());

  it('parses coinRank=0..19 and off; rejects everything else', () => {
    expect(parseDevStateParams({ coinRank: '6' }).request.coinRank).toBe(6);
    expect(parseDevStateParams({ coinRank: '0' }).request.coinRank).toBe(0);
    expect(parseDevStateParams({ coinRank: 'off' }).request.coinRank).toBe('off');
    for (const bad of ['20', '-1', '1.5', 'six']) {
      expect(parseDevStateParams({ coinRank: bad }).rejected).toHaveProperty('coinRank');
    }
  });

  it('in a dev build the override is set, read back, and cleared', () => {
    const mod = require('../app/dev_coin_rank') as typeof import('../app/dev_coin_rank');
    expect(mod.getDevCoinRankOverride()).toBeNull();
    expect(mod.setDevCoinRankOverride(6)).toBe(true);
    expect(mod.getDevCoinRankOverride()).toBe(6);
    expect(mod.setDevCoinRankOverride(0)).toBe(true);
    expect(mod.getDevCoinRankOverride()).toBe(0); // 0 — тоже значение, не «нет подмены»
    expect(mod.setDevCoinRankOverride(null)).toBe(true);
    expect(mod.getDevCoinRankOverride()).toBeNull();
    expect(mod.setDevCoinRankOverride(20)).toBe(false);
    expect(mod.setDevCoinRankOverride(-1)).toBe(false);
  });

  it('in a store build the setter refuses and the getter is always null', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: true }));
    const mod = require('../app/dev_coin_rank') as typeof import('../app/dev_coin_rank');
    expect(mod.setDevCoinRankOverride(6)).toBe(false);
    expect(mod.getDevCoinRankOverride()).toBeNull();
  });

  it('applyDevState sets the override and never writes coins or rank to storage', async () => {
    const storage = require('@react-native-async-storage/async-storage').default as { setItem: jest.Mock; multiSet: jest.Mock };
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const rank = require('../app/dev_coin_rank') as typeof import('../app/dev_coin_rank');
    const result = await fixtures.applyDevState({ coinRank: 6 });
    expect(result.applied).toHaveProperty('coinRank');
    expect(rank.getDevCoinRankOverride()).toBe(6);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.multiSet).not.toHaveBeenCalled();
  });

  it('the hook only substitutes the returned value; the override module has no storage or cloud code', () => {
    const hook = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use_my_coin_rank.ts'), 'utf8');
    expect(hook).toMatch(/getDevCoinRankOverride\(\) \?\? real/);
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_coin_rank.ts'), 'utf8');
    expect(source).not.toMatch(/AsyncStorage|firebase|firestore|httpsCallable|fetch\(|coin_rank_state_v1|coin_rank_upgrade/);
  });
});
