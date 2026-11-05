import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { savedSpireGroupId, spireWeekId } from './spire_groups';
import { spireIsLang } from './spire_progress_contract';
import { spireConfigStatus } from './spire_config_contract';
import { floorRecordServerEnabled } from './spire_floor_record_gate';
import { selectStepRecordVerifier, stepRecordVerifierPath, type StepRecordVerifier } from './spire_floor_record_verifier';
import { verifyTournamentAnswer, type TournamentTask } from './tournament_core';
import type { SpirePack, SpirePackSet } from './spire_pack_contract';
import { chooseFloorRecord, stepRecordChallengeSet, stepRecordKey, FLOOR_RECORD_MAX_MS, STEP_RECORD_VERSION,
  type FloorRecord, type FloorRecordSnapshot, type StepRecordReceipt } from '../../shared/spire_floor_records';

type StoredRecords = { packHash: string; records: Record<string, FloorRecord>; personal: Record<string, Record<string, FloorRecord>>;
  participantUids: string[] };
type Attempt = { uid: string; token: string; groupId: string; weekId: string; floor: number; step: number; packHash: string;
  lang: string; tier: number; taskIds: string[]; verifierTasks: readonly TournamentTask[];
  startedAtMs: number; saltId: string; set: SpirePackSet; submitted?: boolean };

