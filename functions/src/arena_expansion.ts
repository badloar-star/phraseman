import * as admin from 'firebase-admin';
import { createHash, createHmac } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import {
  applySpeedMatchAttempt,
  type TournamentTask,
  validateTournamentTaskForNewRoom,
} from './tournament_core';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
  NEW_TOURNAMENT_POOL_VERSION,
  verifyTournamentPoolTaskProof,
} from './tournament_pool_publication';
import {
  ARENA_V2_ACCEPT_MS,
  ARENA_V2_ANSWER_MS,
  ARENA_V2_COLLECTIONS,
  ARENA_V2_MATCH_TTL_MS,
  ARENA_V2_MODE_ORDER,
  ARENA_V2_READING_MS,
  ARENA_V2_REVEAL_MS,
  arenaDifficultyPlan,
  decodeArenaSpeedProgress,
  encodeArenaSpeedProgress,
  arenaObservedElapsedMs,
  arenaRankIndexFromRp,
  arenaSeasonWindow,
  arenaTaskDurationMs,
  arenaTaskStars,
  scoreArenaAnswer,
  scoreArenaSpeedProgress,
  selectArenaTasks,
  toArenaPublicTask,
  validateArenaPrivateEnvelope,
  type ArenaFirestoreSpeedProgress,
} from './arena_v2_core';
import {
  commitStarOperations,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';
import { arenaWeekKeyForMs } from './arena_xp';
import {
  ARENA_COSMETIC_CATALOG,
  ARENA_EXPANSION_CATALOG_VERSION,
  ARENA_EXPANSION_COLLECTIONS,
  ARENA_EXPANSION_SCHEMA_VERSION,
  ARENA_GHOST_TTL_MS,
  ARENA_LAB_TTL_MS,
  ARENA_MASTERY_SIGNATURE_TTL_MS,
  arenaApplyMasteryObservations,
  arenaCanonicalTaskSignature,
  arenaCatalogItem,
  arenaCosmeticSlot,
  arenaLabTask,
  arenaMasteryObservation,
  arenaPartnerSpotlightAward,
  arenaSanitizeAnswerSnapshot,
  arenaTodayBand,
  arenaTodayDayKey,
  arenaTodayHardExpiresAt,
  arenaTodaySnapshotId,
  arenaTodayStars,
  arenaUtcWeekKey,
  type ArenaMasteryMode,
  type ArenaMasteryProfileState,
} from './arena_expansion_core';

const ARENA_EXPANSION_CALLABLE_OPTIONS = {
  ...HOT_CALLABLE_OPTIONS,
  secrets: ['ARENA_V2_INVITE_HMAC_KEY'],
};

type Json = Record<string, any>;
type ExpansionFeature = 'home' | 'today' | 'lab' | 'ghost' | 'rival' | 'partner' | 'store';
type ExpansionActor = { authUid: string; stableUid: string; user: Json; config: Json };
type ExpansionRun = {
  schemaVersion: string;
  runId: string;
  runKind: 'today' | 'ghost';
  ownerStableUid: string;
  ownerAuthUid: string;
  sourceId: string;
  state: 'task_active' | 'task_reveal' | 'settled' | 'expired';
  terminal: boolean;
  currentTaskIndex: number;
  currentPublicTask?: Json;
  stateStartedAtMs: number;
  readingEndsAtMs: number;
  stateDeadlineAtMs: number;
  hardExpiresAtMs: number;
  answers: Record<string, Json>;
  speedProgress: Record<string, ArenaFirestoreSpeedProgress>;
  speedAttempts: Record<string, Json>;
  totals: { score: number; correct: number; submittedAnswers: number; rawTaskStars: number };
  version: number;
  createdAtMs: number;
  settledAtMs?: number;
  result?: Json;
  expansionFlags: { wallet: boolean; lab: boolean; mastery: boolean; partner: boolean };
  /** Sealed owner/server-only copy prevents source-TTL races from orphaning active runs. */
  tasks: TournamentTask[];
  expireAt: admin.firestore.Timestamp;
};

const db = admin.firestore();
const DAY_MS = 24 * 60 * 60 * 1_000;
const RUN_TTL_MS = 30 * DAY_MS;
const PARTNER_PENDING_TTL_MS = 7 * DAY_MS;
const MAX_SPEED_ATTEMPTS = 40;

function nowMs(): number { return Date.now(); }
function timestamp(ms: number): admin.firestore.Timestamp { return admin.firestore.Timestamp.fromMillis(ms); }
function clone<T>(value: T): T { return structuredClone(value); }
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }

function safeId(value: unknown, field: string, max = 160): string {
  const result = String(value ?? '').trim();
  if (!result || result.length > max || !/^[A-Za-z0-9_.:@-]+$/.test(result)) {
    throw new HttpsError('invalid-argument', `${field}_invalid`);
  }
  return result;
}

function integer(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new HttpsError('invalid-argument', `${field}_invalid`);
  }
  return Number(value);
}

function featureFlag(feature: ExpansionFeature): string {
  return ({
    home: 'arenaExpansionEnabled', today: 'arenaTodayEnabled', lab: 'arenaMatchLabEnabled',
    ghost: 'arenaGhostEnabled', rival: 'arenaRivalEnabled', partner: 'arenaPartnerEnabled',
    store: 'arenaStarStoreEnabled',
  } as const)[feature];
}

function comparableVersion(value: unknown): [number, number, number] | null {
  const match = String(value ?? '').trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function versionAtLeast(actualValue: unknown, minimumValue: unknown): boolean {
  const actual = comparableVersion(actualValue); const minimum = comparableVersion(minimumValue);
  if (!actual || !minimum) return false;
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] !== minimum[index]) return actual[index] > minimum[index];
  }
  return true;
}

async function expansionActor(
  request: { auth?: { uid?: string }; data?: Json },
  feature: ExpansionFeature,
  recovery = false,
): Promise<ExpansionActor> {
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const stableUid = await resolveStableUidForAuth(db, authUid, undefined, {
    requireKnownIdentity: true, repairLinks: false,
  });
  const [userSnap, configSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get(),
    db.collection(ARENA_V2_COLLECTIONS.config).doc('current').get(),
  ]);
  if (!userSnap.exists || !configSnap.exists) throw new HttpsError('failed-precondition', 'arena_config_or_identity_missing');
  const user = userSnap.data() ?? {};
  const config = configSnap.data() ?? {};
  if (user.hidden === true || user.deleted === true || user.banned === true
    || (user.firebaseAuthUid && user.firebaseAuthUid !== authUid)) {
    throw new HttpsError('permission-denied', 'arena_access_denied');
  }
  if (config.schemaVersion !== 'arena-v2-config.v1'
    || config.productConfigVersion !== 'arena-v2-product.v1'
    || config.contentPublication?.poolVersion !== NEW_TOURNAMENT_POOL_VERSION
    || config.contentPublication?.manifestSha256 !== NEW_TOURNAMENT_POOL_CONTENT_SHA256) {
    throw new HttpsError('failed-precondition', 'arena_config_incompatible');
  }
  if (!versionAtLeast(request.data?.clientVersion, config.minClientVersion)) {
    throw new HttpsError('failed-precondition', 'arena_client_update_required');
  }
  if (!recovery && (config.enabled !== true || config.arenaExpansionEnabled !== true
    || config[featureFlag(feature)] !== true)) {
    throw new HttpsError('failed-precondition', `arena_${feature}_disabled`);
  }
  if (feature === 'store' && config.arenaCosmeticCatalogVersion !== ARENA_EXPANSION_CATALOG_VERSION) {
    throw new HttpsError('failed-precondition', 'arena_store_catalog_not_published');
  }
  if (feature === 'rival' && config.arenaRivalRuntimeVersion !== 'arena-rival.v1') {
    throw new HttpsError('failed-precondition', 'arena_rival_runtime_unavailable');
  }
  return { authUid, stableUid, user, config };
}

function userSubcollection(uid: string, collection: string): admin.firestore.CollectionReference {
  return db.collection('users').doc(uid).collection(collection);
}

