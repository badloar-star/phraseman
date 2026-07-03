import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('Android window background contract', () => {
  it('keeps the native activity background plugin opaque during React surface swaps', () => {
    const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
    const plugin = fs.readFileSync(path.join(root, 'plugins', 'withAndroidSplashWindowBackground.js'), 'utf8');

    expect(appJson).toContain('./plugins/withAndroidSplashWindowBackground');
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:windowBackground', '@color/splashscreen_background')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:navigationBarColor', '@color/splashscreen_background')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:windowLightStatusBar', 'false')");
    expect(plugin).toContain("upsertStyleItem(xml, 'AppTheme', 'android:enforceNavigationBarContrast', 'false'");
  });
});
