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

  it('renders generated league cards inside a fixed native-aspect rounded mask behind native UI text', () => {
    const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');

    expect(engineSource).toContain('cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-med.webp")');
    expect(screenSource).toContain('CLUB_LEAGUE_PREVIEW_CARD_ASPECT_RATIO = 768 / 363');
    expect(screenSource).toContain('borderRadius:CLUB_LEAGUE_PREVIEW_CARD_RADIUS');
    expect(screenSource).toContain("overflow:'hidden'");
    expect(screenSource).toContain('const previewLeagueCardImage = (previewLeague as any).cardImageUri');
    expect(screenSource).toContain('source={previewLeagueCardImage}');
    expect(screenSource).toContain('StyleSheet.absoluteFillObject');
    expect(screenSource).toContain("contentFit=\"cover\"");
    expect(screenSource).toContain("previewLeagueCardImage ? '#FFFFFF' : t.textPrimary");
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
