import fs from 'fs';
import path from 'path';
import {
  arenaEligibleRankIndices,
  arenaViewerRankIndex,
} from '../modules/arena/rank_matchmaking_visual';
import { ARENA_RANK_COUNT, ARENA_STARS_PER_RANK } from '../modules/arena/rank_engine';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('ranked Arena matchmaking scene', () => {
  it('limits the reel to the same rank or a direct neighbour', () => {
    expect(arenaEligibleRankIndices(0)).toEqual([0, 1]);
    expect(arenaEligibleRankIndices(8 * ARENA_STARS_PER_RANK)).toEqual([7, 8, 9]);
    expect(arenaEligibleRankIndices((ARENA_RANK_COUNT - 1) * ARENA_STARS_PER_RANK)).toEqual([
      ARENA_RANK_COUNT - 2,
      ARENA_RANK_COUNT - 1,
    ]);
    expect(arenaEligibleRankIndices(null)).toEqual([]);
    expect(arenaEligibleRankIndices(Number.NaN)).toEqual([]);
    expect(arenaViewerRankIndex(null)).toBeNull();
  });

  it('uses transform-only UI-thread motion and lifecycle guards', () => {
    const scene = read('components/arena/ArenaRankMatchmakingScene.tsx');
    expect(scene).toContain('arenaRankShieldAssetForRankIndex');
    expect(scene).toContain('withRepeat(');
    expect(scene).toContain('withSequence(');
    expect(scene).toContain('withTiming(');
    expect(scene).toContain('cancelAnimation(');
    expect(scene).toContain('duration: 260');
    expect(scene).not.toContain('duration: 520');
    expect(scene).toMatch(/!active\s*\|\|\s*reduceMotion/);
    expect(scene).toContain('translateY');
    expect(scene).not.toContain('setInterval');
    expect(scene).not.toContain('setTimeout');
    expect(scene).not.toContain('rotate');
    expect(scene).not.toContain('blur');
  });

  it('keeps quick search intact and uses the rank scene only in ranked mode', () => {
    const screen = read('app/arena_matchmaking.tsx');
    expect(screen).toContain("mode === 'ranked' ? (");
    expect(screen).toContain('<ArenaRankMatchmakingScene');
    expect(screen).toContain('<ArenaSearchPulse />');
    expect(screen).toContain('viewerStars={viewerStars}');
    expect(screen).toContain('reduceMotion={reduceMotion}');
    expect(screen).toContain("params: { matchId, prepared: '1', ...(viewerStarsParam ? { viewerStars: viewerStarsParam } : {}) }");
  });
});
