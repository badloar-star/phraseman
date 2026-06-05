export interface LeagueSwipePreviewState {
  previewLeagueId: number;
  isPreviewingMyLeague: boolean;
  shouldShowLiveContent: boolean;
}

export function swipeLeaguePreview(currentPreviewLeagueId: number, direction: number, leagueCount: number): number {
  const count = Math.max(1, Math.floor(leagueCount));
  const normalizedDirection = direction < 0 ? -1 : 1;
  const current = ((Math.floor(currentPreviewLeagueId) % count) + count) % count;
  return (current + normalizedDirection + count) % count;
}

export function getLeagueSwipePreviewState(myLeagueId: number, previewLeagueId: number): LeagueSwipePreviewState {
  const normalizedMyLeagueId = Math.max(0, Math.floor(myLeagueId));
  const normalizedPreviewLeagueId = Math.max(0, Math.floor(previewLeagueId));
  const isPreviewingMyLeague = normalizedPreviewLeagueId === normalizedMyLeagueId;
  return {
    previewLeagueId: normalizedPreviewLeagueId,
    isPreviewingMyLeague,
    shouldShowLiveContent: isPreviewingMyLeague,
  };
}
