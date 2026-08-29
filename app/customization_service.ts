import type AsyncStorage from '@react-native-async-storage/async-storage';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { USER_AVATAR_AURA_KEY } from '../constants/customization_storage_keys';
import type { AccountTransitionLockLease } from './account_generation';
import type { CustomizationSnapshot } from './customization_snapshot';

export interface ApplyCustomizationInput {
  avatarValue: string;
  storedAuraSelection: string | null;
  level: number;
  frameId: string;
  cloudSyncMode?: 'immediate' | 'deferred';
}

export type CustomizationSelectionCommitContext = Readonly<{
  operationId?: string;
  source: 'user' | 'external' | 'legacy';
  occurrenceId?: string;
}>;

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
  commitSelection?: (
    input: ApplyCustomizationInput,
    context: CustomizationSelectionCommitContext | undefined,
    inheritedLease?: AccountTransitionLockLease,
  ) => Promise<void>;
  createAccountScope?: () => {
    isCurrent: () => boolean;
    runExclusive: <T>(
      work: () => Promise<T>,
      inheritedLease?: AccountTransitionLockLease,
    ) => Promise<T | undefined>;
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
  accountTransitionLockLease?: AccountTransitionLockLease,
  selectionContext?: CustomizationSelectionCommitContext,
): Promise<CustomizationSnapshot> {
  const accountScope = deps.createAccountScope?.();
  const persistOptimisticSelection = async (): Promise<{
    snapshot: CustomizationSnapshot;
    changed: boolean;
  }> => {
    if (accountScope && !accountScope.isCurrent()) {
      throw new Error('customization_account_changed');
    }
    const previous = deps.getCurrentSnapshot();
    if (!force && alreadyApplied(previous, input)) {
      return { snapshot: previous, changed: false };
    }

    const optimistic = snapshotForInput(previous, input);
    try {
      if (deps.commitSelection) {
        await deps.commitSelection(input, selectionContext, accountTransitionLockLease);
        deps.publishSnapshot(optimistic);
      } else {
        deps.publishSnapshot(optimistic);
        await deps.storage.multiSet([
          ['user_avatar', input.avatarValue],
          ['user_frame', input.frameId],
          [USER_AVATAR_AURA_KEY, input.storedAuraSelection ?? ''],
        ]);
      }
      if (accountScope && !accountScope.isCurrent()) {
        throw new Error('customization_account_changed');
      }
    } catch (error) {
      // При обычной ошибке диска откатываем оптимистичный кадр. После смены
      // аккаунта старый snapshot публиковать уже нельзя: он перетрёт состояние
      // нового владельца.
      if (!accountScope || accountScope.isCurrent()) deps.publishSnapshot(previous);
      throw error;
    }
    return { snapshot: optimistic, changed: true };
  };

  // Проверка поколения, чтение текущего снимка, оптимистичная публикация и
  // локальный commit образуют одну account-транзакцию. Без этой границы смена
  // аккаунта могла успеть очистить общий snapshot после первой проверки, а
  // старый экран затем повторно публиковал в него аватар предыдущего владельца.
  const localResult = accountScope
    ? await accountScope.runExclusive(persistOptimisticSelection, accountTransitionLockLease)
    : await persistOptimisticSelection();
  if (!localResult) throw new Error('customization_account_changed');
  if (!localResult.changed) return localResult.snapshot;

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
  return localResult.snapshot;
}

export async function applyCustomizationDraft(
  input: ApplyCustomizationInput,
  deps: CustomizationServiceDeps,
  accountTransitionLockLease?: AccountTransitionLockLease,
  selectionContext?: CustomizationSelectionCommitContext,
): Promise<CustomizationSnapshot> {
  return applyCustomizationDraftInternal(input, deps, false, accountTransitionLockLease, selectionContext);
}

export async function resetToLevelAvatar(
  input: { level: number; storedAuraSelection: string | null },
  deps: CustomizationServiceDeps,
  accountTransitionLockLease?: AccountTransitionLockLease,
  selectionContext?: CustomizationSelectionCommitContext,
): Promise<CustomizationSnapshot> {
  const level = Math.max(1, Math.floor(input.level));
  return applyCustomizationDraftInternal({
    avatarValue: getBestAvatarForLevel(level),
    storedAuraSelection: input.storedAuraSelection,
    level,
    frameId: getBestFrameForLevel(level).id,
    cloudSyncMode: 'deferred',
  }, deps, true, accountTransitionLockLease, selectionContext);
}
