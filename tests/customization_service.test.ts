import {
  applyCustomizationDraft,
  resetToLevelAvatar,
  type CustomizationServiceDeps,
} from '../app/customization_service';
import type { CustomizationSnapshot } from '../app/customization_snapshot';
import type { AccountTransitionLockLease } from '../app/account_generation';

const previousSnapshot: CustomizationSnapshot = {
  source: 'storage',
  updatedAt: 1,
  activeAvatar: '18',
  storedAuraSelection: 'aura-flame-51',
  totalXp: 1250,
  level: 18,
  shards: 100,
  ownedAvatars: {},
  ownedAuras: {},
  giftedAvatarId: null,
  giftedAuraId: null,
};

const availableInput = {
  avatarValue: 'custom:custom-gen-41:violet:black',
  storedAuraSelection: 'none',
  level: 18,
  frameId: 'frame-18',
};

function makeDeps(): CustomizationServiceDeps {
  return {
    storage: { multiSet: jest.fn().mockResolvedValue(undefined) },
    getCurrentSnapshot: jest.fn().mockReturnValue(previousSnapshot),
    publishSnapshot: jest.fn(),
    invalidateCaches: jest.fn().mockResolvedValue(undefined),
    syncCloud: jest.fn(),
    syncPublicProfile: jest.fn(),
  };
}

