import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  DAILY_JOURNEY_PRODUCTION_INTENT_PREFIX,
  DAILY_JOURNEY_PRODUCTION_PRESENTED_PREFIX,
} from '../constants/daily_journey_gift_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import {
  consumeDailyJourneyFreezeBatch,
} from './daily_journey_freeze_ledger';
import {
  commitDailyJourneyGift,
  readLatestDailyJourneyProductionOccurrence,
  type DailyJourneyGiftInput,
  type DailyJourneyGiftOccurrenceV1,
} from './daily_journey_gift_inbox';
import { dailyJourneyRewardPayloadForDay } from './daily_journey_rewards';
import { addLocalDays, getLocalDayKey } from './local_date';
import { isForcedOnboardingForQaRuntime } from './onboarding_runtime_gate';
import { withStorageLock } from './storage_mutex';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const OPERATION_RE = /^daily_journey:([a-f0-9]{64}):c([1-9]\d*):d([1-9]\d*):(\d{4}-\d{2}-\d{2})$/;
const FREEZE_USE_RE = /^daily-journey-series-gap:[a-f0-9]{24}:c[1-9]\d*:\d{4}-\d{2}-\d{2}$/;

export type DailyJourneyProductionIntentDraft = Readonly<{
  ownerStableId: string;
  baselineOperationId: string | null;
  localDayKey: string;
  freezeUseOperationIds: readonly string[];
  input: DailyJourneyGiftInput;
}>;

export type DailyJourneyProductionIntentV1 = DailyJourneyProductionIntentDraft & Readonly<{
  schemaVersion: 'daily-journey-production-intent.v1';
  createdAtMs: number;
  payloadFingerprint: string;
}>;

type ProductionRunResult<Token> =
  | Readonly<{ status: 'ready'; occurrence: DailyJourneyGiftOccurrenceV1; token: Token }>
  | Readonly<{ status: 'not_eligible' | 'failed' | 'stale' }>;

export type DailyJourneyProductionHostDependencies<Token> = Readonly<{
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  isRuntimeOnboardingBlocked: () => boolean;
  readOnboardingDone: () => Promise<string | null>;
  ownerStableId: (token: Token) => string | null;
  localDayKey: () => string;
  hashOwner: (ownerStableId: string) => Promise<string>;
  readLatestOccurrence: (token: Token) => Promise<DailyJourneyGiftOccurrenceV1 | null>;
  readPresentedOperationId: (ownerStableId: string, token: Token) => Promise<string | null>;
  writePresentedOperationId: (
    ownerStableId: string,
    operationId: string,
    token: Token,
  ) => Promise<void>;
  readPreparedIntent: (
    ownerStableId: string,
    token: Token,
  ) => Promise<DailyJourneyProductionIntentV1 | null>;
  clearCorruptPreparedIntent: (ownerStableId: string, token: Token) => Promise<void>;
  writePreparedIntent: (
    intent: DailyJourneyProductionIntentDraft,
    token: Token,
  ) => Promise<DailyJourneyProductionIntentV1>;
  clearPreparedIntent: (
    intent: DailyJourneyProductionIntentV1,
    token: Token,
  ) => Promise<void>;
  consumeFreezeBatch: (
    useOperationIds: readonly string[],
    token: Token,
  ) => Promise<Readonly<{ status: 'applied' | 'already_applied' | 'unavailable' }>>;
  commitGift: (
    input: DailyJourneyGiftInput,
    token: Token,
  ) => Promise<Readonly<{
    status: 'committed' | 'already_committed';
    occurrence: DailyJourneyGiftOccurrenceV1;
  }>>;
  reportError: (scope: 'run' | 'presentation', error: unknown) => void;
}>;

export type DailyJourneyProductionHostController<Token> = Readonly<{
  run: () => Promise<ProductionRunResult<Token>>;
  markPresented: (occurrence: DailyJourneyGiftOccurrenceV1, token: Token) => Promise<boolean>;
  releasePresentation: (operationId: string) => void;
}>;

