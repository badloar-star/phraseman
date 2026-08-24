const configureBootstrap = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { multiGet: jest.fn(async () => []) },
}));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({ collection: jest.fn() })),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000001',
}));
jest.mock('../modules/phone-state/database', () => ({ openPhoneStateDatabase: jest.fn() }));
jest.mock('../app/phone_state_bootstrap', () => ({
  configurePhoneStateBootstrapRuntime: (value: unknown) => configureBootstrap(value),
  defaultPhoneStateBootstrapDependencies: {
    resolveAuthoritativeStableUid: async (stableUid: string) => stableUid,
    resolveAccountContext: jest.fn(),
    isRuntimeTokenCurrent: () => true,
  },
}));
jest.mock('../app/phone_state_health', () => ({
  configurePhoneStateHealthStorage: jest.fn(),
  createPhoneStateHealthSqlStorage: jest.fn(),
}));
jest.mock('../app/phone_state_progress_cutover', () => ({ configurePhoneStateProgressCutover: jest.fn() }));
jest.mock('../app/phone_state_shadow_adapters', () => ({ configurePhoneStateShadowRuntime: jest.fn() }));
jest.mock('../app/phone_state_sync_lifecycle', () => ({ configurePhoneStateSyncLifecycleRuntime: jest.fn() }));

import { installPhoneStateProductionRuntime } from '../app/phone_state_runtime';

test('production runtime installs exactly one concrete bootstrap dependency graph', () => {
  installPhoneStateProductionRuntime();
  installPhoneStateProductionRuntime();
  expect(configureBootstrap).toHaveBeenCalledTimes(1);
  expect(configureBootstrap.mock.calls[0][0]).toEqual(expect.objectContaining({
    openAccount: expect.any(Function),
    importLegacy: expect.any(Function),
    compareShadow: expect.any(Function),
    installDormantSync: expect.any(Function),
  }));
});
