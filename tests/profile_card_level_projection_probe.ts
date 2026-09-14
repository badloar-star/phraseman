import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const publicProjection = read('functions/src/public_profile_projection.ts');
assert.ok(
  publicProjection.includes('profileCardLevel: boundedInt(input.profileCardLevel, 0, 5, 0)'),
  'public profile projection does not preserve profile-card levels 0..5',
);

const league = read('functions/src/league_groups.ts');
assert.equal(
  (league.match(/Math\.max\(0, Math\.min\(5, readInt\([^\n]*profileCardLevel/g) ?? []).length,
  3,
  'all three league profile-card projections must preserve levels 0..5',
);
assert.ok(!/Math\.min\(1, readInt\([^\n]*profileCardLevel/.test(league), 'league still truncates card levels to I');

const sync = read('functions/src/sync_leaderboard.ts');
assert.ok(
  sync.includes("Math.max(0, Math.min(5, parseInt(progress['profile_card_level'] ?? '0') || 0))"),
  'legacy leaderboard repair truncates card levels to I',
);

const index = read('functions/src/index.ts');
assert.ok(index.includes('publicProfileProjectMine'), 'public profile callable export is missing');
for (const callable of ['leagueJoinOrUpdateGroup', 'leagueUpdateMyMember', 'leagueActivateGroupBoost']) {
  assert.ok(index.includes(callable), `league callable export is missing: ${callable}`);
}
assert.ok(!index.includes('syncLeaderboardFromUsers'), 'dead legacy sync helper must not become deployable');

console.log('PROFILE CARD LEVEL PROJECTION PROBE: PASS');
