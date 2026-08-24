const setItem = jest.fn(async () => undefined);
const removeItem = jest.fn(async () => undefined);
const randomUUID = jest.fn(() => '00000000-0000-4000-8000-000000000001');

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { setItem, removeItem },
}));
jest.mock('expo-crypto', () => ({ randomUUID }));

import {
  configurePhoneStateProgressRegisterBridge,
  persistPortableProgressRegister,
} from '../app/phone_state_progress_register_bridge';

describe('PhoneState progress register bridge', () => {
  afterEach(() => {
    configurePhoneStateProgressRegisterBridge(null);
    jest.clearAllMocks();
  });

  test('commits the account-scoped PhoneState operation before compatibility mirror', async () => {
    const order: string[] = [];
    const commit = jest.fn(async () => { order.push('journal'); return { duplicate: false }; });
    setItem.mockImplementationOnce(async () => { order.push('mirror'); });
    configurePhoneStateProgressRegisterBridge({
      scope: { stableUid: 'account-a', accountGeneration: 7 },
      deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });

    await persistPortableProgressRegister('onboarding_step', 'name');

    expect(order).toEqual(['journal', 'mirror']);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      stableUid: 'account-a', accountGeneration: 7,
      domain: 'progress_registers', kind: 'set_field', entityId: 'onboarding_step',
      payload: { field: 'onboarding_step', value: 'name' },
    }), { idempotencyKey: 'progress-register:00000000-0000-4000-8000-000000000001' });
    expect(setItem).toHaveBeenCalledWith('onboarding_step', 'name');
  });

  test('journal failure stays silent and the local compatibility save continues', async () => {
    configurePhoneStateProgressRegisterBridge({
      scope: { stableUid: 'account-a', accountGeneration: 7 },
      deviceId: 'device-a',
      store: {
        commit: jest.fn(async () => { throw new Error('disk_busy'); }),
        readProjection: jest.fn(), replay: jest.fn(),
      } as never,
      triggerSync: jest.fn(),
    });

    await expect(persistPortableProgressRegister('onboarding_done', '1')).resolves.toBeUndefined();
    expect(setItem).toHaveBeenCalledWith('onboarding_done', '1');
  });

  test('removal is journaled as a tombstone before deleting the compatibility key', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStateProgressRegisterBridge({
      scope: { stableUid: 'account-a', accountGeneration: 7 },
      deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });

    await persistPortableProgressRegister('onboarding_done', null);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      payload: { field: 'onboarding_done', value: null },
    }), expect.anything());
    expect(removeItem).toHaveBeenCalledWith('onboarding_done');
  });
});
