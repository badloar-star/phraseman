import {
  applyCustomizationDraft,
  resetToLevelAvatar,
  type CustomizationServiceDeps,
} from '../app/customization_service';
import type { CustomizationSnapshot } from '../app/customization_snapshot';

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
});