function compactMastery(mastery: ArenaMasteryProfileState | undefined): Json {
  return Object.fromEntries((['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as ArenaMasteryMode[])
    .map((mode) => {
      const state = mastery?.[mode];
      return [mode, {
        score: state?.score ?? null,
        sampleCount: Math.max(0, Number(state?.sampleCount ?? 0)),
        confidence: state?.confidence ?? 'hidden',
        accuracy: Math.max(0, Number(state?.accuracy ?? 0)),
        medianMs: Math.max(0, Number(state?.medianMs ?? 0)),
        trend: Number(state?.trend ?? 0),
      }];
    }));
}

async function loadExpansionTaskPool(
  tx: admin.firestore.Transaction,
  divisionIndex: number,
  seed: string,
  excludedTaskIds: ReadonlySet<string> = new Set(),
): Promise<TournamentTask[]> {
  const difficulties = arenaDifficultyPlan(divisionIndex);
  const required = new Map<string, { mode: string; difficulty: number; count: number }>();
  ARENA_V2_MODE_ORDER.forEach((mode, index) => {
    const difficulty = difficulties[index];
    const key = `${mode}:${difficulty}`;
    const cell = required.get(key) ?? { mode, difficulty, count: 0 };
    cell.count += 1;
    required.set(key, cell);
  });
  const prefixes: Record<string, string> = {
    guess_phrase: 'guess', fill_gap: 'gap', find_oddity: 'odd', translate_build: 'build', speed_match: 'pairs',
  };
  const tasks: TournamentTask[] = [];
  for (const cell of required.values()) {
    const prefix = `tp2_20260801_v10_${prefixes[cell.mode]}_d${cell.difficulty}_`;
    const cursor = `${prefix}${createHash('sha1').update(`${seed}|${cell.mode}|${cell.difficulty}`).digest('hex')}`;
    const cellExcludedTaskIds = Array.from(excludedTaskIds).filter((taskId) => taskId.startsWith(prefix));
    let base: admin.firestore.Query = db.collection(ARENA_V2_COLLECTIONS.taskSource)
      .where('poolVersion', '==', NEW_TOURNAMENT_POOL_VERSION)
      .where('mode', '==', cell.mode).where('difficulty', '==', cell.difficulty);
    if (cellExcludedTaskIds.length > 0) {
      // A series has at most four earlier IDs in one mode/difficulty cell.
      // Firestore excludes them server-side, preserving the exact ten-doc read budget.
      base = base.where(admin.firestore.FieldPath.documentId(), 'not-in', cellExcludedTaskIds.slice(0, 10));
    }
    base = base.orderBy(admin.firestore.FieldPath.documentId());
    // Keep the hot-path budget at exactly ten task-document reads. A deterministic
    // collision with an earlier series game fails closed instead of widening reads.
    const readCount = cell.count;
    const after = await tx.get(base.startAt(cursor).limit(readCount));
    const docs = [...after.docs].filter((doc) => !excludedTaskIds.has(String(doc.data().taskId || doc.id)));
    if (after.docs.length < cell.count) {
      const wrapped = await tx.get(base.endBefore(cursor).limit(cell.count - after.docs.length));
      docs.push(...wrapped.docs.filter((doc) => !excludedTaskIds.has(String(doc.data().taskId || doc.id))));
    }
    const uniqueDocs = Array.from(new Map(docs.map((doc) => [doc.id, doc])).values()).slice(0, cell.count);
    if (uniqueDocs.length !== cell.count) throw new HttpsError('unavailable', 'arena_task_pool_insufficient');
    for (const doc of uniqueDocs) {
      const raw = { ...doc.data(), taskId: String(doc.data().taskId || doc.id) } as TournamentTask & {
        arenaPublication?: { poolContentSha256?: string; merkleRootSha256?: string };
      };
      if (!validateTournamentTaskForNewRoom(raw).ok || raw.mode !== cell.mode || raw.difficulty !== cell.difficulty
        || raw.arenaPublication?.poolContentSha256 !== NEW_TOURNAMENT_POOL_CONTENT_SHA256
        || raw.arenaPublication?.merkleRootSha256 !== NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256
        || !verifyTournamentPoolTaskProof(raw as any, NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256)) {
        throw new HttpsError('failed-precondition', 'arena_task_publication_invalid');
      }
      const { arenaPublication: _proof, ...verified } = raw;
      tasks.push(verified as TournamentTask);
    }
  }
  const selected = selectArenaTasks(tasks, seed, divisionIndex);
  if (!selected || selected.length !== 10) throw new HttpsError('unavailable', 'arena_task_pool_insufficient');
  return selected;
}

function activateRunTask(run: ExpansionRun, tasks: readonly TournamentTask[], taskIndex: number, atMs: number): void {
  const task = tasks[taskIndex];
  const publicTask = toArenaPublicTask(task);
  if (!publicTask) throw new HttpsError('data-loss', 'arena_public_task_invalid');
  run.state = 'task_active';
  run.currentTaskIndex = taskIndex;
  run.currentPublicTask = publicTask;
  run.stateStartedAtMs = atMs;
  run.readingEndsAtMs = atMs + ARENA_V2_READING_MS;
  run.stateDeadlineAtMs = Math.min(run.hardExpiresAtMs, atMs + arenaTaskDurationMs(task.mode as any));
  run.version += 1;
}

function makeExpansionRun(input: {
  runId: string; runKind: 'today' | 'ghost'; owner: ExpansionActor; sourceId: string;
  tasks: readonly TournamentTask[]; now: number;
}): ExpansionRun {
  const run: ExpansionRun = {
    schemaVersion: ARENA_EXPANSION_SCHEMA_VERSION,
    runId: input.runId,
    runKind: input.runKind,
    ownerStableUid: input.owner.stableUid,
    ownerAuthUid: input.owner.authUid,
    sourceId: input.sourceId,
    state: 'task_active', terminal: false, currentTaskIndex: 0,
    stateStartedAtMs: input.now, readingEndsAtMs: input.now,
    stateDeadlineAtMs: input.now, hardExpiresAtMs: arenaTodayHardExpiresAt(input.now),
    answers: {}, speedProgress: {}, speedAttempts: {},
    totals: { score: 0, correct: 0, submittedAnswers: 0, rawTaskStars: 0 },
    version: 0, createdAtMs: input.now,
    expansionFlags: {
      wallet: input.owner.config.enabled === true && input.owner.config.arenaExpansionEnabled === true,
      lab: input.owner.config.arenaMatchLabEnabled === true,
      mastery: input.owner.config.arenaMasteryEnabled === true,
      partner: input.owner.config.arenaPartnerEnabled === true,
    },
    tasks: clone(input.tasks) as TournamentTask[],
    expireAt: timestamp(input.now + RUN_TTL_MS),
  };
  activateRunTask(run, input.tasks, 0, input.now);
  return run;
}

function assertRunOwner(run: ExpansionRun, who: ExpansionActor): void {
  if (run.ownerStableUid !== who.stableUid || run.ownerAuthUid !== who.authUid) {
    throw new HttpsError('permission-denied', 'arena_run_not_owner');
  }
}

function storeRunReceipt(run: ExpansionRun, receipt: Json): void {
  const key = String(receipt.taskIndex);
  if (run.answers[key]) return;
  run.answers[key] = receipt;
  run.totals.score += Math.max(0, Number(receipt.points ?? 0));
  run.totals.rawTaskStars += Math.max(0, Number(receipt.taskStars ?? 0));
  if (receipt.submitted === true) run.totals.submittedAnswers += 1;
  if (receipt.correct === true) run.totals.correct += 1;
}

function revealRunTask(run: ExpansionRun, now: number): void {
  run.state = 'task_reveal';
  run.stateStartedAtMs = now;
  run.stateDeadlineAtMs = Math.min(run.hardExpiresAtMs, now + ARENA_V2_REVEAL_MS);
  run.version += 1;
}

function advanceExpansionRun(run: ExpansionRun, tasks: readonly TournamentTask[], now: number): boolean {
  for (let guard = 0; guard < 24; guard += 1) {
    if (run.terminal) return true;
    if (now >= run.hardExpiresAtMs) {
      if (run.state === 'task_active' && !run.answers[String(run.currentTaskIndex)]) {
        const task = tasks[run.currentTaskIndex];
        const storedProgress = run.speedProgress[String(run.currentTaskIndex)];
        const progress = decodeArenaSpeedProgress(storedProgress);
        storeRunReceipt(run, {
          taskIndex: run.currentTaskIndex, submissionId: `hard_timeout_${run.currentTaskIndex}`,
          correct: false, submitted: false,
          points: task.mode === 'speed_match' ? scoreArenaSpeedProgress(progress) : 0,
          taskStars: 0,
          elapsedMs: ARENA_V2_ANSWER_MS[task.mode as keyof typeof ARENA_V2_ANSWER_MS],
          answerSnapshot: storedProgress ?? null, timedOut: true, receivedAtMs: run.hardExpiresAtMs,
        });
      }
      run.state = 'expired'; run.terminal = true; run.settledAtMs = now; run.version += 1;
      return true;
    }
    if (run.state === 'task_active') {
      if (now < run.stateDeadlineAtMs) return false;
      const task = tasks[run.currentTaskIndex];
      const storedProgress = run.speedProgress[String(run.currentTaskIndex)];
      const progress = decodeArenaSpeedProgress(storedProgress);
      storeRunReceipt(run, {
        taskIndex: run.currentTaskIndex, submissionId: `timeout_${run.currentTaskIndex}`,
        correct: false, submitted: false,
        points: task.mode === 'speed_match' ? scoreArenaSpeedProgress(progress) : 0,
        taskStars: task.mode === 'speed_match'
          ? arenaTaskStars({ task, correct: false, speedProgress: progress }) : 0,
        elapsedMs: ARENA_V2_ANSWER_MS[task.mode as keyof typeof ARENA_V2_ANSWER_MS],
        answerSnapshot: storedProgress ?? null, timedOut: true, receivedAtMs: run.stateDeadlineAtMs,
      });
      revealRunTask(run, run.stateDeadlineAtMs);
      continue;
    }
    if (run.state === 'task_reveal') {
      if (now < run.stateDeadlineAtMs) return false;
      const next = run.currentTaskIndex + 1;
      if (next >= tasks.length) {
        run.state = 'settled'; run.terminal = true; run.settledAtMs = run.stateDeadlineAtMs; run.version += 1;
        return true;
      }
      activateRunTask(run, tasks, next, run.stateDeadlineAtMs);
      continue;
    }
    return run.terminal;
  }
  throw new HttpsError('resource-exhausted', 'arena_run_catchup_limit');
}

export function arenaExpansionRunResponse(run: ExpansionRun, extra: Json = {}): Json {
  const matchState = run.state === 'expired' ? 'aborted' : run.state;
  const viewerReward = extra.viewerReward;
  const match = {
    matchId: run.runId, mode: run.runKind, opponentKind: run.runKind === 'ghost' ? 'recording' : 'none',
    players: [{ uid: 'a', name: 'Player', rank: 0, rating: 0,
      score: run.totals.score, correct: run.totals.correct }],
    acceptedBy: ['a'], state: matchState, version: run.version,
    currentTaskIndex: run.currentTaskIndex, currentPublicTask: run.currentPublicTask,
    submittedBy: run.answers[String(run.currentTaskIndex)] ? ['a'] : [],
    scores: { a: run.totals.score }, stateStartedAtMs: run.stateStartedAtMs,
    stateDeadlineAtMs: run.stateDeadlineAtMs, terminal: run.terminal,
    ...(run.terminal ? { result: { rewards: viewerReward ? { a: viewerReward } : {}, players: [] } } : {}),
  };
  return {
    ok: true, matchId: run.runId, runId: run.runId, runKind: run.runKind,
    state: matchState, terminal: run.terminal, currentTaskIndex: run.currentTaskIndex,
    currentPublicTask: run.currentPublicTask, readingEndsAtMs: run.readingEndsAtMs,
    stateDeadlineAtMs: run.stateDeadlineAtMs, hardExpiresAtMs: run.hardExpiresAtMs,
    totals: run.totals, version: run.version, viewerSeat: 'a', match, ...extra,
  };
}

function labRecord(run: ExpansionRun, tasks: readonly TournamentTask[], now: number): Json {
  const exposedIndexes = Object.keys(run.answers).map(Number)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < tasks.length).sort((a, b) => a - b);
  const taskRows: Json[] = exposedIndexes.map((index) => ({ taskIndex: index,
    ...arenaLabTask(tasks[index], run.answers[String(index)] ?? {}) }));
  return {
    schemaVersion: 'arena-match-lab.v1', matchId: run.runId, runKind: run.runKind,
    createdAtMs: now, tasks: taskRows,
    retryTaskIndexes: taskRows.map((row, index) => row.correct === true ? -1 : index).filter((index) => index >= 0).slice(0, 3),
    summary: run.totals,
    expireAt: timestamp(now + ARENA_LAB_TTL_MS),
  };
}

async function settleExpansionRun(
  tx: admin.firestore.Transaction,
  runRef: admin.firestore.DocumentReference,
  run: ExpansionRun,
  tasks: readonly TournamentTask[],
  who: ExpansionActor,
  now: number,
  sourceRef?: admin.firestore.DocumentReference,
): Promise<Json> {
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const season = arenaSeasonWindow(now);
  const seasonRef = userSubcollection(who.stableUid, ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId);
  const labRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.matchLabs).doc(run.runId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts)
    .doc(`${run.runKind}_${run.sourceId}`);
  const [profileSnap, receiptSnap] = await Promise.all([tx.get(profileRef), tx.get(receiptRef)]);
  if (receiptSnap.exists) {
    run.state = run.state === 'expired' ? 'expired' : 'settled';
    run.terminal = true;
    run.result = receiptSnap.data();
    tx.set(runRef, run);
    return receiptSnap.data() ?? {};
  }
  const profileData = profileSnap.data() ?? {};
  if (run.runKind === 'ghost') {
    if (!sourceRef) throw new HttpsError('data-loss', 'arena_ghost_source_missing');
    const sourceSnap = await tx.get(sourceRef);
    const ghost = sourceSnap.data() ?? {};
    if (!sourceSnap.exists || ghost.toStableUid !== who.stableUid || ghost.status !== 'guest_playing'
      || ghost.guestRunId !== run.runId) throw new HttpsError('failed-precondition', 'arena_ghost_state_invalid');
    const guestPlan = Object.values(run.answers).map((answer: Json) => ({
      taskIndex: answer.taskIndex, correct: answer.correct === true,
      points: Math.max(0, Number(answer.points ?? 0)), elapsedMs: Math.max(0, Number(answer.elapsedMs ?? 0)),
    }));
    const hostPlan = Array.isArray(ghost.hostPlan) ? ghost.hostPlan : [];
    const hostScore = hostPlan.reduce((sum: number, row: Json) => sum + Math.max(0, Number(row.points ?? 0)), 0);
    const guestScore = guestPlan.reduce((sum: number, row: Json) => sum + Math.max(0, Number(row.points ?? 0)), 0);
    const result = {
      receiptId: receiptRef.id, noEconomy: true, ratingDelta: 0, starsEarned: 0,
      hostScore, guestScore, outcome: guestScore > hostScore ? 'win' : guestScore < hostScore ? 'loss' : 'draw',
      settledAtMs: now,
    };
    run.state = run.state === 'expired' ? 'expired' : 'settled'; run.terminal = true; run.result = result;
    tx.set(sourceRef, { status: 'complete', guestPlan, result, completedAtMs: now,
      expireAt: timestamp(now + 7 * DAY_MS) }, { merge: true });
    tx.set(profileRef, {
      ...(profileData.activeMatchId === run.runId ? { activeMatchId: null } : {}), updatedAtMs: now,
    }, { merge: true });
    tx.create(receiptRef, result);
    if (run.expansionFlags?.lab === true) tx.create(labRef, labRecord(run, tasks, now));
    tx.set(runRef, run);
    return result;
  }

  const dailyRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.dailyAttempts)
    .doc(arenaTodayDayKey(run.createdAtMs));
  const activityRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.activityDays)
    .doc(arenaTodayDayKey(run.createdAtMs));
  const exposed = Object.keys(run.answers).map(Number)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < tasks.length).sort((a, b) => a - b);
  const signatureRefs = (run.expansionFlags?.mastery === true ? exposed : [])
    .map((index) => userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.masterySignatures)
    .doc(arenaCanonicalTaskSignature(tasks[index])));
  const userRef = db.collection('users').doc(who.stableUid);
  const [seasonSnap, dailySnap, userSnap, ...signatureSnaps] = await Promise.all([
    tx.get(seasonRef), tx.get(dailyRef), tx.get(userRef), ...signatureRefs.map((ref) => tx.get(ref)),
  ]);
  const additions: Partial<Record<ArenaMasteryMode, ReturnType<typeof arenaMasteryObservation>[]>> = {};
  (run.expansionFlags?.mastery === true ? exposed : []).forEach((taskIndex, index) => {
    const task = tasks[taskIndex];
    const seenUntilMs = Number(signatureSnaps[index].data()?.expiresAtMs
      ?? signatureSnaps[index].data()?.expireAt?.toMillis?.() ?? 0);
    if (signatureSnaps[index].exists && seenUntilMs > now) return;
    const observation = arenaMasteryObservation(task, run.answers[String(taskIndex)] ?? {}, now - taskIndex);
    const mode = task.mode as ArenaMasteryMode;
    additions[mode] = [...(additions[mode] ?? []), observation];
  });
  const masteryApplied = arenaApplyMasteryObservations({
    current: profileData.mastery as ArenaMasteryProfileState | undefined,
    additions: run.expansionFlags?.mastery === true ? additions : {},
    lifetimeThresholdStars: Number(profileData.masteryThresholdStarsLifetime ?? 0),
  });
  const todayEarned = arenaTodayStars(run.totals.correct, run.totals.submittedAnswers);
  const masteryWalletAward = run.expansionFlags?.mastery === true ? masteryApplied.walletAward : 0;
  const walletAward = (run.expansionFlags?.wallet === true ? todayEarned : 0) + masteryWalletAward;
  const walletBefore = Math.max(0, Math.trunc(Number(profileData.starWalletBalance ?? 0)));
  const seasonData = seasonSnap.data() ?? {};
  const seasonStarsAfter = Math.max(0, Math.trunc(Number(seasonData.stars ?? 0))) + todayEarned;
  /**
   * Единый журнал звёзд (владелец D-05/D-06). Готовим операции здесь, до первой
   * записи в транзакции: Firestore требует, чтобы все чтения шли до всех
   * записей. Забег дня и пороги мастерства — две разные операции, поэтому
   * уходят одним пакетом: раздельные вызовы прочитали бы одно состояние и
   * второй затёр бы первый.
   */
  const starOps: StarOpRequest[] = [];
  if (run.expansionFlags?.wallet === true && todayEarned > 0) {
    starOps.push({
      opId: `arena_today:${run.runId}`,
      delta: todayEarned,
      reason: 'arena_today',
      sourceKind: 'arena_today',
      sourceId: run.runId,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: {
        correct: run.totals.correct,
        submitted: run.totals.submittedAnswers,
        runKind: String(run.runKind),
      },
    });
  }
  if (masteryWalletAward > 0) {
    starOps.push({
      opId: `arena_today_mastery:${run.runId}`,
      delta: masteryWalletAward,
      reason: 'arena_today_mastery',
      sourceKind: 'arena_today_mastery',
      sourceId: run.runId,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { thresholds: masteryApplied.newlyClaimed.join(',') },
    });
  }
  const starsPrepared = starOps.length
    ? await prepareStarOperations(tx, db, who.stableUid, userSnap, starOps, {
      nowMs: now,
      activeSeasonId: season.seasonId,
      weekKeyNow: arenaWeekKeyForMs(now),
      weekKeyForMs: arenaWeekKeyForMs,
      authUid: who.authUid ?? '',
    })
    : null;

  const result = {
    receiptId: receiptRef.id, starsEarned: todayEarned, masteryStarsEarned: masteryWalletAward,
    walletBalanceAfter: walletBefore + walletAward, seasonStarsAfter, ratingDelta: 0, spinAwarded: false,
    settledAtMs: now,
  };
  run.state = run.state === 'expired' ? 'expired' : 'settled'; run.terminal = true; run.result = result;
  if (starsPrepared) commitStarOperations(tx, starsPrepared);
  tx.set(profileRef, {
    starWalletBalance: walletBefore + walletAward,
    lifetimeWalletStarsEarned: Math.max(0, Number(profileData.lifetimeWalletStarsEarned ?? 0)) + walletAward,
    ...(run.expansionFlags?.mastery === true ? {
      masteryThresholdStarsLifetime: Math.max(0, Number(profileData.masteryThresholdStarsLifetime ?? 0))
        + masteryWalletAward,
      mastery: masteryApplied.mastery,
    } : {}),
    ...(profileData.activeMatchId === run.runId ? { activeMatchId: null } : {}),
    updatedAtMs: now,
  }, { merge: true });
  tx.set(seasonRef, {
    seasonId: season.seasonId, stars: seasonStarsAfter, level: Math.floor(seasonStarsAfter / 50),
    endsAtMs: season.endsAtMs, updatedAtMs: now,
  }, { merge: true });
  tx.set(dailyRef, {
    ...(dailySnap.data() ?? {}), status: run.state, runId: run.runId, starsEarned: todayEarned,
    masteryStarsEarned: masteryWalletAward, score: run.totals.score,
    correct: run.totals.correct, submittedAnswers: run.totals.submittedAnswers, completedAtMs: now,
  }, { merge: true });
  if (run.expansionFlags?.partner === true && run.totals.submittedAnswers >= 8) tx.set(activityRef, {
    dayKey: arenaTodayDayKey(run.createdAtMs), today: true, qualifying: true, updatedAtMs: now,
    expireAt: timestamp(now + 45 * DAY_MS),
  }, { merge: true });
  signatureRefs.forEach((ref, index) => {
    const seenUntilMs = Number(signatureSnaps[index].data()?.expiresAtMs
      ?? signatureSnaps[index].data()?.expireAt?.toMillis?.() ?? 0);
    if (!signatureSnaps[index].exists || seenUntilMs <= now) tx.set(ref, {
      signature: ref.id, firstSeenAtMs: now, lastSeenAtMs: now,
      expiresAtMs: now + ARENA_MASTERY_SIGNATURE_TTL_MS,
      expireAt: timestamp(now + ARENA_MASTERY_SIGNATURE_TTL_MS),
    });
  });
  if (run.expansionFlags?.wallet === true && todayEarned > 0) tx.create(userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.starLedger)
    .doc(`today_${run.sourceId}`), {
    kind: 'today_earn', sourceId: run.sourceId, delta: todayEarned,
    balanceAfter: walletBefore + todayEarned, createdAtMs: now, expireAt: timestamp(now + 400 * DAY_MS),
  });
  if (masteryWalletAward > 0) tx.create(userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.starLedger)
    .doc(`mastery_${run.runId}`), {
    kind: 'mastery_thresholds', sourceId: run.runId, delta: masteryWalletAward,
    thresholds: masteryApplied.newlyClaimed, balanceAfter: walletBefore + walletAward,
    createdAtMs: now, expireAt: timestamp(now + 400 * DAY_MS),
  });
  tx.create(receiptRef, result);
  if (run.expansionFlags?.lab === true) tx.create(labRef, labRecord(run, tasks, now));
  tx.set(runRef, run);
  return result;
}

