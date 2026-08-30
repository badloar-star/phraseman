import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  DAILY_JOURNEY_GIFT_ACCOUNT_LOCAL_PREFIXES,
  DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX,
  DAILY_JOURNEY_GIFT_OCCURRENCE_PREFIX,
  DAILY_JOURNEY_GIFT_PREPARED_PREFIX,
  DAILY_JOURNEY_GIFT_PROJECTION_PREFIX,
} from '../constants/daily_journey_gift_storage_keys';

import {
  captureAccountGeneration,
  isCapturedAccountGenerationToken,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  applyDailyJourneyGiftActivation,
  finalizeDailyJourneyGiftActivation,
} from './daily_journey_gift_activation';
import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';

const OCCURRENCE_PREFIX = DAILY_JOURNEY_GIFT_OCCURRENCE_PREFIX;
const PREPARED_PREFIX = DAILY_JOURNEY_GIFT_PREPARED_PREFIX;
const PROJECTION_PREFIX = DAILY_JOURNEY_GIFT_PROJECTION_PREFIX;
const CLAIM_RECEIPT_PREFIX = DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX;
const OPERATION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,159}$/;
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;
const MAX_REWARD_AMOUNT = 1_000_000;
const MAX_DISPLAYED_REVISIONS = 64;

export type DailyJourneyGiftRewardKind =
  | 'pearls'
  | 'runes'
  | 'spins'
  | 'energy_full'
  | 'energy_plus'
  | 'freeze';

export type DailyJourneyGiftRewardV1 = Readonly<{
  kind: DailyJourneyGiftRewardKind;
  amount: number;
}>;

export type DailyJourneyGiftInput = Readonly<{
  operationId: string;
  source: 'daily_journey' | 'daily_journey_dev';
  cycle: number;
  day: number;
  reward: DailyJourneyGiftRewardV1;
}>;

export type DailyJourneyGiftOccurrenceV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-occurrence.v1';
  operationId: string;
  ownerStableId: string;
  source: DailyJourneyGiftInput['source'];
  cycle: number;
  day: number;
  reward: DailyJourneyGiftRewardV1;
  revision: number;
  createdAtMs: number;
  payloadFingerprint: string;
}>;

export type DailyJourneyGiftPendingItem = DailyJourneyGiftOccurrenceV1 & Readonly<{
  claimState: 'pending';
}>;

type DailyJourneyGiftProjectionStateV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-projection.v1';
  ownerStableId: string;
  latestRevision: number;
  seenRevision: number;
  displayedRevisions: readonly number[];
}>;

type DailyJourneyGiftPreparedV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-prepared.v1';
  ownerStableId: string;
  occurrence: DailyJourneyGiftOccurrenceV1;
  preparedAtMs: number;
}>;

type DailyJourneyGiftClaimPreparedV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-claim-prepared.v1';
  claimOperationId: string;
  ownerStableId: string;
  occurrence: DailyJourneyGiftOccurrenceV1;
  occurrenceFingerprint: string;
  reward: DailyJourneyGiftRewardV1;
  preparedAtMs: number;
}>;

export type DailyJourneyGiftClaimReceiptV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-claim-receipt.v1';
  claimOperationId: string;
  operationId: string;
  ownerStableId: string;
  occurrenceFingerprint: string;
  reward: DailyJourneyGiftRewardV1;
  claimedAtMs: number;
}>;

function ownerPart(ownerStableId: string): string {
  return encodeURIComponent(ownerStableId);
}

function operationPart(operationId: string): string {
  return encodeURIComponent(operationId);
}

function occurrenceKey(ownerStableId: string, operationId: string): string {
  return `${OCCURRENCE_PREFIX}${ownerPart(ownerStableId)}:${operationPart(operationId)}`;
}

function occurrenceOwnerPrefix(ownerStableId: string): string {
  return `${OCCURRENCE_PREFIX}${ownerPart(ownerStableId)}:`;
}

function preparedKey(ownerStableId: string): string {
  return `${PREPARED_PREFIX}${ownerPart(ownerStableId)}`;
}

function projectionKey(ownerStableId: string): string {
  return `${PROJECTION_PREFIX}${ownerPart(ownerStableId)}`;
}

function claimReceiptKey(ownerStableId: string, operationId: string): string {
  return `${CLAIM_RECEIPT_PREFIX}${ownerPart(ownerStableId)}:${operationPart(operationId)}`;
}

function claimPreparedKey(ownerStableId: string): string {
  return `${CLAIM_RECEIPT_PREFIX}${ownerPart(ownerStableId)}:__prepared__:`;
}

export function dailyJourneyGiftClaimOperationId(operationId: string): string {
  return `daily-journey-gift-claim:${operationId}`;
}

export function dailyJourneyGiftClaimReceiptStorageKey(
  ownerStableId: string,
  operationId: string,
): string {
  return claimReceiptKey(ownerStableId, operationId);
}

export function dailyJourneyGiftClaimPreparedStorageKey(ownerStableId: string): string {
  return claimPreparedKey(ownerStableId);
}

