import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Arena rank-shield versus intro', () => {
  it('collides two explicit rank shields instead of avatars', () => {
    const intro = read('components/arena/ArenaVersusIntro.tsx');
    expect(intro).toContain('youRankIndex?: number | null;');
    expect(intro).toContain('opponentRankIndex?: number | null;');
    expect(intro).toContain('arenaRankShieldAssetForRankIndex');
    expect(intro).toContain('<Image source={youRankAsset}');
    expect(intro).toContain('<Image source={opponentRankAsset}');
    expect(intro).not.toContain('AvatarView');
    expect(intro).toContain("you?.name ?? '—'");
    expect(intro).toContain("opponent?.name ?? '—'");
    expect(intro).toContain('countdownTick');
    expect(intro).toContain('countdownGo');
  });

  it('passes route rank context into the intro and preserves the gameplay HUD', () => {
    const match = read('app/arena_match.tsx');
    expect(match).toContain('type ArenaMatchRouteParams = { matchId?: string; prepared?: string; viewerStars?: string };');
    expect(match).toContain('const introViewerRankIndex = arenaViewerRankIndex(viewerStars);');
    expect(match).toContain('youRankIndex={introViewerRankIndex}');
    expect(match).toContain('const introOpponentRankIndex = plan?.opponent.rank ?? null;');
    expect(match).toContain('opponentRankIndex={introOpponentRankIndex}');
    expect(match).toContain('<ArenaPlayers');
    expect(match).toContain('players={players}');
    expect(match).toContain('scoreUid={plan.viewerSeat}');
  });

  it('keeps ranked opponents within the existing same-or-neighbour server rule', () => {
    const core = read('functions/src/arena_v2_core.ts');
    const server = read('functions/src/arena_v2.ts');
    expect(core).toContain("return mode === 'ranked' ? 1 : 3;");
    expect(server).toContain('rank: profile.rank');
  });
});
