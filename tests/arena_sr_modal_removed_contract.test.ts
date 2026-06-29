import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('arena SR explainer modal removal', () => {
  it('does not auto-open the season ending-soon SR explainer from the arena lobby', () => {
    const lobbySource = fs.readFileSync(path.join(ROOT, 'app', 'arena_lobby.tsx'), 'utf8');

    expect(lobbySource).not.toContain("kind=\"ending_soon\"");
    expect(lobbySource).not.toContain('setSeasonEndingSoonModal');
    expect(lobbySource).not.toContain('seasonEndingSoonShownRef');
    expect(lobbySource).toContain("useOverlayVisible('arenaSeasonResult', seasonEndedModal !== null)");
    expect(lobbySource).toContain('visible={seasonResultVisible}');
  });

  it('does not open the ceiling-reached SR explainer after arena results', () => {
    const resultsSource = fs.readFileSync(path.join(ROOT, 'app', 'arena_results.tsx'), 'utf8');

    expect(resultsSource).not.toContain("kind=\"ceiling_reached\"");
    expect(resultsSource).not.toContain('setSeasonCeilingModal');
    expect(resultsSource).not.toContain('seasonCeilingModal');
  });

  it('uses plain season-rating wording in visible arena UI instead of raw SR abbreviation', () => {
    const ratingSource = fs.readFileSync(path.join(ROOT, 'app', 'arena_rating.tsx'), 'utf8');
    const seasonTopSource = fs.readFileSync(path.join(ROOT, 'app', 'arena_season_leaderboard.tsx'), 'utf8');

    expect(ratingSource).toContain('seasonRatingLabel(lang)');
    expect(ratingSource).toContain('сезонный рейтинг');
    expect(ratingSource).not.toContain('} SR');

    expect(seasonTopSource).toContain('seasonRatingShortLabel(lang)');
    expect(seasonTopSource).toContain('сез. рейтинг');
    expect(seasonTopSource).toContain('сезонный рейтинг');
    expect(seasonTopSource).not.toContain('} SR');
  });
});
