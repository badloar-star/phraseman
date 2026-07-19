import fs from 'fs';
import path from 'path';

describe('current league icon content alignment', () => {
  it('uses centered v6 DALL-E icons without legacy per-league offsets', () => {
    const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');

    expect(engineSource).toContain('league-icon-med.webp');
    expect(screenSource).toContain('LEAGUE_ICON_SOURCE_SIZE = 384');
    expect(screenSource).toContain('LEAGUE_ICON_RENDER_SAFE_SCALE = 0.94');
    expect(screenSource).toContain('const LEAGUE_ICON_CONTENT_OFFSETS: Record<number, { x: number; y: number }> = {}');
    expect(screenSource).not.toContain('0: { x: -13, y: -14 }');
    expect(screenSource).toContain('getLeagueIconContentOffset(Number(league?.id), size)');
    expect(screenSource).toContain('const renderSize = Math.max(1, Math.round(size * LEAGUE_ICON_RENDER_SAFE_SCALE))');
    expect(screenSource).toContain('translateX: safeContentOffset.x');
    expect(screenSource).toContain('translateY: safeContentOffset.y');
  });

  it('renders the active league heraldry in a fixed hero icon slot', () => {
    const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const heroSource = fs.readFileSync(path.join(process.cwd(), 'components', 'league', 'LeagueHeroStatus.tsx'), 'utf8');

    expect(screenSource).toContain('leagueIcon={<LeagueIcon');
    expect(screenSource).toContain('league={myLeague}');
    expect(screenSource).toContain('size={96}');
    expect(screenSource).toContain('alignContent={false}');
    expect(heroSource).toContain('leagueIcon: React.ReactNode');
    expect(heroSource).toContain('testID="league-hero-status"');
    expect(heroSource).toContain('iconClip: {');
    expect(heroSource).toContain('width: 110');
    expect(heroSource).toContain('height: 110');
    expect(heroSource).toContain('{leagueIcon}');
    expect(screenSource).not.toContain('CLUB_LEAGUE_PREVIEW_CARD_ASPECT_RATIO');
    expect(screenSource).not.toContain('previewLeagueCardImage');
  });

  it('does not render vector fallback underneath transparent bundled heraldry images', () => {
    const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const componentStart = screenSource.indexOf('function LeagueIconImageWithFallback');
    const componentEnd = screenSource.indexOf('function LeagueBonusGiftImageWithFallback');
    const componentSource = screenSource.slice(componentStart, componentEnd);

    expect(componentSource).toContain('const [failed, setFailed] = useState(false)');
    expect(componentSource).toContain('(!source || failed)');
    expect(componentSource).not.toContain('!loaded || !source');
  });
});