export function dailyJourneyProductionOperationId(
  ownerHash: string,
  cycle: number,
  day: number,
  localDayKey: string,
): string {
  if (!HASH_RE.test(ownerHash)
    || !Number.isSafeInteger(cycle) || cycle < 1
    || !Number.isSafeInteger(day) || day < 1 || day > 50
    || !DAY_KEY_RE.test(localDayKey)) {
    throw new Error('daily_journey_production_identity_invalid');
  }
  return `daily_journey:${ownerHash}:c${cycle}:d${day}:${localDayKey}`;
}

export function millisecondsUntilNextLocalDay(nowMs = Date.now()): number {
  if (!Number.isFinite(nowMs)) return 60_000;
  const next = new Date(nowMs);
  next.setHours(24, 0, 1, 0);
  const delay = next.getTime() - nowMs;
  return Number.isFinite(delay) ? Math.max(1_000, delay) : 60_000;
}

function parseProductionIdentity(
  occurrence: DailyJourneyGiftOccurrenceV1,
  expectedOwnerHash: string,
): Readonly<{ cycle: number; day: number; localDayKey: string }> {
  const match = OPERATION_RE.exec(occurrence.operationId);
  const cycle = Number(match?.[2]);
  const day = Number(match?.[3]);
  const localDayKey = match?.[4] ?? '';
  if (!match
    || match[1] !== expectedOwnerHash
    || occurrence.source !== 'daily_journey'
    || cycle !== occurrence.cycle
    || day !== occurrence.day
    || !Number.isSafeInteger(cycle) || cycle < 1
    || !Number.isSafeInteger(day) || day < 1 || day > 50
    || !DAY_KEY_RE.test(localDayKey)) {
    throw new Error('daily_journey_production_history_corrupt');
  }
  return Object.freeze({ cycle, day, localDayKey });
}

function dayDistance(from: string, to: string): number {
  if (!DAY_KEY_RE.test(from) || !DAY_KEY_RE.test(to)) {
    throw new Error('daily_journey_production_day_invalid');
  }
  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  const distance = (toMs - fromMs) / 86_400_000;
  if (!Number.isSafeInteger(distance)) throw new Error('daily_journey_production_day_invalid');
  return distance;
}

function nextSeriesPosition(cycle: number, day: number): Readonly<{ cycle: number; day: number }> {
  return day >= 50
    ? Object.freeze({ cycle: cycle + 1, day: 1 })
    : Object.freeze({ cycle, day: day + 1 });
}

function freezeUseOperationId(
  ownerHash: string,
  cycle: number,
  missedLocalDayKey: string,
): string {
  return `daily-journey-series-gap:${ownerHash.slice(0, 24)}:c${cycle}:${missedLocalDayKey}`;
}

