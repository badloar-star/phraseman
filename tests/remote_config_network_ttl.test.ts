// PM-210 — Remote Config: кэш до сети, метка свежести. 28.10 (владелец через координатора): «онбординг из Пульта должен применяться
// ПРИ КАЖДОМ ЗАПУСКЕ» — холодный старт читает документ ВСЕГДА (1 чтение на запуск), пропуск по свежему кэшу снят.
//
// зачем: владелец, «Firebase-экономия по умолчанию». Кэш remote_config_cache_v1
// применяется до сети; если сеть подтверждала его меньше 6 ч назад — повторное
// чтение remote_config/app пропускается. force-путь обязан идти в сеть всегда
// (рубильники «сейчас»).
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockDocGet = jest.fn();

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/interactive_network_quiet', () => ({
  ...jest.requireActual('../app/interactive_network_quiet'),
  withBackgroundNetworkLease: (_name: string, fn: (lease: { assertCurrent: () => void }) => unknown) =>
    fn({ assertCurrent: () => {} }),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: () => ({
      doc: () => ({ get: mockDocGet }),
    }),
  }),
}));

import {
  loadRemoteConfig,
  refreshRemoteConfigNow,
  REMOTE_CONFIG_NETWORK_TTL_MS,
} from '../app/remote_config_client';
import { __resetRemoteFlagsForTest } from '../app/remote_flags';

const CACHE_KEY = 'remote_config_cache_v1';
const FETCHED_AT_KEY = 'remote_config_fetched_at_v1';
const NOW = 1_800_000_000_000;

async function seedCache(fetchedAtMs: number | null): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ numbers: {}, bools: { force_update_enabled: false }, texts: {} }));
  if (fetchedAtMs !== null) await AsyncStorage.setItem(FETCHED_AT_KEY, String(fetchedAtMs));
}

describe('remote config network TTL (PM-210)', () => {
  beforeEach(async () => {
    __resetRemoteFlagsForTest();
    await AsyncStorage.clear();
    mockDocGet.mockReset();
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ bools: { force_update_enabled: true } }) });
  });

  it('reads the network when there is no cache and stamps the cache', async () => {
    await loadRemoteConfig({ nowMs: NOW });
    expect(mockDocGet).toHaveBeenCalledTimes(1);
    // multiSet пишется фоном — даём микрозадачам доехать.
    await new Promise((resolve) => setImmediate(resolve));
    expect(await AsyncStorage.getItem(FETCHED_AT_KEY)).toBe(String(NOW));
    expect(await AsyncStorage.getItem(CACHE_KEY)).toContain('force_update_enabled');
  });

  it('reads the network once on a cold start even with a fresh cache (owner 28.10: Pult on every launch)', async () => {
    await seedCache(NOW - 60 * 60 * 1000);
    await loadRemoteConfig({ nowMs: NOW });
    expect(mockDocGet).toHaveBeenCalledTimes(1);
  });

  it('reads the network once the cache is older than the TTL', async () => {
    await seedCache(NOW - REMOTE_CONFIG_NETWORK_TTL_MS - 1);
    await loadRemoteConfig({ nowMs: NOW });
    expect(mockDocGet).toHaveBeenCalledTimes(1);
  });

  it('treats a legacy cache without a fetch stamp as stale', async () => {
    await seedCache(null);
    await loadRemoteConfig({ nowMs: NOW });
    expect(mockDocGet).toHaveBeenCalledTimes(1);
  });

  it('does not trust a fetch stamp from the future (clock moved back)', async () => {
    await seedCache(NOW + 60_000);
    await loadRemoteConfig({ nowMs: NOW });
    expect(mockDocGet).toHaveBeenCalledTimes(1);
  });

  it('force path always reads the network, even with a fresh cache', async () => {
    await seedCache(NOW - 1_000);
    await loadRemoteConfig({ nowMs: NOW, force: true });
    expect(mockDocGet).toHaveBeenCalledTimes(1);
    await refreshRemoteConfigNow();
    expect(mockDocGet).toHaveBeenCalledTimes(2);
  });

  it('keeps the TTL at 6 hours', () => {
    expect(REMOTE_CONFIG_NETWORK_TTL_MS).toBe(6 * 60 * 60 * 1000);
  });
});