async function loadRunSource(
  tx: admin.firestore.Transaction,
  run: ExpansionRun,
): Promise<{ tasks: TournamentTask[]; sourceRef: admin.firestore.DocumentReference }> {
  const sourceRef = run.runKind === 'today'
    ? db.collection(ARENA_EXPANSION_COLLECTIONS.dailyPrivate).doc(run.sourceId)
    : db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts).doc(run.sourceId);
  if (Array.isArray(run.tasks) && run.tasks.length === 10) return { tasks: run.tasks, sourceRef };
  const sourceSnap = await tx.get(sourceRef);
  if (!sourceSnap.exists || !Array.isArray(sourceSnap.data()?.tasks) || sourceSnap.data()!.tasks.length !== 10) {
    throw new HttpsError('data-loss', 'arena_run_source_invalid');
  }
  return { tasks: sourceSnap.data()!.tasks as TournamentTask[], sourceRef };
}

export const arenaExpansionHome = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'home', true);
  const now = nowMs();
  const dayKey = arenaTodayDayKey(now);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const season = arenaSeasonWindow(now);
  const profileSnap = await profileRef.get();
  const activeExpansionRunId = /^(today|ghost)_/.test(String(profileSnap.data()?.activeMatchId ?? ''))
    ? String(profileSnap.data()?.activeMatchId) : '';
  // One official attempt per UTC day. The selected band/snapshot is frozen in the marker.
  const todayId = dayKey;
  const [seasonSnap, todaySnap, partnerDocs, ghostDocs, seriesDocs, activeRunSnap] = await Promise.all([
    userSubcollection(who.stableUid, ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId).get(),
    userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.dailyAttempts).doc(todayId).get(),
    Promise.all([
      db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'active').limit(5).get(),
      db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'pending')
        .where('expiresAtMs', '>', now).limit(5).get(),
    ]).then((rows) => rows.flatMap((row) => row.docs).slice(0, 5)),
    Promise.all([
      db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'guest_playing').limit(10).get(),
      db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'awaiting_guest')
        .where('expiresAtMs', '>', now).limit(10).get(),
    ]).then((rows) => rows.flatMap((row) => row.docs).slice(0, 10)),
    Promise.all([
      db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', who.stableUid)
        .where('status', 'in', ['active', 'between_games']).limit(5).get(),
      db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'pending')
        .where('offerExpiresAtMs', '>', now).limit(5).get(),
    ]).then((rows) => rows.flatMap((row) => row.docs).slice(0, 5)),
    activeExpansionRunId
      ? userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.runs).doc(activeExpansionRunId).get()
      : Promise.resolve(null),
  ]);
  if (activeExpansionRunId && activeRunSnap && !activeRunSnap.exists) {
    await db.runTransaction(async (tx) => {
      const runRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.runs).doc(activeExpansionRunId);
      const [freshProfile, freshRun] = await Promise.all([tx.get(profileRef), tx.get(runRef)]);
      if (!freshRun.exists && freshProfile.data()?.activeMatchId === activeExpansionRunId) {
        tx.set(profileRef, { activeMatchId: null, updatedAtMs: now }, { merge: true });
      }
    });
  }
  const profile = profileSnap.data() ?? {};
  const config = who.config;
  const todayData = todaySnap.data() ?? {};
  const todayStatus = todaySnap.exists
    ? todayData.status === 'active' ? 'in_progress' : todayData.status === 'settled' ? 'complete'
      : todayData.status === 'expired' ? 'expired' : 'available'
    : 'available';
  const partnerRows = partnerDocs.map((doc) => {
    const data = doc.data();
    const viewerIsFrom = data.fromStableUid === who.stableUid;
    const state = data.status === 'pending' ? (viewerIsFrom ? 'invited' : 'invited')
      : data.status === 'active' && Object.values(data.pausedBy ?? {}).some(Boolean) ? 'paused'
        : data.status;
    const claimed = data.claimedThresholdsByUid?.[who.stableUid] ?? [];
    return {
      partnershipId: doc.id, state,
      direction: data.status === 'pending' ? (viewerIsFrom ? 'outgoing' : 'incoming') : 'active',
      partnerName: viewerIsFrom ? data.toName ?? 'Arena Partner' : data.fromName ?? 'Arena Partner',
      ...(viewerIsFrom ? data.toAvatar ? { partnerAvatar: data.toAvatar } : {}
        : data.fromAvatar ? { partnerAvatar: data.fromAvatar } : {}),
      sharedDays: Math.max(0, Number(data.sharedDays ?? 0)), targetSharedDays: 7,
      paused: Object.values(data.pausedBy ?? {}).some(Boolean),
      pausedByViewer: data.pausedBy?.[who.stableUid] === true,
      pausedByOther: data.pausedBy?.[viewerIsFrom ? data.toStableUid : data.fromStableUid] === true,
      nudgeEnabled: data.nudgeEnabledByUid?.[viewerIsFrom ? data.toStableUid : data.fromStableUid] === true,
      claimedSharedDayThresholds: claimed,
      spotlightAvailable: (Number(data.sharedDays ?? 0) >= 3 && !claimed.includes(3))
        || (Number(data.sharedDays ?? 0) >= 5 && !claimed.includes(5)),
    };
  });
  const rivalRows = seriesDocs.map((doc) => {
    const data = doc.data(); const viewerSeat = data.stableUidBySeat?.a === who.stableUid ? 'a' : 'b';
    const opponentSeat = viewerSeat === 'a' ? 'b' : 'a';
    const wins = data.wins ?? { a: 0, b: 0 };
    return {
      rivalryId: doc.id, opponentName: data.playerBySeat?.[opponentSeat]?.name ?? 'Arena Rival',
      ...(data.playerBySeat?.[opponentSeat]?.avatar ? { opponentAvatar: data.playerBySeat[opponentSeat].avatar } : {}),
      state: data.status === 'pending'
        ? data.proposerStableUid === who.stableUid ? 'awaiting' : 'invited'
        : data.status === 'between_games' ? 'active' : data.status ?? 'awaiting',
      viewerWins: Number(wins[viewerSeat] ?? 0), opponentWins: Number(wins[opponentSeat] ?? 0),
      gamesPlayed: Number(data.gamesPlayed ?? 0),
      gamesToWin: 2, ...(data.activeMatchId ? { nextMatchId: data.activeMatchId } : {}),
      muted: profile.rivalMutedPairs?.[data.pairId] === true,
      ...(data.expiresAtMs ? { expiresAtMs: data.expiresAtMs } : {}),
    };
  });
  return {
    ok: true,
    availability: {
      enabled: config.enabled === true && config.arenaExpansionEnabled === true,
      today: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaTodayEnabled === true,
      lab: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaMatchLabEnabled === true,
      mastery: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaMasteryEnabled === true,
      ghost: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaGhostEnabled === true,
      rival: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaRivalEnabled === true
        && config.arenaRivalRuntimeVersion === 'arena-rival.v1',
      partner: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaPartnerEnabled === true,
      store: config.enabled === true && config.arenaExpansionEnabled === true && config.arenaStarStoreEnabled === true
        && config.arenaCosmeticCatalogVersion === ARENA_EXPANSION_CATALOG_VERSION,
    },
    walletStars: Math.max(0, Math.trunc(Number(profile.starWalletBalance ?? 0))),
    seasonStarsEarned: Math.max(0, Math.trunc(Number(seasonSnap.data()?.stars ?? 0))),
    mastery: compactMastery(profile.mastery),
    today: { dayKey, band: String(todaySnap.exists ? todayData.band : arenaTodayBand(Number(profile.rank ?? 0))), status: todayStatus,
      matchId: todayData.runId, starsEarned: todayData.starsEarned,
      completedTasks: todayStatus === 'complete' ? 10 : 0 },
    partners: partnerRows,
    partnerPreferences: {
      nudgesEnabled: who.user.arenaPartnerNudgesEnabled === true,
      quietHoursUtc: who.user.arenaPartnerQuietHoursUtc ?? null,
    },
    ghosts: ghostDocs.map((doc) => ({ ghostId: doc.id, status: doc.data().status,
      expiresAtMs: Number(doc.data().expiresAtMs ?? 0), opponentKind: 'recording', noEconomy: true })),
    rivals: rivalRows,
    equippedBySlot: profile.equippedCosmetics ?? {},
    store: { catalogVersion: ARENA_EXPANSION_CATALOG_VERSION },
    ...(activeRunSnap?.exists ? { activeRun: arenaExpansionRunResponse(activeRunSnap.data() as ExpansionRun) } : {}),
  };
});

export const arenaTodayStart = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'today');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const now = nowMs();
  const dayKey = arenaTodayDayKey(now);
  if (request.data?.dayKey !== undefined && request.data.dayKey !== dayKey) {
    throw new HttpsError('failed-precondition', 'arena_today_day_not_current');
  }
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const queueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
  const output = await db.runTransaction(async (tx) => {
    const [profileSnap, queueSnap] = await Promise.all([tx.get(profileRef), tx.get(queueRef)]);
    const profile = profileSnap.data() ?? {};
    const band = arenaTodayBand(Number(profile.rank ?? arenaRankIndexFromRp(Number(profile.rating ?? 0))));
    const snapshotId = arenaTodaySnapshotId(dayKey, band);
    const snapshotRef = db.collection(ARENA_EXPANSION_COLLECTIONS.dailyPrivate).doc(snapshotId);
    const markerRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.dailyAttempts).doc(dayKey);
    const runId = `today_${dayKey}`;
    const runRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.runs).doc(runId);
    const [snapshotSnap, markerSnap, runSnap] = await Promise.all([
      tx.get(snapshotRef), tx.get(markerRef), tx.get(runRef),
    ]);
    if (markerSnap.exists) {
      if (markerSnap.data()?.runId !== runId || !runSnap.exists) {
        throw new HttpsError('data-loss', 'arena_today_attempt_invalid');
      }
      return { run: runSnap.data() as ExpansionRun,
        snapshotId: String(markerSnap.data()?.snapshotId), band: Number(markerSnap.data()?.band) };
    }
    if (runSnap.exists) throw new HttpsError('data-loss', 'arena_today_attempt_marker_missing');
    if (profile.activeMatchId && profile.activeMatchId !== runId) {
      throw new HttpsError('already-exists', 'arena_active_match_exists');
    }
    const queue = queueSnap.data() ?? {};
    if (queue.status === 'matched') throw new HttpsError('failed-precondition', 'arena_queue_already_matched');
    let tasks: TournamentTask[];
    if (snapshotSnap.exists) {
      tasks = snapshotSnap.data()?.tasks as TournamentTask[];
    } else {
      tasks = await loadExpansionTaskPool(tx, band * 6, snapshotId);
      tx.create(snapshotRef, {
        schemaVersion: 'arena-today-snapshot.v1', snapshotId, dayKey, band,
        publication: { poolVersion: NEW_TOURNAMENT_POOL_VERSION,
          contentSha256: NEW_TOURNAMENT_POOL_CONTENT_SHA256,
          merkleRootSha256: NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256 },
        tasks, createdAtMs: now, expireAt: timestamp(now + 8 * DAY_MS),
      });
    }
    if (!Array.isArray(tasks) || tasks.length !== 10) throw new HttpsError('data-loss', 'arena_today_snapshot_invalid');
    const run = makeExpansionRun({ runId, runKind: 'today', owner: who, sourceId: snapshotId, tasks, now });
    tx.create(runRef, run);
    tx.set(markerRef, {
      schemaVersion: 'arena-today-attempt.v1', snapshotId, dayKey, band, runId,
      requestId, status: 'active', startedAtMs: now, hardExpiresAtMs: run.hardExpiresAtMs,
    });
    tx.set(profileRef, { activeMatchId: runId, updatedAtMs: now }, { merge: true });
    if (queue.status === 'waiting') tx.set(queueRef, {
      status: 'cancelled', closeReason: 'today_start', cancelledAtMs: now, leaseExpiresAt: 0,
    }, { merge: true });
    return { run, snapshotId, band };
  });
  return arenaExpansionRunResponse(output.run, {
    official: true, dayKey, band: output.band, snapshotId: output.snapshotId,
    viewerSeat: 'a', opponentKind: 'none', syntheticKind: 'none', requestId,
  });
});

async function mutateRun(
  request: { auth?: { uid?: string }; data?: Json },
  mutation: 'answer' | 'speed' | 'sync',
): Promise<Json> {
  const who = await expansionActor(request, 'today', true);
  const runId = safeId(request.data?.runId ?? request.data?.matchId, 'run_id');
  const runRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.runs).doc(runId);
  const now = nowMs();
  return db.runTransaction(async (tx) => {
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists) throw new HttpsError('not-found', 'arena_run_missing');
    const run = clone(runSnap.data()!) as ExpansionRun;
    assertRunOwner(run, who);
    const { tasks, sourceRef } = await loadRunSource(tx, run);
    advanceExpansionRun(run, tasks, now);
    let verdict: Json = {};
    if (!run.terminal && mutation === 'answer') {
      const submissionId = safeId(request.data?.submissionId, 'submission_id');
      const taskIndex = integer(request.data?.taskIndex, 'task_index', 0, 9);
      const answer = request.data?.answer;
      if (Buffer.byteLength(JSON.stringify(answer ?? null), 'utf8') > 8 * 1_024) {
        throw new HttpsError('invalid-argument', 'answer_too_large');
      }
      const answerHash = hash(JSON.stringify(answer ?? null));
      const existing = run.answers[String(taskIndex)];
      if (existing) {
        if (existing.submissionId !== submissionId || existing.answerHash !== answerHash) {
          throw new HttpsError('already-exists', 'arena_answer_conflict');
        }
        verdict = { correct: existing.correct, points: existing.points };
      } else {
        if (run.state !== 'task_active' || run.currentTaskIndex !== taskIndex) {
          throw new HttpsError('failed-precondition', 'arena_task_not_active');
        }
        if (now < run.readingEndsAtMs) throw new HttpsError('failed-precondition', 'arena_task_reading');
        const task = tasks[taskIndex];
        if (task.mode === 'speed_match') throw new HttpsError('invalid-argument', 'arena_speed_attempt_required');
        const scored = scoreArenaAnswer(task, answer);
        const receipt = {
          taskIndex, submissionId, answerHash, answerSnapshot: arenaSanitizeAnswerSnapshot(answer),
          correct: scored.correct, submitted: true, points: scored.points,
          taskStars: arenaTaskStars({ task, correct: scored.correct }),
          elapsedMs: arenaObservedElapsedMs(now, run.readingEndsAtMs, task.mode as any), receivedAtMs: now,
        };
        storeRunReceipt(run, receipt); revealRunTask(run, now);
        verdict = { correct: receipt.correct, points: receipt.points };
      }
    } else if (!run.terminal && mutation === 'speed') {
      const submissionId = safeId(request.data?.submissionId, 'submission_id');
      const taskIndex = integer(request.data?.taskIndex, 'task_index', 0, 9);
      const pairIndex = integer(request.data?.pairIndex, 'pair_index', 0, 3);
      const selectedIndex = integer(request.data?.selectedIndex, 'selected_index', 0, 3);
      const replay = run.speedAttempts[submissionId];
      if (replay) {
        if (replay.taskIndex !== taskIndex || replay.pairIndex !== pairIndex || replay.selectedIndex !== selectedIndex) {
          throw new HttpsError('already-exists', 'arena_answer_conflict');
        }
        verdict = { correct: replay.correct, points: replay.points };
      } else {
        if (run.state !== 'task_active' || run.currentTaskIndex !== taskIndex) {
          throw new HttpsError('failed-precondition', 'arena_task_not_active');
        }
        if (now < run.readingEndsAtMs) throw new HttpsError('failed-precondition', 'arena_task_reading');
        if (Object.keys(run.speedAttempts).length >= MAX_SPEED_ATTEMPTS) {
          throw new HttpsError('resource-exhausted', 'arena_speed_attempt_limit');
        }
        const task = tasks[taskIndex];
        if (task.mode !== 'speed_match') throw new HttpsError('invalid-argument', 'arena_speed_task_required');
        let applied;
        try { applied = applySpeedMatchAttempt(task,
          decodeArenaSpeedProgress(run.speedProgress[String(taskIndex)]), pairIndex, selectedIndex); }
        catch { throw new HttpsError('invalid-argument', 'arena_speed_attempt_invalid'); }
        run.speedProgress[String(taskIndex)] = encodeArenaSpeedProgress(applied.progress)!;
        const points = scoreArenaSpeedProgress(applied.progress);
        run.speedAttempts[submissionId] = { taskIndex, pairIndex, selectedIndex, correct: applied.correct, points };
        if (applied.completed) {
          storeRunReceipt(run, {
            taskIndex, submissionId: `complete_${submissionId}`, correct: true, submitted: true, points,
            taskStars: arenaTaskStars({ task, correct: true, speedProgress: applied.progress }),
            elapsedMs: arenaObservedElapsedMs(now, run.readingEndsAtMs, 'speed_match'),
            answerSnapshot: encodeArenaSpeedProgress(applied.progress), receivedAtMs: now,
          });
          revealRunTask(run, now);
        }
        verdict = { correct: applied.correct, points };
      }
    }
    if (run.terminal) {
      const result = await settleExpansionRun(tx, runRef, run, tasks, who, now,
        run.runKind === 'ghost' ? sourceRef : undefined);
      return arenaExpansionRunResponse(run, { ...verdict, viewerReward: result });
    }
    tx.set(runRef, run);
    return arenaExpansionRunResponse(run, verdict);
  });
}

