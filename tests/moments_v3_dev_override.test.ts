// зачем (координатор 15.10, кадры Сверки моментов v3): phraseman://dev_state?moments=v3 включает moments_v3 на устройстве без удалённого конфига, off — выключает,
// inherit — снимает подмену; в стор-сборке (__DEV__=false) переключатель ничего не делает.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
    setItem: (k: string, v: string) => { mockStore.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { mockStore.delete(k); return Promise.resolve(); },
  },
}));
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: () => Promise.resolve(null) }));
jest.mock('../app/events', () => ({ onAppEvent: () => () => undefined }));

import fs from 'node:fs';
import path from 'node:path';

const g = globalThis as typeof globalThis & { __DEV__?: boolean };

describe('dev_state moments=v3|off|inherit', () => {
  beforeEach(() => { jest.resetModules(); mockStore.clear(); });

  it('dev-сборка: v3 → включено и сохранено, off → выключено, inherit → как в конфиге (false)', async () => {
    g.__DEV__ = true;
    const flag = await import('../components/streak/moments/use_moments_v3_flag');
    expect(flag.isMomentsV3FlagOn()).toBe(false);
    await flag.setMomentsV3DevOverride(true);
    expect(flag.isMomentsV3FlagOn()).toBe(true);
    expect(mockStore.get('dev_moments_v3_override')).toBe('1');
    await flag.setMomentsV3DevOverride(false);
    expect(flag.isMomentsV3FlagOn()).toBe(false);
    await flag.setMomentsV3DevOverride(null);
    expect(mockStore.has('dev_moments_v3_override')).toBe(false);
    expect(flag.isMomentsV3FlagOn()).toBe(false);
  });

  it('стор-сборка: переключатель игнорируется', async () => {
    g.__DEV__ = false;
    const flag = await import('../components/streak/moments/use_moments_v3_flag');
    await flag.setMomentsV3DevOverride(true);
    expect(flag.isMomentsV3FlagOn()).toBe(false);
    expect(mockStore.size).toBe(0);
  });

  it('ссылка dev_state знает параметр moments', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state_fixtures.ts'), 'utf8');
    expect(src).toContain("request.moments = pick('moments', ['v3', 'off', 'inherit'] as const);");
    expect(src).toContain("await setMomentsV3DevOverride(request.moments === 'inherit' ? null : request.moments === 'v3');");
  });
});