/** Server-only competitive data. Never writes users, stars, energy, or ordinary progress. */
export const spireFloorRecords = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'auth_required');
  const data = request.data as Record<string, unknown> | null;
  if (!data || !spireIsLang(data.lang) || !['read', 'start', 'finish'].includes(String(data.action))) {
    throw new HttpsError('invalid-argument', 'record_request_invalid');
  }
  const { lang } = data;
  const floor = data.floor;
  if (data.action !== 'read' && (!Number.isInteger(floor) || Number(floor) < 1 || Number(floor) > 15)) {
    throw new HttpsError('invalid-argument', 'record_floor_invalid');
  }
  const step = data.step;
  if (data.action !== 'read' && !stepRecordKey(floor, step)) throw new HttpsError('invalid-argument', 'record_step_invalid');
  const db = admin.firestore();
  const configSnap = await db.collection('config').doc('spire_v1').get();
  if (!floorRecordServerEnabled(configSnap.data())) throw new HttpsError('failed-precondition', 'record_disabled');
  const uid = await resolveStableUidForAuth(db, request.auth.uid, data.stableId, { requireKnownIdentity: true, repairLinks: false });
  const weekId = spireWeekId(new Date());
  const lb = await db.collection('leaderboard').doc(uid).get();
  if (!spireConfigStatus(configSnap.data()).liveForPlayers) throw new HttpsError('failed-precondition', 'spire_paused');
  const groupId = savedSpireGroupId(lb.data(), lang, weekId);
  if (!groupId || groupId !== data.groupId || data.weekId !== weekId) throw new HttpsError('failed-precondition', 'record_room_changed');
  const groupRef = db.collection('spire_groups').doc(groupId);
  const groupSnap = await groupRef.get();
  const group = groupSnap.data();
  if (!group?.members?.[uid] || group.weekId !== weekId || group.lang !== lang || !Number.isInteger(group.tier)) {
    throw new HttpsError('permission-denied', 'record_room_membership');
  }
  const recordRef = db.collection('spire_floor_records').doc(`step-v2_${groupId}`);
  const attemptRef = db.collection('spire_floor_record_attempts').doc(`step-v2_${uid}`);
  const snapshot = (stored: StoredRecords | undefined): FloorRecordSnapshot => ({ records: stored?.records ?? {}, personal: stored?.personal?.[uid] ?? {} });
  if (data.action === 'read') return snapshot((await recordRef.get()).data() as StoredRecords | undefined);

  if (data.action === 'start') {
    const [file] = await admin.storage().bucket().file(`spire_packs/${lang}/${group.tier}/${weekId}.json`).download();
    const pack = JSON.parse(file.toString('utf8')) as SpirePack;
    if (pack.schema !== 'spire-pack-v1' || pack.weekId !== weekId || pack.lang !== lang || pack.tier !== group.tier) {
      throw new HttpsError('failed-precondition', 'record_pack_invalid');
    }
    const set = stepRecordChallengeSet(pack, Number(floor), Number(step));
    if (!set || set.tasks.length !== 10 || set.answerFingerprints.length !== 10 || set.tasks.some((task) => task.kind === 'voice')) {
      throw new HttpsError('failed-precondition', 'record_challenge_unavailable');
    }
    const [verifierFile] = await admin.storage().bucket().file(stepRecordVerifierPath(lang, group.tier, weekId, pack.packHash)).download();
    const verifier = JSON.parse(verifierFile.toString('utf8')) as StepRecordVerifier;
    const verifierTasks = selectStepRecordVerifier(verifier, pack, Number(floor), Number(step));
    const token = randomUUID();
    await db.runTransaction(async (tx) => {
      const stored = (await tx.get(recordRef)).data() as StoredRecords | undefined;
      const oldAttempt = (await tx.get(attemptRef)).data() as Attempt | undefined;
      const currentGroup = (await tx.get(groupRef)).data();
      if (!currentGroup?.members?.[uid] || spireWeekId(new Date()) !== weekId) throw new HttpsError('permission-denied', 'record_room_membership');
      if (oldAttempt && Date.now() - oldAttempt.startedAtMs < 3000) throw new HttpsError('resource-exhausted', 'record_start_busy');
      if (stored && stored.packHash !== pack.packHash) throw new HttpsError('failed-precondition', 'record_pack_changed');
      if (!stored) tx.create(recordRef, { version: STEP_RECORD_VERSION, weekId, lang, tier: group.tier, packHash: pack.packHash, records: {}, personal: {}, participantUids: [] });
      tx.set(attemptRef, { uid, token, groupId, weekId, lang, tier: group.tier,
        floor: Number(floor), step: Number(step), packHash: pack.packHash,
        taskIds: set.tasks.map(t => t.taskId), verifierTasks,
        startedAtMs: Date.now(), saltId: pack.saltId, set } satisfies Attempt);
    });
    return { token, packHash: pack.packHash, saltId: pack.saltId, set };
  }

  if (typeof data.token !== 'string' || !/^[a-f0-9-]{36}$/.test(data.token) || !Array.isArray(data.answers) || data.answers.length !== 10) {
    throw new HttpsError('invalid-argument', 'record_result_invalid');
  }
  const answers = data.answers;
  const resultRef = db.collection('spire_floor_record_results').doc(data.token);
  return db.runTransaction(async (tx) => {
    const [attemptSnap, recordSnap, currentGroup, resultSnap] = await Promise.all([tx.get(attemptRef), tx.get(recordRef), tx.get(groupRef), tx.get(resultRef)]);
    const attempt = attemptSnap.data() as Attempt | undefined;
    const stored = recordSnap.data() as StoredRecords | undefined;
    const accepted = resultSnap.data();
    // Immutable acceptance survives starting a subsequent attempt. Only its owner can replay it.
    if (accepted && accepted.version === STEP_RECORD_VERSION && accepted.uid === uid && accepted.groupId === groupId
      && accepted.weekId === weekId && accepted.lang === lang && accepted.tier === group.tier && accepted.floor === floor && accepted.step === step && accepted.receipt
      && currentGroup.data()?.members?.[uid]) return accepted.receipt;
    if (!attempt || attempt.token !== data.token || attempt.groupId !== groupId || attempt.weekId !== weekId || attempt.floor !== floor || attempt.step !== step ||
        attempt.uid !== uid || attempt.lang !== lang || attempt.tier !== group.tier ||
        !stored || stored.packHash !== attempt.packHash || !currentGroup.data()?.members?.[uid]) {
      throw new HttpsError('failed-precondition', 'record_attempt_expired');
    }
    if (attempt.submitted) throw new HttpsError('failed-precondition', 'record_receipt_missing');
    const now = Date.now();
    // Includes start-response and finish-request network latency. Never trusts client duration.
    const durationMs = now - attempt.startedAtMs;
    if (spireWeekId(new Date(now)) !== weekId || durationMs <= 0 || durationMs > FLOOR_RECORD_MAX_MS) {
      throw new HttpsError('failed-precondition', 'record_attempt_expired');
    }
    if (attempt.verifierTasks.length !== 10 || attempt.taskIds.length !== 10 || !attempt.verifierTasks.every((task, i) =>
      task.taskId === attempt.taskIds[i] && verifyTournamentAnswer(task, answers[i]))) {
      throw new HttpsError('failed-precondition', 'record_requires_ten_correct');
    }
    const key = stepRecordKey(floor, step)!;
    const candidate: FloorRecord = { uid, durationMs, completedAtMs: now };
    const records = { ...stored.records, [key]: chooseFloorRecord(stored.records[key] ?? null, candidate) };
    const personal = { ...stored.personal, [uid]: { ...stored.personal[uid], [key]: chooseFloorRecord(stored.personal[uid]?.[key] ?? null, candidate) } };
    const receipt: StepRecordReceipt = { version: STEP_RECORD_VERSION, uid, groupId, weekId,
      floor: Number(floor), step: Number(step), lang, tier: attempt.tier, taskIds: attempt.taskIds,
      packHash: attempt.packHash, token: data.token as string,
      durationMs, completedAtMs: now, correctCount: 10,
      recordSet: records[key] === candidate, personalBestSet: personal[uid][key] === candidate };
    // Queryable deletion index survives loss of the original room/membership.
    const participantUids = Array.from(new Set([...(stored.participantUids ?? []), uid]));
    tx.update(recordRef, { records, personal, participantUids });
    // зачем (владелец 04.11, тап по ступени → «рекорд и владелец»; цель экрана — 0 доп. чтений): рекорд ступени дублируется
    // в документ комнаты, который экран Пика и так читает. Имя владельца берётся клиентом из members[uid]. Только когда рекорд
    // побит (редко); весь путь живёт за серверным gate floorRecordsEnabled (по умолчанию выключен).
    if (receipt.recordSet) {
      tx.update(groupRef, { [`stepRecords.${Number(floor)}_${Number(step)}`]: { uid, durationMs } });
    }
    tx.update(attemptRef, { submitted: true });
    tx.create(resultRef, { version: STEP_RECORD_VERSION, uid, groupId, weekId, lang, tier: attempt.tier,
      floor, step, taskIds: attempt.taskIds, packHash: attempt.packHash,
      durationMs, completedAtMs: now, correctCount: 10, receipt });
    return receipt;
  });
});