export const arenaTodaySubmitAnswer = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, (request) => mutateRun(request, 'answer'));
export const arenaTodaySubmitSpeedAttempt = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, (request) => mutateRun(request, 'speed'));
export const arenaTodaySync = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, (request) => mutateRun(request, 'sync'));

export const arenaMatchLabGet = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'lab', true);
  const requestedId = request.data?.matchId ?? request.data?.sourceRunId;
  let snap: admin.firestore.DocumentSnapshot | null = null;
  if (requestedId) {
    const matchId = safeId(requestedId, 'match_id');
    snap = await userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.matchLabs).doc(matchId).get();
  } else {
    const latest = await userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.matchLabs)
      .orderBy('createdAtMs', 'desc').limit(1).get();
    snap = latest.docs[0] ?? null;
  }
  if (!snap?.exists) return { ok: true, plan: {
    recommendedMode: request.data?.mode ?? 'guess_phrase',
    modes: (['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const)
      .map((mode) => ({ mode, sampleCount: 0, available: false })),
  } };
  const matchId = snap.id;
  const data = snap.data() ?? {};
  if (data.expireAt?.toMillis?.() <= nowMs()) throw new HttpsError('not-found', 'arena_match_lab_expired');
  const retryIndexes = Array.isArray(data.retryTaskIndexes) ? data.retryTaskIndexes.slice(0, 3) : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const recoveryTasks = retryIndexes.map((index: number) => tasks[index]).filter(Boolean).map((row: Json) => ({
    publicTask: row.publicTask, correctAnswer: row.solution,
  }));
  const questions = tasks.map((row: Json) => ({
    taskIndex: Number(row.taskIndex ?? 0), mode: row.mode,
    verdict: row.correct === true ? 'correct' : row.answerSnapshot ? 'incorrect' : 'unanswered',
    elapsedMs: row.elapsedMs,
    explanation: row.explanation?.ruleNote ?? row.explanation?.example,
  }));
  const requestedMode = request.data?.mode;
  const recommendedMode = typeof requestedMode === 'string' ? requestedMode
    : (questions.find((row: Json) => row.verdict !== 'correct')?.mode ?? 'guess_phrase');
  return { ok: true, plan: {
    recommendedMode,
    modes: (['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const)
      .map((mode) => { const rows = questions.filter((row: Json) => row.mode === mode); return {
        mode, sampleCount: rows.length, accuracy: rows.length
          ? Math.round(100 * rows.filter((row: Json) => row.verdict === 'correct').length / rows.length) : undefined,
        available: rows.length > 0,
      }; }),
    review: { sourceRunId: matchId, questions, recoveryTasks },
  } };
});

export const arenaStarStore = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'store', true);
  const season = arenaSeasonWindow(nowMs());
  const [profileSnap, ownedSnap, seasonSnap] = await Promise.all([
    db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid).get(),
    userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.entitlements).limit(100).get(),
    userSubcollection(who.stableUid, ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId).get(),
  ]);
  const profile = profileSnap.data() ?? {};
  const owned = new Set(ownedSnap.docs.map((doc) => doc.id));
  const equipped = profile.equippedCosmetics ?? {};
  const wallet = {
    walletStars: Math.max(0, Math.trunc(Number(profile.starWalletBalance ?? 0))),
    seasonStarsEarned: Math.max(0, Math.trunc(Number(seasonSnap.data()?.stars ?? 0))),
    equippedBySlot: equipped,
  };
  return {
    ok: true, catalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
    wallet,
    items: ARENA_COSMETIC_CATALOG.map((item) => ({
      sku: item.itemId, titleKey: `arena.store.${item.itemId}.title`,
      descriptionKey: `arena.store.${item.itemId}.description`, title: item.itemId,
      category: item.slot, slot: item.slot, priceStars: item.price,
      owned: owned.has(item.itemId), equipped: equipped[item.slot] === item.itemId, available: true,
    })),
  };
});

export const arenaStarPurchase = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'store');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const itemId = safeId(request.data?.itemId, 'item_id');
  const item = arenaCatalogItem(itemId);
  if (!item) throw new HttpsError('invalid-argument', 'arena_store_item_invalid');
  if (request.data?.catalogVersion !== ARENA_EXPANSION_CATALOG_VERSION) {
    throw new HttpsError('failed-precondition', 'arena_store_catalog_stale');
  }
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const entitlementRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.entitlements).doc(itemId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`purchase_${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const userRef = db.collection('users').doc(who.stableUid);
    const [profileSnap, entitlementSnap, receiptSnap, userSnap] = await Promise.all([
      tx.get(profileRef), tx.get(entitlementRef), tx.get(receiptRef), tx.get(userRef),
    ]);
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.operation !== 'purchase' || receiptSnap.data()?.itemId !== itemId
        || receiptSnap.data()?.catalogVersion !== ARENA_EXPANSION_CATALOG_VERSION) {
        throw new HttpsError('already-exists', 'arena_store_request_conflict');
      }
      return receiptSnap.data()!;
    }
    const profile = profileSnap.data() ?? {};
    const balance = Math.max(0, Math.trunc(Number(profile.starWalletBalance ?? 0)));
    if (entitlementSnap.exists) {
      const replay = { receiptId: receiptRef.id, operation: 'purchase', itemId,
        slot: item.slot, catalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
        status: 'already_owned', alreadyOwned: true, balanceAfter: balance };
      tx.create(receiptRef, replay);
      return replay;
    }
    if (balance < item.price) throw new HttpsError('failed-precondition', 'arena_store_insufficient_stars');
    const balanceAfter = balance - item.price;
    const purchasedAtMs = nowMs();
    /**
     * Списание идёт через единый журнал звёзд (владелец D-05/D-06): трата
     * уменьшает тратимый баланс и НЕ трогает счётчик заработанного за всё
     * время, который открывает награды (D-10).
     *
     * Ключ дедупликации — предмет и версия каталога, а не requestId клиента:
     * повторная покупка того же предмета отсекается правом владения выше, а
     * стабильный ключ переживает переустановку приложения.
     */
    const purchaseSeason = arenaSeasonWindow(purchasedAtMs);
    const purchasePrepared = await prepareStarOperations(tx, db, who.stableUid, userSnap, [{
      opId: `spend_shop:${itemId}_${ARENA_EXPANSION_CATALOG_VERSION}`,
      delta: -item.price,
      reason: 'spend_shop',
      sourceKind: 'spend_shop',
      sourceId: `${itemId}_${ARENA_EXPANSION_CATALOG_VERSION}`,
      ruleVersion: 1,
      earnedAtMs: purchasedAtMs,
      meta: { itemId, slot: item.slot, price: item.price },
    }], {
      nowMs: purchasedAtMs,
      activeSeasonId: purchaseSeason.seasonId,
      weekKeyNow: arenaWeekKeyForMs(purchasedAtMs),
      weekKeyForMs: arenaWeekKeyForMs,
      authUid: who.authUid ?? '',
    });
    const resultDoc = { receiptId: receiptRef.id, operation: 'purchase', itemId, slot: item.slot,
      catalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
      status: 'purchased', price: item.price, balanceAfter, purchasedAtMs };
    commitStarOperations(tx, purchasePrepared);
    tx.set(profileRef, {
      starWalletBalance: balanceAfter,
      lifetimeWalletStarsSpent: Math.max(0, Number(profile.lifetimeWalletStarsSpent ?? 0)) + item.price,
      updatedAtMs: resultDoc.purchasedAtMs,
    }, { merge: true });
    tx.create(entitlementRef, { ...resultDoc, catalogVersion: ARENA_EXPANSION_CATALOG_VERSION });
    tx.create(userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.starLedger).doc(`purchase_${requestId}`), {
      kind: 'cosmetic_purchase', itemId, delta: -item.price, balanceAfter,
      createdAtMs: resultDoc.purchasedAtMs, expireAt: timestamp(resultDoc.purchasedAtMs + 400 * DAY_MS),
    });
    tx.create(receiptRef, resultDoc);
    return resultDoc;
  });
  const season = arenaSeasonWindow(nowMs());
  const seasonSnap = await userSubcollection(who.stableUid, ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId).get();
  return { ok: true, ...result,
    entitlement: { itemId, slot: item.slot },
    wallet: { walletStars: result.balanceAfter,
      seasonStarsEarned: Math.max(0, Number(seasonSnap.data()?.stars ?? 0)), equippedBySlot: {} },
    item: { sku: item.itemId, title: item.itemId, titleKey: `arena.store.${item.itemId}.title`,
      category: item.slot, slot: item.slot, priceStars: item.price, owned: true, equipped: false, available: true },
  };
});

export const arenaStarEquip = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'store');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const itemId = safeId(request.data?.itemId, 'item_id');
  const slot = arenaCosmeticSlot(request.data?.slot);
  const item = arenaCatalogItem(itemId);
  if (!slot || !item || item.slot !== slot) throw new HttpsError('invalid-argument', 'arena_store_slot_invalid');
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const entitlementRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.entitlements).doc(itemId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`equip_${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const [profileSnap, entitlementSnap, receiptSnap] = await Promise.all([
      tx.get(profileRef), tx.get(entitlementRef), tx.get(receiptRef),
    ]);
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.operation !== 'equip' || receiptSnap.data()?.itemId !== itemId
        || receiptSnap.data()?.slot !== slot) throw new HttpsError('already-exists', 'arena_store_request_conflict');
      return receiptSnap.data()!;
    }
    if (!entitlementSnap.exists) throw new HttpsError('failed-precondition', 'arena_store_item_not_owned');
    const equipped = { ...(profileSnap.data()?.equippedCosmetics ?? {}), [slot]: itemId };
    const resultDoc = { receiptId: receiptRef.id, operation: 'equip', slot, itemId, equippedAtMs: nowMs() };
    tx.set(profileRef, { equippedCosmetics: equipped, updatedAtMs: resultDoc.equippedAtMs }, { merge: true });
    tx.create(receiptRef, resultDoc);
    return resultDoc;
  });
  return { ok: true, ...result };
});

