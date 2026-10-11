// зачем (координатор 12.10): проверка режима энергии Б на эмуляторе без рубильника в проде — локальный override режима и быстрая установка энергии.
// Только dev-сборка; в релизе функции ничего не делают. Поздняя загрузка с диска не затирает выбор, сделанный раньше.
const mockStore = new Map<string, string>();
const mockEmit = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
  },
}));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));
jest.mock('../app/storage_mutex', () => ({ withStorageLock: async (fn: () => Promise<unknown>) => fn() }));
jest.mock('../app/energy_system', () => ({ ENERGY_STORAGE_KEY: 'energy_state' }));
jest.mock('../app/energy_state_v2', () => ({
  coerceEnergyStateV2: (parsed: { current?: number } | null) => ({ current: parsed?.current ?? 5, lastSettledAt: 1 }),
}));

describe('dev_energy_tools', () => {
  beforeEach(() => { jest.resetModules(); mockStore.clear(); mockEmit.mockClear(); (globalThis as { __DEV__?: boolean }).__DEV__ = true; });

  test('override режима: выбор сохраняется, шлёт событие и виден синхронно', async () => {
    const tools = require('../app/dev_energy_tools');
    expect(tools.peekDevEnergyModeOverride()).toBeNull();
    await expect(tools.setDevEnergyModeOverride('mistake_charge')).resolves.toBe(true);
    expect(tools.peekDevEnergyModeOverride()).toBe('mistake_charge');
    expect(mockStore.get('dev_energy_mode_override_v1')).toBe('mistake_charge');
    expect(mockEmit).toHaveBeenCalledWith('remote_config_changed');
  });

  test('«как на сервере» снимает override и ключ', async () => {
    const tools = require('../app/dev_energy_tools');
    await tools.setDevEnergyModeOverride('start_charge');
    await tools.setDevEnergyModeOverride(null);
    expect(tools.peekDevEnergyModeOverride()).toBeNull();
    expect(mockStore.has('dev_energy_mode_override_v1')).toBe(false);
  });

  test('после «перезапуска» процесса override читается с диска', async () => {
    mockStore.set('dev_energy_mode_override_v1', 'mistake_charge');
    const tools = require('../app/dev_energy_tools');
    await tools.loadDevEnergyModeOverride();
    expect(tools.peekDevEnergyModeOverride()).toBe('mistake_charge');
  });

  test('энергия: значение зажимается в 0..5, часы восстановления перезапускаются, экраны перечитывают состояние', async () => {
    const tools = require('../app/dev_energy_tools');
    await expect(tools.devSetEnergy(1)).resolves.toBe(true);
    const saved = JSON.parse(mockStore.get('energy_state') as string);
    expect(saved.current).toBe(1);
    expect(saved.lastSettledAt).toBeGreaterThan(1);
    expect(mockEmit).toHaveBeenCalledWith('energy_reload');
    await tools.devSetEnergy(99);
    expect(JSON.parse(mockStore.get('energy_state') as string).current).toBe(5);
    await tools.devSetEnergy(-4);
    expect(JSON.parse(mockStore.get('energy_state') as string).current).toBe(0);
  });

  test('релиз (__DEV__ = false): ничего не меняется и не пишется', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const tools = require('../app/dev_energy_tools');
    await expect(tools.setDevEnergyModeOverride('mistake_charge')).resolves.toBe(false);
    await expect(tools.devSetEnergy(0)).resolves.toBe(false);
    expect(tools.peekDevEnergyModeOverride()).toBeNull();
    expect(mockStore.size).toBe(0);
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
