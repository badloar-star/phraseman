import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('Android window background contract', () => {
  it('keeps startup opaque but makes both system bars transparent after React mounts', () => {
    const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
    const plugin = fs.readFileSync(path.join(root, 'plugins', 'withAndroidSplashWindowBackground.js'), 'utf8');
    expect(appJson).toContain('./plugins/withAndroidSplashWindowBackground');
    expect(appJson).toContain('"edgeToEdgeEnabled": true');
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:windowBackground', '@color/splashscreen_background')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:statusBarColor', '@android:color/transparent')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:navigationBarColor', '@android:color/transparent')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:windowLightStatusBar', 'false')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:windowLightNavigationBar', 'false')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:enforceStatusBarContrast', 'false'");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:enforceNavigationBarContrast', 'false'");

    expect(plugin).not.toContain("upsertStyleItem(xml, 'AppTheme', 'android:navigationBarColor', '@color/splashscreen_background')");
  });

  // зачем (Ревизор 18.10 по 18a4b2ad1): плагин идёт после expo-splash-screen и обязан писать ДВА цвета — светлый в values, тёмный в values-night —
  // те же, что заданы в app.json expo-splash-screen; иначе светлая заставка затирается тёмной.
  it('splash background: light in values, dark in values-night — same colors as app.json expo-splash-screen', () => {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')) as { expo: { plugins: unknown[] } };
    const splash = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, { backgroundColor: string; dark: { backgroundColor: string } }];
    const plugin = fs.readFileSync(path.join(root, 'plugins', 'withAndroidSplashWindowBackground.js'), 'utf8');
    expect(plugin).toContain(`const SPLASH_BG_LIGHT = '${splash[1].backgroundColor}';`);
    expect(plugin).toContain(`const SPLASH_BG_DARK = '${splash[1].dark.backgroundColor}';`);
    expect(plugin).toContain("patchColors(path.join(resRoot, 'values', 'colors.xml'), SPLASH_BG_LIGHT);");
    expect(plugin).toContain("patchColors(path.join(resRoot, 'values-night', 'colors.xml'), SPLASH_BG_DARK);");
    expect(splash[1].backgroundColor).not.toBe(splash[1].dark.backgroundColor);
  });

  it('sets transparent system chrome once at the themed root for every route', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');

    expect(layout).toMatch(/import \{[^}]*\bStatusBar\b[^}]*\} from 'react-native';/);
    // зачем (10.10): корень дополнительно читает liquidGlassChoiceReady (выбор темы 2.0) — проверяем нужные поля, а не всю строку.
    expect(layout).toMatch(/const \{ theme: tTheme, themeMode, statusBarLight(?:, [A-Za-z]+)* \} = useTheme\(\);/);
    expect(layout).toContain('<StatusBar');
    expect(layout).toContain("barStyle={statusBarLight ? 'light-content' : 'dark-content'}");
    expect(layout).toContain('backgroundColor="transparent"');
    expect(layout).toContain('translucent');
    expect(layout).toContain('<View style={{ flex: 1, backgroundColor: tTheme.bgPrimary }}>');
  });
});
