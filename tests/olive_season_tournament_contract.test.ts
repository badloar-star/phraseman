import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Olive season and tournament chrome', () => {
  it('uses the readable Olive season scrim', () => {
    const source = read('app/season_pass.tsx');
    expect(source).toContain("themeMode === 'olive' ? 0.58");
  });

  it('gives tournament tokens an explicit Olive branch without decorative breathing', () => {
    const theme = read('components/ui/v2_theme.ts');
    const backdrop = read('components/ui/V2Backdrop.tsx');
    const ui = read('components/ui/v2_ui.tsx');
    expect(theme).toContain("const isOlive = themeMode === 'olive'");
    expect(theme).toContain("ctaGradA: isOlive ? '#F0DEA5'");
    expect(theme).toContain("sheen: isOlive ? 'transparent'");
    expect(theme).toContain("onGold: isOlive ? '#07110A'");
    expect(backdrop).toContain("themeMode !== 'olive'");
    expect(ui).toContain("backgroundColor: isOlive ? 'rgba(227,204,136,0.14)' :");
    expect(ui).toContain('const { themeMode } = useTheme();');
  });
});
