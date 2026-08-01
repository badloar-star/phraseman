import fs from 'fs';
import path from 'path';

describe('large screen app window configuration', () => {
  const root = process.cwd();

  it('does not force phone-only portrait compatibility mode', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const expo = appJson.expo ?? {};

    expect(expo.orientation).toBe('default');
    expect(expo.ios?.supportsTablet).toBe(true);
    expect(expo.plugins).toContain('./plugins/withAndroidLargeScreenSupport');
  });

  it('keeps the Android config plugin resizable on large screens', () => {
    const plugin = fs.readFileSync(path.join(root, 'plugins', 'withAndroidLargeScreenSupport.js'), 'utf8');

    expect(plugin).toContain("mainActivity.$['android:screenOrientation'] = 'unspecified'");
    expect(plugin).toContain("mainActivity.$['android:resizeableActivity'] = 'true'");
  });
});
