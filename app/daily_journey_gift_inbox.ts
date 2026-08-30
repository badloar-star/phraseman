import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  captureAccountGeneration,
  isCapturedAccountGenerationToken,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';

const OCCURRENCE_PREFIX = 'daily_journey_gift_occurrence_v1:';
const PREPARED_PREFIX = 'daily_journey_gift_prepared_v1:';
const PROJECTION_PREFIX = 'daily_journey_gift_projection_v1:';
const CLAIM_RECEIPT_PREFIX = 'daily_journey_gift_claim_receipt_v1:';
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

type DailyJourneyGiftClaimReceiptV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-claim-receipt.v1';
  operationId: string;
  ownerStableId: string;
  occurrenceFingerprint: string;
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
  const operationId = String(input.operationId ?? '');
  const source = input.source;
  const cycle = Number(input.cycle);
  const day = Number(input.day);
  const kind = input.reward.kind;
  const amount = Number(input.reward.amount);
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

function canonicalPayload(ownerStableId: string, input: DailyJourneyGiftInput): string {
  return JSON.stringify({
    schemaVersion: 'daily-journey-gift-occurrence.v1',
    operationId: input.operationId,
    ownerStableId,
    source: input.source,
    cycle: input.cycle,
    day: input.day,
    reward: { kind: input.reward.kind, amount: input.reward.amount },
  });
}

async function payloadFingerprint(ownerStableId: string, input: DailyJourneyGiftInput): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalPayload(ownerStableId, input),
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
): Promise<DailyJourneyGiftOccurrenceV1 | null> {
  const occurrence = parseOccurrenceShape(raw, ownerStableId);
  if (!occurrence) return null;
  const expected = await payloadFingerprint(ownerStableId, occurrenceInput(occurrence));
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

async function readOccurrences(ownerStableId: string): Promise<DailyJourneyGiftOccurrenceV1[]> {
  const prefix = occurrenceOwnerPrefix(ownerStableId);
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
  if (keys.length === 0) return [];
  const rows = await AsyncStorage.multiGet(keys);
  const occurrences: DailyJourneyGiftOccurrenceV1[] = [];
  for (const [key, raw] of rows) {
    const occurrence = await parseVerifiedOccurrence(raw, ownerStableId);
    if (!occurrence || key !== occurrenceKey(ownerStableId, occurrence.operationId)) {
      throw new Error('daily_journey_occurrence_corrupt');
    }
    occurrences.push(occurrence);
  }
  occurrences.sort((left, right) => left.revision - right.revision);
  const revisions = new Set<number>();
  const operationIds = new Set<string>();
  for (const occurrence of occurrences) {
    if (revisions.has(occurrence.revision) || operationIds.has(occurrence.operationId)) {
      throw new Error('daily_journey_occurrence_corrupt');
    }
    revisions.add(occurrence.revision);
    operationIds.add(occurrence.operationId);
  }
  return occurrences;
}

function parseClaimReceipt(
  raw: string | null,
  occurrence: DailyJourneyGiftOccurrenceV1,
): DailyJourneyGiftClaimReceiptV1 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftClaimReceiptV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    assertExactKeys(value, [
      'schemaVersion', 'operationId', 'ownerStableId', 'occurrenceFingerprint', 'claimedAtMs',
    ]);
    if (value.schemaVersion !== 'daily-journey-gift-claim-receipt.v1'
      || value.ownerStableId !== occurrence.ownerStableId
      || value.operationId !== occurrence.operationId
      || value.occurrenceFingerprint !== occurrence.payloadFingerprint
      || !Number.isSafeInteger(value.claimedAtMs) || value.claimedAtMs < occurrence.createdAtMs) return null;
    return Object.freeze(value);
  } catch {
    return null;
  }
}

async function isClaimed(occurrence: DailyJourneyGiftOccurrenceV1): Promise<boolean> {
  const raw = await AsyncStorage.getItem(claimReceiptKey(occurrence.ownerStableId, occurrence.operationId));
  return parseClaimReceipt(raw, occurrence) !== null;
}

async function parsePrepared(
  raw: string | null,
  ownerStableId: string,
): Promise<DailyJourneyGiftPreparedV1 | null> {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as DailyJourneyGiftPreparedV1;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    assertExactKeys(value, ['schemaVersion', 'ownerStableId', 'occurrence', 'preparedAtMs']);
    const occurrence = await parseVerifiedOccurrence(JSON.stringify(value.occurrence), ownerStableId);
    if (value.schemaVersion !== 'daily-journey-gift-prepared.v1'
      || value.ownerStableId !== ownerStableId
      || !occurrence
      || !Number.isSafeInteger(value.preparedAtMs) || value.preparedAtMs < 0) return null;
    return Object.freeze({ ...value, occurrence });
  } catch {
    return null;
  }
}

