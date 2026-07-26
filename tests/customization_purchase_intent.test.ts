import {
  prepareCustomizationPurchase,
  resumeCustomizationPurchase,
  resumePersistedCustomizationPurchase,
  type CustomizationPurchaseDeps,
  type PurchaseCustomizationInput,
} from '../app/customization_purchase_intent';
import type { CustomizationSnapshot } from '../app/customization_snapshot';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

const previousSnapshot: CustomizationSnapshot = {
  source: 'storage', updatedAt: 1, activeAvatar: '18', storedAuraSelection: null,
  totalXp: 100, level: 18, shards: 100, ownedAvatars: {}, ownedAuras: {},
  giftedAvatarId: null, giftedAuraId: null,
};

const purchaseInput: PurchaseCustomizationInput = {
  target: 'aura', itemId: 'aura-aurora', cost: 120,
  spendReason: 'avatar_aura', mode: 'buy-only', ownedValue: true,
};

function makeMemoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  const api = {
    multiSet: jest.fn(async (pairs: readonly (readonly [string, string])[]) => {
      pairs.forEach(([key, value]) => values.set(key, value));
    }),
    multiRemove: jest.fn(async (keys: readonly string[]) => {
      keys.forEach((key) => values.delete(key));
    }),
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
  };
  return { values, api };
}

function makeDeps(memory = makeMemoryStorage()): CustomizationPurchaseDeps {
  return {
    storage: memory.api,
    getAccountScope: jest.fn().mockResolvedValue('account-a'),
    spendShardsIdempotent: jest.fn().mockResolvedValue('applied'),
    getCurrentSnapshot: jest.fn().mockReturnValue(previousSnapshot),
    publishSnapshot: jest.fn(),
    invalidateCaches: jest.fn().mockResolvedValue(undefined),
    syncCloud: jest.fn(),
    syncPublicProfile: jest.fn(),
    onOwnershipGranted: jest.fn(),
    validatePurchase: jest.fn().mockReturnValue(true),
    validateApply: jest.fn().mockReturnValue(true),
  };
}