export function createDailyJourneyProductionHostController<Token>(
  dependencies: DailyJourneyProductionHostDependencies<Token>,
): DailyJourneyProductionHostController<Token> {
  let queue: Promise<void> = Promise.resolve();
  const offered = new Set<string>();

  const report = (scope: 'run' | 'presentation', error: unknown): void => {
    try {
      dependencies.reportError(scope, error);
    } catch {
      // Diagnostics cannot mutate an immutable grant or reject UI lifecycle.
    }
  };

  const executeIntent = async (
    intent: DailyJourneyProductionIntentV1,
    latest: DailyJourneyGiftOccurrenceV1 | null,
    token: Token,
    ownerHash: string,
  ): Promise<ProductionRunResult<Token>> => {
    if (latest?.operationId === intent.input.operationId) {
      await dependencies.clearPreparedIntent(intent, token);
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      offered.add(latest.operationId);
      return Object.freeze({ status: 'ready', occurrence: latest, token });
    }
    if ((latest?.operationId ?? null) !== intent.baselineOperationId) {
      throw new Error('daily_journey_production_intent_baseline_conflict');
    }
    if (intent.freezeUseOperationIds.length > 0) {
      const consumed = await dependencies.consumeFreezeBatch(intent.freezeUseOperationIds, token);
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      if (consumed.status === 'unavailable') {
        if (!latest) throw new Error('daily_journey_production_intent_baseline_conflict');
        const baseline = parseProductionIdentity(latest, ownerHash);
        const resetCycle = baseline.cycle + 1;
        const resetInput: DailyJourneyGiftInput = Object.freeze({
          operationId: dailyJourneyProductionOperationId(
            ownerHash,
            resetCycle,
            1,
            intent.localDayKey,
          ),
          source: 'daily_journey',
          cycle: resetCycle,
          day: 1,
          reward: dailyJourneyRewardPayloadForDay(1),
        });
        await dependencies.clearPreparedIntent(intent, token);
        if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
        const resetIntent = await dependencies.writePreparedIntent(Object.freeze({
          ownerStableId: intent.ownerStableId,
          baselineOperationId: intent.baselineOperationId,
          localDayKey: intent.localDayKey,
          freezeUseOperationIds: Object.freeze([]),
          input: resetInput,
        }), token);
        if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
        return executeIntent(resetIntent, latest, token, ownerHash);
      }
    }
    const committed = await dependencies.commitGift(intent.input, token);
    if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
    await dependencies.clearPreparedIntent(intent, token);
    if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
    offered.add(committed.occurrence.operationId);
    return Object.freeze({ status: 'ready', occurrence: committed.occurrence, token });
  };

  const executeRun = async (): Promise<ProductionRunResult<Token>> => {
    const token = dependencies.captureToken();
    try {
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      if (dependencies.isRuntimeOnboardingBlocked()) return { status: 'not_eligible' };
      const onboardingDone = await dependencies.readOnboardingDone();
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      if (onboardingDone !== '1') return { status: 'not_eligible' };
      const ownerStableId = dependencies.ownerStableId(token)?.trim() ?? '';
      if (!ownerStableId) throw new Error('daily_journey_production_owner_missing');
      const today = dependencies.localDayKey();
      if (!DAY_KEY_RE.test(today)) throw new Error('daily_journey_production_day_invalid');
      const ownerHash = await dependencies.hashOwner(ownerStableId);
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      if (!HASH_RE.test(ownerHash)) throw new Error('daily_journey_production_owner_hash_invalid');

      const latest = await dependencies.readLatestOccurrence(token);
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      let recoveredCorruptIntent = false;
      let prepared: DailyJourneyProductionIntentV1 | null;
      try {
        prepared = await dependencies.readPreparedIntent(ownerStableId, token);
      } catch (error) {
        if (!(error instanceof Error)
          || error.message !== 'daily_journey_production_intent_corrupt') throw error;
        await dependencies.clearCorruptPreparedIntent(ownerStableId, token);
        recoveredCorruptIntent = true;
        prepared = null;
      }
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      if (prepared) {
        if (prepared.ownerStableId !== ownerStableId
          || prepared.input.operationId !== dailyJourneyProductionOperationId(
            ownerHash,
            prepared.input.cycle,
            prepared.input.day,
            prepared.localDayKey,
          )) {
          throw new Error('daily_journey_production_intent_corrupt');
        }
        return await executeIntent(prepared, latest, token, ownerHash);
      }
      let cycle = 1;
      let day = 1;
      const freezeUseOperationIds: string[] = [];
      let latestIdentity: Readonly<{ cycle: number; day: number; localDayKey: string }> | null = null;

      if (latest) {
        if (latest.ownerStableId !== ownerStableId) {
          throw new Error('daily_journey_production_owner_mismatch');
        }
        const identity = parseProductionIdentity(latest, ownerHash);
        latestIdentity = identity;
        const distance = dayDistance(identity.localDayKey, today);
        if (distance < 0) return { status: 'not_eligible' };
        const presented = await dependencies.readPresentedOperationId(ownerStableId, token);
        if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
        if (presented !== latest.operationId && !offered.has(latest.operationId)) {
          offered.add(latest.operationId);
          return Object.freeze({ status: 'ready', occurrence: latest, token });
        }
        if (distance === 0) return { status: 'not_eligible' };

        const missedUseIds = Array.from({ length: Math.max(0, distance - 1) }, (_, index) => (
          freezeUseOperationId(ownerHash, identity.cycle, addLocalDays(identity.localDayKey, index + 1))
        ));
        freezeUseOperationIds.push(...missedUseIds);
        ({ cycle, day } = nextSeriesPosition(identity.cycle, identity.day));
      }

      const operationId = dailyJourneyProductionOperationId(ownerHash, cycle, day, today);
      const input: DailyJourneyGiftInput = Object.freeze({
        operationId,
        source: 'daily_journey',
        cycle,
        day,
        reward: dailyJourneyRewardPayloadForDay(day),
      });
      const writeIntent = async (
        localDayKey: string,
        useOperationIds: readonly string[],
      ): Promise<DailyJourneyProductionIntentV1> => dependencies.writePreparedIntent(Object.freeze({
        ownerStableId,
        baselineOperationId: latest?.operationId ?? null,
        localDayKey,
        freezeUseOperationIds: Object.freeze([...useOperationIds]),
        input: Object.freeze({
          ...input,
          operationId: dailyJourneyProductionOperationId(ownerHash, cycle, day, localDayKey),
        }),
      }), token);

      if (recoveredCorruptIntent && latestIdentity && freezeUseOperationIds.length > 1) {
        for (let length = freezeUseOperationIds.length; length >= 1; length -= 1) {
          const candidateIntent = await writeIntent(
            addLocalDays(latestIdentity.localDayKey, length + 1),
            freezeUseOperationIds.slice(0, length),
          );
          if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
          try {
            return await executeIntent(candidateIntent, latest, token, ownerHash);
          } catch (error) {
            if (!(error instanceof Error)
              || error.message !== 'daily_journey_freeze_operation_conflict') throw error;
            await dependencies.clearPreparedIntent(candidateIntent, token);
            if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
            if (length === 1) throw error;
          }
        }
      }

      const intent = await writeIntent(today, freezeUseOperationIds);
      if (!dependencies.isTokenCurrent(token)) return { status: 'stale' };
      return await executeIntent(intent, latest, token, ownerHash);
    } catch (error) {
      report('run', error);
      return { status: 'failed' };
    }
  };

  const run = (): Promise<ProductionRunResult<Token>> => {
    const result = queue.then(executeRun, executeRun);
    queue = result.then(() => undefined, () => undefined);
    return result;
  };

  const markPresented = async (
    occurrence: DailyJourneyGiftOccurrenceV1,
    token: Token,
  ): Promise<boolean> => {
    try {
      if (!dependencies.isTokenCurrent(token)) return false;
      const ownerStableId = dependencies.ownerStableId(token)?.trim() ?? '';
      if (!ownerStableId || occurrence.ownerStableId !== ownerStableId) return false;
      await dependencies.writePresentedOperationId(ownerStableId, occurrence.operationId, token);
      if (!dependencies.isTokenCurrent(token)) return false;
      offered.add(occurrence.operationId);
      return true;
    } catch (error) {
      report('presentation', error);
      return false;
    }
  };

  return Object.freeze({
    run,
    markPresented,
    releasePresentation: (operationId: string) => offered.delete(operationId),
  });
}