async function readProjectionState(ownerStableId: string): Promise<DailyJourneyGiftProjectionStateV1> {
  return parseProjectionState(await AsyncStorage.getItem(projectionKey(ownerStableId)), ownerStableId);
}

async function finalizePrepared(
  prepared: DailyJourneyGiftPreparedV1,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftOccurrenceV1> {
  const ownerStableId = assertCurrentToken(token);
  if (prepared.ownerStableId !== ownerStableId) throw new Error('daily_journey_account_stale');
  const key = occurrenceKey(ownerStableId, prepared.occurrence.operationId);
  const existingRaw = await AsyncStorage.getItem(key);
  assertCurrentToken(token);
  if (existingRaw !== null) {
    const existing = await parseVerifiedOccurrence(existingRaw, ownerStableId);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(prepared.occurrence)) {
      throw new Error('daily_journey_occurrence_conflict');
    }
  }
  const occurrences = await readOccurrences(ownerStableId);
  assertCurrentToken(token);
  const sameRevision = occurrences.find((item) => item.revision === prepared.occurrence.revision);
  if (sameRevision && sameRevision.operationId !== prepared.occurrence.operationId) {
    throw new Error('daily_journey_occurrence_conflict');
  }
  const state = await readProjectionState(ownerStableId);
  assertCurrentToken(token);
  const latestRevision = Math.max(
    state.latestRevision,
    prepared.occurrence.revision,
    ...occurrences.map((item) => item.revision),
  );
  const nextState: DailyJourneyGiftProjectionStateV1 = {
    ...state,
    latestRevision,
  };
  await AsyncStorage.multiSet([
    [key, JSON.stringify(prepared.occurrence)],
    [projectionKey(ownerStableId), JSON.stringify(nextState)],
  ]);
  assertCurrentToken(token);
  const verifiedRaw = await AsyncStorage.getItem(key);
  assertCurrentToken(token);
  const verified = await parseVerifiedOccurrence(verifiedRaw, ownerStableId);
  if (!verified || JSON.stringify(verified) !== JSON.stringify(prepared.occurrence)) {
    throw new Error('daily_journey_occurrence_write_unverified');
  }
  await AsyncStorage.removeItem(preparedKey(ownerStableId));
  assertCurrentToken(token);
  return verified;
}

