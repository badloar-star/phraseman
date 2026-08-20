import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from '../../app/account_generation';
import { withStorageLock } from '../../app/storage_mutex';
import { AVATAR_DNA_STATE_PREFIX } from '../../constants/customization_storage_keys';
import { parseAvatarDNA } from './canonicalize';
import type { AvatarDNA } from './contracts';

const OWNER_STABLE_ID_MAX_LENGTH = 256;
const SAFE_RENDER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const STATE_KEYS = [
  'schemaVersion',
  'ownerStableId',
  'accountGeneration',
  'confirmedDNA',
  'lastConfirmedDNA',
  'manifestVersion',
  'lastGood',
  'updatedAtMs',
] as const;
const LAST_GOOD_KEYS = ['portrait', 'studio'] as const;

export type AvatarDNAStoredState = Readonly<{
  schemaVersion: 1;
  ownerStableId: string;
  accountGeneration: number;
  confirmedDNA: AvatarDNA;
  lastConfirmedDNA: AvatarDNA;
  manifestVersion: number;
  lastGood: Readonly<{ portrait: string; studio: string }>;
  updatedAtMs: number;
}>;

export type CommitAvatarDNAResult = Readonly<
  { status: 'committed' } | { status: 'stale-account' }
>;

type UnknownRecord = Record<string, unknown>;

const hasExactKeys = (value: UnknownRecord, expected: readonly string[]): boolean => {
  const actual = Reflect.ownKeys(value);
  return actual.length === expected.length
    && actual.every((key) => typeof key === 'string' && expected.includes(key))
    && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const readExactRecord = (value: unknown, keys: readonly string[]): UnknownRecord | null => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as UnknownRecord;
  return hasExactKeys(record, keys) ? record : null;
};

const validPositiveSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;

const validNonNegativeSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const validateOwnerStableId = (value: unknown): string => {
  if (
    typeof value !== 'string'
    || value.length < 1
    || value.length > OWNER_STABLE_ID_MAX_LENGTH
    || value !== value.trim()
    || /[\u0000-\u001F\u007F]/.test(value)
  ) {
    throw new TypeError('avatar_dna_scope_invalid');
  }
  try {
    encodeURIComponent(value);
  } catch {
    throw new TypeError('avatar_dna_scope_invalid');
  }
  return value;
};

const validateGeneration = (value: unknown): number => {
  if (!validPositiveSafeInteger(value)) throw new TypeError('avatar_dna_scope_invalid');
  return value;
};

const validateRenderId = (value: unknown): string => {
  if (typeof value !== 'string' || !SAFE_RENDER_ID.test(value)) {
    throw new TypeError('avatar_dna_render_id_invalid');
  }
  return value;
};

export function avatarDNAStateStorageKey(
  ownerStableId: string,
  accountGeneration: number,
): string {
  const owner = validateOwnerStableId(ownerStableId);
  const generation = validateGeneration(accountGeneration);
  return `${AVATAR_DNA_STATE_PREFIX}${encodeURIComponent(owner)}:${generation}`;
}
export function parseAvatarDNAStoredState(
  input: unknown,
  expectedOwnerStableId: string,
  expectedAccountGeneration: number,
): AvatarDNAStoredState | null {
  let owner: string;
  let generation: number;
  try {
    owner = validateOwnerStableId(expectedOwnerStableId);
    generation = validateGeneration(expectedAccountGeneration);
  } catch {
    return null;
  }

  try {
    const root = readExactRecord(input, STATE_KEYS);
    if (!root || root.schemaVersion !== 1) return null;
    if (root.ownerStableId !== owner || root.accountGeneration !== generation) return null;
    if (!validPositiveSafeInteger(root.manifestVersion)) return null;
    if (!validNonNegativeSafeInteger(root.updatedAtMs)) return null;
    const lastGood = readExactRecord(root.lastGood, LAST_GOOD_KEYS);
    if (!lastGood) return null;
    const portrait = validateRenderId(lastGood.portrait);
    const studio = validateRenderId(lastGood.studio);
    const confirmedDNA = parseAvatarDNA(root.confirmedDNA);
    const lastConfirmedDNA = parseAvatarDNA(root.lastConfirmedDNA);
    return {
      schemaVersion: 1,
      ownerStableId: owner,
      accountGeneration: generation,
      confirmedDNA,
      lastConfirmedDNA,
      manifestVersion: root.manifestVersion,
      lastGood: { portrait, studio },
      updatedAtMs: root.updatedAtMs,
    };
  } catch {
    return null;
  }
}

export async function readAvatarDNAState(
  ownerStableId: string,
  accountGeneration: number,
): Promise<AvatarDNAStoredState | null> {
  let key: string;
  try {
    key = avatarDNAStateStorageKey(ownerStableId, accountGeneration);
  } catch {
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return parseAvatarDNAStoredState(JSON.parse(raw), ownerStableId, accountGeneration);
  } catch {
    return null;
  }
}

export async function commitAvatarDNA(input: Readonly<{
  ownerStableId: string;
  accountGeneration: number;
  dna: unknown;
  renderIds: Readonly<{ portrait: string; studio: string }>;
  manifestVersion: number;
}>): Promise<CommitAvatarDNAResult> {
  const ownerStableId = validateOwnerStableId(input.ownerStableId);
  const accountGeneration = validateGeneration(input.accountGeneration);
  const key = avatarDNAStateStorageKey(ownerStableId, accountGeneration);
  const confirmedDNA = parseAvatarDNA(input.dna);
  const portrait = validateRenderId(input.renderIds?.portrait);
  const studio = validateRenderId(input.renderIds?.studio);
  if (!validPositiveSafeInteger(input.manifestVersion)) {
    throw new TypeError('avatar_dna_manifest_version_invalid');
  }
  const manifestVersion = input.manifestVersion;

  return withAccountTransitionLock(() => withStorageLock(async () => {
    const current = captureAccountGeneration();
    if (
      current.generation !== accountGeneration
      || !isCurrentAccountGeneration(current, ownerStableId)
    ) {
      return { status: 'stale-account' } as const;
    }

    const previousRaw = await AsyncStorage.getItem(key);
    const previous = previousRaw === null
      ? null
      : (() => {
        try {
          return parseAvatarDNAStoredState(
            JSON.parse(previousRaw),
            ownerStableId,
            accountGeneration,
          );
        } catch {
          return null;
        }
      })();
    const state: AvatarDNAStoredState = {
      schemaVersion: 1,
      ownerStableId,
      accountGeneration,
      confirmedDNA: parseAvatarDNA(confirmedDNA),
      lastConfirmedDNA: parseAvatarDNA(previous?.confirmedDNA ?? confirmedDNA),
      manifestVersion,
      lastGood: { portrait, studio },
      updatedAtMs: Date.now(),
    };

    const stillCurrent = captureAccountGeneration();
    if (
      stillCurrent.generation !== accountGeneration
      || !isCurrentAccountGeneration(stillCurrent, ownerStableId)
    ) {
      return { status: 'stale-account' } as const;
    }
    await AsyncStorage.setItem(key, JSON.stringify(state));
    return { status: 'committed' } as const;
  }));
}