export type PresentedReceiptV1 = Readonly<{
  schemaVersion: 'daily-journey-production-presented.v1';
  ownerStableId: string;
  operationId: string;
  presentedAtMs: number;
}>;

export function dailyJourneyProductionPresentedStorageKey(ownerStableId: string): string {
  return `${DAILY_JOURNEY_PRODUCTION_PRESENTED_PREFIX}${encodeURIComponent(ownerStableId)}`;
}

export function dailyJourneyProductionIntentStorageKey(ownerStableId: string): string {
  return `${DAILY_JOURNEY_PRODUCTION_INTENT_PREFIX}${encodeURIComponent(ownerStableId)}`;
}

function assertCurrentToken(token: AccountGenerationToken, ownerStableId: string): void {
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('daily_journey_production_account_stale');
  }
}

async function withProductionStorageLock<T>(
  ownerStableId: string,
  token: AccountGenerationToken,
  work: () => Promise<T>,
  inheritedLease?: AccountTransitionLockLease,
): Promise<T> {
  assertCurrentToken(token, ownerStableId);
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    assertCurrentToken(token, ownerStableId);
    const value = await work();
    // Mandatory after-I/O generation guard: a queued old-account write can
    // never complete successfully across deletion/account replacement.
    assertCurrentToken(token, ownerStableId);
    return value;
  }), inheritedLease);
}

