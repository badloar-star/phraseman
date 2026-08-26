import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  markLevelSpinGiftOccurrenceClaimed,
  readLevelSpinGiftOccurrenceClaimState,
} from '../app/level_gift_inventory';
import {
  applyGift,
  confirmDeferredLocalLevelGiftEffectReceipt,
} from '../app/level_gift_system';
import { applyLocalLevelSpinRewardExactlyOnce } from '../app/local_level_spin_auto_delivery';
import type { LocalLevelSpinReceipt } from '../app/level_spin_local_contract';

jest.mock('../app/level_gift_inventory', () => ({
  markLevelSpinGiftOccurrenceClaimed: jest.fn(),
  readLevelSpinGiftOccurrenceClaimState: jest.fn(),
}));

jest.mock('../app/level_gift_system', () => ({
  ALL_LEVEL_GIFT_DEFS: [{
    id: 'energy_plus3', rarity: 'rare', icon: 'energy', weight: 1,
    titleRU: 'Энергия +3', titleUK: 'Енергія +3', titleES: 'Energía +3',
    descRU: 'До полуночи', descUK: 'До опівночі', descES: 'Hasta medianoche',
  }, {
    id: 'attempt_restore_all', rarity: 'common', icon: 'heart', weight: 1,
    titleRU: 'Второй шанс', titleUK: 'Другий шанс', titleES: 'Segunda oportunidad',
    descRU: 'Восстанавливает все 3 попытки во время сессии',
    descUK: 'Відновлює всі 3 спроби під час сесії',
    descES: 'Restaura los 3 intentos durante la sesión',
  }],
  applyGift: jest.fn(),
  confirmDeferredLocalLevelGiftEffectReceipt: jest.fn(),
}));

const receipt = (baseGiftId = 'energy_plus3'): LocalLevelSpinReceipt => {
  const createdAtMs = Date.now();
  return {
    ok: true,
    stableUid: 'spin-owner',
    requestId: 'spin_request_auto_apply_0001',
    creditId: 'local_spin_session_en-lesson-2',
    level: 2,
    kind: 'standard',
    baseGiftId,
    premiumGiftId: null,
    createdAtMs,
    expiresAtMs: createdAtMs + 259_200_000,
    balanceAfter: 0,
    status: 'awaiting_ack',
    revealState: 'pending',
    deliveries: { base: { state: 'unclaimed' } },
    catalogVersion: baseGiftId === 'attempt_restore_all' ? 6 : 3,
    schemaVersion: 2,
    localOnly: true,
  };
};

describe('local level Spin automatic delivery', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    __resetAccountGenerationForTests();
    beginAccountGeneration('spin-owner');
    jest.clearAllMocks();
    (readLevelSpinGiftOccurrenceClaimState as jest.Mock).mockResolvedValue('pending');
    (markLevelSpinGiftOccurrenceClaimed as jest.Mock).mockResolvedValue(true);
    (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(true);
  });

  test('applies the selected reward through the local exactly-once occurrence and closes its journal lane', async () => {
    (applyGift as jest.Mock).mockResolvedValue({ success: true });
    (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(true);
    const accountToken = captureAccountGeneration();
    const setEnergy = jest.fn();

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken,
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy,
      studyTarget: 'en',
    })).resolves.toEqual({ success: true });

    expect(applyGift).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'energy_plus3' }),
      'Player',
      5,
      5,
      setEnergy,
      expect.objectContaining({
        accountToken,
        deferEffectReceiptConfirmation: true,
        localOnly: true,
        occurrenceId: 'level-spin:spin_request_auto_apply_0001:base',
        studyTarget: 'en',
      }),
    );
    expect(markLevelSpinGiftOccurrenceClaimed).toHaveBeenCalledWith(
      'spin_request_auto_apply_0001',
      'base',
      accountToken,
    );
    expect(confirmDeferredLocalLevelGiftEffectReceipt).toHaveBeenCalledWith(
      accountToken,
      'level-spin:spin_request_auto_apply_0001:base',
    );
    expect((markLevelSpinGiftOccurrenceClaimed as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  test('keeps the journal lane pending when the effect did not complete', async () => {
    (applyGift as jest.Mock).mockResolvedValue({ success: false });

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: false });

    expect(markLevelSpinGiftOccurrenceClaimed).not.toHaveBeenCalled();
    expect(confirmDeferredLocalLevelGiftEffectReceipt).not.toHaveBeenCalled();
  });

  test('never reapplies a reward whose durable outer journal lane is already claimed', async () => {
    (readLevelSpinGiftOccurrenceClaimState as jest.Mock).mockResolvedValue('claimed');
    (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(true);

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: false, alreadyClaimed: true });

    expect(applyGift).not.toHaveBeenCalled();
    expect(markLevelSpinGiftOccurrenceClaimed).not.toHaveBeenCalled();
    expect(confirmDeferredLocalLevelGiftEffectReceipt).toHaveBeenCalledWith(
      expect.any(Object),
      'level-spin:spin_request_auto_apply_0001:base',
    );
  });

  test('does not apply when its outer journal lane is missing or malformed', async () => {
    (readLevelSpinGiftOccurrenceClaimState as jest.Mock).mockResolvedValue('missing');

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: false });

    expect(applyGift).not.toHaveBeenCalled();
    expect(confirmDeferredLocalLevelGiftEffectReceipt).not.toHaveBeenCalled();
  });

  test('delivers the permanent second-chance gift through the same durable local lane', async () => {
    (applyGift as jest.Mock).mockResolvedValue({ success: true });
    (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(true);

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt('attempt_restore_all'), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: true });

    expect(applyGift).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'attempt_restore_all' }),
      'Player',
      5,
      5,
      expect.any(Function),
      expect.objectContaining({
        localOnly: true,
        occurrenceId: 'level-spin:spin_request_auto_apply_0001:base',
      }),
    );
  });

  test('keeps the receipt retryable when closing the journal lane fails', async () => {
    (applyGift as jest.Mock).mockResolvedValue({ success: true });
    (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(true);
    (markLevelSpinGiftOccurrenceClaimed as jest.Mock).mockRejectedValue(new Error('storage interrupted'));

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: false });
    expect(confirmDeferredLocalLevelGiftEffectReceipt).not.toHaveBeenCalled();
  });

  test('does not confirm the inner receipt when the outer journal lane was not durably closed', async () => {
    (applyGift as jest.Mock).mockResolvedValue({ success: true });
    (markLevelSpinGiftOccurrenceClaimed as jest.Mock).mockResolvedValue(false);

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: false });

    expect(confirmDeferredLocalLevelGiftEffectReceipt).not.toHaveBeenCalled();
  });

  test('keeps retrying until the deferred inner receipt is confirmed', async () => {
    (applyGift as jest.Mock).mockResolvedValue({ success: true });
    (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(false);

    await expect(applyLocalLevelSpinRewardExactlyOnce(receipt(), {
      accountToken: captureAccountGeneration(),
      userName: 'Player',
      currentEnergy: 5,
      maxEnergy: 5,
      setEnergy: jest.fn(),
      studyTarget: 'en',
    })).resolves.toEqual({ success: false });

    expect(markLevelSpinGiftOccurrenceClaimed).toHaveBeenCalled();
    expect(confirmDeferredLocalLevelGiftEffectReceipt).toHaveBeenCalled();
  });
});
