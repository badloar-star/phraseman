// зачем (координатор 12.10, R1 «нет пути», Диалоги): dev-состояния для съёмки (отказ сервера, настроение, рубильник, удержание загрузки,
// отказ энергии) работают ТОЛЬКО в dev-сборке; в стор-сборке ссылка ничего не включает, а геттеры всегда «выключено».
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined), getDevLocalPlusStorageKey: (id: string) => `k:${id}` }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiRemove: jest.fn(async () => undefined), multiGet: jest.fn(async () => []) },
}));
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { applyDevState, parseDevStateParams } from '../app/dev_state_fixtures';
import { getDevDialogFail, getDevDialogMood, isDevDialogEnergyFail, isDevFreeformLoadingHeld, resetDevDialogState, setDevDialogState } from '../app/dev_dialog_state';

describe('dev dialog states', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevDialogState();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('parses the link parameters and rejects unknown values', () => {
    const { request, rejected } = parseDevStateParams({ dev_dialog_fail: 'plus_daily_cap', dev_dialog_mood: 'sad', dialogs_paused: '1', hold: 'freeform_loading', dev_energy_fail: '1', toast: 'restored' });
    expect(request).toMatchObject({ dialogFail: 'plus_daily_cap', dialogMood: 'sad', dialogsPaused: 'on', hold: 'freeform_loading', energyFail: 'on', toast: 'restored' });
    expect(rejected).toEqual({});
    const bad = parseDevStateParams({ dev_dialog_fail: 'boom', dev_dialog_mood: 'furious', toast: 'x' });
    expect(Object.keys(bad.rejected).sort()).toEqual(['dev_dialog_fail', 'dev_dialog_mood', 'toast']);
  });

  it('applies and clears the flags in a dev build', async () => {
    const applied = await applyDevState({ dialogFail: 'service', dialogMood: 'sad', hold: 'freeform_loading', energyFail: 'on' });
    expect(applied.skipped).toEqual({});
    expect([getDevDialogFail(), getDevDialogMood(), isDevFreeformLoadingHeld(), isDevDialogEnergyFail()]).toEqual(['service', 'sad', true, true]);
    await applyDevState({ dialogsPaused: 'on' });
    expect(getDevDialogFail()).toBe('paused');
    await applyDevState({ dialogFail: 'off', dialogMood: 'off', hold: 'off', energyFail: 'off' });
    expect([getDevDialogFail(), getDevDialogMood(), isDevFreeformLoadingHeld(), isDevDialogEnergyFail()]).toEqual([null, null, false, false]);
  });

  it('does nothing in a store build', async () => {
    mockStoreRelease = true;
    expect(setDevDialogState({ fail: 'service', mood: 'sad', holdFreeformLoading: true, energyFail: true })).toBe(false);
    const result = await applyDevState({ dialogFail: 'service', energyFail: 'on' });
    expect(result.skipped).toEqual({ all: 'not_dev_build' });
    expect([getDevDialogFail(), getDevDialogMood(), isDevFreeformLoadingHeld(), isDevDialogEnergyFail()]).toEqual([null, null, false, false]);
    // даже если флаг уже стоял — в стор-сборке геттеры гасят его
    mockStoreRelease = false;
    setDevDialogState({ fail: 'service', energyFail: true });
    mockStoreRelease = true;
    expect(getDevDialogFail()).toBeNull();
    expect(isDevDialogEnergyFail()).toBe(false);
  });

  it('is wired into the turn client, freeform gate and energy confirmation', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(read('app/dialogue_v2_turn_coaching_client.ts')).toMatch(/getDevDialogFail\(\)[\s\S]*throw new DialogueV2TurnFailureError\(devFail\)/);
    expect(read('app/dialogue_v2_freeform.tsx')).toMatch(/!accessResolved \|\| isDevFreeformLoadingHeld\(\)/);
    expect(read('components/EnergyContext.tsx')).toMatch(/kind === 'ai_dialog' && isDevDialogEnergyFail\(\)/);
  });
});