function socialKey(): string {
  const key = String(process.env.ARENA_V2_INVITE_HMAC_KEY ?? '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'arena_social_key_unavailable');
  return key;
}

function pairId(left: string, right: string): string {
  return createHmac('sha256', socialKey()).update([left, right].sort().join('|')).digest('hex');
}

function socialToken(kind: 'ghost' | 'partner', id: string, targetAuthUid: string): string {
  const signature = createHmac('sha256', socialKey()).update(`${kind}|${id}|${targetAuthUid}`).digest('base64url');
  return `${id}${signature}`;
}

function ghostToken(ghostId: string, targetAuthUid: string): string {
  return createHmac('sha256', socialKey())
    .update(`ghost-capability.v1|${ghostId}|${targetAuthUid}`).digest('base64url');
}

async function ghostRefForToken(inviteToken: string): Promise<admin.firestore.DocumentReference> {
  const matches = await db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
    .where('inviteTokenHash', '==', hash(inviteToken)).limit(2).get();
  if (matches.size !== 1) throw new HttpsError('not-found', 'arena_ghost_missing');
  return matches.docs[0].ref;
}

function tokenDocumentId(token: string): string {
  const id = token.slice(0, 64); const signature = token.slice(64);
  if (!/^[a-f0-9]{64}$/.test(id) || !/^[A-Za-z0-9_-]{20,}$/.test(signature)) {
    throw new HttpsError('invalid-argument', 'arena_social_token_invalid');
  }
  return id;
}

function assertAvailableUser(data: Json, authUid?: string): void {
  if (!data || data.hidden === true || data.deleted === true || data.banned === true
    || (authUid && data.firebaseAuthUid !== authUid)) {
    throw new HttpsError('failed-precondition', 'arena_social_target_unavailable');
  }
}

function inPartnerQuietHours(user: Json, now: number): boolean {
  const quiet = user.arenaPartnerQuietHoursUtc;
  if (!quiet || !Number.isInteger(quiet.startHour) || !Number.isInteger(quiet.endHour)) return false;
  const hour = new Date(now).getUTCHours();
  const start = Math.max(0, Math.min(23, Number(quiet.startHour)));
  const end = Math.max(0, Math.min(23, Number(quiet.endHour)));
  return start === end || (start < end ? hour >= start && hour < end : hour >= start || hour < end);
}

function partnerSummary(id: string, data: Json, viewerStableUid: string): Json {
  const viewerIsFrom = data.fromStableUid === viewerStableUid;
  const paused = Object.values(data.pausedBy ?? {}).some(Boolean);
  const state = data.status === 'active' && paused ? 'paused' : data.status === 'pending' ? 'invited' : data.status;
  const claimed = data.claimedThresholdsByUid?.[viewerStableUid] ?? [];
  return {
    partnershipId: id, state,
    direction: data.status === 'pending' ? (viewerIsFrom ? 'outgoing' : 'incoming') : 'active',
    partnerName: viewerIsFrom ? data.toName ?? 'Arena Partner' : data.fromName ?? 'Arena Partner',
    ...(viewerIsFrom ? data.toAvatar ? { partnerAvatar: data.toAvatar } : {}
      : data.fromAvatar ? { partnerAvatar: data.fromAvatar } : {}),
    sharedDays: Math.max(0, Number(data.sharedDays ?? 0)), targetSharedDays: 7,
    paused,
    pausedByViewer: data.pausedBy?.[viewerStableUid] === true,
    pausedByOther: data.pausedBy?.[viewerIsFrom ? data.toStableUid : data.fromStableUid] === true,
    nudgeEnabled: data.nudgeEnabledByUid?.[viewerIsFrom ? data.toStableUid : data.fromStableUid] === true,
    claimedSharedDayThresholds: claimed,
    spotlightAvailable: (Number(data.sharedDays ?? 0) >= 3 && !claimed.includes(3))
      || (Number(data.sharedDays ?? 0) >= 5 && !claimed.includes(5)),
    ...(data.badgeExpiresAtMs > nowMs() ? { badgeExpiresAtMs: data.badgeExpiresAtMs } : {}),
  };
}

function hostPlanFromEvidence(tasks: readonly TournamentTask[], evidence: Record<string, Json>): Json[] {
  return tasks.map((task, index) => {
    const row = evidence[String(index)] ?? {};
    return {
      taskIndex: index, taskSignature: arenaCanonicalTaskSignature(task),
      correct: row.correct === true, points: Math.max(0, Number(row.points ?? 0)),
      elapsedMs: Math.max(0, Number(row.elapsedMs ?? 0)),
      timedOut: row.timedOut === true,
    };
  });
}

export const arenaGhostCreate = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'ghost');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const friendStableUid = safeId(request.data?.friendStableUid, 'friend_stable_uid');
  const sourceKind = request.data?.sourceKind === 'arena_today' ? 'today'
    : request.data?.sourceKind === 'arena_match' ? 'match' : null;
  const sourceRunId = safeId(request.data?.sourceRunId ?? request.data?.sourceMatchId, 'source_run_id');
  if (!sourceKind || friendStableUid === who.stableUid) throw new HttpsError('invalid-argument', 'arena_ghost_source_invalid');
  const now = nowMs();
  const targetUserRef = db.collection('users').doc(friendStableUid);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const ownFriendRef = db.collection('users').doc(who.stableUid).collection('friends').doc(friendStableUid);
  const targetFriendRef = db.collection('users').doc(friendStableUid).collection('friends').doc(who.stableUid);
  const ghostId = hash(`${who.stableUid}|${friendStableUid}|${sourceKind}|${sourceRunId}|${requestId}`);
  const ghostRef = db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts).doc(ghostId);
  const canonicalPairId = pairId(who.stableUid, friendStableUid);
  const result = await db.runTransaction(async (tx) => {
    const [ghostSnap, targetUserSnap, ownFriendSnap, targetFriendSnap,
      outgoingPlaying, outgoingAwaiting, pairPlaying, pairAwaiting, profileSnap] = await Promise.all([
      tx.get(ghostRef), tx.get(targetUserRef), tx.get(ownFriendRef), tx.get(targetFriendRef),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('fromStableUid', '==', who.stableUid)
        .where('status', '==', 'guest_playing').limit(10)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('fromStableUid', '==', who.stableUid)
        .where('status', '==', 'awaiting_guest').where('expiresAtMs', '>', now).limit(10)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('pairId', '==', canonicalPairId).where('status', '==', 'guest_playing').limit(1)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('pairId', '==', canonicalPairId).where('status', '==', 'awaiting_guest')
        .where('expiresAtMs', '>', now).limit(1)),
      tx.get(profileRef),
    ]);
    const targetUser = targetUserSnap.data() ?? {};
    assertAvailableUser(targetUser);
    if (!ownFriendSnap.exists || !targetFriendSnap.exists) {
      throw new HttpsError('failed-precondition', 'arena_friendship_required');
    }
    const targetAuthUid = String(targetUser.firebaseAuthUid ?? '').trim();
    if (!targetAuthUid) throw new HttpsError('failed-precondition', 'arena_social_target_unavailable');
    const token = ghostToken(ghostId, targetAuthUid);
    if (ghostSnap.exists) {
      const existing = ghostSnap.data() ?? {};
      if (existing.fromStableUid !== who.stableUid || existing.toStableUid !== friendStableUid
        || existing.requestId !== requestId
        || hash(token) !== existing.inviteTokenHash) throw new HttpsError('already-exists', 'arena_ghost_conflict');
      return { ghost: existing, token };
    }
    if (!pairPlaying.empty || !pairAwaiting.empty) {
      throw new HttpsError('already-exists', 'arena_ghost_pair_active');
    }
    if (outgoingPlaying.size + outgoingAwaiting.size >= 3) {
      throw new HttpsError('resource-exhausted', 'arena_ghost_active_limit');
    }
    const profile = profileSnap.data() ?? {};
    const dayKey = arenaTodayDayKey(now);
    const createdToday = profile.ghostCreateDay === dayKey ? Math.max(0, Number(profile.ghostCreatedToday ?? 0)) : 0;
    if (createdToday >= 10) throw new HttpsError('resource-exhausted', 'arena_ghost_daily_limit');
    let tasks: TournamentTask[];
    let evidence: Record<string, Json>;
    if (sourceKind === 'today') {
      const sourceRunRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.runs).doc(sourceRunId);
      const sourceRunSnap = await tx.get(sourceRunRef);
      if (!sourceRunSnap.exists) throw new HttpsError('not-found', 'arena_ghost_source_missing');
      const sourceRun = sourceRunSnap.data() as ExpansionRun;
      assertRunOwner(sourceRun, who);
      if (!sourceRun.terminal || sourceRun.state !== 'settled' || sourceRun.runKind !== 'today'
        || Object.keys(sourceRun.answers).length !== 10) {
        throw new HttpsError('failed-precondition', 'arena_ghost_source_not_settled');
      }
      tasks = sourceRun.tasks;
      evidence = sourceRun.answers;
    } else {
      const publicRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(sourceRunId);
      const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(sourceRunId);
      const [publicSnap, privateSnap] = await Promise.all([tx.get(publicRef), tx.get(privateRef)]);
      const publicMatch = publicSnap.data() ?? {};
      const privateMatch = privateSnap.data() ?? {};
      const completeEvidence = Array.from({ length: 10 }, (_, index) => String(index))
        .every((index) => privateMatch.answers?.[who.stableUid]?.[index]);
      if (!publicSnap.exists || !privateSnap.exists || publicMatch.terminal !== true || publicMatch.state !== 'settled'
        || !publicMatch.result || publicMatch.result.reason === 'forfeit'
        || !['quick', 'ranked'].includes(String(publicMatch.mode))
        || (publicMatch.mode === 'ranked' && publicMatch.opponentKind !== 'human')
        || !['human', 'bot'].includes(String(publicMatch.opponentKind)) || privateMatch.runKind === 'rival'
        || !Array.isArray(privateMatch.participantStableUids)
        || !privateMatch.participantStableUids.includes(who.stableUid)
        || privateMatch.authByStableUid?.[who.stableUid] !== who.authUid || !completeEvidence) {
        throw new HttpsError('failed-precondition', 'arena_ghost_source_not_settled');
      }
      tasks = privateMatch.tasks as TournamentTask[];
      evidence = privateMatch.answers?.[who.stableUid] ?? {};
    }
    if (!Array.isArray(tasks) || tasks.length !== 10) throw new HttpsError('data-loss', 'arena_ghost_source_invalid');
    const ghost = {
      schemaVersion: 'arena-ghost.v1', ghostId, requestId, sourceKind, sourceRunId,
      fromStableUid: who.stableUid, fromAuthUid: who.authUid,
      fromName: String(who.user.displayName ?? who.user.name ?? 'Arena Player').slice(0, 48),
      ...(typeof who.user.avatar === 'string' ? { fromAvatar: who.user.avatar.slice(0, 256) } : {}),
      toStableUid: friendStableUid, toAuthUid: targetAuthUid,
      toName: String(targetUser.displayName ?? targetUser.name ?? 'Arena Player').slice(0, 48),
      participantStableUids: [who.stableUid, friendStableUid],
      participantAuthUids: [who.authUid, targetAuthUid],
      pairId: canonicalPairId, inviteTokenHash: hash(token),
      tasks, hostPlan: hostPlanFromEvidence(tasks, evidence), status: 'awaiting_guest',
      opponentKind: 'recording', noEconomy: true, createdAtMs: now,
      expiresAtMs: now + ARENA_GHOST_TTL_MS, expireAt: timestamp(now + ARENA_GHOST_TTL_MS),
    };
    tx.create(ghostRef, ghost);
    tx.set(profileRef, { ghostCreateDay: dayKey, ghostCreatedToday: createdToday + 1, updatedAtMs: now }, { merge: true });
    return { ghost, token };
  });
  const wireSourceKind = sourceKind === 'today' ? 'arena_today' : 'arena_match';
  return { ok: true, ghostId, inviteToken: result.token, sourceRunId, sourceKind: wireSourceKind,
    shareUrl: `https://knowlyapps.com/arena/ghost/${result.token}`,
    status: 'available', expiresAtMs: result.ghost.expiresAtMs, opponentKind: 'recording', noEconomy: true };
});

export const arenaGhostAccept = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'ghost');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const inviteToken = safeId(request.data?.inviteToken, 'invite_token', 256);
  const ghostRef = await ghostRefForToken(inviteToken);
  const ghostId = ghostRef.id;
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const queueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
  const runId = `ghost_${ghostId}`;
  const runRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.runs).doc(runId);
  const now = nowMs();
  const output = await db.runTransaction(async (tx) => {
    const [ghostSnap, profileSnap, queueSnap, runSnap] = await Promise.all([
      tx.get(ghostRef), tx.get(profileRef), tx.get(queueRef), tx.get(runRef),
    ]);
    if (!ghostSnap.exists) throw new HttpsError('not-found', 'arena_ghost_missing');
    const ghost = ghostSnap.data() ?? {};
    if (ghost.toStableUid !== who.stableUid || ghost.toAuthUid !== who.authUid
      || ghost.inviteTokenHash !== hash(inviteToken)) {
      throw new HttpsError('permission-denied', 'arena_ghost_token_invalid');
    }
    if (runSnap.exists && ghost.guestRunId === runId) return { run: runSnap.data() as ExpansionRun, ghost };
    if (ghost.status !== 'awaiting_guest' || Number(ghost.expiresAtMs ?? 0) <= now) {
      throw new HttpsError('failed-precondition', 'arena_ghost_unavailable');
    }
    const [hostUserSnap, ownFriendSnap, hostFriendSnap] = await Promise.all([
      tx.get(db.collection('users').doc(String(ghost.fromStableUid))),
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(String(ghost.fromStableUid))),
      tx.get(db.collection('users').doc(String(ghost.fromStableUid)).collection('friends').doc(who.stableUid)),
    ]);
    assertAvailableUser(hostUserSnap.data() ?? {}, String(ghost.fromAuthUid));
    if (!ownFriendSnap.exists || !hostFriendSnap.exists) throw new HttpsError('failed-precondition', 'arena_friendship_required');
    const profile = profileSnap.data() ?? {};
    if (profile.activeMatchId && profile.activeMatchId !== runId) throw new HttpsError('already-exists', 'arena_active_match_exists');
    const queue = queueSnap.data() ?? {};
    if (queue.status === 'matched') throw new HttpsError('failed-precondition', 'arena_queue_already_matched');
    const tasks = ghost.tasks as TournamentTask[];
    if (!Array.isArray(tasks) || tasks.length !== 10) throw new HttpsError('data-loss', 'arena_ghost_source_invalid');
    const run = makeExpansionRun({ runId, runKind: 'ghost', owner: who, sourceId: ghostId, tasks, now });
    tx.create(runRef, run);
    tx.set(ghostRef, { status: 'guest_playing', guestRunId: runId, acceptRequestId: requestId,
      acceptedAtMs: now, expiresAtMs: run.hardExpiresAtMs + DAY_MS,
      sourceRetainUntilMs: run.hardExpiresAtMs + DAY_MS,
      expireAt: timestamp(run.hardExpiresAtMs + DAY_MS) }, { merge: true });
    tx.set(profileRef, { activeMatchId: runId, updatedAtMs: now }, { merge: true });
    if (queue.status === 'waiting') tx.set(queueRef, {
      status: 'cancelled', closeReason: 'ghost_start', cancelledAtMs: now, leaseExpiresAt: 0,
    }, { merge: true });
    return { run, ghost };
  });
  return arenaExpansionRunResponse(output.run, { ghostId, status: 'accepted', expiresAtMs: output.run.hardExpiresAtMs,
    viewerSeat: 'a', opponentKind: 'recording', noEconomy: true });
});

export const arenaGhostStatus = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'ghost', true);
  const inviteToken = request.data?.inviteToken ? safeId(request.data.inviteToken, 'invite_token', 256) : null;
  const docs = inviteToken
    ? [await (await ghostRefForToken(inviteToken)).get()]
    : (await Promise.all([
      db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('participantStableUids', 'array-contains', who.stableUid)
        .where('status', '==', 'guest_playing').limit(10).get(),
      db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('participantStableUids', 'array-contains', who.stableUid)
        .where('status', '==', 'awaiting_guest').where('expiresAtMs', '>', nowMs()).limit(10).get(),
      db.collection(ARENA_EXPANSION_COLLECTIONS.ghosts)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'complete')
        .orderBy('completedAtMs', 'desc').limit(5).get(),
    ])).flatMap((row) => row.docs).slice(0, 10);
  const summaries: Json[] = [];
  let selected: Json | null = null;
  for (const snap of docs) {
    if (!snap.exists) continue;
    const ghost = snap.data() ?? {};
    if (!ghost.participantStableUids?.includes(who.stableUid) || !ghost.participantAuthUids?.includes(who.authUid)) {
      if (inviteToken) throw new HttpsError('permission-denied', 'arena_ghost_not_participant');
      continue;
    }
    const expired = Number(ghost.expiresAtMs ?? 0) <= nowMs() && ghost.status !== 'complete';
    const direction = ghost.toStableUid === who.stableUid ? 'incoming' : 'outgoing';
    const capability = ghostToken(snap.id, String(ghost.toAuthUid));
    const summary = {
      ghostId: snap.id, ownerName: ghost.fromName ?? 'Arena Player', ownerAvatar: ghost.fromAvatar,
      direction, ...(capability ? { inviteToken: capability } : {}),
      ...(direction === 'outgoing' && capability ? { shareUrl: `https://knowlyapps.com/arena/ghost/${capability}` } : {}),
      state: expired ? 'expired' : ghost.status === 'awaiting_guest' ? 'available'
        : ghost.status === 'guest_playing' ? 'accepted' : ghost.status,
      matchId: ghost.guestRunId, createdAtMs: ghost.createdAtMs, expiresAtMs: ghost.expiresAtMs,
      ...(ghost.status === 'complete' && ghost.result ? { result: {
        hostScore: Number(ghost.result.hostScore ?? 0), guestScore: Number(ghost.result.guestScore ?? 0),
        outcome: ghost.result.outcome === 'win' || ghost.result.outcome === 'loss' ? ghost.result.outcome : 'draw',
      } } : {}),
    };
    summaries.push(summary);
    if (inviteToken) selected = {
      ok: true, ghostId: snap.id, status: summary.state, expiresAtMs: Number(ghost.expiresAtMs ?? 0),
      opponentKind: 'recording', noEconomy: true, matchId: ghost.guestRunId,
      ...(ghost.guestRunId ? { viewerSeat: 'a' } : {}),
      ...(ghost.status === 'complete' ? { result: summary.result } : {}),
    };
  }
  if (inviteToken && !selected) throw new HttpsError('not-found', 'arena_ghost_missing');
  return { ok: true, ghosts: summaries, selected };
});

export const arenaGhostDecline = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'ghost', true);
  const inviteToken = safeId(request.data?.inviteToken, 'invite_token', 256);
  const ghostRef = await ghostRefForToken(inviteToken);
  const ghostId = ghostRef.id;
  const status = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ghostRef);
    const data = snap.data() ?? {};
    const guest = data.toStableUid === who.stableUid && data.toAuthUid === who.authUid
      && data.inviteTokenHash === hash(inviteToken);
    const host = data.fromStableUid === who.stableUid && data.fromAuthUid === who.authUid;
    if (!snap.exists || (!guest && !host)) {
      throw new HttpsError('permission-denied', 'arena_ghost_token_invalid');
    }
    const next = host ? 'cancelled' : 'declined';
    if (data.status === 'awaiting_guest') tx.set(ghostRef, {
      status: next, closedBy: who.stableUid, declinedAtMs: nowMs(),
    }, { merge: true });
    return data.status === 'awaiting_guest' ? next : data.status;
  });
  return { ok: true, ghostId, status };
});

