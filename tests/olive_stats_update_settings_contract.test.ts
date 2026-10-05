import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.join(__dirname, '..');
const read = (file: string) => normalizeEol(fs.readFileSync(path.join(root, file), 'utf8'));

describe('Olive stats, update and settings chrome', () => {
  it('keeps Olive stats tonal, borderless and shadowed', () => {
    const art = read('components/StatsCardArtSurface.tsx');
    const stats = read('app/streak_stats.tsx');
    const chrome = read('constants/statsThemeChrome.ts');
    expect(art).toContain('themeMode?: ThemeMode');
    expect(art).toContain('const resolvedThemeMode = themeMode ?? activeThemeMode;');
    expect(art).toContain('OLIVE_GRADIENTS.raisedPanel');
    expect(art).toContain("borderWidth: resolvedThemeMode === 'olive' ? 0 : undefined");
    expect(art).toContain("borderColor: resolvedThemeMode === 'olive' ? 'transparent' : undefined");
    expect(art).toContain('style,\n        ...(resolvedThemeMode === \'olive\' ? [{ borderWidth: 0, borderColor: \'transparent\' }] : []),');
    const artSurfaceUses = stats.match(/<StatsCardArtSurface\b/g) ?? [];
    const themedArtSurfaceUses = stats.match(/<StatsCardArtSurface\b[^>]*\bthemeMode=\{themeMode\}/g) ?? [];
    expect(themedArtSurfaceUses).toHaveLength(artSurfaceUses.length);
    expect(stats).toContain("borderWidth: themeMode === 'olive' ? 0 : 1");
    expect(chrome).toContain("olive: '#181B12'");
  });

  it('uses dedicated static Olive palettes outside cosmic/default mappings', () => {
    const update = read('components/UpdateModal.tsx');
    const settings = read('components/settings/SettingsGroup.tsx');
    expect(update).toContain("import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';");
    expect(update).toContain('const { liquidGlassThemeId } = useTheme();');
    expect(update).toContain('const glass = liquidGlassTokens(liquidGlassThemeId);');
    expect(settings).toContain('const SETTINGS_TILE_OLIVE');
    expect(settings).toContain("themeMode === 'olive'");
    expect(settings).toContain("color={themeMode === 'olive' ? OLIVE_RICH.ivory : '#FFFFFF'}");
  });
});
