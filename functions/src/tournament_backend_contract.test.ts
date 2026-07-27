import fs from 'fs';
import path from 'path';

describe('tournament backend hardening source contracts', () => {
  const source = fs.readFileSync(path.join(__dirname, 'tournaments.ts'), 'utf8');
  const core = fs.readFileSync(path.join(__dirname, 'tournament_core.ts'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');

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
   * зачем 2026-07-27 (владелец: «дев турнир не создался slot_already_played,
   * такого не должно быть, дев без ограничений»): лимит «один турнир на слот в
   * день» правильный для боевых окон, но дев-комнаты живут под общим ключом
   * dev-…, поэтому второй тестовый прогон за день всегда упирался в свой же
   * slotKey. Обе половины исключения фиксируем тестом: и проверку, и запись
   * маркера — иначе дев-прогон занял бы владельцу настоящее окно на весь день.
   */
  it('exempts dev rooms from the once-per-slot limit, both check and marker', () => {
    expect(source).toContain("const isDevRoom = roomSnap.data()?.devRoom === true;");
    expect(source).toContain("if (!isDevRoom && sanitizeString(user.tournament_last_slot_key, 200) === slotKey)");
    expect(source).toContain('...(isDevRoom ? {} : {');
    expect(source).toContain('tournament_last_slot_key: slotKey,');
    // Маркер обязан жить ВНУТРИ условной ветки, иначе дев снова сожжёт окно.
    const markerAt = source.indexOf('tournament_last_slot_key: slotKey,');
    const guardAt = source.indexOf('...(isDevRoom ? {} : {');
    expect(guardAt).toBeGreaterThan(0);
    expect(markerAt).toBeGreaterThan(guardAt);
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

  it('does not use client elapsedMs to mint a speed bonus', () => {
    expect(source).not.toContain('given?.elapsedMs');
    expect(source).toContain('applyTournamentSubmission');
    expect(core).toContain('serverBoundedElapsedMs');
  });

  it('uses a server-only tournament receipt namespace', () => {
    expect(source).toContain("TOURNAMENT_RECEIPTS_SUBCOLLECTION");
    expect(rules).toMatch(/match \/tournament_receipts\/\{receiptId\}[\s\S]*?allow read:[\s\S]*?allow write: if false;/);
  });

  it('freezes immutable task secrets per room and denies every client read', () => {
    expect(source).toContain("collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)");
    expect(source).toContain('tx.create(secretRef');
    expect(source).toContain('loadTasksByIds(db, initialRound.taskIds, roomId)');
    expect(rules).toMatch(/match \/tournamentRooms\/\{roomId\}\/taskSecrets\/\{taskId\}[\s\S]*?allow read, write: if false;/);
    expect(source).toContain('for (const secretRef of secretRefsToDelete) tx.delete(secretRef)');
  });

  it('offers participant-triggered deadline advancement with the scheduler as fallback', () => {
    expect(source).toContain('export const tournamentAdvanceRound = onCall');
    expect(source).toContain('room.participantAuthUids?.includes(authUid)');
    expect(index).toContain('tournamentAdvanceRound,');
    expect(source).toContain("throw new HttpsError('failed-precondition', 'deadline_not_elapsed')");
  });

  it('rechecks a join race before scheduler cancellation and fills when quorum arrived', () => {
    expect(source).toContain('async function settleAdvanceOutcome');
    expect((source.match(/settleAdvanceOutcome\(db,/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('if (!cancelled)');
    expect(source).toContain("if (fillOutcome === 'filled')");
  });

  it('returns a persisted replay before immutable task secrets are cleaned up', () => {
    const replayIndex = source.indexOf('const initialReplay = initialRound.results?.[stableUid]');
    const taskLoadIndex = source.indexOf('loadTasksByIds(db, initialRound.taskIds, roomId)');
    expect(replayIndex).toBeGreaterThan(0);
    expect(taskLoadIndex).toBeGreaterThan(replayIndex);
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