describe('customization service', () => {
  it('commits the complete selection through the durable authority before publishing it', async () => {
    const deps = makeDeps();
    const commitSelection = jest.fn(async () => undefined);
    deps.commitSelection = commitSelection;

    await expect(applyCustomizationDraft(availableInput, deps, undefined, {
      operationId: 'selection:purchase:avatar-73', source: 'user',
    })).resolves.toMatchObject({
      activeAvatar: availableInput.avatarValue,
      storedAuraSelection: availableInput.storedAuraSelection,
    });

    expect(commitSelection).toHaveBeenCalledWith(availableInput, {
      operationId: 'selection:purchase:avatar-73', source: 'user',
    }, undefined);
    expect(deps.storage.multiSet).not.toHaveBeenCalled();
    expect(deps.publishSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      activeAvatar: availableInput.avatarValue,
      storedAuraSelection: availableInput.storedAuraSelection,
    }));
  });

  it('publishes the complete draft immediately, then persists and syncs', async () => {
    const deps = makeDeps();
    let finishWrite!: () => void;
    (deps.storage.multiSet as jest.Mock).mockReturnValueOnce(new Promise<void>((resolve) => { finishWrite = resolve; }));

    const pending = applyCustomizationDraft(availableInput, deps);

    expect(deps.publishSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      activeAvatar: availableInput.avatarValue,
      storedAuraSelection: availableInput.storedAuraSelection,
    }));
    expect(deps.syncCloud).not.toHaveBeenCalled();
    finishWrite();
    await pending;
    expect(deps.storage.multiSet).toHaveBeenCalledWith(expect.arrayContaining([
      ['user_avatar', availableInput.avatarValue],
      ['user_frame', availableInput.frameId],
      ['user_avatar_aura', availableInput.storedAuraSelection],
    ]));
    expect(deps.syncCloud).toHaveBeenCalledTimes(1);
    expect(deps.syncPublicProfile).toHaveBeenCalledTimes(1);
  });

  it('rolls back both fields and skips sync when local persistence rejects', async () => {
    const deps = makeDeps();
    (deps.storage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('disk'));

    await expect(applyCustomizationDraft(availableInput, deps)).rejects.toThrow('disk');

    expect(deps.publishSnapshot).toHaveBeenNthCalledWith(2, previousSnapshot);
    expect(deps.invalidateCaches).not.toHaveBeenCalled();
    expect(deps.syncCloud).not.toHaveBeenCalled();
    expect(deps.syncPublicProfile).not.toHaveBeenCalled();
  });

  it('resolves after local persistence without waiting for cache or server mirrors', async () => {
    const deps = makeDeps();
    let finishBackground!: () => void;
    const background = new Promise<void>((resolve) => { finishBackground = resolve; });
    deps.invalidateCaches = jest.fn(() => background);
    deps.syncCloud = jest.fn(() => background);
    deps.syncPublicProfile = jest.fn(() => background);

    await expect(applyCustomizationDraft(availableInput, deps)).resolves.toMatchObject({
      activeAvatar: availableInput.avatarValue,
      storedAuraSelection: availableInput.storedAuraSelection,
    });
    expect(deps.invalidateCaches).toHaveBeenCalledTimes(1);
    expect(deps.syncCloud).toHaveBeenCalledTimes(1);
    expect(deps.syncPublicProfile).toHaveBeenCalledTimes(1);
    finishBackground();
    await background;
  });

  it('never rolls an old snapshot or starts mirrors after the account scope changes', async () => {
    const deps = makeDeps();
    let current = true;
    let finishWrite!: () => void;
    (deps.storage.multiSet as jest.Mock).mockReturnValueOnce(new Promise<void>((resolve) => { finishWrite = resolve; }));
    deps.createAccountScope = () => ({
      isCurrent: () => current,
      runExclusive: async (work) => work(),
    });

    const pending = applyCustomizationDraft(availableInput, deps);
    expect(deps.publishSnapshot).toHaveBeenCalledTimes(1);
    current = false;
    finishWrite();
    await expect(pending).rejects.toThrow('customization_account_changed');

    expect(deps.publishSnapshot).toHaveBeenCalledTimes(1);
    expect(deps.invalidateCaches).not.toHaveBeenCalled();
    expect(deps.syncCloud).not.toHaveBeenCalled();
    expect(deps.syncPublicProfile).not.toHaveBeenCalled();
  });

  it('does not publish an old selection when an account transition wins the lock', async () => {
    const deps = makeDeps();
    let current = true;
    let releaseLock!: () => void;
    const lockBlocked = new Promise<void>((resolve) => { releaseLock = resolve; });
    deps.createAccountScope = () => ({
      isCurrent: () => current,
      runExclusive: async (work) => {
        await lockBlocked;
        return current ? work() : undefined;
      },
    });

    const pending = applyCustomizationDraft(availableInput, deps);
    current = false;
    releaseLock();

    await expect(pending).rejects.toThrow('customization_account_changed');
    expect(deps.getCurrentSnapshot).not.toHaveBeenCalled();
    expect(deps.publishSnapshot).not.toHaveBeenCalled();
    expect(deps.storage.multiSet).not.toHaveBeenCalled();
    expect(deps.invalidateCaches).not.toHaveBeenCalled();
    expect(deps.syncCloud).not.toHaveBeenCalled();
    expect(deps.syncPublicProfile).not.toHaveBeenCalled();
  });

  it('resets to computed level avatar and frame while preserving stored aura', async () => {
    const deps = makeDeps();
    await resetToLevelAvatar({ level: 18, storedAuraSelection: 'none' }, deps);

    expect(deps.storage.multiSet).toHaveBeenCalledWith(expect.arrayContaining([
      ['user_avatar', '18'],
      ['user_avatar_aura', 'none'],
      ['user_frame', expect.any(String)],
    ]));
    expect(deps.invalidateCaches).toHaveBeenCalledTimes(1);
    expect(deps.syncCloud).toHaveBeenCalledTimes(1);
    expect(deps.syncPublicProfile).toHaveBeenCalledTimes(1);
  });

  it('passes an inherited account lock through the canonical level reset commit', async () => {
    const deps = makeDeps();
    const commitSelection = jest.fn(async () => undefined);
    deps.commitSelection = commitSelection;
    const lease = Object.freeze({}) as AccountTransitionLockLease;

    await resetToLevelAvatar(
      { level: 18, storedAuraSelection: null },
      deps,
      lease,
      { source: 'user', operationId: 'dev:restore-baseline' },
    );

    expect(commitSelection).toHaveBeenCalledWith(
      expect.objectContaining({ avatarValue: '18', storedAuraSelection: null }),
      { source: 'user', operationId: 'dev:restore-baseline' },
      lease,
    );
  });
});
