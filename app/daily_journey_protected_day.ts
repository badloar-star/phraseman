import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { DAILY_JOURNEY_PROTECTED_DAY_PREPARED_PREFIX } from '../constants/daily_journey_freeze_storage_keys';
import { persistLegacyPersonalProgressScalar } from '../modules/phone-state/legacy_mirror';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { consumeDailyJourneyFreeze } from './daily_journey_freeze_ledger';

const USE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,159}$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;

export type DailyJourneyProtectedDayInput = Readonly<{
  useOperationId: string;
  lastActiveDate: string;
  protectedDayDate: string;
  streakCount: number;
}>;

type DailyJourneyProtectedDayPreparedV1 = Readonly<{
  schemaVersion: 'daily-journey-protected-day-prepared.v1';
  ownerStableId: string;
  useOperationId: string;
  lastActiveDate: string;
  protectedDayDate: string;
  streakCount: number;
  createdAtMs: number;
  payloadFingerprint: string;
}>;

function assertCurrent(token: AccountGenerationToken): string {
  const ownerStableId = token.stableId?.trim() ?? '';
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('daily_journey_protected_day_account_stale');
  }
  return ownerStableId;
}

async function accountAwait<T>(token: AccountGenerationToken, work: () => Promise<T>): Promise<T> {
  assertCurrent(token);
  const value = await work();
  assertCurrent(token);
  return value;
}

const preparedKey = (ownerStableId: string): string => (
  `${DAILY_JOURNEY_PROTECTED_DAY_PREPARED_PREFIX}${encodeURIComponent(ownerStableId)}`
);

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function assertInput(input: DailyJourneyProtectedDayInput): void {
  if (!USE_ID_RE.test(input.useOperationId)
    || !DATE_KEY_RE.test(input.lastActiveDate)
    || !DATE_KEY_RE.test(input.protectedDayDate)
    || input.lastActiveDate >= input.protectedDayDate
    || !Number.isSafeInteger(input.streakCount)
    || input.streakCount < 1) {
    throw new Error('daily_journey_protected_day_invalid');
  }
}

function preparedBody(
  prepared: Omit<DailyJourneyProtectedDayPreparedV1, 'payloadFingerprint'>,
) {
  return {
    schemaVersion: prepared.schemaVersion,
    ownerStableId: prepared.ownerStableId,
    useOperationId: prepared.useOperationId,
    lastActiveDate: prepared.lastActiveDate,
    protectedDayDate: prepared.protectedDayDate,
    streakCount: prepared.streakCount,
    createdAtMs: prepared.createdAtMs,
  };
}

async function fingerprintPrepared(
  prepared: Omit<DailyJourneyProtectedDayPreparedV1, 'payloadFingerprint'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(preparedBody(prepared)),
  );
}

async function parsePrepared(
  raw: string | null,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyProtectedDayPreparedV1 | null> {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || !hasExactKeys(value, [
        'schemaVersion', 'ownerStableId', 'useOperationId', 'lastActiveDate',
        'protectedDayDate', 'streakCount', 'createdAtMs', 'payloadFingerprint',
      ])) return null;
    const prepared = value as DailyJourneyProtectedDayPreparedV1;
    if (prepared.schemaVersion !== 'daily-journey-protected-day-prepared.v1'
      || prepared.ownerStableId !== ownerStableId
      || !USE_ID_RE.test(prepared.useOperationId)
      || !DATE_KEY_RE.test(prepared.lastActiveDate)
      || !DATE_KEY_RE.test(prepared.protectedDayDate)
      || prepared.lastActiveDate >= prepared.protectedDayDate
      || !Number.isSafeInteger(prepared.streakCount) || prepared.streakCount < 1
      || !Number.isSafeInteger(prepared.createdAtMs) || prepared.createdAtMs < 0
      || !FINGERPRINT_RE.test(prepared.payloadFingerprint)) return null;
    const expected = await accountAwait(token, () => fingerprintPrepared(prepared));
    return expected === prepared.payloadFingerprint ? Object.freeze(prepared) : null;
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_protected_day_account_stale') {
      throw error;
    }
    return null;
  }
}

async function clearPrepared(
  prepared: DailyJourneyProtectedDayPreparedV1,
  token: AccountGenerationToken,
): Promise<void> {
  const key = preparedKey(prepared.ownerStableId);
  const currentRaw = await accountAwait(token, () => AsyncStorage.getItem(key));
  const current = await accountAwait(
    token,
    () => parsePrepared(currentRaw, prepared.ownerStableId, token),
  );
  if (!current || JSON.stringify(current) !== JSON.stringify(prepared)) {
    throw new Error('daily_journey_protected_day_prepared_conflict');
  }
  await accountAwait(token, () => AsyncStorage.removeItem(key));
  const remaining = await accountAwait(token, () => AsyncStorage.getItem(key));
  if (remaining !== null) throw new Error('daily_journey_protected_day_prepared_clear_failed');
}

