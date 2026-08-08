import fs from 'fs';
import path from 'path';

const CLIENT_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'tournament_client.ts'),
  'utf8',
);
const SEASON_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'tournament_season.tsx'),
  'utf8',
);

describe('tournament season stars contract', () => {
  test('season standings identify the current player by canonical stable uid', () => {
    const loadBlock = CLIENT_SOURCE.slice(
      CLIENT_SOURCE.indexOf('export async function loadSeasonStandings'),
      CLIENT_SOURCE.indexOf('/**', CLIENT_SOURCE.indexOf('export async function loadSeasonStandings') + 1),
    );

    expect(CLIENT_SOURCE).toContain("import { getStableId, peekStableId } from './stable_id';");
    expect(loadBlock).toContain("const myUid = await getStableId().catch(() => '');");
    expect(loadBlock).not.toContain('getAuth(');
    expect(loadBlock).not.toContain("currentUser?.uid");
  });

  test('season standings cache is scoped by stable uid to avoid stale self rows after identity changes', () => {
    expect(CLIENT_SOURCE).toContain('stableUid: string; value: SeasonStandings | null');
    expect(CLIENT_SOURCE).toContain('seasonCache.stableUid === myUid');
    expect(CLIENT_SOURCE).toContain('seasonCache = { at: now, weekId, stableUid: myUid, value }');
    expect(CLIENT_SOURCE).toContain('const stableUid = peekStableId();');
    expect(CLIENT_SOURCE).toContain('if (!stableUid || seasonCache.stableUid !== stableUid) return null;');
  });

  test('full season table renders and announces starsTotal, not weekly place points', () => {
    const rowBlock = SEASON_SOURCE.slice(
      SEASON_SOURCE.indexOf('const SeasonRowItem = memo'),
      SEASON_SOURCE.indexOf('const makeStyles'),
    );

    expect(rowBlock).toContain('row.starsTotal');
    expect(rowBlock).toContain('season-row-stars');
    expect(rowBlock).not.toContain('season-row-points');
    expect(rowBlock).not.toMatch(/row\.points\s*}\s*<\/FlowText>/);
    expect(rowBlock).not.toMatch(/\$\{row\.points\}/);
  });
});