function parsePresentedReceiptRaw(
  raw: string,
  ownerStableId: string,
): PresentedReceiptV1 {
  try {
    const parsed = JSON.parse(raw) as Partial<PresentedReceiptV1>;
    if (Object.keys(parsed).sort().join(',') !== 'operationId,ownerStableId,presentedAtMs,schemaVersion'
      || parsed.schemaVersion !== 'daily-journey-production-presented.v1'
      || parsed.ownerStableId !== ownerStableId
      || typeof parsed.operationId !== 'string' || !OPERATION_RE.test(parsed.operationId)
      || !Number.isSafeInteger(parsed.presentedAtMs) || Number(parsed.presentedAtMs) < 0) {
      throw new Error('daily_journey_production_presented_corrupt');
    }
    return Object.freeze(parsed as PresentedReceiptV1);
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_production_presented_corrupt') throw error;
    throw new Error('daily_journey_production_presented_corrupt');
  }
}

export async function readPresentedReceipt(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<PresentedReceiptV1 | null> {
  return withProductionStorageLock(ownerStableId, token, async () => {
    const raw = await AsyncStorage.getItem(dailyJourneyProductionPresentedStorageKey(ownerStableId));
    return raw === null ? null : parsePresentedReceiptRaw(raw, ownerStableId);
  });
}

export async function writePresentedReceipt(
  ownerStableId: string,
  operationId: string,
  token: AccountGenerationToken,
): Promise<void> {
  if (!OPERATION_RE.test(operationId)) throw new Error('daily_journey_production_presented_invalid');
  await withProductionStorageLock(ownerStableId, token, async () => {
    const receipt: PresentedReceiptV1 = Object.freeze({
      schemaVersion: 'daily-journey-production-presented.v1',
      ownerStableId,
      operationId,
      presentedAtMs: Date.now(),
    });
    const raw = JSON.stringify(receipt);
    const key = dailyJourneyProductionPresentedStorageKey(ownerStableId);
    await AsyncStorage.setItem(key, raw);
    assertCurrentToken(token, ownerStableId);
    const verifiedRaw = await AsyncStorage.getItem(key);
    if (verifiedRaw === null
      || JSON.stringify(parsePresentedReceiptRaw(verifiedRaw, ownerStableId)) !== raw) {
      throw new Error('daily_journey_production_presented_write_unverified');
    }
  });
}

function intentBody(
  intent: Omit<DailyJourneyProductionIntentV1, 'payloadFingerprint'>,
) {
  return {
    schemaVersion: intent.schemaVersion,
    ownerStableId: intent.ownerStableId,
    baselineOperationId: intent.baselineOperationId,
    localDayKey: intent.localDayKey,
    freezeUseOperationIds: intent.freezeUseOperationIds,
    input: intent.input,
    createdAtMs: intent.createdAtMs,
  };
}

async function fingerprintIntent(
  intent: Omit<DailyJourneyProductionIntentV1, 'payloadFingerprint'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(intentBody(intent)),
  );
}

function validIntentInput(input: unknown): input is DailyJourneyGiftInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as Partial<DailyJourneyGiftInput>;
  const reward = value.reward as Partial<DailyJourneyGiftInput['reward']> | undefined;
  const validKind = reward?.kind === 'pearls'
    || reward?.kind === 'runes'
    || reward?.kind === 'spins'
    || reward?.kind === 'energy_full'
    || reward?.kind === 'energy_plus'
    || reward?.kind === 'freeze';
  return Object.keys(value).sort().join(',') === 'cycle,day,operationId,reward,source'
    && Object.keys(reward ?? {}).sort().join(',') === 'amount,kind'
    && typeof value.operationId === 'string' && OPERATION_RE.test(value.operationId)
    && value.source === 'daily_journey'
    && Number.isSafeInteger(value.cycle) && Number(value.cycle) >= 1
    && Number.isSafeInteger(value.day) && Number(value.day) >= 1 && Number(value.day) <= 50
    && validKind
    && Number.isSafeInteger(reward?.amount) && Number(reward?.amount) >= 1;
}

