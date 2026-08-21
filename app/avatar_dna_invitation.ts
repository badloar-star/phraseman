import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import { isAvatarDNAEnabled } from './remote_flags';

const INVITATION_PREFIX = 'avatar_dna_invitation_v1:';

export type AvatarDNAInvitationState = Readonly<{
  offered: boolean;
  dismissed: boolean;
  completed: boolean;
  offeredAtMs: number;
}>;

type InvitationAccount = Readonly<{ stableId: string; generation: number }>;

const invitationKey = (stableId: string): string => {
  const normalized = stableId.trim();
  if (!normalized || normalized.length > 256 || /[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new TypeError('avatar_dna_invitation_scope_invalid');
  }
  return `${INVITATION_PREFIX}${encodeURIComponent(normalized)}`;
};

const tokenFor = (account: InvitationAccount): AccountGenerationToken => ({
  stableId: account.stableId.trim(),
  generation: account.generation,
  phase: 'active',
});

const parseState = (raw: string | null): AvatarDNAInvitationState | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (Reflect.ownKeys(record).length !== 4) return null;
    if (typeof record.offered !== 'boolean' || typeof record.dismissed !== 'boolean' || typeof record.completed !== 'boolean') return null;
    if (!Number.isSafeInteger(record.offeredAtMs) || (record.offeredAtMs as number) < 0) return null;
    return Object.freeze({
      offered: record.offered,
      dismissed: record.dismissed,
      completed: record.completed,
      offeredAtMs: record.offeredAtMs as number,
    });
  } catch {
    return null;
  }
};

export async function readInvitationState(
  stableId: string,
  generation: number,
): Promise<AvatarDNAInvitationState | null> {
  try {
    const account = { stableId: stableId.trim(), generation };
    if (!isCurrentAccountGeneration(tokenFor(account), account.stableId)) return null;
    return parseState(await AsyncStorage.getItem(invitationKey(account.stableId)));
  } catch {
    return null;
  }
}

async function updateInvitationState(
  account: InvitationAccount,
  update: (current: AvatarDNAInvitationState | null) => AvatarDNAInvitationState | null,
): Promise<boolean> {
  return withAccountTransitionLock(async () => {
    const stableId = account.stableId.trim();
    const token = tokenFor({ ...account, stableId });
    if (!isCurrentAccountGeneration(token, stableId)) return false;
    const key = invitationKey(stableId);
    const previousRaw = await AsyncStorage.getItem(key);
    const next = update(parseState(previousRaw));
    if (!next) return false;
    await AsyncStorage.setItem(key, JSON.stringify(next));
    if (isCurrentAccountGeneration(token, stableId)) return true;
    if (previousRaw === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, previousRaw);
    return false;
  });
}

export async function onFirstAchievement(
  account: InvitationAccount,
): Promise<'offered' | 'already-handled' | 'stale-account' | 'unavailable'> {
  try {
    if (!isAvatarDNAEnabled(account.stableId.trim())) return 'already-handled';
    let alreadyHandled = false;
    const written = await updateInvitationState(account, (current) => {
      if (current?.offered || current?.dismissed || current?.completed) {
        alreadyHandled = true;
        return null;
      }
      return { offered: true, dismissed: false, completed: false, offeredAtMs: Date.now() };
    });
    if (alreadyHandled) return 'already-handled';
    if (!written) {
      return isCurrentAccountGeneration(tokenFor(account), account.stableId.trim())
        ? 'unavailable'
        : 'stale-account';
    }
    emitAppEvent('avatar_dna_invitation_requested', { source: 'first_achievement' });
    return 'offered';
  } catch {
    return 'unavailable';
  }
}

export async function dismissAvatarDNAInvitation(stableId: string, generation: number): Promise<boolean> {
  return updateInvitationState({ stableId, generation }, (current) => (
    current ? { ...current, dismissed: true } : null
  )).catch(() => false);
}

export async function completeAvatarDNAInvitation(stableId: string, generation: number): Promise<boolean> {
  return updateInvitationState({ stableId, generation }, (current) => ({
    offered: true,
    dismissed: current?.dismissed ?? false,
    completed: true,
    offeredAtMs: current?.offeredAtMs ?? Date.now(),
  })).catch(() => false);
}
