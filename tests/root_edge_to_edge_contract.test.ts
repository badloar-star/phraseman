import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('root edge-to-edge ownership', () => {
  it('has one system-bar owner and keeps interactive content inside real insets', () => {
    const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
    const rootLayout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');
    const tabsLayout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');
    const plugin = fs.readFileSync(
      path.join(root, 'plugins', 'withAndroidSplashWindowBackground.js'),
      'utf8',
    );
    const screenHook = fs.readFileSync(path.join(root, 'hooks', 'use-screen.ts'), 'utf8');

    expect(rootLayout).toContain('backgroundColor: tTheme.bgPrimary');
    expect(rootLayout.match(/<StatusBar/g)?.length ?? 0).toBe(1);
    expect(tabsLayout).not.toContain('<StatusBar');
    expect(appJson).toContain('"edgeToEdgeEnabled": true');
    expect(plugin).toContain("android:navigationBarColor', '@android:color/transparent'");
    expect(plugin).toContain("android:statusBarColor', '@android:color/transparent'");
    expect(screenHook).toContain('normalizeSafeAreaBottomInset(bottomInset)');
    expect(screenHook).toContain('ANDROID_NAV_BAR_FALLBACK_INSET = 48');
  });
});