async function parsePreparedIntentRaw(
  raw: string,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyProductionIntentV1> {
  try {
    const value = JSON.parse(raw) as Partial<DailyJourneyProductionIntentV1>;
    const useIds = value.freezeUseOperationIds;
    if (Object.keys(value).sort().join(',') !== 'baselineOperationId,createdAtMs,freezeUseOperationIds,input,localDayKey,ownerStableId,payloadFingerprint,schemaVersion'
      || value.schemaVersion !== 'daily-journey-production-intent.v1'
      || value.ownerStableId !== ownerStableId
      || !(value.baselineOperationId === null
        || typeof value.baselineOperationId === 'string' && OPERATION_RE.test(value.baselineOperationId))
      || typeof value.localDayKey !== 'string' || !DAY_KEY_RE.test(value.localDayKey)
      || !Array.isArray(useIds)
      || useIds.some((id) => typeof id !== 'string' || !FREEZE_USE_RE.test(id))
      || new Set(useIds).size !== useIds.length
      || !validIntentInput(value.input)
      || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
      || typeof value.payloadFingerprint !== 'string' || !HASH_RE.test(value.payloadFingerprint)) {
      throw new Error('daily_journey_production_intent_corrupt');
    }
    const intent = value as DailyJourneyProductionIntentV1;
    const expected = await fingerprintIntent(intent);
    assertCurrentToken(token, ownerStableId);
    if (expected !== intent.payloadFingerprint) {
      throw new Error('daily_journey_production_intent_corrupt');
    }
    return Object.freeze(intent);
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_production_account_stale') throw error;
    throw new Error('daily_journey_production_intent_corrupt');
  }
}

export async function readPreparedIntent(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyProductionIntentV1 | null> {
  return withProductionStorageLock(ownerStableId, token, async () => {
    const raw = await AsyncStorage.getItem(dailyJourneyProductionIntentStorageKey(ownerStableId));
    return raw === null ? null : parsePreparedIntentRaw(raw, ownerStableId, token);
  });
}

export async function clearCorruptPreparedIntent(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<void> {
  await withProductionStorageLock(ownerStableId, token, async () => {
    const key = dailyJourneyProductionIntentStorageKey(ownerStableId);
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return;
    try {
      await parsePreparedIntentRaw(raw, ownerStableId, token);
    } catch (error) {
      if (!(error instanceof Error)
        || error.message !== 'daily_journey_production_intent_corrupt') throw error;
      await AsyncStorage.removeItem(key);
      assertCurrentToken(token, ownerStableId);
      if (await AsyncStorage.getItem(key) !== null) {
        throw new Error('daily_journey_production_intent_corrupt_clear_failed');
      }
      return;
    }
    throw new Error('daily_journey_production_intent_corrupt_clear_conflict');
  });
}

export async function writePreparedIntent(
  draft: DailyJourneyProductionIntentDraft,
  token: AccountGenerationToken,
): Promise<DailyJourneyProductionIntentV1> {
  const ownerStableId = draft.ownerStableId.trim();
  if (!DAY_KEY_RE.test(draft.localDayKey)
    || !validIntentInput(draft.input)
    || !(draft.baselineOperationId === null || OPERATION_RE.test(draft.baselineOperationId))
    || draft.freezeUseOperationIds.some((id) => !FREEZE_USE_RE.test(id))
    || new Set(draft.freezeUseOperationIds).size !== draft.freezeUseOperationIds.length) {
    throw new Error('daily_journey_production_intent_invalid');
  }
  return withProductionStorageLock(ownerStableId, token, async () => {
    const key = dailyJourneyProductionIntentStorageKey(ownerStableId);
    const currentRaw = await AsyncStorage.getItem(key);
    const current = currentRaw === null
      ? null
      : await parsePreparedIntentRaw(currentRaw, ownerStableId, token);
    if (current) {
      const sameDraft = JSON.stringify(intentBody(current)) === JSON.stringify({
        schemaVersion: 'daily-journey-production-intent.v1',
        ...draft,
        createdAtMs: current.createdAtMs,
      });
      if (!sameDraft) throw new Error('daily_journey_production_intent_conflict');
      return current;
    }
    const body: Omit<DailyJourneyProductionIntentV1, 'payloadFingerprint'> = Object.freeze({
      schemaVersion: 'daily-journey-production-intent.v1',
      ownerStableId,
      baselineOperationId: draft.baselineOperationId,
      localDayKey: draft.localDayKey,
      freezeUseOperationIds: Object.freeze([...draft.freezeUseOperationIds]),
      input: draft.input,
      createdAtMs: Date.now(),
    });
    const intent: DailyJourneyProductionIntentV1 = Object.freeze({
      ...body,
      payloadFingerprint: await fingerprintIntent(body),
    });
    assertCurrentToken(token, ownerStableId);
    const raw = JSON.stringify(intent);
    await AsyncStorage.setItem(key, raw);
    assertCurrentToken(token, ownerStableId);
    const verifiedRaw = await AsyncStorage.getItem(key);
    const verified = verifiedRaw === null
      ? null
      : await parsePreparedIntentRaw(verifiedRaw, ownerStableId, token);
    if (!verified || JSON.stringify(verified) !== raw) {
      throw new Error('daily_journey_production_intent_write_unverified');
    }
    return verified;
  });
}

export async function clearPreparedIntent(
  intent: DailyJourneyProductionIntentV1,
  token: AccountGenerationToken,
): Promise<void> {
  await withProductionStorageLock(intent.ownerStableId, token, async () => {
    const key = dailyJourneyProductionIntentStorageKey(intent.ownerStableId);
    const currentRaw = await AsyncStorage.getItem(key);
    const current = currentRaw === null
      ? null
      : await parsePreparedIntentRaw(currentRaw, intent.ownerStableId, token);
    if (!current || JSON.stringify(current) !== JSON.stringify(intent)) {
      throw new Error('daily_journey_production_intent_clear_conflict');
    }
    await AsyncStorage.removeItem(key);
    assertCurrentToken(token, intent.ownerStableId);
    if (await AsyncStorage.getItem(key) !== null) {
      throw new Error('daily_journey_production_intent_clear_failed');
    }
  });
}

export function createDefaultDailyJourneyProductionHostController(
  reportError: (scope: 'run' | 'presentation', error: unknown) => void,
): DailyJourneyProductionHostController<AccountGenerationToken> {
  return createDailyJourneyProductionHostController<AccountGenerationToken>({
    captureToken: captureAccountGeneration,
    isTokenCurrent: (token) => isCurrentAccountGeneration(token),
    isRuntimeOnboardingBlocked: isForcedOnboardingForQaRuntime,
    readOnboardingDone: () => AsyncStorage.getItem('onboarding_done').catch(() => null),
    ownerStableId: (token) => token.stableId,
    localDayKey: getLocalDayKey,
    hashOwner: (ownerStableId) => Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      ownerStableId,
    ),
    readLatestOccurrence: readLatestDailyJourneyProductionOccurrence,
    readPresentedOperationId: async (ownerStableId, token) => (
      (await readPresentedReceipt(ownerStableId, token))?.operationId ?? null
    ),
    writePresentedOperationId: writePresentedReceipt,
    readPreparedIntent,
    clearCorruptPreparedIntent,
    writePreparedIntent,
    clearPreparedIntent,
    consumeFreezeBatch: consumeDailyJourneyFreezeBatch,
    commitGift: commitDailyJourneyGift,
    reportError,
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
