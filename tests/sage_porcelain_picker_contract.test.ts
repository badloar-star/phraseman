import fs from 'fs';
import path from 'path';

// зачем: экран «Темы» пережил редизайн «Примерочная» (2026-08-02, решение владельца).
// Контракт сторожит СМЫСЛ, а не вёрстку: Нефрит фри и стоит после Индиго со всеми
// локализациями; плашки красятся НАСТОЯЩИМИ токенами тем (не ручными дублями);
// обводок нет (запрет владельца); примерка не утекает за пределы экрана.
describe('Sage Porcelain picker contract', () => {
  const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8').replace(/\r\n/g, '\n');
  const pickerSource = readSource('app', 'settings_themes.tsx');
  const settingsSource = readSource('app', '(tabs)', 'settings.tsx');

  it('lists the 13 Liquid Glass themes with graphite first and Plus marked on the rest', () => {
    // зачем (2026-09-30): «Темы» перенесены на список стеклянных строк (макет PRF-06);
    // старые темы indigo/sagePorcelain удалены, реестр — LIQUID_GLASS_THEME_IDS.
    expect(pickerSource).toMatch(/\{ mode: 'graphite' \}, \{ mode: 'polar' \}[\s\S]*?\{ mode: 'marine' \}/);
    expect(pickerSource.match(/\{ mode: '/g)).toHaveLength(13);
    expect(pickerSource).toContain("item.mode === 'graphite' ? standardLabel : 'Plus'");
  });

  it('paints rows from real theme palettes with the glass tokens and no thick borders', () => {
    expect(pickerSource).toContain('makeLiquidGlassTheme(id, DARK)');
    expect(pickerSource).toContain('palette.cardGradient');
    expect(pickerSource).toContain('liquidGlassTokens(liquidGlassThemeId)');
    expect(pickerSource).not.toMatch(/borderWidth:\s*[2-9]/);
    expect(pickerSource).not.toContain('adjustsFontSizeToFit');
  });

  it('keeps the try-on preview scoped to the themes screen', () => {
    expect(pickerSource).toContain('setPreviewLiquidGlassThemeId(mode === appliedLiquidGlassThemeId ? null : mode)');
    expect(pickerSource).toMatch(/useEffect\(\(\) => \(\) => setPreviewLiquidGlassThemeId\(null\)/);
    expect(pickerSource).toContain("params: { context: 'theme', source: 'settings_theme_picker' }");
    expect(pickerSource).toMatch(/setLiquidGlassThemeId\(mode\);[\s\S]*?profile_theme_set/);
  });

  it('shows the exact localized Jade name on the settings summary row', () => {
    expect(settingsSource).toMatch(/sagePorcelain: \{ ru: 'Нефрит', uk: 'Нефрит', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' \}/);
  });
});