export const arenaPartnerInvite = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'partner');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const friendStableUid = safeId(request.data?.friendStableUid, 'friend_stable_uid');
  if (friendStableUid === who.stableUid) throw new HttpsError('invalid-argument', 'arena_partner_self');
  const id = pairId(who.stableUid, friendStableUid);
  const ref = db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships).doc(id);
  const now = nowMs();
  const result = await db.runTransaction(async (tx) => {
    const [existing, friendUser, ownFriend, reciprocal, ownActive, ownPending, targetActive, targetPending] = await Promise.all([
      tx.get(ref), tx.get(db.collection('users').doc(friendStableUid)),
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(friendStableUid)),
      tx.get(db.collection('users').doc(friendStableUid).collection('friends').doc(who.stableUid)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'active').limit(5)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'pending')
        .where('expiresAtMs', '>', now).limit(5)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', friendStableUid).where('status', '==', 'active').limit(5)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', friendStableUid).where('status', '==', 'pending')
        .where('expiresAtMs', '>', now).limit(5)),
    ]);
    const friend = friendUser.data() ?? {};
    assertAvailableUser(friend);
    if (!ownFriend.exists || !reciprocal.exists) throw new HttpsError('failed-precondition', 'arena_friendship_required');
    const friendAuthUid = String(friend.firebaseAuthUid ?? '').trim();
    if (!friendAuthUid) throw new HttpsError('failed-precondition', 'arena_social_target_unavailable');
    const token = socialToken('partner', id, friendAuthUid);
    if (existing.exists) {
      const data = existing.data() ?? {};
      if (data.status === 'active' || (data.status === 'pending' && data.fromStableUid === who.stableUid)) {
        if (data.requestId !== requestId) throw new HttpsError('already-exists', 'arena_partner_request_conflict');
        return { partnership: data, token };
      }
    }
    const countOther = (active: admin.firestore.QuerySnapshot, pending: admin.firestore.QuerySnapshot) =>
      active.docs.filter((doc) => doc.id !== id).length + pending.docs.filter((doc) => doc.id !== id).length;
    if (countOther(ownActive, ownPending) >= 5 || countOther(targetActive, targetPending) >= 5) {
      throw new HttpsError('resource-exhausted', 'arena_partner_limit');
    }
    const partnership = {
      schemaVersion: 'arena-partnership.v1', partnershipId: id, requestId,
      fromStableUid: who.stableUid, fromAuthUid: who.authUid,
      fromName: String(who.user.displayName ?? who.user.name ?? 'Arena Partner').slice(0, 48),
      ...(typeof who.user.avatar === 'string' ? { fromAvatar: who.user.avatar.slice(0, 256) } : {}),
      toStableUid: friendStableUid, toAuthUid: friendAuthUid,
      toName: String(friend.displayName ?? friend.name ?? 'Arena Partner').slice(0, 48),
      ...(typeof friend.avatar === 'string' ? { toAvatar: friend.avatar.slice(0, 256) } : {}),
      participantStableUids: [who.stableUid, friendStableUid],
      participantAuthUids: [who.authUid, friendAuthUid], status: 'pending',
      pausedBy: {}, nudgeEnabledByUid: {
        [who.stableUid]: who.user.arenaPartnerNudgesEnabled === true,
        [friendStableUid]: friend.arenaPartnerNudgesEnabled === true,
      }, createdAtMs: now, expiresAtMs: now + PARTNER_PENDING_TTL_MS,
      expireAt: timestamp(now + PARTNER_PENDING_TTL_MS),
    };
    tx.set(ref, partnership);
    tx.set(userNotificationRef(db, friendStableUid, `arena_partner_invite_${id}`), buildUserNotification({
      type: 'arena_partner_invite',
      fromUid: who.stableUid,
      fromName: partnership.fromName,
      ...(partnership.fromAvatar ? { fromAvatar: partnership.fromAvatar } : {}),
      nav: { kind: 'arena_partner', partnershipId: id },
    }, now));
    return { partnership, token };
  });
  return { ok: true, inviteToken: result.token,
    partner: partnerSummary(id, result.partnership, who.stableUid) };
});

export const arenaPartnerAccept = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'partner');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const inviteToken = request.data?.inviteToken ? safeId(request.data.inviteToken, 'invite_token', 256) : null;
  const id = inviteToken ? tokenDocumentId(inviteToken) : safeId(request.data?.partnershipId, 'partnership_id');
  const ref = db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships).doc(id);
  const now = nowMs();
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    if (!snap.exists || data.toStableUid !== who.stableUid || data.toAuthUid !== who.authUid
      || (inviteToken && socialToken('partner', id, who.authUid) !== inviteToken)) {
      throw new HttpsError('permission-denied', 'arena_partner_token_invalid');
    }
    if (data.status === 'active') return data;
    if (data.status !== 'pending' || Number(data.expiresAtMs ?? 0) <= now) {
      throw new HttpsError('failed-precondition', 'arena_partner_unavailable');
    }
    const [hostUser, ownFriend, hostFriend, hostActive, hostPending, guestActive, guestPending] = await Promise.all([
      tx.get(db.collection('users').doc(String(data.fromStableUid))),
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(String(data.fromStableUid))),
      tx.get(db.collection('users').doc(String(data.fromStableUid)).collection('friends').doc(who.stableUid)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', String(data.fromStableUid))
        .where('status', '==', 'active').limit(5)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', String(data.fromStableUid)).where('status', '==', 'pending')
        .where('expiresAtMs', '>', now).limit(6)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid)
        .where('status', '==', 'active').limit(5)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'pending')
        .where('expiresAtMs', '>', now).limit(6)),
    ]);
    assertAvailableUser(hostUser.data() ?? {}, String(data.fromAuthUid));
    if (!ownFriend.exists || !hostFriend.exists) throw new HttpsError('failed-precondition', 'arena_friendship_required');
    const otherEdges = (active: admin.firestore.QuerySnapshot, pending: admin.firestore.QuerySnapshot) =>
      active.docs.filter((doc) => doc.id !== id).length + pending.docs.filter((doc) => doc.id !== id).length;
    if (otherEdges(hostActive, hostPending) >= 5 || otherEdges(guestActive, guestPending) >= 5) {
      throw new HttpsError('resource-exhausted', 'arena_partner_limit');
    }
    const update = { status: 'active', acceptRequestId: requestId, acceptedAtMs: now,
      expiresAtMs: null, expireAt: admin.firestore.FieldValue.delete() };
    tx.set(ref, update, { merge: true });
    tx.delete(userNotificationRef(db, who.stableUid, `arena_partner_invite_${id}`));
    return { ...data, ...update };
  });
  return { ok: true, partner: partnerSummary(id, result, who.stableUid) };
});

async function mutatePartnership(
  request: { auth?: { uid?: string }; data?: Json },
  action: 'pause' | 'remove',
): Promise<Json> {
  const who = await expansionActor(request, 'partner', true);
  safeId(request.data?.requestId, 'request_id');
  const id = safeId(request.data?.partnershipId, 'partnership_id');
  const ref = db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships).doc(id);
  const now = nowMs();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    if (!snap.exists || !data.participantStableUids?.includes(who.stableUid)
      || !data.participantAuthUids?.includes(who.authUid)) {
      throw new HttpsError('permission-denied', 'arena_partner_not_participant');
    }
    if (action === 'remove') {
      const updated = { ...data, status: 'removed', removedBy: who.stableUid, removedAtMs: now,
        expireAt: timestamp(now + 30 * DAY_MS) };
      tx.set(ref, updated, { merge: true });
      return { ok: true, partner: partnerSummary(id, updated, who.stableUid) };
    }
    const paused = typeof request.data?.paused === 'boolean'
      ? request.data.paused : data.pausedBy?.[who.stableUid] !== true;
    const updated = { ...data, pausedBy: { ...(data.pausedBy ?? {}), [who.stableUid]: paused }, updatedAtMs: now };
    tx.set(ref, { [`pausedBy.${who.stableUid}`]: paused, updatedAtMs: now }, { merge: true });
    return { ok: true, partner: partnerSummary(id, updated, who.stableUid) };
  });
}

export const arenaPartnerPause = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, (request) => mutatePartnership(request, 'pause'));
export const arenaPartnerRemove = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, (request) => mutatePartnership(request, 'remove'));

export const arenaPartnerPreferences = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'partner');
  const requestId = safeId(request.data?.requestId, 'request_id');
  if (typeof request.data?.enabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'arena_partner_preferences_invalid');
  }
  const enabled = request.data.enabled;
  const quiet = request.data?.quietHoursUtc == null ? null : {
    startHour: integer(request.data.quietHoursUtc.startHour, 'quiet_start_hour', 0, 23),
    endHour: integer(request.data.quietHoursUtc.endHour, 'quiet_end_hour', 0, 23),
  };
  const userRef = db.collection('users').doc(who.stableUid);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts)
    .doc(`partner_preferences_${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const [receiptSnap, active] = await Promise.all([
      tx.get(receiptRef),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'active').limit(5)),
    ]);
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.operation !== 'partner_preferences' || receiptSnap.data()?.enabled !== enabled
        || JSON.stringify(receiptSnap.data()?.quietHoursUtc ?? null) !== JSON.stringify(quiet)) {
        throw new HttpsError('already-exists', 'arena_partner_request_conflict');
      }
      return receiptSnap.data()!;
    }
    const updatedAtMs = nowMs();
    tx.set(userRef, {
      arenaPartnerNudgesEnabled: enabled,
      ...(quiet ? { arenaPartnerQuietHoursUtc: quiet } : {
        arenaPartnerQuietHoursUtc: admin.firestore.FieldValue.delete(),
      }),
      updatedAtMs,
    }, { merge: true });
    active.docs.forEach((doc) => tx.set(doc.ref, {
      [`nudgeEnabledByUid.${who.stableUid}`]: enabled, updatedAtMs,
    }, { merge: true }));
    const receipt = { operation: 'partner_preferences', enabled, quietHoursUtc: quiet, updatedAtMs };
    tx.create(receiptRef, receipt);
    return receipt;
  });
  return { ok: true, enabled: result.enabled, quietHoursUtc: result.quietHoursUtc ?? null };
});

export const arenaPartnerNudge = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'partner');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const id = safeId(request.data?.partnershipId, 'partnership_id');
  const ref = db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships).doc(id);
  const now = nowMs(); const dayKey = arenaTodayDayKey(now);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    if (!snap.exists || data.status !== 'active' || !data.participantStableUids?.includes(who.stableUid)
      || data.pausedBy?.[who.stableUid] === true) throw new HttpsError('failed-precondition', 'arena_partner_unavailable');
    const targetStableUid = data.participantStableUids.find((uid: string) => uid !== who.stableUid);
    const targetAuthUid = data.toStableUid === targetStableUid ? data.toAuthUid : data.fromAuthUid;
    const targetUserRef = db.collection('users').doc(targetStableUid);
    const senderProfileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
    const targetProfileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(targetStableUid);
    const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`nudge_${requestId}`);
    const [targetUser, targetProfile, senderProfile, ownFriend, reciprocal, receipt] = await Promise.all([
      tx.get(targetUserRef), tx.get(targetProfileRef), tx.get(senderProfileRef),
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(targetStableUid)),
      tx.get(db.collection('users').doc(targetStableUid).collection('friends').doc(who.stableUid)),
      tx.get(receiptRef),
    ]);
    if (receipt.exists) {
      if (receipt.data()?.operation !== 'partner_nudge' || receipt.data()?.partnershipId !== id) {
        throw new HttpsError('already-exists', 'arena_partner_request_conflict');
      }
      return receipt.data()!;
    }
    assertAvailableUser(targetUser.data() ?? {}, targetAuthUid);
    if (targetUser.data()?.arenaPartnerNudgesEnabled !== true || inPartnerQuietHours(targetUser.data() ?? {}, now)) {
      throw new HttpsError('failed-precondition', 'arena_partner_nudge_quiet');
    }
    if (!ownFriend.exists || !reciprocal.exists || data.pausedBy?.[targetStableUid] === true) {
      throw new HttpsError('failed-precondition', 'arena_partner_unavailable');
    }
    if (data.nudgeDayByUid?.[who.stableUid] === dayKey) {
      throw new HttpsError('resource-exhausted', 'arena_partner_nudge_daily_limit');
    }
    const profile = targetProfile.data() ?? {};
    const sender = senderProfile.data() ?? {};
    const senderCount = sender.partnerNudgeSentDay === dayKey ? Math.max(0, Number(sender.partnerNudgeSentCount ?? 0)) : 0;
    if (senderCount >= 2) throw new HttpsError('resource-exhausted', 'arena_partner_sender_nudge_limit');
    const targetCount = profile.partnerNudgeDay === dayKey ? Math.max(0, Number(profile.partnerNudgeCount ?? 0)) : 0;
    if (targetCount >= 2) throw new HttpsError('resource-exhausted', 'arena_partner_target_nudge_limit');
    const eventId = `arena_partner_${id}_${dayKey}`;
    const resultDoc = { receiptId: receiptRef.id, operation: 'partner_nudge', partnershipId: id, dayKey, sentAtMs: now };
    tx.set(ref, { [`nudgeDayByUid.${who.stableUid}`]: dayKey, updatedAtMs: now }, { merge: true });
    tx.set(targetProfileRef, { partnerNudgeDay: dayKey, partnerNudgeCount: targetCount + 1, updatedAtMs: now }, { merge: true });
    tx.set(senderProfileRef, { partnerNudgeSentDay: dayKey, partnerNudgeSentCount: senderCount + 1, updatedAtMs: now }, { merge: true });
    tx.set(userNotificationRef(db, targetStableUid, eventId), buildUserNotification({
      type: 'arena_partner_nudge',
      fromUid: who.stableUid,
      fromName: String(who.user.displayName ?? who.user.name ?? 'Arena Partner').slice(0, 48),
      ...(typeof who.user.avatar === 'string' ? { fromAvatar: who.user.avatar.slice(0, 200) } : {}),
      nav: { kind: 'arena_partner', partnershipId: id },
    }, now));
    tx.create(receiptRef, resultDoc);
    return resultDoc;
  });
  const partnership = (await ref.get()).data() ?? {};
  return { ok: true, receiptId: result.receiptId, partner: partnerSummary(id, partnership, who.stableUid) };
});

function weekDayKeys(weekKey: string): string[] {
  const start = Date.parse(`${weekKey}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => arenaTodayDayKey(start + index * DAY_MS));
}

