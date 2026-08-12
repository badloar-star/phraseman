import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

describe('Arena V2 integration boundary', () => {
  test('ships the new Arena without unlocking retired Tournaments', () => {
    const config = read('app/config.ts');
    expect(config).toContain('export const ENABLE_ARENA = true;');
    expect(config).toContain('export const ENABLE_TOURNAMENTS: false = false;');

    const layout = read('app/_layout.tsx');
    expect(layout).toContain('<Stack.Protected guard={ENABLE_ARENA}>');
    for (const route of [
      'arena',
      'arena_matchmaking',
      'arena_match',
      'arena_results',
      'arena_friend_duel',
      'arena_invite',
      'arena_ranks',
      'arena_season_pass',
      'arena_today',
      'arena_match_lab',
      'arena_ghost_duel',
      'arena_rivalries',
      'arena_mastery_map',
      'arena_partner',
      'arena_star_wallet',
    ]) {
      expect(layout).toContain(`<Stack.Screen name="${route}"`);
    }
    expect(layout).toContain('<Stack.Protected guard={ENABLE_TOURNAMENTS}>');
  });

  test('exposes Arena from Home and keeps lime foreground dark', () => {
    expect(read('app/(tabs)/home.tsx')).toContain('<ArenaHomeCard />');
    const card = read('components/arena/ArenaHomeCard.tsx');
    expect(card).toContain("router.push('/arena' as never)");
    expect(card).toContain("colors={['#C7FF4A', '#72E86E', '#43C9A5']}");
    expect(card).toContain("color: '#07110A'");
    expect(card).toContain('width: 44');
    expect(card).toContain('height: 44');
  });

  test('uses only versioned Arena roots and does not import retired Tournament runtime', () => {
    const backend = read('functions/src/arena_v2.ts');
    expect(backend).not.toMatch(/from ['"]\.\/tournaments['"]/);
    expect(read('functions/src/arena_v2_core.ts')).toContain("taskSource: 'tournamentTasks'");
    expect(read('functions/src/tournament_release_gate.ts')).toContain('TOURNAMENTS_RELEASED = false');

    const rules = read('firestore.rules');
    for (const collection of [
      'arena_v2_profiles',
      'arena_v2_queue',
      'arena_v2_matches',
      'arena_v2_match_private',
      'arena_v2_invites',
    ]) {
      expect(rules).toContain(`match /${collection}/`);
    }
  });

  test('declares every bounded runtime composite index', () => {
    const indexes = JSON.parse(read('firestore.indexes.json')) as { indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string }> }> };
    const signatures = indexes.indexes.map((index) => `${index.collectionGroup}:${index.fields.map((field) => field.fieldPath).join(',')}`);
    expect(signatures).toContain('tournamentTasks:poolVersion,mode,difficulty,__name__');
    expect(signatures).toContain('arena_v2_queue:mode,status,joinedAtMs');
    expect(signatures).toContain('arena_v2_matches:terminal,stateDeadlineAtMs');
    expect(signatures).toContain('arena_v2_invites:fromStableUid,status');
    expect(signatures).toContain('arena_v2_spin_credits:status,expiresAtMs');
  });

  test('exports the complete callable surface from the deployed Functions entrypoint', () => {
    const index = read('functions/src/index.ts');
    for (const name of [
      'arenaV2Home', 'arenaV2FindMatch', 'arenaV2QueueCancel', 'arenaV2QuickBotFallback',
      'arenaV2MatchAccept', 'arenaV2MatchDecline', 'arenaV2SubmitAnswer',
      'arenaV2SubmitSpeedAttempt', 'arenaV2SyncMatch', 'arenaV2Forfeit',
      'arenaV2InviteCreate', 'arenaV2InviteAccept', 'arenaV2InviteDecline',
      'arenaV2SeasonClaim', 'arenaV2SpinStatus', 'arenaV2SpinClaim',
      'arenaV2CleanupHourly',
    ]) {
      expect(index).toContain(name);
    }
    expect(index).toContain("from './arena_v2'");
  });

  test('keeps Arena economy separate from Learning V2 authority', () => {
    const arenaFiles = [
      'functions/src/arena_v2.ts',
      'functions/src/arena_v2_core.ts',
      'app/arena_client.ts',
      'modules/arena/contract.ts',
    ].map(read).join('\n');
    expect(arenaFiles).not.toMatch(/v2_star_journal|v2_wallet|learning_v2|LearningV2/);
  });
});