describe('customization purchase intent', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    beginAccountGeneration('account-a');
  });

  it('creates new intents with a CSPRNG queue-compatible operation id', async () => {
    const prepared = await prepareCustomizationPurchase(purchaseInput, makeDeps());

    expect(prepared.opId).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
  });

  it('forwards a persisted prepared legacy operation id byte-for-byte', async () => {
    const legacyOpId = 'customization:legacy-intent-1234';
    const memory = makeMemoryStorage({
      customization_purchase_intent_v1: JSON.stringify({
        v: 1,
        accountScope: 'account-a',
        opId: legacyOpId,
        phase: 'prepared',
        createdAt: 1,
        ...purchaseInput,
      }),
    });
    const deps = makeDeps(memory);

    await resumePersistedCustomizationPurchase(deps);

    expect(deps.spendShardsIdempotent).toHaveBeenCalledWith(
      purchaseInput.cost,
      purchaseInput.spendReason,
      legacyOpId,
      { requireCloudReceiptForLocalLedger: true },
    );
  });

  it.each(['charged', 'granted'] as const)(
    'does not debit a persisted %s legacy intent again',
    async (phase) => {
      const memory = makeMemoryStorage({
        customization_purchase_intent_v1: JSON.stringify({
          v: 1,
          accountScope: 'account-a',
          opId: 'customization:legacy-intent-1234',
          phase,
          createdAt: 1,
          ...purchaseInput,
        }),
      });
      const deps = makeDeps(memory);

      await resumePersistedCustomizationPurchase(deps);

      expect(deps.spendShardsIdempotent).not.toHaveBeenCalled();
    },
  );

  it('persists charged recovery and resumes after restart without a second spend', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    const realMultiSet = memory.api.multiSet.getMockImplementation()!;
    memory.api.multiSet.mockImplementation(async (pairs) => {
      if (pairs.some(([key]) => key === 'avatar_aura_owned_v1')) throw new Error('owned write failed');
      await realMultiSet(pairs);
    });

    const prepared = await prepareCustomizationPurchase(purchaseInput, deps);
    await expect(resumeCustomizationPurchase(prepared, deps)).rejects.toThrow('owned write failed');
    expect(JSON.parse(memory.values.get('customization_purchase_intent_v1')!))
      .toMatchObject({ phase: 'charged', opId: prepared.opId });
    expect(deps.publishSnapshot).not.toHaveBeenCalled();

    const restartedMemory = makeMemoryStorage(Object.fromEntries(memory.values));
    const restartedDeps = makeDeps(restartedMemory);
    await resumePersistedCustomizationPurchase(restartedDeps);

    expect(restartedDeps.spendShardsIdempotent).not.toHaveBeenCalled();
    expect(restartedMemory.values.get('avatar_aura_owned_v1')).toContain('aura-aurora');
    expect(restartedMemory.values.has('customization_purchase_intent_v1')).toBe(false);
  });

  it('does not execute an intent belonging to another account', async () => {
    const memory = makeMemoryStorage({
      customization_purchase_intent_v1: JSON.stringify({
        v: 1, accountScope: 'account-b', opId: 'foreign', phase: 'prepared', createdAt: 1,
        ...purchaseInput,
      }),
    });
    const deps = makeDeps(memory);

    await resumePersistedCustomizationPurchase(deps);

    expect(deps.spendShardsIdempotent).not.toHaveBeenCalled();
    expect(deps.onOwnershipGranted).not.toHaveBeenCalled();
  });

  it('removes an invalid prepared intent before spending', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    deps.validatePurchase = jest.fn().mockReturnValue(false);
    const prepared = await prepareCustomizationPurchase(purchaseInput, deps);

    await expect(resumeCustomizationPurchase(prepared, deps))
      .rejects.toThrow('invalid_customization_purchase_product');
    expect(deps.spendShardsIdempotent).not.toHaveBeenCalled();
    expect(memory.values.has('customization_purchase_intent_v1')).toBe(false);
  });

  it('grants ownership but skips stale apply after access changes', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    deps.validateApply = jest.fn().mockReturnValue(false);
    const prepared = await prepareCustomizationPurchase({
      ...purchaseInput,
      mode: 'buy-and-apply',
      applyInput: {
        avatarValue: '18', storedAuraSelection: 'aura-aurora', level: 18, frameId: 'frame-18',
      },
    }, deps);

    await expect(resumeCustomizationPurchase(prepared, deps)).resolves.toBe('purchased-only');
    expect(memory.values.get('avatar_aura_owned_v1')).toContain('aura-aurora');
    expect(deps.publishSnapshot).not.toHaveBeenCalled();
  });

  it('does not persist account A charge or ownership after delayed spend crosses to account B', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    let accountScope = 'account-a';
    deps.getAccountScope = jest.fn(async () => accountScope);
    let resolveSpend!: (result: 'applied') => void;
    deps.spendShardsIdempotent = jest.fn(() => new Promise((resolve) => {
      resolveSpend = resolve;
    }));
    const prepared = await prepareCustomizationPurchase(purchaseInput, deps);

    const pending = resumeCustomizationPurchase(prepared, deps);
    for (let index = 0; index < 20
      && (deps.spendShardsIdempotent as jest.Mock).mock.calls.length === 0; index += 1) {
      await Promise.resolve();
    }
    expect(deps.spendShardsIdempotent).toHaveBeenCalledTimes(1);

    invalidateAccountGeneration();
    accountScope = 'account-b';
    beginAccountGeneration('account-b');
    resolveSpend('applied');

    await expect(pending).rejects.toThrow('customization_purchase_account_mismatch');
    expect(memory.values.has('avatar_aura_owned_v1')).toBe(false);
    expect(deps.onOwnershipGranted).not.toHaveBeenCalled();
    expect(JSON.parse(memory.values.get('customization_purchase_intent_v1')!))
      .toMatchObject({ accountScope: 'account-a', phase: 'prepared' });
  });
});
