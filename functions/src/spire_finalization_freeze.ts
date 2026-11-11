import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import {
  SPIRE_CONFIG_COLLECTION,
  SPIRE_CONFIG_DOC_ID,
  spireConfigStatus,
  spireEffectiveRankBy,
  type SpireConfigDoc,
  type SpireRankBy,
} from './spire_config_contract';
import {
  computeSpireRoomResults,
  spireLadderMemberKey,
  type SpireMemberWeekResult,
} from './spire_finalize_core';
import { isSpireResidentMember } from './spire_residents';
import { normalizeStars, starsWeekEarned, STAR_OPERATIONS_COLLECTION } from './stars_ledger';
import { spireWeekRewardOpId } from './spire_coins';
import {
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';

export const SPIRE_FINALIZATION_FREEZE_SCHEMA = 'spire-finalization-freeze.v1' as const;
export const SPIRE_FINALIZATION_INTEGRITY_HOLD_SCHEMA = 'spire-finalization-integrity-hold.v1' as const;
export const SPIRE_FINALIZATION_INPUT_EVIDENCE_SCHEMA = 'spire-finalization-input-evidence.v1' as const;
export const SPIRE_FINALIZATION_CONFIG_EVIDENCE_SCHEMA = 'spire-finalization-config-evidence.v1' as const;

export type SpireFinalizationFreeze = Readonly<{
  schema: typeof SPIRE_FINALIZATION_FREEZE_SCHEMA;
  state: 'frozen';
  weekId: string;
  lang: string;
  rankBy: SpireRankBy;
  frozenResultCount: number;
  removedAfterFreezeCount: number;
  resultsDigest: string;
  configEvidenceSchema: typeof SPIRE_FINALIZATION_CONFIG_EVIDENCE_SCHEMA;
  configEvidenceHash: string;
  inputEvidenceSchema: typeof SPIRE_FINALIZATION_INPUT_EVIDENCE_SCHEMA;
  inputEvidenceHash: string;
  frozenAt: unknown;
}>;

export type SpireFrozenResult = SpireMemberWeekResult & Readonly<{
  weekId: string;
  lang: string;
  groupId: string;
  roomDigest: string;
  memberKey: string;
  decisionHash: string;
  rewardStatus: 'pending_wallet' | 'none' | 'paid';
  settlementStatus?: 'settled';
}>;

type FreezeClassification =
  | Readonly<{ kind: 'valid'; freeze: SpireFinalizationFreeze }>
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'hold'; reason: string }>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source).sort().map((key) => `${JSON.stringify(key)}:${canonical(source[key])}`).join(',')}}`;
}

export function spireFinalizationHash(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

export function isValidSpireFinalizationFreeze(
  room: Readonly<Record<string, unknown>>,
  value: unknown = room.finalizationFreeze,
): value is SpireFinalizationFreeze {
  const f = record(value);
  if (!f) return false;
  return f.schema === SPIRE_FINALIZATION_FREEZE_SCHEMA
    && f.state === 'frozen'
    && f.weekId === room.weekId
    && f.lang === room.lang
    && (f.rankBy === 'steps' || f.rankBy === 'coins')
    && Number.isSafeInteger(f.frozenResultCount) && Number(f.frozenResultCount) > 0
    && Number.isSafeInteger(f.removedAfterFreezeCount) && Number(f.removedAfterFreezeCount) >= 0
    && Number(f.removedAfterFreezeCount) <= Number(f.frozenResultCount)
    && typeof f.resultsDigest === 'string' && /^[a-f0-9]{64}$/.test(f.resultsDigest)
    && f.configEvidenceSchema === SPIRE_FINALIZATION_CONFIG_EVIDENCE_SCHEMA
    && typeof f.configEvidenceHash === 'string' && /^[a-f0-9]{64}$/.test(f.configEvidenceHash)
    && f.inputEvidenceSchema === SPIRE_FINALIZATION_INPUT_EVIDENCE_SCHEMA
    && typeof f.inputEvidenceHash === 'string' && /^[a-f0-9]{64}$/.test(f.inputEvidenceHash)
    && f.frozenAt !== undefined && f.frozenAt !== null;
}

export function classifySpireFinalizationFreeze(
  room: Readonly<Record<string, unknown>>,
  value: unknown,
  existingResultCount: number,
): FreezeClassification {
  if (Object.prototype.hasOwnProperty.call(room, 'finalizationFreeze')) {
    return isValidSpireFinalizationFreeze(room, value)
      ? { kind: 'valid', freeze: value }
      : { kind: 'hold', reason: 'invalid_finalization_freeze' };
  }
  if (existingResultCount > 0) return { kind: 'hold', reason: 'legacy_unfrozen_result' };
  const members = record(room.members) ?? {};
  const live = Object.entries(members).filter(([uid, raw]) => record(raw) && !isSpireResidentMember(uid, raw as Record<string, unknown>));
  if (live.length === 0) return { kind: 'hold', reason: 'zero_member_unfrozen_hold' };
  return { kind: 'none' };
}

export type SpireFreezeForDeletion =
  | Readonly<{ kind: 'absent' }>
  | Readonly<{ kind: 'valid'; fence: SpireFinalizationFreeze }>
  | Readonly<{ kind: 'invalid' }>;

export function classifySpireFreezeForDeletion(
  room: Readonly<Record<string, unknown>>,
): SpireFreezeForDeletion {
  if (!Object.prototype.hasOwnProperty.call(room, 'finalizationFreeze')) return { kind: 'absent' };
  return isValidSpireFinalizationFreeze(room, room.finalizationFreeze)
    ? { kind: 'valid', fence: room.finalizationFreeze }
    : { kind: 'invalid' };
}

export function spireFrozenResultDecisionHash(value: Readonly<Record<string, unknown>>): string {
  const { rewardStatus: _rewardStatus, settlementStatus: _settlementStatus,
    rewardOpId: _rewardOpId, rewardPaidCoins: _rewardPaidCoins,
    rewardPaidAt: _rewardPaidAt, starsBalanceAfter: _balance, starsEarnedTotalAfter: _earned,
    starsSeq: _seq, finalizedAt: _finalizedAt, decisionHash: _decisionHash, ladder: rawLadder, ...immutable } = value;
  // Privacy scrubbing may blank a ladder row after freeze. Hash stable ranking
  // facts and member keys, never mutable display fields.
  const ladder = Array.isArray(rawLadder) ? rawLadder.map((raw) => {
    const row = record(raw) ?? {};
    return { place: row.place, coins: row.coins, steps: row.steps, isMe: row.isMe, memberKey: row.memberKey };
  }) : rawLadder;
  return spireFinalizationHash({ ...immutable, ladder });
}

export function validateSpireFrozenResult(
  room: Readonly<Record<string, unknown>>,
  uid: string,
  raw: unknown,
): raw is SpireFrozenResult {
  const freeze = room.finalizationFreeze;
  if (!isValidSpireFinalizationFreeze(room, freeze)) return false;
  const result = record(raw);
  if (!result) return false;
  const member = record(record(room.members)?.[uid]);
  if (!member || isSpireResidentMember(uid, member)) return false;
  return result.groupId === room.groupId
    && result.weekId === room.weekId
    && result.lang === room.lang
    && result.roomDigest === freeze.inputEvidenceHash
    && result.memberKey === spireLadderMemberKey(String(room.groupId), uid)
    && typeof result.decisionHash === 'string'
    && result.decisionHash === spireFrozenResultDecisionHash(result);
}

function membersOf(room: Record<string, unknown>): Record<string, unknown> {
  return record(room.members) ?? {};
}

function configEvidence(config: SpireConfigDoc, rankBy: SpireRankBy, weekId: string): Record<string, unknown> {
  return {
    schema: SPIRE_FINALIZATION_CONFIG_EVIDENCE_SCHEMA,
    weekId,
    coins: config.coins,
    residents: config.residents,
    configuredRankBy: config.rankBy,
    effectiveRankBy: rankBy,
    weekCoinsCap: config.weekCoinsCap,
  };
}

export type FreezeRoomOutcome = Readonly<{
  status: 'frozen' | 'already_frozen' | 'hold' | 'integrity_room_hold';
  reason?: string;
  freeze?: SpireFinalizationFreeze;
  results?: Readonly<Record<string, SpireFrozenResult>>;
}>;

/** First finalization is one optimistic transaction: all reads precede all writes. */
export async function freezeSpireRoom(
  db: admin.firestore.Firestore,
  roomRef: admin.firestore.DocumentReference,
  fallbackWeekStartMs: number,
): Promise<FreezeRoomOutcome> {
  return db.runTransaction(async (tx): Promise<FreezeRoomOutcome> => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) return { status: 'hold', reason: 'room_missing' };
    const room = { ...(roomSnap.data() ?? {}), groupId: roomRef.id } as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(room, 'finalizationIntegrityHold')) {
      return { status: 'integrity_room_hold', reason: 'integrity_room_hold' };
    }
    const existingMarker = classifySpireFinalizationFreeze(room, room.finalizationFreeze, 0);
    if (existingMarker.kind === 'valid') return { status: 'already_frozen', freeze: existingMarker.freeze };
    if (Object.prototype.hasOwnProperty.call(room, 'finalizationFreeze')) {
      return { status: 'hold', reason: existingMarker.kind === 'hold' ? existingMarker.reason : 'invalid_finalization_freeze' };
    }

    const weekId = typeof room.weekId === 'string' ? room.weekId : '';
    const lang = typeof room.lang === 'string' ? room.lang : '';
    if (!weekId || !lang) return { status: 'hold', reason: 'room_identity_missing' };
    const configRef = db.collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID);
    const configSnap = await tx.get(configRef);
    const config = spireConfigStatus(configSnap.exists ? configSnap.data() : null).config;
    const rankBy = spireEffectiveRankBy(config, weekId);
    const live = Object.entries(membersOf(room))
      .filter(([uid, raw]) => record(raw) && !isSpireResidentMember(uid, raw as Record<string, unknown>))
      .map(([uid]) => uid)
      .sort();
    if (live.length === 0) {
      return { status: 'hold', reason: 'zero_member_unfrozen_hold' };
    }

    const userRefs = live.map((uid) => db.collection('users').doc(uid));
    const tombRefs = live.map((uid) => db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(uid));
    const denialRefs = live.map((uid) => db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(uid)));
    const resultRefs = live.map((uid) => db.collection('users').doc(uid).collection('spire_week_results').doc(`${weekId}_${lang}`));
    const receiptRefs = live.map((uid) => db.collection('users').doc(uid).collection(STAR_OPERATIONS_COLLECTION).doc(spireWeekRewardOpId(weekId, lang)));
    // A removed legacy member is no longer discoverable through room.members.
    // The groupId projection catches any markerless old result for this room.
    const legacyGroupResultsQuery = db.collectionGroup('spire_week_results').where('groupId', '==', roomRef.id).limit(1);
    const [users, tombs, denials, priorResults, receipts, legacyGroupResults] = await Promise.all([
      Promise.all(userRefs.map((ref) => tx.get(ref))),
      Promise.all(tombRefs.map((ref) => tx.get(ref))),
      Promise.all(denialRefs.map((ref) => tx.get(ref))),
      Promise.all(resultRefs.map((ref) => tx.get(ref))),
      Promise.all(receiptRefs.map((ref) => tx.get(ref))),
      tx.get(legacyGroupResultsQuery),
    ]);
    if (!legacyGroupResults.empty || priorResults.some((snap) => snap.exists) || receipts.some((snap) => snap.exists)) {
      return { status: 'hold', reason: 'legacy_unfrozen_result' };
    }
    for (let index = 0; index < live.length; index += 1) {
      const data = users[index].data() ?? {};
      if (!users[index].exists || data.identityHidden === true || data.levelSpinMergePending === true || tombs[index].exists || denials[index].exists) {
        return { status: 'hold', reason: 'member_identity_inactive' };
      }
    }
    const weekCoinsByUid: Record<string, number> = {};
    if (rankBy === 'coins') {
      live.forEach((uid, index) => { weekCoinsByUid[uid] = starsWeekEarned(normalizeStars(users[index].data()?.stars), weekId); });
    }
    const roomWeekStart = Number(room.weekStartMs);
    const output = computeSpireRoomResults({
      groupId: roomRef.id,
      tier: Number(room.tier),
      weekStartMs: Number.isFinite(roomWeekStart) && roomWeekStart > 0 ? roomWeekStart : fallbackWeekStartMs,
      cohortDay: Number(room.cohortDay) || 0,
      members: membersOf(room),
      coins: config.coins,
      tuning: config.residents,
      rankBy,
      weekCoinsByUid,
      weekCoinsCap: config.weekCoinsCap,
    });
    const inputEvidence = {
      schema: SPIRE_FINALIZATION_INPUT_EVIDENCE_SCHEMA,
      groupId: roomRef.id, weekId, lang, tier: Number(room.tier),
      weekStartMs: Number.isFinite(roomWeekStart) && roomWeekStart > 0 ? roomWeekStart : fallbackWeekStartMs,
      cohortDay: Number(room.cohortDay) || 0,
      members: live.map((uid) => ({ uid, member: membersOf(room)[uid], weekCoins: rankBy === 'coins' ? weekCoinsByUid[uid] : null })),
      config: configEvidence(config, rankBy, weekId),
    };
    const inputEvidenceHash = spireFinalizationHash(inputEvidence);
    const resultDocs: Record<string, SpireFrozenResult> = {};
    for (const uid of live) {
      const base = {
        ...output.results[uid], weekId, lang, groupId: roomRef.id,
        roomDigest: inputEvidenceHash,
        memberKey: spireLadderMemberKey(roomRef.id, uid),
        rewardStatus: output.results[uid].rewardCoins.total > 0 ? 'pending_wallet' : 'none',
      } as Omit<SpireFrozenResult, 'decisionHash'>;
      resultDocs[uid] = { ...base, decisionHash: spireFrozenResultDecisionHash(base as unknown as Record<string, unknown>) } as SpireFrozenResult;
    }
    const resultsDigest = spireFinalizationHash(live.map((uid) => ({ uid, decisionHash: resultDocs[uid].decisionHash })));
    const freeze: SpireFinalizationFreeze = {
      schema: SPIRE_FINALIZATION_FREEZE_SCHEMA, state: 'frozen', weekId, lang, rankBy,
      frozenResultCount: live.length, removedAfterFreezeCount: 0, resultsDigest,
      configEvidenceSchema: SPIRE_FINALIZATION_CONFIG_EVIDENCE_SCHEMA,
      configEvidenceHash: spireFinalizationHash(configEvidence(config, rankBy, weekId)),
      inputEvidenceSchema: SPIRE_FINALIZATION_INPUT_EVIDENCE_SCHEMA,
      inputEvidenceHash,
      frozenAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    for (let index = 0; index < live.length; index += 1) {
      tx.create(resultRefs[index], { ...resultDocs[live[index]], finalizedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    tx.set(roomRef, { finalizationFreeze: freeze }, { merge: true });
    return { status: 'frozen', freeze, results: resultDocs };
  }, { maxAttempts: 3 });
}

export type LoadFrozenSpireRoomResultsOutcome =
  | Readonly<{ status: 'loaded'; room: Record<string, unknown>; results: Record<string, SpireFrozenResult> }>
  | Readonly<{
    status:
      | 'integrity_room_hold'
      | 'integrity_freeze'
      | 'integrity_member_count'
      | 'integrity_result_missing'
      | 'integrity_result_binding';
  }>;

export async function loadFrozenSpireRoomResults(
  db: admin.firestore.Firestore,
  roomRef: admin.firestore.DocumentReference,
): Promise<LoadFrozenSpireRoomResultsOutcome> {
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) return { status: 'integrity_freeze' };
  const room = { ...(roomSnap.data() ?? {}), groupId: roomRef.id } as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(room, 'finalizationIntegrityHold')) return { status: 'integrity_room_hold' };
  if (!isValidSpireFinalizationFreeze(room)) return { status: 'integrity_freeze' };
  const uids = Object.entries(membersOf(room)).filter(([uid, raw]) => record(raw) && !isSpireResidentMember(uid, raw as Record<string, unknown>)).map(([uid]) => uid).sort();
  const refs = uids.map((uid) => db.collection('users').doc(uid).collection('spire_week_results').doc(`${room.weekId}_${room.lang}`));
  const snaps = refs.length ? await db.getAll(...refs) : [];
  const results: Record<string, SpireFrozenResult> = {};
  for (let index = 0; index < uids.length; index += 1) {
    if (!snaps[index].exists) return { status: 'integrity_result_missing' };
    if (!validateSpireFrozenResult(room, uids[index], snaps[index].data())) return { status: 'integrity_result_binding' };
    results[uids[index]] = snaps[index].data() as SpireFrozenResult;
  }
  const freeze = room.finalizationFreeze as SpireFinalizationFreeze;
  if (uids.length + freeze.removedAfterFreezeCount !== freeze.frozenResultCount) return { status: 'integrity_member_count' };
  if (freeze.removedAfterFreezeCount === 0
    && spireFinalizationHash(uids.map((uid) => ({ uid, decisionHash: results[uid].decisionHash }))) !== freeze.resultsDigest) {
    return { status: 'integrity_result_binding' };
  }
  return { status: 'loaded', room, results };
}

export type CompleteFrozenSpireRoomOutcome = Readonly<{
  status:
    | 'finalized'
    | 'already_finalized'
    | 'integrity_room_hold'
    | 'integrity_freeze'
    | 'integrity_member_count'
    | 'integrity_result_missing'
    | 'integrity_result_binding'
    | 'integrity_unsettled';
}>;

export async function completeFrozenSpireRoom(
  db: admin.firestore.Firestore,
  roomRef: admin.firestore.DocumentReference,
): Promise<CompleteFrozenSpireRoomOutcome> {
  return db.runTransaction(async (tx): Promise<CompleteFrozenSpireRoomOutcome> => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) return { status: 'integrity_freeze' };
    const room = { ...(roomSnap.data() ?? {}), groupId: roomRef.id } as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(room, 'finalizationIntegrityHold')) return { status: 'integrity_room_hold' };
    if (!isValidSpireFinalizationFreeze(room)) return { status: 'integrity_freeze' };
    if (room.finalizedAt !== undefined) return { status: 'already_finalized' };
    const freeze = room.finalizationFreeze as SpireFinalizationFreeze;
    const uids = Object.entries(membersOf(room)).filter(([uid, raw]) => record(raw) && !isSpireResidentMember(uid, raw as Record<string, unknown>)).map(([uid]) => uid).sort();
    if (uids.length + freeze.removedAfterFreezeCount !== freeze.frozenResultCount) return { status: 'integrity_member_count' };
    const refs = uids.map((uid) => db.collection('users').doc(uid).collection('spire_week_results').doc(`${room.weekId}_${room.lang}`));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    for (let index = 0; index < uids.length; index += 1) {
      if (!snaps[index].exists) return { status: 'integrity_result_missing' };
      const data = snaps[index].data();
      if (!validateSpireFrozenResult(room, uids[index], data)) return { status: 'integrity_result_binding' };
      if (data?.settlementStatus !== 'settled') return { status: 'integrity_unsettled' };
    }
    if (freeze.removedAfterFreezeCount === 0
      && spireFinalizationHash(uids.map((uid, index) => ({ uid, decisionHash: snaps[index].data()?.decisionHash }))) !== freeze.resultsDigest) {
      return { status: 'integrity_result_binding' };
    }
    tx.update(roomRef, { finalizedAt: admin.firestore.FieldValue.serverTimestamp(), open: false });
    return { status: 'finalized' };
  });
}