export const arenaPartnerClaimSpotlight = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'partner');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const id = safeId(request.data?.partnershipId, 'partnership_id');
  const now = nowMs(); const weekKey = arenaUtcWeekKey(now); const days = weekDayKeys(weekKey);
  const partnershipRef = db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships).doc(id);
  const weekRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.partnerWeeks).doc(weekKey);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const season = arenaSeasonWindow(now);
  const seasonRef = userSubcollection(who.stableUid, ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`partner_${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const [partnershipSnap, weekSnap, profileSnap, seasonSnap, receiptSnap, activePartnershipsSnap] = await Promise.all([
      tx.get(partnershipRef), tx.get(weekRef), tx.get(profileRef), tx.get(seasonRef), tx.get(receiptRef),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.partnerships)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'active').limit(5)),
    ]);
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.operation !== 'partner_spotlight' || receiptSnap.data()?.partnershipId !== id) {
        throw new HttpsError('already-exists', 'arena_partner_request_conflict');
      }
      return receiptSnap.data()!;
    }
    const partnership = partnershipSnap.data() ?? {};
    if (!partnershipSnap.exists || partnership.status !== 'active'
      || !partnership.participantStableUids?.includes(who.stableUid)
      || Object.values(partnership.pausedBy ?? {}).some(Boolean)) {
      throw new HttpsError('failed-precondition', 'arena_partner_unavailable');
    }
    const week = weekSnap.data() ?? {};
    if (week.spotlightPartnershipId && week.spotlightPartnershipId !== id) {
      throw new HttpsError('failed-precondition', 'arena_partner_spotlight_locked');
    }
    const otherUid = partnership.participantStableUids.find((uid: string) => uid !== who.stableUid);
    const otherAuthUid = partnership.toStableUid === otherUid ? partnership.toAuthUid : partnership.fromAuthUid;
    const [otherUser, ownFriend, reciprocal] = await Promise.all([
      tx.get(db.collection('users').doc(otherUid)),
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(otherUid)),
      tx.get(db.collection('users').doc(otherUid).collection('friends').doc(who.stableUid)),
    ]);
    const otherData = otherUser.data() ?? {};
    const relationshipInvalid = !ownFriend.exists || !reciprocal.exists || otherData.hidden === true
      || otherData.deleted === true || otherData.banned === true || otherData.firebaseAuthUid !== otherAuthUid;
    if (relationshipInvalid) {
      const removed = { ...partnership, status: 'removed', removedAtMs: now, closeReason: 'relationship_unavailable' };
      tx.set(partnershipRef, removed, { merge: true });
      const denied = { receiptId: receiptRef.id, operation: 'partner_spotlight', partnershipId: id,
        status: 'removed', starsEarned: 0, balanceAfter: Number(profileSnap.data()?.starWalletBalance ?? 0) };
      tx.create(receiptRef, denied);
      return denied;
    }
    const activityRefs = days.flatMap((day) => [
      userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.activityDays).doc(day),
      userSubcollection(otherUid, ARENA_EXPANSION_COLLECTIONS.activityDays).doc(day),
    ]);
    const activity = await Promise.all(activityRefs.map((ref) => tx.get(ref)));
    const spotlightUserSnap = await tx.get(db.collection('users').doc(who.stableUid));
    const sharedDays = days.filter((_, index) => activity[index * 2].data()?.qualifying === true
      && activity[index * 2 + 1].data()?.qualifying === true).length;
    if (!week.spotlightPartnershipId) {
      const candidates = activePartnershipsSnap.docs.filter((doc) =>
        Array.isArray(doc.data().participantStableUids) && doc.data().participantStableUids.length === 2
        && doc.data().participantStableUids.includes(who.stableUid)
        && !Object.values(doc.data().pausedBy ?? {}).some(Boolean));
      const candidateOtherRefs = candidates.flatMap((doc) => {
        const row = doc.data();
        const candidateOtherUid = row.participantStableUids.find((uid: string) => uid !== who.stableUid);
        return days.map((day) => userSubcollection(candidateOtherUid, ARENA_EXPANSION_COLLECTIONS.activityDays).doc(day));
      });
      const candidateOtherActivity = await Promise.all(candidateOtherRefs.map((ref) => tx.get(ref)));
      const rankedCandidates = candidates.flatMap((doc, candidateIndex) => {
        const firstSharedDay = days.findIndex((_, dayIndex) => activity[dayIndex * 2].data()?.qualifying === true
          && candidateOtherActivity[candidateIndex * days.length + dayIndex].data()?.qualifying === true);
        return firstSharedDay < 0 ? [] : [{ id: doc.id, firstSharedDay,
          acceptedAtMs: Math.max(0, Number(doc.data().acceptedAtMs ?? 0)) }];
      }).sort((left, right) => left.firstSharedDay - right.firstSharedDay
        || left.acceptedAtMs - right.acceptedAtMs || left.id.localeCompare(right.id));
      const lockedId = rankedCandidates[0]?.id;
      if (lockedId && lockedId !== id) {
        const lockedElsewhere = { receiptId: receiptRef.id, operation: 'partner_spotlight', partnershipId: id,
          weekKey, sharedDays, claimedThresholds: [], starsEarned: 0,
          balanceAfter: Math.max(0, Number(profileSnap.data()?.starWalletBalance ?? 0)),
          status: 'locked_elsewhere', spotlightPartnershipId: lockedId };
        tx.set(weekRef, { weekKey, spotlightPartnershipId: lockedId, claimedThresholds: [],
          lockedAtMs: now, updatedAtMs: now }, { merge: true });
        tx.set(partnershipRef, { sharedDays, updatedAtMs: now }, { merge: true });
        tx.create(receiptRef, lockedElsewhere);
        return lockedElsewhere;
      }
    }
    if (!week.spotlightPartnershipId && sharedDays < 1) {
      const pending = { receiptId: receiptRef.id, operation: 'partner_spotlight', partnershipId: id,
        weekKey, sharedDays, claimedThresholds: [], starsEarned: 0,
        balanceAfter: Math.max(0, Number(profileSnap.data()?.starWalletBalance ?? 0)), status: 'not_locked' };
      tx.set(partnershipRef, { sharedDays, updatedAtMs: now }, { merge: true });
      tx.create(receiptRef, pending);
      return pending;
    }
    const award = arenaPartnerSpotlightAward(sharedDays, Array.isArray(week.claimedThresholds) ? week.claimedThresholds : []);
    const profile = profileSnap.data() ?? {};
    const balanceBefore = Math.max(0, Number(profile.starWalletBalance ?? 0));
    const balanceAfter = balanceBefore + award.walletStars;
    const seasonData = seasonSnap.data() ?? {};
    const seasonStarsAfter = Math.max(0, Number(seasonData.stars ?? 0)) + award.walletStars;
    const claimedThresholds = Array.from(new Set([...(week.claimedThresholds ?? []), ...award.thresholds])).sort();
    const resultDoc = { receiptId: receiptRef.id, operation: 'partner_spotlight', partnershipId: id, weekKey, sharedDays,
      claimedThresholds, starsEarned: award.walletStars, balanceAfter, claimedAtMs: now };
    tx.set(weekRef, { weekKey, spotlightPartnershipId: id, sharedDays, claimedThresholds,
      ...(!week.spotlightPartnershipId ? { lockedAtMs: now } : {}), updatedAtMs: now }, { merge: true });
    /**
     * Партнёрский спотлайт — обычное начисление в единый журнал (D-05/D-06).
     * Ключ включает неделю, партнёрство и набор порогов: он стабилен и
     * переживает повтор запроса, а порог, взятый один раз, второй раз не платит.
     */
    const spotlightPrepared = award.walletStars > 0
      ? await prepareStarOperations(tx, db, who.stableUid, spotlightUserSnap, [{
        opId: `arena_partner:${weekKey}_${id}_${award.thresholds.join('_')}`,
        delta: award.walletStars,
        reason: 'arena_partner',
        sourceKind: 'arena_partner',
        sourceId: `${weekKey}_${id}_${award.thresholds.join('_')}`,
        ruleVersion: 1,
        earnedAtMs: now,
        meta: { weekKey, partnershipId: id, sharedDays, thresholds: award.thresholds.join(',') },
      }], {
        nowMs: now,
        activeSeasonId: season.seasonId,
        weekKeyNow: arenaWeekKeyForMs(now),
        weekKeyForMs: arenaWeekKeyForMs,
        authUid: who.authUid ?? '',
      })
      : null;
    if (spotlightPrepared) commitStarOperations(tx, spotlightPrepared);
    if (award.walletStars > 0) {
      tx.set(profileRef, { starWalletBalance: balanceAfter,
        lifetimeWalletStarsEarned: Math.max(0, Number(profile.lifetimeWalletStarsEarned ?? 0)) + award.walletStars,
        updatedAtMs: now }, { merge: true });
      tx.set(seasonRef, { seasonId: season.seasonId, stars: seasonStarsAfter,
        level: Math.floor(seasonStarsAfter / 50), endsAtMs: season.endsAtMs, updatedAtMs: now }, { merge: true });
      tx.create(userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.starLedger).doc(`partner_${weekKey}_${id}_${award.thresholds.join('_')}`), {
        kind: 'partner_spotlight', partnershipId: id, weekKey, thresholds: award.thresholds,
        delta: award.walletStars, balanceAfter, createdAtMs: now, expireAt: timestamp(now + 400 * DAY_MS),
      });
    }
    const claimedByUid = { ...(partnership.claimedThresholdsByUid ?? {}), [who.stableUid]: claimedThresholds };
    const newBadge = sharedDays >= 7 && partnership.badgeWeekKey !== weekKey;
    tx.set(partnershipRef, { sharedDays, claimedThresholdsByUid: claimedByUid,
      ...(newBadge ? { badgeWeekKey: weekKey, badgeExpiresAtMs: now + 7 * DAY_MS } : {}), updatedAtMs: now }, { merge: true });
    tx.create(receiptRef, resultDoc);
    return resultDoc;
  });
  const partnership = (await partnershipRef.get()).data() ?? {};
  return { ok: true, receiptId: result.receiptId, starsEarned: result.starsEarned,
    partner: partnerSummary(id, partnership, who.stableUid) };
});

async function rivalResponse(seriesId: string, series: Json, who: ExpansionActor): Promise<Json> {
  const viewerProfile = (await db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid).get()).data() ?? {};
  const viewerSeat: 'a' | 'b' = series.stableUidBySeat?.b === who.stableUid ? 'b' : 'a';
  const status = series.status === 'pending'
    ? series.proposerStableUid === who.stableUid ? 'awaiting' : 'invited'
    : series.status === 'between_games' ? 'active' : series.status;
  return {
    ok: true, seriesId, status, wins: series.wins ?? { a: 0, b: 0 },
    gameIndex: Math.max(1, Number(series.gameIndex ?? series.gamesPlayed ?? 1)), maxGames: 3,
    ...(series.activeMatchId ? { activeMatchId: series.activeMatchId } : {}),
    viewerSeat, viewerReady: Boolean(series.readyBy?.[who.stableUid]),
    muted: viewerProfile.rivalMutedPairs?.[series.pairId] === true,
    leaveAllowed: status === 'awaiting' || status === 'invited'
      || (status === 'active' && !series.activeMatchId),
  };
}

function safeRivalPlayer(user: Json, profile: Json): Json {
  return {
    name: String(user.displayName ?? user.name ?? 'Arena Rival').slice(0, 48),
    ...(typeof user.avatar === 'string' ? { avatar: user.avatar.slice(0, 256) } : {}),
    ...(typeof user.aura === 'string' ? { aura: user.aura.slice(0, 128) } : {}),
    rank: Math.max(0, Math.min(23, Math.trunc(Number(profile.rank ?? 0)))),
    rating: Math.max(0, Math.trunc(Number(profile.rating ?? 0))), score: 0, correct: 0,
  };
}

function createRivalMatchWrites(input: {
  tx: admin.firestore.Transaction; seriesId: string; matchId: string; gameIndex: number;
  series: Json; tasks: TournamentTask[]; profiles: Record<'a' | 'b', Json>;
  users: Record<'a' | 'b', Json>; now: number; config: Json;
}): void {
  const { tx, seriesId, matchId, gameIndex, series, tasks, profiles, users, now, config } = input;
  const stableA = String(series.stableUidBySeat.a); const stableB = String(series.stableUidBySeat.b);
  const authA = String(series.authUidBySeat.a); const authB = String(series.authUidBySeat.b);
  const playerA = safeRivalPlayer(users.a, profiles.a); const playerB = safeRivalPlayer(users.b, profiles.b);
  const privateDoc: Json = {
    matchId, tasks, participantStableUids: [stableA, stableB], participantAuthUids: [authA, authB],
    seatByStableUid: { [stableA]: 'a', [stableB]: 'b' },
    authByStableUid: { [stableA]: authA, [stableB]: authB },
    answers: { [stableA]: {}, [stableB]: {} }, speedProgress: { [stableA]: {}, [stableB]: {} },
    speedAttempts: { [stableA]: {}, [stableB]: {} },
    totals: {
      [stableA]: { score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0 },
      [stableB]: { score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0 },
    },
    runKind: 'rival', seriesId, gameIndex,
    expansionFlags: { wallet: false, lab: false, mastery: false, partner: false },
    createdAtMs: now, expireAt: timestamp(now + ARENA_V2_MATCH_TTL_MS),
  };
  const validation = validateArenaPrivateEnvelope(privateDoc as any);
  if (!validation.ok) throw new HttpsError('resource-exhausted', validation.reason);
  const publicDoc = {
    matchId, mode: 'series', entryMode: 'series', runKind: 'rival', seriesId, gameIndex,
    opponentKind: 'human', players: [
      { uid: 'a', ...playerA }, { uid: 'b', ...playerB },
    ],
    acceptedBy: ['a', 'b'], state: 'countdown', version: 1, currentTaskIndex: -1,
    submittedBy: [], scores: { a: 0, b: 0 }, stateStartedAtMs: now,
    stateDeadlineAtMs: now + 3_200, terminal: false, createdAtMs: now,
    expireAt: timestamp(now + ARENA_V2_MATCH_TTL_MS),
  };
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  tx.create(matchRef, publicDoc);
  tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), privateDoc);
  tx.create(matchRef.collection(ARENA_V2_COLLECTIONS.members).doc(authA), {
    schemaVersion: 'arena-v2-member.v1', matchId, authUid: authA, seatId: 'a', createdAtMs: now,
    expireAt: timestamp(now + ARENA_V2_MATCH_TTL_MS),
  });
  tx.create(matchRef.collection(ARENA_V2_COLLECTIONS.members).doc(authB), {
    schemaVersion: 'arena-v2-member.v1', matchId, authUid: authB, seatId: 'b', createdAtMs: now,
    expireAt: timestamp(now + ARENA_V2_MATCH_TTL_MS),
  });
  tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(stableA), { activeMatchId: matchId, updatedAtMs: now }, { merge: true });
  tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(stableB), { activeMatchId: matchId, updatedAtMs: now }, { merge: true });
  for (const uid of [stableA, stableB]) tx.set(db.collection(ARENA_V2_COLLECTIONS.queue).doc(uid), {
    status: 'cancelled', closeReason: 'rival_series', cancelledAtMs: now, leaseExpiresAt: 0,
  }, { merge: true });
}

function sourceSeriesScore(match: Json): { wins: { a: number; b: number }; draws: number } {
  const winner = match.result?.winnerUid;
  return { wins: { a: winner === 'a' ? 1 : 0, b: winner === 'b' ? 1 : 0 }, draws: winner ? 0 : 1 };
}

export const arenaRivalPropose = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'rival');
  const sourceMatchId = safeId(request.data?.sourceMatchId, 'source_match_id');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const seriesId = hash(`rival|${sourceMatchId}`);
  const seriesRef = db.collection(ARENA_EXPANSION_COLLECTIONS.series).doc(seriesId);
  const publicRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(sourceMatchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(sourceMatchId);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const now = nowMs();
  const series = await db.runTransaction(async (tx) => {
    const [existing, publicSnap, privateSnap, profileSnap] = await Promise.all([
      tx.get(seriesRef), tx.get(publicRef), tx.get(privateRef), tx.get(profileRef),
    ]);
    if (existing.exists) {
      const data = existing.data() ?? {};
      if (!data.participantStableUids?.includes(who.stableUid)
        || !data.participantAuthUids?.includes(who.authUid)) {
        throw new HttpsError('permission-denied', 'arena_rival_not_participant');
      }
      if (data.status === 'pending' && data.sourceMatchId === sourceMatchId
        && data.proposerStableUid !== who.stableUid && Number(data.offerExpiresAtMs ?? 0) > now) {
        return data;
      }
      if (data.requestId !== requestId || data.sourceMatchId !== sourceMatchId) {
        throw new HttpsError('already-exists', 'arena_rival_requestId_conflict');
      }
      return data;
    }
    const match = publicSnap.data() ?? {}; const privateDoc = privateSnap.data() ?? {};
    if (!publicSnap.exists || !privateSnap.exists || match.state !== 'settled' || match.terminal !== true
      || match.opponentKind !== 'human' || !['quick', 'ranked'].includes(String(match.mode))
      || !match.result || match.result.reason === 'forfeit'
      || !privateDoc.participantStableUids?.includes(who.stableUid)
      || privateDoc.authByStableUid?.[who.stableUid] !== who.authUid
      || Number(match.stateStartedAtMs ?? 0) > now + 2_000
      || now - Number(match.stateStartedAtMs ?? 0) > 30_000) {
      throw new HttpsError('failed-precondition', 'arena_rival_source_ineligible');
    }
    const proposerSeat = privateDoc.seatByStableUid[who.stableUid] as 'a' | 'b';
    const opponentSeat = proposerSeat === 'a' ? 'b' : 'a';
    const stableUidBySeat = Object.fromEntries(Object.entries(privateDoc.seatByStableUid)
      .map(([uid, seat]) => [seat, uid]));
    const authUidBySeat = {
      a: privateDoc.authByStableUid[stableUidBySeat.a], b: privateDoc.authByStableUid[stableUidBySeat.b],
    };
    const opponentStableUid = stableUidBySeat[opponentSeat];
    if (privateDoc.participantStableUids.length !== 2 || new Set(privateDoc.participantStableUids).size !== 2
      || !authUidBySeat.a || !authUidBySeat.b) {
      throw new HttpsError('failed-precondition', 'arena_rival_source_participants_invalid');
    }
    const [opponentUserSnap, opponentProfileSnap] = await Promise.all([
      tx.get(db.collection('users').doc(opponentStableUid)),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(opponentStableUid)),
    ]);
    assertAvailableUser(opponentUserSnap.data() ?? {}, String(authUidBySeat[opponentSeat]));
    const pair = pairId(who.stableUid, opponentStableUid);
    if (profileSnap.data()?.rivalMutedPairs?.[pair] === true
      || opponentProfileSnap.data()?.rivalMutedPairs?.[pair] === true) {
      throw new HttpsError('failed-precondition', 'arena_rival_pair_muted');
    }
    const dayKey = arenaTodayDayKey(now);
    const [recent, activeSeries, pendingSeries, targetActiveSeries, targetPendingSeries] = await Promise.all([
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('pairId', '==', pair).where('dayKey', '==', dayKey).orderBy('createdAtMs', 'desc').limit(5)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', who.stableUid)
        .where('status', 'in', ['active', 'between_games']).limit(3)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', who.stableUid).where('status', '==', 'pending')
        .where('offerExpiresAtMs', '>', now).limit(3)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', opponentStableUid)
        .where('status', 'in', ['active', 'between_games']).limit(3)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', opponentStableUid).where('status', '==', 'pending')
        .where('offerExpiresAtMs', '>', now).limit(3)),
    ]);
    if (activeSeries.size + pendingSeries.size >= 3
      || targetActiveSeries.size + targetPendingSeries.size >= 3) {
      throw new HttpsError('resource-exhausted', 'arena_rival_active_limit');
    }
    if (recent.size >= 5 || recent.docs.some((doc) => now - Number(doc.data().createdAtMs ?? 0) < 15 * 60_000)) {
      throw new HttpsError('resource-exhausted', 'arena_rival_pair_cooldown');
    }
    const profile = profileSnap.data() ?? {};
    const targetCounterKey = hash(`${dayKey}|${opponentStableUid}`).slice(0, 32);
    const targetOffersToday = profile.rivalOfferDay === dayKey ? { ...(profile.rivalTargetOffersToday ?? {}) } : {};
    if (Math.max(0, Number(targetOffersToday[targetCounterKey] ?? 0)) >= 5) {
      throw new HttpsError('resource-exhausted', 'arena_rival_target_daily_limit');
    }
    targetOffersToday[targetCounterKey] = Math.max(0, Number(targetOffersToday[targetCounterKey] ?? 0)) + 1;
    const score = sourceSeriesScore(match);
    const data = {
      schemaVersion: 'arena-rival-series.v1', seriesId, sourceMatchId, requestId,
      proposerStableUid: who.stableUid, proposerAuthUid: who.authUid, proposerSeat,
      participantStableUids: [stableUidBySeat.a, stableUidBySeat.b],
      participantAuthUids: [authUidBySeat.a, authUidBySeat.b], stableUidBySeat, authUidBySeat,
      playerBySeat: { a: match.players?.[0] ?? {}, b: match.players?.[1] ?? {} },
      pairId: pair, dayKey, status: 'pending', wins: score.wins, draws: score.draws,
      gamesPlayed: 1, gameIndex: 1, matchIds: [sourceMatchId], processedMatchIds: [sourceMatchId],
      usedTaskIds: (privateDoc.tasks as TournamentTask[]).map((task) => task.taskId),
      createdAtMs: now, offerExpiresAtMs: now + 30_000, expiresAtMs: now + 30_000,
      expireAt: timestamp(now + 30 * DAY_MS),
    };
    tx.create(seriesRef, data);
    tx.set(profileRef, { rivalOfferDay: dayKey, rivalTargetOffersToday: targetOffersToday, updatedAtMs: now }, { merge: true });
    tx.set(publicRef, { rivalOffer: { seriesId, fromSeat: proposerSeat, expiresAtMs: now + 30_000 } }, { merge: true });
    return data;
  });
  return rivalResponse(seriesId, series, who);
});

async function readRivalStartInputs(
  tx: admin.firestore.Transaction,
  series: Json,
): Promise<{ profiles: Record<'a' | 'b', Json>; users: Record<'a' | 'b', Json>; queues: Record<'a' | 'b', Json> }> {
  const refs = (['a', 'b'] as const).flatMap((seat) => {
    const stableUid = String(series.stableUidBySeat[seat]);
    return [db.collection(ARENA_V2_COLLECTIONS.profiles).doc(stableUid),
      db.collection('users').doc(stableUid), db.collection(ARENA_V2_COLLECTIONS.queue).doc(stableUid)];
  });
  const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
  return {
    profiles: { a: snaps[0].data() ?? {}, b: snaps[3].data() ?? {} },
    users: { a: snaps[1].data() ?? {}, b: snaps[4].data() ?? {} },
    queues: { a: snaps[2].data() ?? {}, b: snaps[5].data() ?? {} },
  };
}

function assertRivalStartInputs(series: Json, input: Awaited<ReturnType<typeof readRivalStartInputs>>): void {
  for (const seat of ['a', 'b'] as const) {
    assertAvailableUser(input.users[seat], String(series.authUidBySeat[seat]));
    if (input.profiles[seat].activeMatchId) throw new HttpsError('already-exists', 'arena_active_match_exists');
    if (input.queues[seat].status === 'matched') throw new HttpsError('failed-precondition', 'arena_queue_already_matched');
  }
}

export const arenaRivalAccept = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'rival');
  const seriesId = safeId(request.data?.seriesId, 'series_id'); const requestId = safeId(request.data?.requestId, 'request_id');
  const seriesRef = db.collection(ARENA_EXPANSION_COLLECTIONS.series).doc(seriesId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`rival_accept_${requestId}`);
  const now = nowMs();
  const output = await db.runTransaction(async (tx) => {
    const [seriesSnap, receiptSnap] = await Promise.all([tx.get(seriesRef), tx.get(receiptRef)]);
    if (!seriesSnap.exists) throw new HttpsError('not-found', 'arena_rival_missing');
    const series = clone(seriesSnap.data()!);
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.seriesId !== seriesId) throw new HttpsError('already-exists', 'arena_rival_request_conflict');
      return series;
    }
    if (!series.participantStableUids.includes(who.stableUid) || !series.participantAuthUids.includes(who.authUid)
      || series.proposerStableUid === who.stableUid) throw new HttpsError('permission-denied', 'arena_rival_not_invitee');
    if (series.status !== 'pending' || now >= Number(series.offerExpiresAtMs ?? 0)) {
      throw new HttpsError('failed-precondition', 'arena_rival_offer_expired');
    }
    const capQueries = await Promise.all((series.participantStableUids as string[]).flatMap((uid) => [
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', uid)
        .where('status', 'in', ['active', 'between_games']).limit(3)),
      tx.get(db.collection(ARENA_EXPANSION_COLLECTIONS.series)
        .where('participantStableUids', 'array-contains', uid).where('status', '==', 'pending')
        .where('offerExpiresAtMs', '>', now).limit(4)),
    ]));
    if ([0, 1].some((participantIndex) => {
      const activeCount = capQueries[participantIndex * 2].size;
      const otherPendingCount = capQueries[participantIndex * 2 + 1].docs.filter((doc) => doc.id !== seriesId).length;
      return activeCount + otherPendingCount >= 3;
    })) {
      throw new HttpsError('resource-exhausted', 'arena_rival_active_limit');
    }
    const start = await readRivalStartInputs(tx, series); assertRivalStartInputs(series, start);
    const gameIndex = 2; const matchId = hash(`${seriesId}|game|${gameIndex}`).slice(0, 40);
    const division = Math.min(Number(start.profiles.a.rank ?? 0), Number(start.profiles.b.rank ?? 0));
    const previousTaskIds = new Set<string>(Array.isArray(series.usedTaskIds) ? series.usedTaskIds : []);
    const tasks = await loadExpansionTaskPool(tx, division, matchId, previousTaskIds);
    createRivalMatchWrites({ tx, seriesId, matchId, gameIndex, series, tasks,
      profiles: start.profiles, users: start.users, now, config: who.config });
    Object.assign(series, { status: 'active', activeMatchId: matchId, gameIndex,
      matchIds: [...series.matchIds, matchId], acceptRequestId: requestId, acceptedAtMs: now,
      usedTaskIds: [...previousTaskIds, ...tasks.map((task) => task.taskId)], readyBy: {},
      expiresAtMs: now + 30 * DAY_MS });
    tx.set(seriesRef, series);
    tx.create(receiptRef, { operation: 'rival_accept', seriesId, matchId, createdAtMs: now });
    return series;
  });
  return rivalResponse(seriesId, output, who);
});

export const arenaRivalNext = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'rival');
  const seriesId = safeId(request.data?.seriesId, 'series_id'); const requestId = safeId(request.data?.requestId, 'request_id');
  const seriesRef = db.collection(ARENA_EXPANSION_COLLECTIONS.series).doc(seriesId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`rival_next_${requestId}`);
  const now = nowMs();
  const output = await db.runTransaction(async (tx) => {
    const [seriesSnap, receiptSnap] = await Promise.all([tx.get(seriesRef), tx.get(receiptRef)]);
    if (!seriesSnap.exists) throw new HttpsError('not-found', 'arena_rival_missing');
    const series = clone(seriesSnap.data()!);
    if (!series.participantStableUids.includes(who.stableUid) || !series.participantAuthUids.includes(who.authUid)) {
      throw new HttpsError('permission-denied', 'arena_rival_not_participant');
    }
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.seriesId !== seriesId) throw new HttpsError('already-exists', 'arena_rival_request_conflict');
      return series;
    }
    if (series.status !== 'between_games' || series.activeMatchId) {
      if (series.status === 'complete') return series;
      throw new HttpsError('failed-precondition', 'arena_rival_not_ready');
    }
    const readyBy = { ...(series.readyBy ?? {}), [who.stableUid]: requestId };
    const bothReady = series.participantStableUids.every((uid: string) => Boolean(readyBy[uid]));
    if (!bothReady) {
      series.readyBy = readyBy;
      tx.set(seriesRef, series);
      tx.create(receiptRef, { operation: 'rival_next', seriesId, ready: true, createdAtMs: now });
      return series;
    }
    const start = await readRivalStartInputs(tx, series); assertRivalStartInputs(series, start);
    const gameIndex = 3; const matchId = hash(`${seriesId}|game|${gameIndex}`).slice(0, 40);
    const division = Math.min(Number(start.profiles.a.rank ?? 0), Number(start.profiles.b.rank ?? 0));
    const previousTaskIds = new Set<string>(Array.isArray(series.usedTaskIds) ? series.usedTaskIds : []);
    const tasks = await loadExpansionTaskPool(tx, division, matchId, previousTaskIds);
    createRivalMatchWrites({ tx, seriesId, matchId, gameIndex, series, tasks,
      profiles: start.profiles, users: start.users, now, config: who.config });
    series.status = 'active'; series.activeMatchId = matchId; series.gameIndex = gameIndex;
    series.matchIds = [...series.matchIds, matchId]; series.readyBy = {};
    series.usedTaskIds = [...previousTaskIds, ...tasks.map((task) => task.taskId)];
    tx.set(seriesRef, series); tx.create(receiptRef, { operation: 'rival_next', seriesId, matchId, createdAtMs: now });
    return series;
  });
  return rivalResponse(seriesId, output, who);
});

export const arenaRivalLeave = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'rival', true);
  const seriesId = safeId(request.data?.seriesId, 'series_id'); const requestId = safeId(request.data?.requestId, 'request_id');
  const seriesRef = db.collection(ARENA_EXPANSION_COLLECTIONS.series).doc(seriesId);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts).doc(`rival_leave_${requestId}`);
  const now = nowMs();
  const series = await db.runTransaction(async (tx) => {
    const [snap, receipt] = await Promise.all([tx.get(seriesRef), tx.get(receiptRef)]);
    if (!snap.exists) throw new HttpsError('not-found', 'arena_rival_missing');
    const data = clone(snap.data()!);
    if (!data.participantStableUids.includes(who.stableUid) || !data.participantAuthUids.includes(who.authUid)) {
      throw new HttpsError('permission-denied', 'arena_rival_not_participant');
    }
    if (receipt.exists) {
      if (receipt.data()?.seriesId !== seriesId) throw new HttpsError('already-exists', 'arena_rival_request_conflict');
      return data;
    }
    if (data.activeMatchId) throw new HttpsError('failed-precondition', 'arena_rival_game_active');
    if (data.status !== 'complete') {
      data.status = 'left'; data.leftBy = who.stableUid; data.leftAtMs = now;
      tx.set(seriesRef, data);
    }
    tx.create(receiptRef, { operation: 'rival_leave', seriesId, createdAtMs: now });
    return data;
  });
  return rivalResponse(seriesId, series, who);
});

export const arenaRivalMute = onCall(ARENA_EXPANSION_CALLABLE_OPTIONS, async (request) => {
  const who = await expansionActor(request, 'rival', true);
  const seriesId = safeId(request.data?.seriesId, 'series_id');
  const requestId = safeId(request.data?.requestId, 'request_id');
  if (typeof request.data?.muted !== 'boolean') throw new HttpsError('invalid-argument', 'arena_rival_muted_invalid');
  const muted = request.data.muted;
  const seriesRef = db.collection(ARENA_EXPANSION_COLLECTIONS.series).doc(seriesId);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const receiptRef = userSubcollection(who.stableUid, ARENA_EXPANSION_COLLECTIONS.receipts)
    .doc(`rival_mute_${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const [seriesSnap, profileSnap, receiptSnap] = await Promise.all([
      tx.get(seriesRef), tx.get(profileRef), tx.get(receiptRef),
    ]);
    if (!seriesSnap.exists || !seriesSnap.data()?.participantStableUids?.includes(who.stableUid)
      || !seriesSnap.data()?.participantAuthUids?.includes(who.authUid)) {
      throw new HttpsError('permission-denied', 'arena_rival_not_participant');
    }
    if (receiptSnap.exists) {
      if (receiptSnap.data()?.operation !== 'rival_mute' || receiptSnap.data()?.seriesId !== seriesId
        || receiptSnap.data()?.muted !== muted) throw new HttpsError('already-exists', 'arena_rival_request_conflict');
      return receiptSnap.data()!;
    }
    const pair = String(seriesSnap.data()?.pairId ?? '');
    if (!pair) throw new HttpsError('data-loss', 'arena_rival_pair_missing');
    const mutedPairs = { ...(profileSnap.data()?.rivalMutedPairs ?? {}) };
    if (muted) {
      if (mutedPairs[pair] !== true && Object.values(mutedPairs).filter(Boolean).length >= 100) {
        throw new HttpsError('resource-exhausted', 'arena_rival_mute_limit');
      }
      mutedPairs[pair] = true;
    } else {
      delete mutedPairs[pair];
    }
    const resultDoc = { operation: 'rival_mute', seriesId, muted, updatedAtMs: nowMs() };
    tx.set(profileRef, { rivalMutedPairs: mutedPairs, updatedAtMs: resultDoc.updatedAtMs }, { merge: true });
    tx.create(receiptRef, resultDoc);
    return resultDoc;
  });
  return { ok: true, seriesId, muted: result.muted };
});
