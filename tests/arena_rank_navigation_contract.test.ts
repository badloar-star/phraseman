import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Arena rank navigation contract', () => {
  it('uses the standard Arena back action to return home', () => {
    const hub = read('components/arena/ArenaHubSurface.tsx');
    expect(hub).toContain("onBack={() => router.replace('/(tabs)/home' as never)}");
    expect(hub).not.toContain('showBack={false}');
  });

  it('passes locally loaded stars only into ranked matchmaking', () => {
    const hub = read('components/arena/ArenaHubSurface.tsx');
    expect(hub).toContain('const rankedViewerStars = arenaRankStarsRouteParam(home?.profile.rating);');
    expect(hub).toContain("action.mode === 'ranked'");
    expect(hub).toContain("key === 'ranked'");
    expect(hub).toContain("activeQueue.mode === 'ranked'");
    expect(hub).toContain('{ viewerStars: rankedViewerStars }');
    expect(hub).not.toContain("viewerStars: '0'");
  });

  it('resolves rank-index assets through the existing static shield map', () => {
    const assets = read('components/arena/arena_rank_shield_assets.ts');
    expect(assets).toContain('export function arenaRankShieldAssetForRankIndex(');
    expect(assets).toContain('Number.isInteger(rankIndex)');
    expect(assets).toContain('return null;');
    expect(assets).toContain('arenaRankView(rankIndex * ARENA_STARS_PER_RANK)');
    expect(assets).not.toContain('require(`');
  });
});
