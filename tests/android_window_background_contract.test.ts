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

  it('sets transparent system chrome once at the themed root for every route', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');

    expect(layout).toMatch(/import \{[^}]*\bStatusBar\b[^}]*\} from 'react-native';/);
    expect(layout).toContain("const { theme: tTheme, themeMode, statusBarLight } = useTheme();");
    expect(layout).toContain('<StatusBar');
    expect(layout).toContain("barStyle={statusBarLight ? 'light-content' : 'dark-content'}");
    expect(layout).toContain('backgroundColor="transparent"');
    expect(layout).toContain('translucent');
    expect(layout).toContain('<View style={{ flex: 1, backgroundColor: tTheme.bgPrimary }}>');
  });
});
