import { ARENA_RANK_COUNT, arenaRankIndex } from './rank_engine';

export function arenaViewerRankIndex(viewerStars: number | null): number | null {
  if (viewerStars === null || !Number.isFinite(viewerStars) || viewerStars < 0) return null;
  return arenaRankIndex(viewerStars);
}

export function arenaEligibleRankIndices(viewerStars: number | null): readonly number[] {
  const viewerRankIndex = arenaViewerRankIndex(viewerStars);
  if (viewerRankIndex === null) return [];
  return [viewerRankIndex - 1, viewerRankIndex, viewerRankIndex + 1]
    .filter((rankIndex) => rankIndex >= 0 && rankIndex < ARENA_RANK_COUNT);
}
