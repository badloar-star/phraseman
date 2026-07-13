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

async function applyCustomizationDraftInternal(
  input: ApplyCustomizationInput,
  deps: CustomizationServiceDeps,
  force: boolean,
): Promise<CustomizationSnapshot> {
  const previous = deps.getCurrentSnapshot();
  if (!force && alreadyApplied(previous, input)) return previous;

  const optimistic = snapshotForInput(previous, input);
  deps.publishSnapshot(optimistic);
  try {
    await deps.storage.multiSet([
      ['user_avatar', input.avatarValue],
      ['user_frame', input.frameId],
      [USER_AVATAR_AURA_KEY, input.storedAuraSelection ?? ''],
    ]);
  } catch (error) {
    deps.publishSnapshot(previous);
    throw error;
  }

  await deps.invalidateCaches(input.avatarValue, input.storedAuraSelection);
  await deps.syncCloud(input.cloudSyncMode ?? 'deferred');
  await deps.syncPublicProfile(input.avatarValue, input.level, input.storedAuraSelection);
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