function ownKeys(value: object): string[] {
  return Object.keys(value).sort();
}

function assertExactKeys(value: object, expected: readonly string[]): void {
  const actual = ownKeys(value);
  const sortedExpected = [...expected].sort();
  if (actual.length !== sortedExpected.length || actual.some((key, index) => key !== sortedExpected[index])) {
    throw new Error('daily_journey_occurrence_invalid');
  }
}

function normalizeInput(input: DailyJourneyGiftInput): DailyJourneyGiftInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('daily_journey_occurrence_invalid');
  }
  assertExactKeys(input, ['operationId', 'source', 'cycle', 'day', 'reward']);
  if (!input.reward || typeof input.reward !== 'object' || Array.isArray(input.reward)) {
    throw new Error('daily_journey_occurrence_invalid');
  }
  assertExactKeys(input.reward, ['kind', 'amount']);
  if (typeof input.operationId !== 'string'
    || typeof input.cycle !== 'number'
    || typeof input.day !== 'number'
    || typeof input.reward.kind !== 'string'
    || typeof input.reward.amount !== 'number') {
    throw new Error('daily_journey_occurrence_invalid');
  }
  const operationId = input.operationId;
  const source = input.source;
  const cycle = input.cycle;
  const day = input.day;
  const kind = input.reward.kind;
  const amount = input.reward.amount;
  const validKind = kind === 'pearls'
    || kind === 'runes'
    || kind === 'spins'
    || kind === 'energy_full'
    || kind === 'energy_plus'
    || kind === 'freeze';
  if (!OPERATION_ID_RE.test(operationId)
    || (source !== 'daily_journey' && source !== 'daily_journey_dev')
    || !Number.isSafeInteger(cycle) || cycle < 1 || cycle > 1_000_000
    || !Number.isSafeInteger(day) || day < 1 || day > 50
    || !validKind
    || !Number.isSafeInteger(amount) || amount < 1 || amount > MAX_REWARD_AMOUNT
    || (kind === 'runes' && amount < 100)) {
    throw new Error('daily_journey_occurrence_invalid');
  }
  return Object.freeze({
    operationId,
    source,
    cycle,
    day,
    reward: Object.freeze({ kind, amount }),
  });
}

function canonicalPayload(
  ownerStableId: string,
  input: DailyJourneyGiftInput,
  revision: number,
  createdAtMs: number,
): string {
  return JSON.stringify({
    schemaVersion: 'daily-journey-gift-occurrence.v1',
    operationId: input.operationId,
    ownerStableId,
    source: input.source,
    cycle: input.cycle,
    day: input.day,
    reward: { kind: input.reward.kind, amount: input.reward.amount },
    revision,
    createdAtMs,
  });
}

async function payloadFingerprint(
  ownerStableId: string,
  input: DailyJourneyGiftInput,
  revision: number,
  createdAtMs: number,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalPayload(ownerStableId, input, revision, createdAtMs),
  );
}

function occurrenceInput(occurrence: DailyJourneyGiftOccurrenceV1): DailyJourneyGiftInput {
  return {
    operationId: occurrence.operationId,
    source: occurrence.source,
    cycle: occurrence.cycle,
    day: occurrence.day,
    reward: occurrence.reward,
  };
}

function assertCurrentToken(token: AccountGenerationToken): string {
  const ownerStableId = token.stableId?.trim() ?? '';
  if (!ownerStableId
    || ownerStableId.length > 160
    || ownerStableId.includes('/')
    || !isCapturedAccountGenerationToken(token)
    || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('daily_journey_account_stale');
  }
  return ownerStableId;
}

async function accountAwait<T>(
  token: AccountGenerationToken,
  operation: () => Promise<T>,
): Promise<T> {
  assertCurrentToken(token);
  const value = await operation();
  assertCurrentToken(token);
  return value;
}

function sameInput(
  occurrence: DailyJourneyGiftOccurrenceV1,
  input: DailyJourneyGiftInput,
): boolean {
  return occurrence.operationId === input.operationId
    && occurrence.source === input.source
    && occurrence.cycle === input.cycle
    && occurrence.day === input.day
    && occurrence.reward.kind === input.reward.kind
    && occurrence.reward.amount === input.reward.amount;
}

function parseOccurrenceShape(raw: string | null, ownerStableId: string): DailyJourneyGiftOccurrenceV1 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftOccurrenceV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    assertExactKeys(value, [
      'schemaVersion', 'operationId', 'ownerStableId', 'source', 'cycle', 'day', 'reward',
      'revision', 'createdAtMs', 'payloadFingerprint',
    ]);
    if (value.schemaVersion !== 'daily-journey-gift-occurrence.v1'
      || value.ownerStableId !== ownerStableId
      || !Number.isSafeInteger(value.revision) || value.revision < 1
      || !Number.isSafeInteger(value.createdAtMs) || value.createdAtMs < 0
      || !FINGERPRINT_RE.test(value.payloadFingerprint)) return null;
    const input = normalizeInput(occurrenceInput(value));
    return Object.freeze({ ...value, reward: input.reward });
  } catch {
    return null;
  }
}

