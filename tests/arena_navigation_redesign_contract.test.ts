import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena detail navigation after the main-tab move', () => {
  const DETAILS = [
    'app/arena_ranks.tsx',
    'app/arena_tops.tsx',
    'app/arena_history.tsx',
    'app/arena_star_wallet.tsx',
  ];

  it.each(DETAILS)('%s does not mount the retired private chrome', (rel) => {
    expect(read(rel)).not.toContain('ArenaHubChrome');
  });

  it('keeps Ranks personal and Tops social', () => {
    const ranks = read('app/arena_ranks.tsx');
    expect(ranks).not.toContain('arenaV2FriendsBoard');
    expect(ranks).not.toContain('friends.map');
    expect(read('app/arena_tops.tsx')).toContain('arenaV2FriendsBoard');
  });

  it('opens the exact review from every history row', () => {
    const history = read('app/arena_history.tsx');
    expect(history).toContain("pathname: '/arena_review'");
    expect(history).toContain('params: { matchId: row.matchId }');
    expect(history).toContain('accessibilityRole="button"');
  });

  it('redirects the retired Arena season route to the existing Season Pass', () => {
    const season = read('app/arena_season_pass.tsx');
    expect(season).toContain('<Redirect href="/season_pass"');
    expect(season).not.toContain('arenaClaimSeasonReward');
  });
});
