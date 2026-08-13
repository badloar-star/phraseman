import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'arena_v2.ts'), 'utf8');
const core = readFileSync(path.join(__dirname, 'arena_v2_core.ts'), 'utf8');

describe('Arena V2 backend source contract', () => {
  it('exports the complete isolated callable surface', () => {
    for (const name of [
      'arenaV2Home', 'arenaV2FindMatch', 'arenaV2QueueCancel', 'arenaV2QuickBotFallback',
      'arenaV2MatchAccept', 'arenaV2MatchDecline', 'arenaV2SubmitAnswer',
      'arenaV2SubmitSpeedAttempt', 'arenaV2SyncMatch', 'arenaV2Forfeit',
      'arenaV2InviteCreate', 'arenaV2InviteAccept', 'arenaV2InviteDecline',
      'arenaV2SeasonClaim', 'arenaV2SpinStatus', 'arenaV2SpinClaim', 'arenaV2CleanupHourly',
    ]) expect(source).toContain(`export const ${name} =`);
  });

  it('reuses only pure Tournament publication contracts and never imports runtime', () => {
    expect(source).not.toMatch(/from ['"]\.\/tournaments['"]/);
    expect(source).toContain("from './tournament_pool_publication'");
    expect(source).not.toContain('buildNewTournamentPool(');
    expect(source).toContain(".where('poolVersion', '==', NEW_TOURNAMENT_POOL_VERSION)");
    expect(source).toContain('verifyTournamentPoolTaskProof(raw, NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256)');
    expect(source).toContain('.startAt(cursor).limit(cell.count)');
    expect(source).toContain('tasks.length > ARENA_V2_MAX_TASK_DOC_READS');
    expect(core).toContain('ARENA_V2_MAX_TASK_DOC_READS = 10');
  });

  it('keeps task secrets and identities out of the persisted public match', () => {
    expect(core).toContain('toPublicTournamentTask(task)');
    expect(core).not.toContain('toPublicTournamentTask(task,');
    expect(source).toContain("uid: index === 0 ? 'a' : 'b'");
    expect(source).toContain('.collection(ARENA_V2_COLLECTIONS.members).doc(authUid)');
    const publicBuilder = source.slice(source.indexOf('publicDoc: {'), source.indexOf('privateDoc,\n  };', source.indexOf('publicDoc: {')));
    expect(publicBuilder).not.toContain('participantStableUids');
    expect(publicBuilder).not.toContain('participantAuthUids');
    expect(source).toContain('closedField =');
    expect(source).toContain('seatAwards:');
    const publicReward = source.match(/rewards\[publicSeat\] = \{\s+starsEarned,[\s\S]*?\n\s+\};/)?.[0] ?? '';
    expect(publicReward).toContain('ratingDelta');
    expect(publicReward).not.toContain('seasonStarsAfter');
    expect(publicReward).not.toContain('spinAwarded');
  });

  it('has bounded queue/cleanup operations and a six-second bot recheck', () => {
    expect(source).not.toMatch(/\.limit\((?:1[1-9]|[2-9]\d+)\).*queue/);
    expect(source).toContain(".orderBy('joinedAtMs', 'asc').limit(10)");
    expect(source).toContain('arena_quick_bot_too_early');
    expect(source).toContain(".where('mode', '==', 'quick').where('status', '==', 'waiting')");
    expect(source).toContain('CLEANUP_BATCH_LIMIT = 100');
    expect(source).toContain('reconcileOrphanMatch(orphan.id, now)');
    expect(source).toContain('const MAX_SPEED_ATTEMPT_IDS = 40');
    expect(source).toContain('const equivalent = Object.values');
  });

  it('uses stable auth, release gates, HMAC pair/invite/spin inputs and exactly-once receipts', () => {
    expect(source).toContain('resolveStableUidForAuth');
    expect(source).toContain("collection(ARENA_V2_COLLECTIONS.config).doc('current')");
    expect(source).toContain('config.contentPublication?.manifestSha256 !== NEW_TOURNAMENT_POOL_CONTENT_SHA256');
    expect(source).toContain('request.data?.clientVersion, config.minClientVersion');
    expect(source).toContain("arenaActor(request, 'home', true)");
    expect(source).toContain('availability: {');
    expect(source).toContain('ARENA_V2_PAIR_HMAC_KEY');
    expect(source).toContain('ARENA_V2_INVITE_HMAC_KEY');
    expect(source).toContain('ARENA_V2_SPIN_HMAC_KEY');
    expect(source).toContain('tx.create(entry.receipt');
    expect(source).toContain("expireAt: timestamp(now + 400 * 24 * 60 * 60 * 1_000)");
    expect(source).toContain("throw new HttpsError('failed-precondition', 'arena_spin_credit_expired')");
    expect(source).toContain('tx.get(availableQuery)');
    expect(source).toContain("closeReason: 'friend_match'");
    expect(source).toContain("throw new HttpsError('failed-precondition', 'arena_invite_host_unavailable')");
    expect(source).not.toContain('randomInt(');
  });

  it('keeps ranked human-only, strict range, pair reservations and server settlement guards', () => {
    expect(core).toContain("return mode === 'ranked' ? 1 : 3");
    // Публичный opponentKind теперь всегда 'human' (бот не раскрывается),
    // поэтому целостность рейтинга держится на числе живых участников.
    expect(source).toContain('humans.length !== 2');
    expect(source).not.toContain("match.opponentKind !== 'human'");
    expect(source).not.toContain('Training opponent');
    expect(source).not.toContain('Arena Bot');
    expect(source).toContain("Math.abs(divisions[0] - divisions[1]) > 1");
    expect(source).toContain('reservationExpiresAtMs');
    expect(source).toContain('pairLimitCommitted');
    expect(source).toContain('if (possibleProfile.activeMatchId || !arenaRanksCompatible');
    expect(source).toContain('!arenaAcceptanceOpen(now, Number(match.stateDeadlineAtMs))');
  });

  it('keeps pity across 63-day season boundaries in the Arena profile', () => {
    expect(core).toContain('ARENA_V2_SEASON_LENGTH_DAYS = 63');
    expect(source).toContain('pityBefore: profile.spinPity');
    expect(source).toContain('spinPity: spin.pityAfter');
  });
});
