import fs from 'fs';
import path from 'path';

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'backfill_tournament_season_stars.mjs');

describe('tournament season stars backfill script contract', () => {
  test('backfill exists as dry-run by default and requires explicit apply flag', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
    const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(source).toContain('const apply = args.has(\'--apply\');');
    expect(source).toContain('PHRASEMAN_TOURNAMENT_STARS_BACKFILL_APPLY');
    expect(source).toContain('DRY RUN');
    expect(source).toContain('starsTotal');
    expect(source).toContain('starsTotal,');
    expect(source).toContain("starsBackfillSource: 'tournamentRooms.players.score'");
    expect(source).toContain("const FINALIZED_BACKFILL_STATES = ['rewards', 'final', 'closed'];");
    expect(source).toContain("state', 'in', FINALIZED_BACKFILL_STATES");
    expect(source).toContain('function isTournamentTestRoom(room, roomId)');
    expect(source).toContain('function hasZeroEntryEconomySnapshot(room)');
    expect(source).toContain('function isBackfillEligibleRoom(room, roomId)');
    expect(source).toContain('skippedNonRewardingRooms');
    expect(source).toContain('if (!isBackfillEligibleRoom(data, doc.id))');
  });
});
