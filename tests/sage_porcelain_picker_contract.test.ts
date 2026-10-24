import fs from 'fs';
import path from 'path';
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { THEME_DISPLAY_NAMES } from '../app/theme_display_names';

// зачем: экран «Темы» пережил редизайн «Примерочная» (2026-08-02, решение владельца).
// Контракт сторожит СМЫСЛ, а не вёрстку: кружки и плашки красятся НАСТОЯЩИМИ формулами тем
// (не ручными дублями); обводок нет (запрет владельца); превью не утекает за пределы экрана.
// 2026-10-04 (темы 2.0, сессия «ТЕМЫ 2.0»): сторож обновлён под решения владельца 30.09 —
// «ТЕМЫ ВСЕ ФРИ» (Plus/пейвол/замок запрещены), примерка убрана (тап = применить сразу),
// Нефрит снят. Ничего из действующего не ослаблено; добавлены градиентные темы и ползунок.
describe('Sage Porcelain picker contract', () => {
  const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8').replace(/\r\n/g, '\n');
  /** Код без комментариев: «ни Plus, ни пейвола» в пояснении не должно ронять запрет. */
  const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const pickerSource = readSource('app', 'settings_themes.tsx');
  const pickerCode = codeOnly(pickerSource);
  const settingsSource = readSource('app', '(tabs)', 'settings.tsx');

  it('lists the 13 tinted themes with graphite first, then the gradient themes from one config', () => {
    // зачем (2026-09-30): «Темы» — список стеклянных строк (макет PRF-06), реестр — LIQUID_GLASS_THEME_IDS.
    expect(pickerSource).toMatch(/\{ mode: 'graphite' \}, \{ mode: 'polar' \}[\s\S]*?\{ mode: 'marine' \}/);
    expect(pickerSource.match(/\{ mode: '/g)).toHaveLength(13);
    // зачем (владелец 2026-10-04): 10 градиентных тем ДОБАВЛЕНЫ — список берётся из конфига, не дублируется.
    expect(pickerSource).toContain('LIQUID_GLASS_GRADIENT_THEME_IDS.map(mode => ({ mode }))');
  });

  it('every theme is free: no Plus, no price, no paywall, no purchase; a lock only on achievement themes', () => {
    // зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ, БЕЗ ПЛЮСА МОЖНО МЕНЯТЬ» — смысл: темы не продаются.
    // Уточнение координатора 24.10 (ночной режим, слово владельца 30.09 не ослаблено): особые темы (isPremiumThemeId) открываются ДОСТИЖЕНИЯМИ —
    // замок «заработай» продаже не противоречит. Поэтому: Plus/цена/пейвол/покупка запрещены везде; значок замка допустим только у особых тем,
    // доступность спрашивается только для них, а 13 обычных и градиентные строки всегда доступны.
    expect(pickerCode).not.toMatch(/['"]Plus['"]/);
    expect(pickerCode).not.toMatch(/paywall|purchasePackage|restorePurchases|priceString|router\.push\(['"`]\/premium/i);
    expect((pickerCode.match(/lock-closed/g) ?? []).length).toBeLessThanOrEqual(1);
    expect((pickerCode.match(/isLiquidGlassThemeAvailable\(/g) ?? []).length).toBeLessThanOrEqual(1);
    // список особых тем — единственное место, где строка может быть закрыта
    expect(pickerCode).toMatch(/PREMIUM_GRADIENT_OPTIONS(?:\.filter\([^\n]*?\))?\.map[\s\S]*?available=\{[^}]*isLiquidGlassThemeAvailable\(item\.mode\)\}/);
    // ни у одной особой темы условие открытия — не покупка
    const catalog = readSource('app', 'premium_theme_catalog.ts');
    expect(catalog).not.toMatch(/condition: 'plus_purchase'[^}]*unlockAt: \d/);
    const server = readSource('functions', 'src', 'premium_themes.ts');
    expect(server).toMatch(/case 'plus_purchase': return false;/);
  });

  it('paints rows from real theme formulas with the glass tokens and no thick borders', () => {
    expect(pickerSource).toContain('<ThemeSwatch id={option.mode}');
    expect(pickerSource).toContain('liquidGlassTokens(liquidGlassThemeId)');
    expect(pickerSource).not.toMatch(/borderWidth:\s*[2-9]/);
    expect(pickerSource).not.toContain('adjustsFontSizeToFit');
  });

  it('applies a theme on tap and keeps every preview scoped to the themes screen', () => {
    // зачем (2026-09-30): примерки больше нет — тап применяет тему сразу (optimistic).
    expect(pickerSource).toMatch(/const onRowPress = useCallback\(\(mode: LiquidGlassThemeId\) => \{[\s\S]*?setLiquidGlassThemeId\(mode\);/);
    expect(pickerSource).toMatch(/useEffect\(\(\) => \(\) => setPreviewLiquidGlassThemeId\(null\)/);
    // зачем (ползунок 2026-10-04): превью насыщенности не переживает уход посреди жеста.
    expect(pickerSource).toMatch(/useEffect\(\(\) => \(\) => setPreviewLiquidGlassIntensity\(null\)/);
    expect(pickerSource).toMatch(/setLiquidGlassThemeId\(mode\);[\s\S]*?profile_theme_set/);
  });

  it('settings show the theme name from the one shared dictionary, in all 9 languages for every theme', () => {
    // зачем: копии названий тем уже разъезжались — источник один, theme_display_names.ts.
    expect(settingsSource).toContain("import { themeDisplayName } from '../theme_display_names'");
    expect(settingsSource).toContain('themeDisplayName(liquidGlassThemeId, lang)');
    expect(settingsSource).not.toMatch(/graphite: \{ ru: '/);
    for (const id of LIQUID_GLASS_THEME_IDS) {
      const names = THEME_DISPLAY_NAMES[id] as Record<string, string | undefined> | undefined;
      expect(names).toBeDefined();
      for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
        expect(names?.[lang]?.trim()).toBeTruthy();
      }
    }
  });
});
