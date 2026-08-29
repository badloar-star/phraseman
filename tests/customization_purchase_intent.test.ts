import {
  prepareCustomizationPurchase,
  resumeCustomizationPurchase,
  resumePersistedCustomizationPurchase,
  type CustomizationPurchaseDeps,
  type PurchaseCustomizationInput,
} from '../app/customization_purchase_intent';
import type { CustomizationSnapshot } from '../app/customization_snapshot';
import { buildAtomicEditorAvatarPurchase } from '../app/customization_editor_purchase';
import { customizationDevOverlayReceiptKey } from '../app/customization_dev_grant';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
} from '../app/account_generation';

const previousSnapshot: CustomizationSnapshot = {
  source: 'storage', updatedAt: 1, activeAvatar: '18', storedAuraSelection: null,
  totalXp: 100, level: 18, shards: 100, ownedAvatars: {}, ownedAuras: {},
  giftedAvatarId: null, giftedAuraId: null,
};

const purchaseInput: PurchaseCustomizationInput = {
  target: 'aura', itemId: 'aura-ember', cost: 120,
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
    commitShardCompositeOperation: jest.fn(async (input) => {
      await memory.api.multiSet(input.localWrites);
      return { status: 'applied', balanceBefore: 200, balanceAfter: 80 } as any;
    }),
    commitRuneCustomizationCompositeOperation: jest.fn(async (input) => {
      await memory.api.multiSet(input.localWrites);
      return { duplicate: false, balanceBefore: 10_000, balanceAfter: 4_400 };
    }),
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
    expect(prepared).toMatchObject({ v: 2, currency: 'pearls' });
  });

  it('commits one Yin purchase through the exact rune composite and never the pearl ledger', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    const runeInput: PurchaseCustomizationInput = {
      target: 'avatar',
      itemId: 'custom-gen-73',
      cost: 5_600,
      currency: 'runes',
      spendReason: 'custom_avatar',
      ownedValue: 'avatar100-v1|aurora:black',
      avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
      mode: 'buy-and-apply',
      applyInput: {
        avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
        storedAuraSelection: null,
        level: 18,
        frameId: 'frame-18',
      },
    };

    const prepared = await prepareCustomizationPurchase(runeInput, deps);
    await expect(resumeCustomizationPurchase(prepared, deps)).resolves.toBe('applied');

    expect(prepared).toMatchObject({ v: 2, currency: 'runes', phase: 'prepared' });
    expect(deps.commitShardCompositeOperation).not.toHaveBeenCalled();
    expect(deps.commitRuneCustomizationCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      operationId: prepared.opId,
      avatarId: 'custom-gen-73',
      ownedValue: 'avatar100-v1|aurora:black',
      avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
      price: 5_600,
      reason: 'custom_avatar',
      localWrites: expect.arrayContaining([
        expect.arrayContaining(['custom_avatar_owned_v1']),
        expect.arrayContaining(['customization_purchase_intent_v1']),
      ]),
    }));
    expect(memory.values.get('custom_avatar_owned_v1')).toContain('avatar100-v1|aurora:black');
  });

  it('atomically releases a legacy DEV suppression when the item is legitimately purchased', async () => {
    const receiptKey = customizationDevOverlayReceiptKey('account-a');
    const memory = makeMemoryStorage({
      [receiptKey]: JSON.stringify({
        v: 2,
        ownerStableId: 'account-a',
        state: 'disabled',
        baselineSelection: {
          avatarValue: '18', frameId: 'frame-18', storedAuraSelection: null, level: 18,
        },
        restoreOperationId: 'customization_dev_restore:test-cycle',
        suppressedAvatarIds: ['custom-gen-73', 'custom-gen-74'],
        suppressedAuraIds: [],
      }),
    });
    const deps = makeDeps(memory);
    const input: PurchaseCustomizationInput = {
      target: 'avatar', itemId: 'custom-gen-73', cost: 5_600, currency: 'runes',
      spendReason: 'custom_avatar', ownedValue: 'avatar100-v1|aurora:black',
      avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1', mode: 'buy-only',
    };

    const prepared = await prepareCustomizationPurchase(input, deps);
    await expect(resumeCustomizationPurchase(prepared, deps)).resolves.toBe('purchased-only');

    expect(deps.commitRuneCustomizationCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      localWrites: expect.arrayContaining([expect.arrayContaining([receiptKey])]),
    }));
    expect(JSON.parse(memory.values.get(receiptKey)!)).toMatchObject({
      suppressedAvatarIds: ['custom-gen-74'],
    });
  });

  it('atomically buys and applies one editor avatar without charging or granting its unpaid preview aura', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    const avatarValue = 'custom:custom-gen-73:aurora:white:avatar100-v1';
    const input = buildAtomicEditorAvatarPurchase({
      purchaseInput: {
        target: 'avatar', itemId: 'custom-gen-73', cost: 70, currency: 'pearls',
        spendReason: 'custom_avatar', ownedValue: 'avatar100-v1|aurora:white',
        avatarValue, mode: 'buy-only',
      },
      selectedAvatarValue: avatarValue,
      confirmedStoredAuraSelection: previousSnapshot.storedAuraSelection,
      level: previousSnapshot.level,
      frameId: 'frame-18',
    });

    const prepared = await prepareCustomizationPurchase(input, deps);
    await expect(resumeCustomizationPurchase(prepared, deps)).resolves.toBe('applied');

    expect(deps.commitShardCompositeOperation).toHaveBeenCalledTimes(1);
    expect(deps.commitShardCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: 70,
      reason: 'custom_avatar',
      grant: expect.objectContaining({ kind: 'custom_avatar', subjectId: 'custom-gen-73' }),
      localWrites: expect.arrayContaining([
        expect.arrayContaining(['custom_avatar_owned_v1']),
      ]),
    }));
    expect(deps.commitRuneCustomizationCompositeOperation).not.toHaveBeenCalled();
    expect(memory.values.get('custom_avatar_owned_v1')).toContain('custom-gen-73');
    expect(memory.values.has('avatar_aura_owned_v1')).toBe(false);
    expect(deps.publishSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      activeAvatar: avatarValue,
      storedAuraSelection: previousSnapshot.storedAuraSelection,
    }));
  });

  it('reports insufficient runes without falling back to pearls', async () => {
    const deps = makeDeps();
    deps.commitRuneCustomizationCompositeOperation = jest.fn().mockRejectedValue(
      new Error('customization_runes_insufficient'),
    );
    const prepared = await prepareCustomizationPurchase({
      target: 'avatar', itemId: 'custom-gen-73', cost: 5_600, currency: 'runes',
      spendReason: 'custom_avatar', ownedValue: 'avatar100-v1|aurora:black',
      avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1', mode: 'buy-only',
    }, deps);

    await expect(resumeCustomizationPurchase(prepared, deps)).rejects.toThrow('insufficient_runes');
    expect(deps.commitShardCompositeOperation).not.toHaveBeenCalled();
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

    expect(deps.commitShardCompositeOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: purchaseInput.cost,
      reason: purchaseInput.spendReason,
      operationId: legacyOpId,
      grant: expect.objectContaining({ kind: 'avatar_aura', subjectId: purchaseInput.itemId }),
    }));
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

      expect(deps.commitShardCompositeOperation).not.toHaveBeenCalled();
    },
  );

  it('keeps the prepared intent when the composite result write fails and safely retries', async () => {
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
      .toMatchObject({ phase: 'prepared', opId: prepared.opId });
    expect(deps.publishSnapshot).not.toHaveBeenCalled();

    const restartedMemory = makeMemoryStorage(Object.fromEntries(memory.values));
    const restartedDeps = makeDeps(restartedMemory);
    await resumePersistedCustomizationPurchase(restartedDeps);

    expect(restartedDeps.commitShardCompositeOperation).toHaveBeenCalledTimes(1);
    expect(restartedMemory.values.get('avatar_aura_owned_v1')).toContain('aura-ember');
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

    expect(deps.commitShardCompositeOperation).not.toHaveBeenCalled();
    expect(deps.onOwnershipGranted).not.toHaveBeenCalled();
  });

  it('removes an invalid prepared intent before spending', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    deps.validatePurchase = jest.fn().mockReturnValue(false);
    const prepared = await prepareCustomizationPurchase(purchaseInput, deps);

    await expect(resumeCustomizationPurchase(prepared, deps))
      .rejects.toThrow('invalid_customization_purchase_product');
    expect(deps.commitShardCompositeOperation).not.toHaveBeenCalled();
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
        avatarValue: '18', storedAuraSelection: 'aura-ember', level: 18, frameId: 'frame-18',
      },
    }, deps);

    await expect(resumeCustomizationPurchase(prepared, deps)).resolves.toBe('purchased-only');
    expect(memory.values.get('avatar_aura_owned_v1')).toContain('aura-ember');
    expect(deps.publishSnapshot).not.toHaveBeenCalled();
  });

  it('does not persist account A charge or ownership after delayed spend crosses to account B', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    let accountScope = 'account-a';
    deps.getAccountScope = jest.fn(async () => accountScope);
    let resolveSpend!: (result: any) => void;
    deps.commitShardCompositeOperation = jest.fn(() => new Promise((resolve) => {
      resolveSpend = resolve;
    }));
    const prepared = await prepareCustomizationPurchase(purchaseInput, deps);

    const pending = resumeCustomizationPurchase(prepared, deps);
    for (let index = 0; index < 20
      && (deps.commitShardCompositeOperation as jest.Mock).mock.calls.length === 0; index += 1) {
      await Promise.resolve();
    }
    expect(deps.commitShardCompositeOperation).toHaveBeenCalledTimes(1);

    invalidateAccountGeneration();
    accountScope = 'account-b';
    beginAccountGeneration('account-b');
    resolveSpend({ status: 'applied', balanceBefore: 200, balanceAfter: 80 });

    await expect(pending).rejects.toThrow('customization_purchase_account_mismatch');
    expect(memory.values.has('avatar_aura_owned_v1')).toBe(false);
    expect(deps.onOwnershipGranted).not.toHaveBeenCalled();
    expect(JSON.parse(memory.values.get('customization_purchase_intent_v1')!))
      .toMatchObject({ accountScope: 'account-a', phase: 'prepared' });
  });

  it('keeps ownership publication and apply inside the account transition boundary', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    let accountScope = 'account-a';
    deps.getAccountScope = jest.fn(async () => accountScope);
    let ownershipStarted!: () => void;
    let releaseOwnership!: () => void;
    const ownershipIsRunning = new Promise<void>((resolve) => { ownershipStarted = resolve; });
    const ownershipRelease = new Promise<void>((resolve) => { releaseOwnership = resolve; });
    deps.onOwnershipGranted = jest.fn(async () => {
      ownershipStarted();
      await ownershipRelease;
    });
    const prepared = await prepareCustomizationPurchase({
      ...purchaseInput,
      mode: 'buy-and-apply',
      applyInput: {
        avatarValue: '18', storedAuraSelection: 'aura-ember', level: 18, frameId: 'frame-18',
      },
    }, deps);

    const purchase = resumeCustomizationPurchase(prepared, deps);
    await ownershipIsRunning;
    let transitionCompleted = false;
    const transition = withAccountTransitionLock(async () => {
      invalidateAccountGeneration();
      accountScope = 'account-b';
      beginAccountGeneration('account-b');
      transitionCompleted = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(transitionCompleted).toBe(false);
    releaseOwnership();
    await expect(purchase).resolves.toBe('applied');
    await transition;
    expect(deps.publishSnapshot).toHaveBeenCalledTimes(1);
  });

  it('applies without deadlocking when the customization service reuses the active account lease', async () => {
    const memory = makeMemoryStorage();
    const deps = makeDeps(memory);
    deps.createAccountScope = () => {
      const accountToken = captureAccountGeneration();
      return {
        isCurrent: () => isCurrentAccountGeneration(accountToken),
        runExclusive: <T,>(
          work: () => Promise<T>,
          inheritedLease?: AccountTransitionLockLease,
        ) => withAccountTransitionLock(async () => {
          if (!isCurrentAccountGeneration(accountToken)) return undefined;
          return work();
        }, inheritedLease),
      };
    };
    const prepared = await prepareCustomizationPurchase({
      ...purchaseInput,
      mode: 'buy-and-apply',
      applyInput: {
        avatarValue: '18', storedAuraSelection: 'aura-ember', level: 18, frameId: 'frame-18',
      },
    }, deps);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      resumeCustomizationPurchase(prepared, deps),
      new Promise<'timed-out'>((resolve) => {
        timer = setTimeout(() => resolve('timed-out'), 50);
      }),
    ]);
    if (timer) clearTimeout(timer);

    expect(outcome).toBe('applied');
    expect(deps.publishSnapshot).toHaveBeenCalledTimes(1);
  });

  it('threads one stable selection operation id from the purchase receipt into durable apply', async () => {
    const deps = makeDeps();
    deps.commitSelection = jest.fn(async () => undefined);
    const prepared = await prepareCustomizationPurchase({
      ...purchaseInput,
      mode: 'buy-and-apply',
      applyInput: {
        avatarValue: '18', storedAuraSelection: 'aura-ember', level: 18, frameId: 'frame-18',
      },
    }, deps);

    await expect(resumeCustomizationPurchase(prepared, deps)).resolves.toBe('applied');

    expect(deps.commitSelection).toHaveBeenCalledWith(
      prepared.applyInput,
      { operationId: `customization_selection:${prepared.opId}`, source: 'user' },
      expect.anything(),
    );
  });
});