async function parseVerifiedOccurrence(
  raw: string | null,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftOccurrenceV1 | null> {
  const occurrence = parseOccurrenceShape(raw, ownerStableId);
  if (!occurrence) return null;
  const expected = await accountAwait(token, () => payloadFingerprint(
    ownerStableId,
    occurrenceInput(occurrence),
    occurrence.revision,
    occurrence.createdAtMs,
  ));
  return expected === occurrence.payloadFingerprint ? occurrence : null;
}

function defaultProjectionState(ownerStableId: string): DailyJourneyGiftProjectionStateV1 {
  return Object.freeze({
    schemaVersion: 'daily-journey-gift-projection.v1',
    ownerStableId,
    latestRevision: 0,
    seenRevision: 0,
    displayedRevisions: Object.freeze([]),
  });
}

function parseProjectionState(
  raw: string | null,
  ownerStableId: string,
): DailyJourneyGiftProjectionStateV1 {
  if (raw === null) return defaultProjectionState(ownerStableId);
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftProjectionStateV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    assertExactKeys(value, [
      'schemaVersion', 'ownerStableId', 'latestRevision', 'seenRevision', 'displayedRevisions',
    ]);
    if (value.schemaVersion !== 'daily-journey-gift-projection.v1'
      || value.ownerStableId !== ownerStableId
      || !Number.isSafeInteger(value.latestRevision) || value.latestRevision < 0
      || !Number.isSafeInteger(value.seenRevision) || value.seenRevision < 0
      || value.seenRevision > value.latestRevision
      || !Array.isArray(value.displayedRevisions)
      || value.displayedRevisions.length > MAX_DISPLAYED_REVISIONS
      || value.displayedRevisions.some((revision) =>
        !Number.isSafeInteger(revision) || revision < 1 || revision > value.latestRevision)
      || new Set(value.displayedRevisions).size !== value.displayedRevisions.length) throw new Error();
    return Object.freeze({
      ...value,
      displayedRevisions: Object.freeze([...value.displayedRevisions].sort((a, b) => a - b)),
    });
  } catch {
    throw new Error('daily_journey_projection_corrupt');
  }
}

async function readOccurrences(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftOccurrenceV1[]> {
  const prefix = occurrenceOwnerPrefix(ownerStableId);
  const allKeys = await accountAwait(token, () => AsyncStorage.getAllKeys());
  const keys = allKeys.filter((key) => key.startsWith(prefix)).sort();
  if (keys.length === 0) return [];
  const rows = await accountAwait(token, () => AsyncStorage.multiGet(keys));
  const occurrences: DailyJourneyGiftOccurrenceV1[] = [];
  for (const [key, raw] of rows) {
    const occurrence = await accountAwait(token, () => parseVerifiedOccurrence(raw, ownerStableId, token));
    if (!occurrence || key !== occurrenceKey(ownerStableId, occurrence.operationId)) {
      throw new Error('daily_journey_occurrence_corrupt');
    }
    occurrences.push(occurrence);
  }
  occurrences.sort((left, right) => left.revision - right.revision);
  const revisions = new Set<number>();
  const operationIds = new Set<string>();
  for (const [index, occurrence] of occurrences.entries()) {
    if (occurrence.revision !== index + 1) {
      throw new Error('daily_journey_occurrence_revision_gap');
    }
    if (revisions.has(occurrence.revision) || operationIds.has(occurrence.operationId)) {
      throw new Error('daily_journey_occurrence_corrupt');
    }
    revisions.add(occurrence.revision);
    operationIds.add(occurrence.operationId);
  }
  return occurrences;
}

type ParsedClaimReceipt =
  | Readonly<{ status: 'absent' }>
  | Readonly<{ status: 'valid'; receipt: DailyJourneyGiftClaimReceiptV1 }>
  | Readonly<{ status: 'corrupt' }>;

function parseClaimReceipt(
  raw: string | null,
  occurrence: DailyJourneyGiftOccurrenceV1,
): ParsedClaimReceipt {
  if (raw === null) return Object.freeze({ status: 'absent' });
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftClaimReceiptV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return Object.freeze({ status: 'corrupt' });
    }
    assertExactKeys(value, [
      'schemaVersion', 'claimOperationId', 'operationId', 'ownerStableId',
      'occurrenceFingerprint', 'reward', 'claimedAtMs',
    ]);
    if (value.schemaVersion !== 'daily-journey-gift-claim-receipt.v1'
      || value.claimOperationId !== dailyJourneyGiftClaimOperationId(occurrence.operationId)
      || value.ownerStableId !== occurrence.ownerStableId
      || value.operationId !== occurrence.operationId
      || value.occurrenceFingerprint !== occurrence.payloadFingerprint
      || !value.reward || typeof value.reward !== 'object' || Array.isArray(value.reward)
      || ownKeys(value.reward).join('\u0000') !== ['amount', 'kind'].join('\u0000')
      || value.reward.kind !== occurrence.reward.kind
      || value.reward.amount !== occurrence.reward.amount
      || !Number.isSafeInteger(value.claimedAtMs) || value.claimedAtMs < occurrence.createdAtMs) {
      return Object.freeze({ status: 'corrupt' });
    }
    return Object.freeze({ status: 'valid', receipt: Object.freeze(value) });
  } catch {
    return Object.freeze({ status: 'corrupt' });
  }
}

