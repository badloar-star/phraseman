import {
  getLeagueSwipePreviewState,
  swipeLeaguePreview,
} from '../app/league_swipe_preview';

describe('league swipe preview', () => {
  it('hides live league content while previewing another league and restores it on my league', () => {
    const myLeagueId = 2;
    const leagueCount = 12;

    const preview = swipeLeaguePreview(myLeagueId, 1, leagueCount);
    expect(preview).toBe(3);
    expect(getLeagueSwipePreviewState(myLeagueId, preview)).toEqual({
      previewLeagueId: 3,
      isPreviewingMyLeague: false,
      shouldShowLiveContent: false,
    });

    const backToMine = swipeLeaguePreview(preview, -1, leagueCount);
    expect(backToMine).toBe(myLeagueId);
    expect(getLeagueSwipePreviewState(myLeagueId, backToMine)).toEqual({
      previewLeagueId: myLeagueId,
      isPreviewingMyLeague: true,
      shouldShowLiveContent: true,
    });
  });

  it('wraps around the first and last league cards', () => {
    expect(swipeLeaguePreview(0, -1, 12)).toBe(11);
    expect(swipeLeaguePreview(11, 1, 12)).toBe(0);
  });
});
