import fs from 'fs';
import path from 'path';

describe('tournament backend hardening source contracts', () => {
  const source = fs.readFileSync(path.join(__dirname, 'tournaments.ts'), 'utf8');
  const core = fs.readFileSync(path.join(__dirname, 'tournament_core.ts'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '..', '..', 'admin', 'v2', 'legacy.html'), 'utf8');

  it('exports a deadline advancement scheduler and closes rooms with TTL', () => {
    expect(source).toContain('export const tournamentAdvanceRooms = onSchedule');
    expect(source).toContain('expireAt: admin.firestore.Timestamp.fromMillis');
    expect(source).toContain("state: 'closed'");
  });

  it('runs submit, fill/cancel and finalize mutations inside transactions', () => {
    expect(source).toContain('SUBMIT_TRANSACTION_GUARD');
    expect(source).toContain('FILL_CANCEL_TRANSACTION_GUARD');
    expect(source).toContain('FINALIZE_TRANSACTION_GUARD');
    expect(source).not.toContain('const roomSnap = await roomRef.get();\n  if (!roomSnap.exists)');
  });

  /**
   * зачем 2026-07-27 (владелец: «дев удалить, и никогда логику дев не
   * использовать — обычный турнир»): раньше здесь фиксировалось исключение для
   * devRoom. Дев-режим удалён целиком, поэтому тест сторожит обратное: никаких
   * поблажек по флагу комнаты в транзакции входа не осталось.
   */
  it('keeps the join path free of dev-room exemptions', () => {
    expect(source).not.toContain('devRoom === true');
    expect(source).not.toContain('isDevRoom');
  });

  /**
   * зачем 2026-07-27 (владелец: «убери ограничение на количество игр в слот»):
   * играть можно сколько угодно раз, но лимит для комнат РАСПИСАНИЯ снимать
   * нельзя — иначе банк недели достаётся тому, кто дольше сидит в приложении.
   * Развязка сделана без исключений в транзакции: у турнира по требованию
   * собственный slotId с меткой времени, поэтому его slotKey каждый раз новый
   * и маркер профиля не совпадает. Тест держит обе половины этой развязки.
   */
  it('lets on-demand tournaments bypass the once-per-slot limit via their own slotId', () => {
    // Лимит для комнат расписания на месте — безусловный, без флагов-поблажек.
    expect(source).toContain('sanitizeString(user.tournament_last_slot_key, 200) === slotKey');
    expect(source).toContain('tournament_last_slot_key: slotKey,');
    // Турнир по требованию живёт под своим slotId с меткой времени.
    expect(source).toContain('slotId: `now-${slot.slotId}-${nowMs}`');
  });

  /**
   * зачем 2026-07-27 (владелец: «раунды все перепрыгивают через друг друга»):
   * фазы длятся 5–12 секунд, а крон стоит на минуте. Переход обязан быть
   * защищён ожидаемым состоянием и дедлайном — тогда клиенту безопасно его
   * дёргать, и он не может ускорить турнир, только не дать залипнуть.
   */
  it('guards the client-driven phase advance with expected state and deadline', () => {
    expect(source).toContain('export const tournamentAdvanceRound = onCall');
    expect(source).toContain("const expectedState = sanitizeString(request.data?.expectedState, 20);");
    expect(source).toContain('const expectedDeadlineAtMs = readInt(request.data?.expectedDeadlineAtMs, -1);');
    expect(source).toContain("if (outcome === 'waiting') throw new HttpsError('failed-precondition', 'deadline_not_elapsed');");
  });

  /**
   * zachem 2026-07-27 (vladelec: «4 voprosa v raunde»): odno i to zhe chislo
   * lezhalo v TRYOH mestah i uspelo razoytis' — server sobiral 6 zadaniy, a
   * klient schital 5, otsyuda «Vopros 5 iz 6» v shapke. Zakreplyaem ravenstvo:
   * lyuboe rashozhdenie snova dast vranyo v progresse raunda.
   */
  it('keeps tasks-per-round equal to 4 across server, planner and blueprint', () => {
    const planner = fs.readFileSync(path.join(__dirname, 'tournament_pool_plan.ts'), 'utf8');
    const blueprint = fs.readFileSync(path.join(__dirname, 'tournament_ai_blueprint.ts'), 'utf8');
    const round = fs.readFileSync(
      path.join(__dirname, '..', '..', 'app', 'tournament_round.tsx'), 'utf8');

    expect(planner).toContain('export const TASKS_PER_ROUND = 4;');
    expect(blueprint).toContain('export const TASKS_PER_ROUND = 4;');
    expect(source).toContain('const DEFAULT_TASKS_PER_ROUND = 4;');
    expect(round).toContain('const QUESTIONS_PER_ROUND = 4;');
  });

  it('does not use client elapsedMs to mint a speed bonus', () => {
    expect(source).not.toContain('given?.elapsedMs');
    expect(source).toContain('applyTournamentSubmission');
    expect(core).toContain('serverBoundedElapsedMs');
  });

  it('uses a server-only tournament receipt namespace', () => {
    expect(source).toContain("TOURNAMENT_RECEIPTS_SUBCOLLECTION");
    expect(rules).toMatch(/match \/tournament_receipts\/\{receiptId\}[\s\S]*?allow read:[\s\S]*?allow write: if false;/);
  });

  it('exposes review for 24 hours, retains private evidence seven days, and denies every client read', () => {
    expect(source).toContain("collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)");
    expect(source).toContain('tx.create(secretRef');
    expect(source).toContain('loadTasksByIds(db, initialRound.taskIds, roomId)');
    expect(rules).toMatch(/match \/tournamentRooms\/\{roomId\}\/taskSecrets\/\{taskId\}[\s\S]*?allow read, write: if false;/);
    expect(source).toContain('TOURNAMENT_REVIEW_RETENTION_MS = 24 * 60 * 60 * 1000');
    expect(source).toContain('TOURNAMENT_PRIVATE_EVIDENCE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000');
    expect(source).toContain('reviewRetentionUntilMs');
    expect(source).toContain('tx.set(secretRef, { expireAt: evidenceExpireAt }, { merge: true })');
    expect(source).not.toContain('for (const secretRef of secretRefsToDelete) tx.delete(secretRef)');
    expect(source).toContain("throw new HttpsError('failed-precondition', 'tournament_review_expired')");
    expect(source).toContain('export async function cleanupExpiredTournamentReviewEvidence');
    expect(source).toContain("db.collectionGroup(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)");
    expect(source).toContain('await cleanupExpiredTournamentReviewEvidence(db, { nowMs })');
    expect(source).toContain("throw new HttpsError('failed-precondition', 'tournament_review_evidence_unavailable')");
  });

  it('gates free test tournaments by the deployed release and removes the runtime admin switch', () => {
    const start = source.indexOf('export const tournamentStartNow');
    const end = source.indexOf('export const tournamentRoundReview', start);
    const startBlock = source.slice(start, end);
    expect(source).toContain('export function tournamentTestModeReleaseEnabled');
    expect(startBlock).toContain('if (!tournamentTestModeReleaseEnabled())');
    expect(startBlock.indexOf('if (!tournamentTestModeReleaseEnabled())'))
      .toBeLessThan(startBlock.indexOf('const db = admin.firestore()'));
    expect(startBlock).not.toContain('testingEnabled');
    const joinStart = source.indexOf('export async function tournamentJoinTransaction');
    const joinEnd = source.indexOf('export async function tournamentLeaveTransaction', joinStart);
    expect(source.slice(joinStart, joinEnd))
      .toContain("if (admissionMode === 'test' && !tournamentTestModeReleaseEnabled())");
    expect(admin).not.toContain('id="tn-testing-enabled"');
    expect(admin).not.toContain('const testingEnabled =');
  });

  it('exports a server-authoritative first-answer callable backed by private receipts', () => {
    expect(source).toContain('export const tournamentSubmitTaskAnswer = onCall');
    expect(source).toContain('export async function tournamentSubmitTaskAnswerTransaction');
    expect(source).toContain("kind: 'tournament_task_answer_v1'");
    expect(source).toContain("throw new HttpsError('already-exists', 'task_answer_idempotency_key_mismatch')");
    expect(index).toContain('tournamentSubmitTaskAnswer,');
    expect(rules).toMatch(/match \/tournamentRooms\/\{roomId\}\/taskSecrets\/\{taskId\}[\s\S]*?allow read, write: if false;/);
  });

  it('exports an exact-once pre-start leave callable with a private refund receipt', () => {
    expect(source).toContain('export async function tournamentLeaveTransaction');
    expect(source).toContain('export const tournamentLeave = onCall');
    expect(source).toContain("doc(`leave_${roomId}`)");
    expect(source).toContain("kind: 'tournament_lobby_leave_v1'");
    expect(source).toContain("throw new HttpsError('failed-precondition', 'room_not_leaveable')");
    expect(index).toContain('tournamentLeave,');
  });

  it('offers participant-triggered deadline advancement with the scheduler as fallback', () => {
    expect(source).toContain('export const tournamentAdvanceRound = onCall');
    expect(source).toContain('room.participantAuthUids?.includes(authUid)');
    expect(index).toContain('tournamentAdvanceRound,');
    expect(source).toContain("throw new HttpsError('failed-precondition', 'deadline_not_elapsed')");
  });

  it('never manufactures bot reactions while creating or filling a room', () => {
    expect(source).not.toContain('SERVER_BOT_REACTIONS');
    expect(source).not.toContain('server_bot_');
  });

  it('rechecks a join race before scheduler cancellation and fills when quorum arrived', () => {
    expect(source).toContain('async function settleAdvanceOutcome');
    expect((source.match(/settleAdvanceOutcome\(db,/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('if (!cancelled)');
    expect(source).toContain("if (fillOutcome === 'filled')");
  });

  it('rechecks transactional access before returning a persisted replay without task secrets', () => {
    const start = source.indexOf('export async function tournamentSubmitTransaction');
    const end = source.indexOf('export const tournamentSubmitAnswers', start);
    const submitSource = source.slice(start, end);
    const accessIndex = submitSource.indexOf('assertTransactionalTournamentAccess(input.authUid, stableUid');
    const replayIndex = submitSource.indexOf('if (existing && !existingTimedOut)');
    const taskParseIndex = submitSource.indexOf('const tasks = snapshots.slice');
    expect(accessIndex).toBeGreaterThan(0);
    expect(replayIndex).toBeGreaterThan(accessIndex);
    expect(taskParseIndex).toBeGreaterThan(replayIndex);
  });

  it('restricts in-progress room reads to recorded auth participants', () => {
    expect(rules).toContain("resource.data.state in ['scheduled', 'lobby']");
    expect(rules).toContain("request.auth.uid in resource.data.get('participantAuthUids', [])");
  });

  it('keeps legacy participant listeners available without opening active rooms globally', () => {
    expect(rules).toContain('function isLegacyTournamentParticipant(room)');
    expect(rules).toContain('isLegacyTournamentParticipant(resource.data)');
    expect(rules).toContain("resource.data.get('participantAuthUidsComplete', false) == true");
    expect(source).toContain('participantAuthUidsComplete: true');
    expect(rules).not.toMatch(/resource\.data\.state in \['round1'[\s\S]{0,120}request\.auth != null\s*;/);
  });

  it('recovers missing legacy deadlines and secrets through exact-once cancellation', () => {
    expect(source).toContain('legacyTournamentRecoveryAction');
    expect(source).toContain('legacy_gameplay_unverifiable');
    expect(source).toContain('fallbackTickets');
    expect(source).toContain('scanLegacyTournamentRooms');
    expect(source).toContain(".where('startsAt', '<=', nowMs)");
    expect(source).toContain(".orderBy('startsAt', 'asc')");
    expect(source).toContain('LEGACY_RECOVERY_CURSOR_DOC');
    expect(source).toContain('.startAfter(cursorStartsAt, cursorRoomId)');
    expect(source).toContain('legacyRecoveryCursorRef');
    expect(source).toContain('stateDeadlineAtMs: admin.firestore.FieldValue.delete()');
    expect(source).not.toContain('...plan.room,\n      expireAt:');
  });

  it('refreshes auth identity on replay join before rejecting new entrants at cutoff', () => {
    const replayIndex = source.indexOf('const existingPlayer = room.players.find');
    const cutoffIndex = source.indexOf("throw new HttpsError('failed-precondition', 'join_cutoff_elapsed')");
    expect(replayIndex).toBeGreaterThan(0);
    expect(cutoffIndex).toBeGreaterThan(replayIndex);
    expect(source).toContain('participantAuthUids: replayRoom.participantAuthUids');
    expect(source).toContain('players: replayRoom.players.map(publicTournamentPlayer)');
  });

  it('reads the canonical public profile for scheduled and Start Now joins', () => {
    const reads = source.match(/db\.collection\('public_profiles'\)\.doc\(stableUid\)/g) ?? [];
    expect(reads).toHaveLength(2);
    expect(source).toContain('publicProfile: publicProfileSnap.exists');
  });

  it('accepts the authenticated client profile as a last-resort join hint', () => {
    const callableForwards = source.match(/profileHint: request\.data\?\.profile/g) ?? [];
    expect(callableForwards).toHaveLength(2);
    expect(source).toContain('tournamentProfileHint(input.profileHint)');
  });

  it('exports the production transaction handlers used by callables and emulator tests', () => {
    for (const handler of [
      'tournamentJoinTransaction',
      'tournamentFillRoomTransaction',
      'tournamentSubmitTransaction',
      'tournamentCancelTransaction',
      'tournamentFinalizeTransaction',
      'tournamentClaimTransaction',
      'advanceRoomAtDeadline',
      'cleanupExpiredTournamentReviewEvidence',
      'scanLegacyTournamentRooms',
    ]) {
      expect(source).toContain(`export async function ${handler}`);
    }
    expect(source).not.toContain('loadTasksByIds(db, activeRound.taskIds, initialRoom.roomId).catch(() => null)');
    expect(source).toContain('loadCompleteTournamentTasks');
  });

  it('bounds every task and the complete fill write-set before Firestore writes', () => {
    expect(core).toContain('TOURNAMENT_TASK_LIMITS');
    expect(core).toContain('TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES = 384 * 1_024');
    expect(core).toContain("Buffer.byteLength(value as string, 'utf8')");
    expect(core).toContain('validateTournamentFillMutation');
    expect(source).toContain('const fillValidation =');
    expect(source).toContain('validateTournamentFillMutation({');
    expect(source).toContain("cancelRoomInTransaction(db, tx, roomRef, room, 'resources_unavailable'");
  });

  it('играет только на вопросах от ИИ — задания из планов в турнир не попадают', () => {
    // Решение владельца 2026-07-26: задания, нарезанные из фраз обучающих
    // планов, ОСТАЮТСЯ в базе, но не участвуют в турнирах — фраза урока не
    // работает как соревновательный вопрос. Фильтр стоит в двух местах:
    // общий пул и кураторский дочит по id (иначе набор протащил бы их в обход).
    const poolStart = source.indexOf('async function loadResourcePool');
    const poolEnd = source.indexOf('CuratedRoomSelection', poolStart);
    expect(source.slice(poolStart, poolEnd)).toContain("where('source', '==', 'ai')");

    const curatedStart = source.indexOf('async function loadCuratedForRoom');
    const curatedEnd = source.indexOf('function buildRounds', curatedStart);
    expect(source.slice(curatedStart, curatedEnd)).toContain("taskSnap.get('source') === 'ai'");
  });

  it('cancels deterministic legacy resource failure without retrying the same fill path', () => {
    const start = source.indexOf("if (outcome === 'cancel_resources')");
    const end = source.indexOf("if (outcome === 'cancel_legacy')", start);
    const branch = source.slice(start, end);
    expect(branch).toContain("tournamentCancelTransaction(db, roomRef, 'resources_unavailable')");
    expect(branch).not.toContain('loadResourcePool');
    expect(branch).not.toContain('tournamentFillRoomTransaction');
  });
});