async function parseClaimPrepared(
  raw: string | null,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftClaimPreparedV1 | null> {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftClaimPreparedV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    assertExactKeys(value, [
      'schemaVersion', 'claimOperationId', 'ownerStableId', 'occurrence',
      'occurrenceFingerprint', 'reward', 'preparedAtMs',
    ]);
    const occurrence = await accountAwait(token, () => parseVerifiedOccurrence(
      JSON.stringify(value.occurrence),
      ownerStableId,
      token,
    ));
    if (value.schemaVersion !== 'daily-journey-gift-claim-prepared.v1'
      || value.ownerStableId !== ownerStableId
      || !occurrence
      || value.claimOperationId !== dailyJourneyGiftClaimOperationId(occurrence.operationId)
      || value.occurrenceFingerprint !== occurrence.payloadFingerprint
      || JSON.stringify(value.reward) !== JSON.stringify(occurrence.reward)
      || !Number.isSafeInteger(value.preparedAtMs)
      || value.preparedAtMs < occurrence.createdAtMs) return null;
    return Object.freeze({ ...value, occurrence, reward: occurrence.reward });
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_account_stale') throw error;
    return null;
  }
}

async function isClaimed(
  occurrence: DailyJourneyGiftOccurrenceV1,
  token: AccountGenerationToken,
): Promise<boolean> {
  const raw = await accountAwait(token, () => AsyncStorage.getItem(
    claimReceiptKey(occurrence.ownerStableId, occurrence.operationId),
  ));
  const parsed = parseClaimReceipt(raw, occurrence);
  if (parsed.status === 'corrupt') throw new Error('daily_journey_claim_receipt_corrupt');
  return parsed.status === 'valid';
}

async function parsePrepared(
  raw: string | null,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftPreparedV1 | null> {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftPreparedV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    assertExactKeys(value, ['schemaVersion', 'ownerStableId', 'occurrence', 'preparedAtMs']);
    const occurrence = await accountAwait(token, () => parseVerifiedOccurrence(
      JSON.stringify(value.occurrence),
      ownerStableId,
      token,
    ));
    if (value.schemaVersion !== 'daily-journey-gift-prepared.v1'
      || value.ownerStableId !== ownerStableId
      || !occurrence
      || !Number.isSafeInteger(value.preparedAtMs) || value.preparedAtMs < 0) return null;
    return Object.freeze({ ...value, occurrence });
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_account_stale') throw error;
    return null;
  }
}