async function recoverPrepared(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyGiftOccurrenceV1 | null> {
  const raw = await AsyncStorage.getItem(preparedKey(ownerStableId));
  assertCurrentToken(token);
  if (raw === null) return null;
  const prepared = await parsePrepared(raw, ownerStableId);
  if (!prepared) throw new Error('daily_journey_prepared_corrupt');
  return finalizePrepared(prepared, token);
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
  const fingerprint = await payloadFingerprint(ownerStableId, input);
  assertCurrentToken(token);
  let recoveredDurableChange = false;
  const result = await withAccountTransitionLock(async () => withStorageLock(async () => {
    assertCurrentToken(token);
    const pendingRaw = await AsyncStorage.getItem(preparedKey(ownerStableId));
    assertCurrentToken(token);
    if (pendingRaw !== null) {
      const pending = await parsePrepared(pendingRaw, ownerStableId);
      if (!pending) throw new Error('daily_journey_prepared_corrupt');
      if (pending.occurrence.operationId === input.operationId
        && pending.occurrence.payloadFingerprint !== fingerprint) {
        throw new Error('daily_journey_occurrence_conflict');
      }
      const recovered = await finalizePrepared(pending, token);
      recoveredDurableChange = true;
      if (recovered.operationId === input.operationId) {
        return { status: 'committed' as const, occurrence: recovered };
      }
    }

    const key = occurrenceKey(ownerStableId, input.operationId);
    const existingRaw = await AsyncStorage.getItem(key);
    assertCurrentToken(token);
    if (existingRaw !== null) {
      const existing = await parseVerifiedOccurrence(existingRaw, ownerStableId);
      if (!existing || existing.payloadFingerprint !== fingerprint) {
        throw new Error('daily_journey_occurrence_conflict');
      }
      return { status: 'already_committed' as const, occurrence: existing };
    }

    const occurrences = await readOccurrences(ownerStableId);
    assertCurrentToken(token);
    const latestRevision = occurrences.reduce((latest, item) => Math.max(latest, item.revision), 0);
    const occurrence: DailyJourneyGiftOccurrenceV1 = Object.freeze({
      schemaVersion: 'daily-journey-gift-occurrence.v1',
      operationId: input.operationId,
      ownerStableId,
      source: input.source,
      cycle: input.cycle,
      day: input.day,
      reward: input.reward,
      revision: latestRevision + 1,
      createdAtMs: Date.now(),
      payloadFingerprint: fingerprint,
    });
    const prepared: DailyJourneyGiftPreparedV1 = Object.freeze({
      schemaVersion: 'daily-journey-gift-prepared.v1',
      ownerStableId,
      occurrence,
      preparedAtMs: Date.now(),
    });
    await AsyncStorage.setItem(preparedKey(ownerStableId), JSON.stringify(prepared));
    assertCurrentToken(token);
    const durablePrepared = await parsePrepared(
      await AsyncStorage.getItem(preparedKey(ownerStableId)),
      ownerStableId,
    );
    assertCurrentToken(token);
    if (!durablePrepared || JSON.stringify(durablePrepared) !== JSON.stringify(prepared)) {
      throw new Error('daily_journey_prepared_write_unverified');
    }
    return { status: 'committed' as const, occurrence: await finalizePrepared(prepared, token) };
  }));
  if (recoveredDurableChange || result.status === 'committed') {
    emitAppEvent('daily_journey_gifts_changed');
  }
  return result;
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
  const projection = await withAccountTransitionLock(async () => withStorageLock(async () => {
    assertCurrentToken(token);
    recovered = (await recoverPrepared(ownerStableId, token)) !== null;
    const occurrences = await readOccurrences(ownerStableId);
    assertCurrentToken(token);
    const state = await readProjectionState(ownerStableId);
    assertCurrentToken(token);
    const latestRevision = occurrences.reduce((latest, item) => Math.max(latest, item.revision), 0);
    if (state.seenRevision > latestRevision) throw new Error('daily_journey_projection_corrupt');
    const pending: DailyJourneyGiftPendingItem[] = [];
    for (const occurrence of occurrences) {
      if (!await isClaimed(occurrence)) pending.push(Object.freeze({ ...occurrence, claimState: 'pending' }));
    }
    assertCurrentToken(token);
    const displayedRevisions = latestRevision > 0
      ? [...new Set([...state.displayedRevisions, latestRevision])]
        .sort((a, b) => a - b)
        .slice(-MAX_DISPLAYED_REVISIONS)
      : state.displayedRevisions;
    const nextState: DailyJourneyGiftProjectionStateV1 = {
      ...state,
      latestRevision,
      displayedRevisions,
    };
    if (JSON.stringify(nextState) !== JSON.stringify(state)) {
      await AsyncStorage.setItem(projectionKey(ownerStableId), JSON.stringify(nextState));
      assertCurrentToken(token);
    }
    return {
      pending: Object.freeze(pending),
      pendingCount: pending.length,
      unreadCount: pending.filter((item) => item.revision > state.seenRevision).length,
      latestRevision,
      seenRevision: state.seenRevision,
    };
  }));
  if (recovered) emitAppEvent('daily_journey_gifts_changed');
  return projection;
}

export async function markDailyJourneyGiftSnapshotSeen(
  snapshotRevision: number,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  if (!isCapturedAccountGenerationToken(token) || !isCurrentAccountGeneration(token) || !token.stableId) return false;
  const ownerStableId = token.stableId;
  let recovered = false;
  const updated = await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    recovered = (await recoverPrepared(ownerStableId, token)) !== null;
    const occurrences = await readOccurrences(ownerStableId);
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    const latestRevision = occurrences.reduce((latest, item) => Math.max(latest, item.revision), 0);
    const state = await readProjectionState(ownerStableId);
    if (!Number.isSafeInteger(snapshotRevision)
      || snapshotRevision < 1
      || snapshotRevision > latestRevision
      || snapshotRevision <= state.seenRevision
      || !state.displayedRevisions.includes(snapshotRevision)) return false;
    const nextState: DailyJourneyGiftProjectionStateV1 = {
      ...state,
      latestRevision,
      seenRevision: snapshotRevision,
      displayedRevisions: state.displayedRevisions.filter((revision) => revision > snapshotRevision),
    };
    await AsyncStorage.setItem(projectionKey(ownerStableId), JSON.stringify(nextState));
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    const verified = await readProjectionState(ownerStableId);
    return verified.seenRevision === snapshotRevision;
  }));
  if (recovered || updated) emitAppEvent('daily_journey_gifts_changed');
  return updated;
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
  const state = await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) return 'missing' as const;
    recovered = (await recoverPrepared(ownerStableId, token)) !== null;
    const raw = await AsyncStorage.getItem(occurrenceKey(ownerStableId, operationId));
    if (!isCurrentAccountGeneration(token, ownerStableId)) return 'missing' as const;
    const occurrence = await parseVerifiedOccurrence(raw, ownerStableId);
    if (!occurrence || occurrence.operationId !== operationId) return 'missing' as const;
    return await isClaimed(occurrence) ? 'claimed' as const : 'pending' as const;
  }));
  if (recovered) emitAppEvent('daily_journey_gifts_changed');
  return state;
}

export const DAILY_JOURNEY_GIFT_ACCOUNT_LOCAL_PREFIXES = Object.freeze([
  OCCURRENCE_PREFIX,
  PREPARED_PREFIX,
  PROJECTION_PREFIX,
  CLAIM_RECEIPT_PREFIX,
]);

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