async function executePrepared(
  prepared: DailyJourneyProtectedDayPreparedV1,
  token: AccountGenerationToken,
  lease: AccountTransitionLockLease,
): Promise<boolean> {
  const consumed = await accountAwait(
    token,
    () => consumeDailyJourneyFreeze(prepared.useOperationId, token, lease),
  );
  if (!consumed) {
    await accountAwait(token, () => clearPrepared(prepared, token));
    return false;
  }
  await accountAwait(token, () => persistLegacyPersonalProgressScalar(
    AsyncStorage,
    'streak_count',
    prepared.streakCount,
  ));
  const streakRaw = await accountAwait(token, () => AsyncStorage.getItem('streak_count'));
  if (streakRaw !== String(prepared.streakCount)) {
    throw new Error('daily_journey_protected_day_result_not_durable');
  }
  await accountAwait(
    token,
    () => AsyncStorage.setItem('last_active_date', prepared.protectedDayDate),
  );
  const lastActiveRaw = await accountAwait(token, () => AsyncStorage.getItem('last_active_date'));
  if (lastActiveRaw !== prepared.protectedDayDate) {
    throw new Error('daily_journey_protected_day_result_not_durable');
  }
  await accountAwait(token, () => clearPrepared(prepared, token));
  return true;
}

export async function commitDailyJourneyProtectedDay(
  input: DailyJourneyProtectedDayInput,
  token: AccountGenerationToken = captureAccountGeneration(),
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<boolean> {
  assertInput(input);
  return accountAwait(token, () => withAccountTransitionLock(async (lease) => {
    const ownerStableId = assertCurrent(token);
    const key = preparedKey(ownerStableId);
    const currentRaw = await accountAwait(token, () => AsyncStorage.getItem(key));
    let prepared = await accountAwait(token, () => parsePrepared(currentRaw, ownerStableId, token));
    if (currentRaw !== null && !prepared) {
      throw new Error('daily_journey_protected_day_prepared_corrupt');
    }
    if (prepared) {
      if (prepared.useOperationId !== input.useOperationId
        || prepared.lastActiveDate !== input.lastActiveDate
        || prepared.protectedDayDate !== input.protectedDayDate
        || prepared.streakCount !== input.streakCount) {
        throw new Error('daily_journey_protected_day_prepared_conflict');
      }
    } else {
      const body: Omit<DailyJourneyProtectedDayPreparedV1, 'payloadFingerprint'> = {
        schemaVersion: 'daily-journey-protected-day-prepared.v1',
        ownerStableId,
        useOperationId: input.useOperationId,
        lastActiveDate: input.lastActiveDate,
        protectedDayDate: input.protectedDayDate,
        streakCount: input.streakCount,
        createdAtMs: Date.now(),
      };
      prepared = Object.freeze({
        ...body,
        payloadFingerprint: await accountAwait(token, () => fingerprintPrepared(body)),
      });
      await accountAwait(token, () => AsyncStorage.setItem(key, JSON.stringify(prepared)));
      const verifiedRaw = await accountAwait(token, () => AsyncStorage.getItem(key));
      const verified = await accountAwait(token, () => parsePrepared(verifiedRaw, ownerStableId, token));
      if (!verified || JSON.stringify(verified) !== JSON.stringify(prepared)) {
        throw new Error('daily_journey_protected_day_prepared_write_unverified');
      }
      prepared = verified;
    }
    return executePrepared(prepared, token, lease);
  }, accountTransitionLockLease));
}

export async function recoverDailyJourneyProtectedDay(
  token: AccountGenerationToken = captureAccountGeneration(),
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<boolean> {
  return accountAwait(token, () => withAccountTransitionLock(async (lease) => {
    const ownerStableId = assertCurrent(token);
    const raw = await accountAwait(token, () => AsyncStorage.getItem(preparedKey(ownerStableId)));
    if (raw === null) return false;
    const prepared = await accountAwait(token, () => parsePrepared(raw, ownerStableId, token));
    if (!prepared) throw new Error('daily_journey_protected_day_prepared_corrupt');
    return executePrepared(prepared, token, lease);
  }, accountTransitionLockLease));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