async function readProjectionState(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftProjectionStateV1> {
  const raw = await accountAwait(token, () => AsyncStorage.getItem(projectionKey(ownerStableId)));
  return parseProjectionState(raw, ownerStableId);
}

async function readValidatedJournal(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<Readonly<{
  occurrences: readonly DailyJourneyGiftOccurrenceV1[];
  state: DailyJourneyGiftProjectionStateV1;
  headRevision: number;
}>> {
  const occurrences = await accountAwait(token, () => readOccurrences(ownerStableId, token));
  const state = await accountAwait(token, () => readProjectionState(ownerStableId, token));
  const headRevision = occurrences.length === 0 ? 0 : occurrences[occurrences.length - 1].revision;
  if (state.latestRevision > headRevision) throw new Error('daily_journey_projection_ahead');
  if (state.latestRevision < headRevision) throw new Error('daily_journey_projection_behind');
  return Object.freeze({ occurrences, state, headRevision });
}

async function finalizePrepared(
  prepared: DailyJourneyGiftPreparedV1,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftOccurrenceV1> {
  const ownerStableId = assertCurrentToken(token);
  if (prepared.ownerStableId !== ownerStableId) throw new Error('daily_journey_account_stale');
  const key = occurrenceKey(ownerStableId, prepared.occurrence.operationId);
  const existingRaw = await accountAwait(token, () => AsyncStorage.getItem(key));
  let existing: DailyJourneyGiftOccurrenceV1 | null = null;
  if (existingRaw !== null) {
    existing = await accountAwait(token, () => parseVerifiedOccurrence(existingRaw, ownerStableId, token));
    if (!existing || JSON.stringify(existing) !== JSON.stringify(prepared.occurrence)) {
      throw new Error('daily_journey_occurrence_conflict');
    }
  }
  const occurrences = await accountAwait(token, () => readOccurrences(ownerStableId, token));
  const state = await accountAwait(token, () => readProjectionState(ownerStableId, token));
  const headRevision = occurrences.length === 0 ? 0 : occurrences[occurrences.length - 1].revision;
  const projectionOnlyTornWrite = !existing
    && prepared.occurrence.revision === headRevision + 1
    && state.latestRevision === prepared.occurrence.revision;
  if (state.latestRevision > headRevision && !projectionOnlyTornWrite) {
    throw new Error('daily_journey_projection_ahead');
  }
  if (existing) {
    if (headRevision !== prepared.occurrence.revision
      || (state.latestRevision !== headRevision && state.latestRevision !== headRevision - 1)) {
      throw new Error('daily_journey_prepared_revision_conflict');
    }
  } else if (prepared.occurrence.revision !== headRevision + 1) {
    throw new Error('daily_journey_prepared_revision_conflict');
  } else if (state.latestRevision !== headRevision && !projectionOnlyTornWrite) {
    throw new Error('daily_journey_projection_behind');
  }
  const latestRevision = prepared.occurrence.revision;
  const nextState: DailyJourneyGiftProjectionStateV1 = {
    ...state,
    latestRevision,
  };
  await accountAwait(token, () => AsyncStorage.multiSet([
    [key, JSON.stringify(prepared.occurrence)],
    [projectionKey(ownerStableId), JSON.stringify(nextState)],
  ]));
  const verifiedRaw = await accountAwait(token, () => AsyncStorage.getItem(key));
  const verified = await accountAwait(token, () => parseVerifiedOccurrence(
    verifiedRaw,
    ownerStableId,
    token,
  ));
  if (!verified || JSON.stringify(verified) !== JSON.stringify(prepared.occurrence)) {
    throw new Error('daily_journey_occurrence_write_unverified');
  }
  const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
  if (durable.headRevision !== prepared.occurrence.revision
    || durable.occurrences[durable.occurrences.length - 1]?.operationId !== prepared.occurrence.operationId) {
    throw new Error('daily_journey_occurrence_write_unverified');
  }
  await accountAwait(token, () => AsyncStorage.removeItem(preparedKey(ownerStableId)));
  return verified;
}

async function recoverPrepared(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftOccurrenceV1 | null> {
  const raw = await accountAwait(token, () => AsyncStorage.getItem(preparedKey(ownerStableId)));
  if (raw === null) return null;
  const prepared = await accountAwait(token, () => parsePrepared(raw, ownerStableId, token));
  if (!prepared) throw new Error('daily_journey_prepared_corrupt');
  return accountAwait(token, () => finalizePrepared(prepared, token));
}

function emitDailyJourneyGiftsChangedBestEffort(): void {
  try {
    emitAppEvent('daily_journey_gifts_changed');
  } catch {
    // A durable journal commit remains authoritative even if a UI listener fails.
  }
}

export async function commitDailyJourneyGift(
  rawInput: DailyJourneyGiftInput,
  token: AccountGenerationToken,
): Promise<{
  status: 'committed' | 'already_committed';
  occurrence: DailyJourneyGiftOccurrenceV1;
}> {
  const input = normalizeInput(rawInput);
  const ownerStableId = assertCurrentToken(token);
  let recoveredDurableChange = false;
  let requestedDurableChange = false;
  try {
    return await accountAwait(token, () => withAccountTransitionLock(async () => withStorageLock(async () => {
      assertCurrentToken(token);
      const pendingRaw = await accountAwait(token, () => AsyncStorage.getItem(preparedKey(ownerStableId)));
      if (pendingRaw !== null) {
        const pending = await accountAwait(token, () => parsePrepared(pendingRaw, ownerStableId, token));
        if (!pending) throw new Error('daily_journey_prepared_corrupt');
        if (pending.occurrence.operationId === input.operationId && !sameInput(pending.occurrence, input)) {
          throw new Error('daily_journey_occurrence_conflict');
        }
        const recovered = await accountAwait(token, () => finalizePrepared(pending, token));
        recoveredDurableChange = true;
        if (recovered.operationId === input.operationId) {
          return { status: 'committed' as const, occurrence: recovered };
        }
      }

      const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
      const existing = durable.occurrences.find((item) => item.operationId === input.operationId);
      if (existing) {
        if (!sameInput(existing, input)) throw new Error('daily_journey_occurrence_conflict');
        return { status: 'already_committed' as const, occurrence: existing };
      }

      const createdAtMs = Date.now();
      const revision = durable.headRevision + 1;
      const fingerprint = await accountAwait(token, () => payloadFingerprint(
        ownerStableId,
        input,
        revision,
        createdAtMs,
      ));
      const occurrence: DailyJourneyGiftOccurrenceV1 = Object.freeze({
        schemaVersion: 'daily-journey-gift-occurrence.v1',
        operationId: input.operationId,
        ownerStableId,
        source: input.source,
        cycle: input.cycle,
        day: input.day,
        reward: input.reward,
        revision,
        createdAtMs,
        payloadFingerprint: fingerprint,
      });
      const prepared: DailyJourneyGiftPreparedV1 = Object.freeze({
        schemaVersion: 'daily-journey-gift-prepared.v1',
        ownerStableId,
        occurrence,
        preparedAtMs: Date.now(),
      });
      await accountAwait(token, () => AsyncStorage.setItem(
        preparedKey(ownerStableId),
        JSON.stringify(prepared),
      ));
      const durablePreparedRaw = await accountAwait(
        token,
        () => AsyncStorage.getItem(preparedKey(ownerStableId)),
      );
      const durablePrepared = await accountAwait(
        token,
        () => parsePrepared(durablePreparedRaw, ownerStableId, token),
      );
      if (!durablePrepared || JSON.stringify(durablePrepared) !== JSON.stringify(prepared)) {
        throw new Error('daily_journey_prepared_write_unverified');
      }
      const committed = await accountAwait(token, () => finalizePrepared(prepared, token));
      requestedDurableChange = true;
      return { status: 'committed' as const, occurrence: committed };
    })));
  } finally {
    if (recoveredDurableChange || requestedDurableChange) {
      emitDailyJourneyGiftsChangedBestEffort();
    }
  }
}

export async function readDailyJourneyGiftProjection(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<{
  pending: readonly DailyJourneyGiftPendingItem[];
  pendingCount: number;
  unreadCount: number;
  latestRevision: number;
  seenRevision: number;
}> {
  const ownerStableId = assertCurrentToken(token);
  let recovered = false;
  try {
    return await accountAwait(token, () => withAccountTransitionLock(async () => withStorageLock(async () => {
      assertCurrentToken(token);
      recovered = (await accountAwait(token, () => recoverPrepared(ownerStableId, token))) !== null;
      const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
      const pending: DailyJourneyGiftPendingItem[] = [];
      for (const occurrence of durable.occurrences) {
        const claimed = await accountAwait(token, () => isClaimed(occurrence, token));
        if (!claimed) pending.push(Object.freeze({ ...occurrence, claimState: 'pending' }));
      }
      const displayedRevisions = durable.headRevision > 0
        ? [...new Set([...durable.state.displayedRevisions, durable.headRevision])]
          .sort((a, b) => a - b)
          .slice(-MAX_DISPLAYED_REVISIONS)
        : durable.state.displayedRevisions;
      const nextState: DailyJourneyGiftProjectionStateV1 = {
        ...durable.state,
        displayedRevisions,
      };
      if (JSON.stringify(nextState) !== JSON.stringify(durable.state)) {
        await accountAwait(token, () => AsyncStorage.setItem(
          projectionKey(ownerStableId),
          JSON.stringify(nextState),
        ));
      }
      return {
        pending: Object.freeze(pending),
        pendingCount: pending.length,
        unreadCount: durable.occurrences.filter(
          (item) => item.revision > durable.state.seenRevision,
        ).length,
        latestRevision: durable.headRevision,
        seenRevision: durable.state.seenRevision,
      };
    })));
  } finally {
    if (recovered) emitDailyJourneyGiftsChangedBestEffort();
  }
}

export async function markDailyJourneyGiftSnapshotSeen(
  snapshotRevision: number,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  if (!isCapturedAccountGenerationToken(token) || !isCurrentAccountGeneration(token) || !token.stableId) return false;
  const ownerStableId = token.stableId;
  let recovered = false;
  let updated = false;
  try {
    updated = await accountAwait(token, () => withAccountTransitionLock(async () => withStorageLock(async () => {
      assertCurrentToken(token);
      recovered = (await accountAwait(token, () => recoverPrepared(ownerStableId, token))) !== null;
      const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
      if (!Number.isSafeInteger(snapshotRevision)
        || snapshotRevision < 1
        || snapshotRevision > durable.headRevision
        || snapshotRevision <= durable.state.seenRevision
        || !durable.state.displayedRevisions.includes(snapshotRevision)) return false;
      const nextState: DailyJourneyGiftProjectionStateV1 = {
        ...durable.state,
        seenRevision: snapshotRevision,
        displayedRevisions: durable.state.displayedRevisions.filter(
          (revision) => revision > snapshotRevision,
        ),
      };
      await accountAwait(token, () => AsyncStorage.setItem(
        projectionKey(ownerStableId),
        JSON.stringify(nextState),
      ));
      const verified = await accountAwait(token, () => readProjectionState(ownerStableId, token));
      return verified.seenRevision === snapshotRevision;
    })));
    return updated;
  } finally {
    if (recovered || updated) emitDailyJourneyGiftsChangedBestEffort();
  }
}

export async function readDailyJourneyGiftClaimState(
  operationId: string,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<'pending' | 'claimed' | 'missing'> {
  if (!OPERATION_ID_RE.test(operationId)
    || !isCapturedAccountGenerationToken(token)
    || !isCurrentAccountGeneration(token)
    || !token.stableId) return 'missing';
  const ownerStableId = token.stableId;
  let recovered = false;
  try {
    return await accountAwait(token, () => withAccountTransitionLock(async () => withStorageLock(async () => {
      assertCurrentToken(token);
      recovered = (await accountAwait(token, () => recoverPrepared(ownerStableId, token))) !== null;
      const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
      const occurrence = durable.occurrences.find((item) => item.operationId === operationId);
      if (!occurrence) return 'missing' as const;
      return await accountAwait(token, () => isClaimed(occurrence, token))
        ? 'claimed' as const
        : 'pending' as const;
    })));
  } finally {
    if (recovered) emitDailyJourneyGiftsChangedBestEffort();
  }
}

type ClaimInspection =
  | Readonly<{ status: 'prepared'; prepared: DailyJourneyGiftClaimPreparedV1 }>
  | Readonly<{ status: 'already_claimed' }>
  | Readonly<{ status: 'missing' }>;

async function withDailyJourneyJournalLock<T>(
  token: AccountGenerationToken,
  work: (ownerStableId: string) => Promise<T>,
): Promise<T> {
  return accountAwait(token, () => withAccountTransitionLock(async () => withStorageLock(async () => {
    const ownerStableId = assertCurrentToken(token);
    const value = await work(ownerStableId);
    assertCurrentToken(token);
    return value;
  })));
}

async function inspectOrPrepareClaim(
  operationId: string,
  token: AccountGenerationToken,
): Promise<ClaimInspection> {
  return withDailyJourneyJournalLock(token, async (ownerStableId) => {
    const preparedRaw = await accountAwait(
      token,
      () => AsyncStorage.getItem(claimPreparedKey(ownerStableId)),
    );
    if (preparedRaw !== null) {
      const prepared = await accountAwait(
        token,
        () => parseClaimPrepared(preparedRaw, ownerStableId, token),
      );
      if (!prepared) throw new Error('daily_journey_claim_prepared_corrupt');
      return Object.freeze({ status: 'prepared' as const, prepared });
    }
    const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
    const occurrence = durable.occurrences.find((candidate) => candidate.operationId === operationId);
    if (!occurrence) return Object.freeze({ status: 'missing' as const });
    const receiptRaw = await accountAwait(
      token,
      () => AsyncStorage.getItem(claimReceiptKey(ownerStableId, operationId)),
    );
    const receipt = parseClaimReceipt(receiptRaw, occurrence);
    if (receipt.status === 'corrupt') throw new Error('daily_journey_claim_receipt_corrupt');
    if (receipt.status === 'valid') return Object.freeze({ status: 'already_claimed' as const });
    const prepared: DailyJourneyGiftClaimPreparedV1 = Object.freeze({
      schemaVersion: 'daily-journey-gift-claim-prepared.v1',
      claimOperationId: dailyJourneyGiftClaimOperationId(operationId),
      ownerStableId,
      occurrence,
      occurrenceFingerprint: occurrence.payloadFingerprint,
      reward: occurrence.reward,
      preparedAtMs: Math.max(Date.now(), occurrence.createdAtMs),
    });
    await accountAwait(token, () => AsyncStorage.setItem(
      claimPreparedKey(ownerStableId),
      JSON.stringify(prepared),
    ));
    const verifiedRaw = await accountAwait(
      token,
      () => AsyncStorage.getItem(claimPreparedKey(ownerStableId)),
    );
    const verified = await accountAwait(
      token,
      () => parseClaimPrepared(verifiedRaw, ownerStableId, token),
    );
    if (!verified || JSON.stringify(verified) !== JSON.stringify(prepared)) {
      throw new Error('daily_journey_claim_prepared_write_unverified');
    }
    return Object.freeze({ status: 'prepared' as const, prepared: verified });
  });
}

async function preparedClaimHasReceipt(
  prepared: DailyJourneyGiftClaimPreparedV1,
  token: AccountGenerationToken,
): Promise<boolean> {
  return withDailyJourneyJournalLock(token, async (ownerStableId) => {
    if (prepared.ownerStableId !== ownerStableId) throw new Error('daily_journey_account_stale');
    const raw = await accountAwait(
      token,
      () => AsyncStorage.getItem(claimReceiptKey(ownerStableId, prepared.occurrence.operationId)),
    );
    const receipt = parseClaimReceipt(raw, prepared.occurrence);
    if (receipt.status === 'corrupt') throw new Error('daily_journey_claim_receipt_corrupt');
    return receipt.status === 'valid';
  });
}

async function persistPreparedClaimReceipt(
  prepared: DailyJourneyGiftClaimPreparedV1,
  token: AccountGenerationToken,
): Promise<boolean> {
  return withDailyJourneyJournalLock(token, async (ownerStableId) => {
    if (prepared.ownerStableId !== ownerStableId) throw new Error('daily_journey_account_stale');
    const durable = await accountAwait(token, () => readValidatedJournal(ownerStableId, token));
    const occurrence = durable.occurrences.find(
      (candidate) => candidate.operationId === prepared.occurrence.operationId,
    );
    if (!occurrence || JSON.stringify(occurrence) !== JSON.stringify(prepared.occurrence)) {
      throw new Error('daily_journey_claim_occurrence_conflict');
    }
    const receiptKey = claimReceiptKey(ownerStableId, occurrence.operationId);
    const receiptRaw = await accountAwait(token, () => AsyncStorage.getItem(receiptKey));
    const existing = parseClaimReceipt(receiptRaw, occurrence);
    if (existing.status === 'corrupt') throw new Error('daily_journey_claim_receipt_corrupt');
    if (existing.status === 'valid') return false;
    const currentPreparedRaw = await accountAwait(
      token,
      () => AsyncStorage.getItem(claimPreparedKey(ownerStableId)),
    );
    const currentPrepared = await accountAwait(
      token,
      () => parseClaimPrepared(currentPreparedRaw, ownerStableId, token),
    );
    if (!currentPrepared || JSON.stringify(currentPrepared) !== JSON.stringify(prepared)) {
      throw new Error('daily_journey_claim_prepared_conflict');
    }
    const receipt: DailyJourneyGiftClaimReceiptV1 = Object.freeze({
      schemaVersion: 'daily-journey-gift-claim-receipt.v1',
      claimOperationId: prepared.claimOperationId,
      operationId: occurrence.operationId,
      ownerStableId,
      occurrenceFingerprint: occurrence.payloadFingerprint,
      reward: occurrence.reward,
      claimedAtMs: Math.max(Date.now(), occurrence.createdAtMs),
    });
    await accountAwait(token, () => AsyncStorage.setItem(receiptKey, JSON.stringify(receipt)));
    const verifiedRaw = await accountAwait(token, () => AsyncStorage.getItem(receiptKey));
    const verified = parseClaimReceipt(verifiedRaw, occurrence);
    if (verified.status !== 'valid' || JSON.stringify(verified.receipt) !== JSON.stringify(receipt)) {
      throw new Error('daily_journey_claim_receipt_write_unverified');
    }
    return true;
  });
}

async function clearPreparedClaim(
  prepared: DailyJourneyGiftClaimPreparedV1,
  token: AccountGenerationToken,
): Promise<void> {
  await withDailyJourneyJournalLock(token, async (ownerStableId) => {
    const receiptRaw = await accountAwait(
      token,
      () => AsyncStorage.getItem(claimReceiptKey(ownerStableId, prepared.occurrence.operationId)),
    );
    const receipt = parseClaimReceipt(receiptRaw, prepared.occurrence);
    if (receipt.status !== 'valid') throw new Error('daily_journey_claim_receipt_write_unverified');
    const preparedKey = claimPreparedKey(ownerStableId);
    const currentRaw = await accountAwait(token, () => AsyncStorage.getItem(preparedKey));
    if (currentRaw === null) return;
    const current = await accountAwait(token, () => parseClaimPrepared(currentRaw, ownerStableId, token));
    if (!current || JSON.stringify(current) !== JSON.stringify(prepared)) {
      throw new Error('daily_journey_claim_prepared_conflict');
    }
    await accountAwait(token, () => AsyncStorage.removeItem(preparedKey));
    const remaining = await accountAwait(token, () => AsyncStorage.getItem(preparedKey));
    if (remaining !== null) throw new Error('daily_journey_claim_prepared_clear_failed');
  });
}

async function completePreparedClaim(
  prepared: DailyJourneyGiftClaimPreparedV1,
  token: AccountGenerationToken,
): Promise<'claimed' | 'already_claimed'> {
  const alreadyDurable = await accountAwait(
    token,
    () => preparedClaimHasReceipt(prepared, token),
  );
  if (!alreadyDurable) {
    await accountAwait(token, () => applyDailyJourneyGiftActivation(
      prepared.occurrence,
      prepared.claimOperationId,
      token,
    ));
  }
  const created = await accountAwait(
    token,
    () => persistPreparedClaimReceipt(prepared, token),
  );
  await accountAwait(token, () => finalizeDailyJourneyGiftActivation(
    prepared.occurrence,
    prepared.claimOperationId,
    token,
  ));
  await accountAwait(token, () => clearPreparedClaim(prepared, token));
  emitDailyJourneyGiftsChangedBestEffort();
  return created ? 'claimed' : 'already_claimed';
}

export async function claimDailyJourneyGift(
  operationId: string,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<{ status: 'claimed' | 'already_claimed' }> {
  if (typeof operationId !== 'string' || !OPERATION_ID_RE.test(operationId)) {
    throw new Error('daily_journey_claim_invalid');
  }
  const ownerStableId = assertCurrentToken(token);
  const recoveredOccurrence = await withDailyJourneyJournalLock(token, async () => (
    accountAwait(token, () => recoverPrepared(ownerStableId, token))
  ));
  if (recoveredOccurrence) emitDailyJourneyGiftsChangedBestEffort();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const inspection = await accountAwait(token, () => inspectOrPrepareClaim(operationId, token));
    if (inspection.status === 'missing') throw new Error('daily_journey_claim_missing');
    if (inspection.status === 'already_claimed') return { status: 'already_claimed' };
    const status = await accountAwait(
      token,
      () => completePreparedClaim(inspection.prepared, token),
    );
    if (inspection.prepared.occurrence.operationId === operationId) return { status };
  }
  throw new Error('daily_journey_claim_recovery_exhausted');
}

export { DAILY_JOURNEY_GIFT_ACCOUNT_LOCAL_PREFIXES };

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
