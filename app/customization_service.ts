import type AsyncStorage from '@react-native-async-storage/async-storage';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { USER_AVATAR_AURA_KEY } from '../constants/customization_storage_keys';
import type { CustomizationSnapshot } from './customization_snapshot';

export interface ApplyCustomizationInput {
  avatarValue: string;
  storedAuraSelection: string | null;
  level: number;
  frameId: string;
  cloudSyncMode?: 'immediate' | 'deferred';
}

export interface CustomizationServiceDeps {
  storage: Pick<typeof AsyncStorage, 'multiSet'>;
  getCurrentSnapshot: () => CustomizationSnapshot;
  publishSnapshot: (snapshot: CustomizationSnapshot) => void;
  invalidateCaches: (avatar: string, storedAuraSelection: string | null) => Promise<void>;
  syncCloud: (mode: 'immediate' | 'deferred') => void | Promise<void>;
  syncPublicProfile: (
    avatar: string,
    level: number,
    storedAuraSelection: string | null,
  ) => void | Promise<void>;
  createAccountScope?: () => {
    isCurrent: () => boolean;
    runExclusive: <T>(work: () => Promise<T>) => Promise<T | undefined>;
  };
}

function snapshotForInput(
  previous: CustomizationSnapshot,
  input: ApplyCustomizationInput,
): CustomizationSnapshot {
  return {
    ...previous,
    source: 'local',
    updatedAt: Date.now(),
    activeAvatar: input.avatarValue,
    storedAuraSelection: input.storedAuraSelection,
    level: Math.max(1, Math.floor(input.level)),
  };
}

function alreadyApplied(previous: CustomizationSnapshot, input: ApplyCustomizationInput): boolean {
  return previous.activeAvatar === input.avatarValue
    && previous.storedAuraSelection === input.storedAuraSelection
    && previous.level === Math.max(1, Math.floor(input.level));
}

function settleCustomizationBackgroundWork(work: () => void | Promise<void>): Promise<void> {
  try {
    return Promise.resolve(work()).then(() => undefined, () => undefined);
  } catch {
    return Promise.resolve();
  }
}

async function applyCustomizationDraftInternal(
  input: ApplyCustomizationInput,
  deps: CustomizationServiceDeps,
  force: boolean,
): Promise<CustomizationSnapshot> {
  const accountScope = deps.createAccountScope?.();
  if (accountScope && !accountScope.isCurrent()) {
    throw new Error('customization_account_changed');
  }
  const previous = deps.getCurrentSnapshot();
  if (!force && alreadyApplied(previous, input)) return previous;

  const optimistic = snapshotForInput(previous, input);
  deps.publishSnapshot(optimistic);
  try {
    const persist = async (): Promise<boolean> => {
      if (accountScope && !accountScope.isCurrent()) return false;
      await deps.storage.multiSet([
        ['user_avatar', input.avatarValue],
        ['user_frame', input.frameId],
        [USER_AVATAR_AURA_KEY, input.storedAuraSelection ?? ''],
      ]);
      return !accountScope || accountScope.isCurrent();
    };
    const persisted = accountScope ? await accountScope.runExclusive(persist) : await persist();
    if (persisted !== true) throw new Error('customization_account_changed');
  } catch (error) {
    // При обычной ошибке диска откатываем оптимистичный кадр. После смены
    // аккаунта старый snapshot публиковать уже нельзя: он перетрёт состояние
    // нового владельца.
    if (!accountScope || accountScope.isCurrent()) deps.publishSnapshot(previous);
    throw error;
  }

  // Local state is already visible and durable. Cache cleanup and both remote
  // mirrors must never hold the Apply button or the rest of the UI hostage.
  void Promise.all([
    settleCustomizationBackgroundWork(() => {
      if (accountScope && !accountScope.isCurrent()) return;
      return deps.invalidateCaches(input.avatarValue, input.storedAuraSelection);
    }),
    settleCustomizationBackgroundWork(() => {
      if (accountScope && !accountScope.isCurrent()) return;
      return deps.syncCloud(input.cloudSyncMode ?? 'deferred');
    }),
    settleCustomizationBackgroundWork(() => {
      if (accountScope && !accountScope.isCurrent()) return;
      return deps.syncPublicProfile(input.avatarValue, input.level, input.storedAuraSelection);
    }),
  ]);
  return optimistic;
}

export async function applyCustomizationDraft(
  input: ApplyCustomizationInput,
  deps: CustomizationServiceDeps,
): Promise<CustomizationSnapshot> {
  return applyCustomizationDraftInternal(input, deps, false);
}

export async function resetToLevelAvatar(
  input: { level: number; storedAuraSelection: string | null },
  deps: CustomizationServiceDeps,
): Promise<CustomizationSnapshot> {
  const level = Math.max(1, Math.floor(input.level));
  return applyCustomizationDraftInternal({
    avatarValue: getBestAvatarForLevel(level),
    storedAuraSelection: input.storedAuraSelection,
    level,
    frameId: getBestFrameForLevel(level).id,
    cloudSyncMode: 'deferred',
  }, deps, true);
}
