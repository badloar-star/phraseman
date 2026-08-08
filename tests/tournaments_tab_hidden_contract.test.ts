import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('tournaments tab visibility contract', () => {
  it('keeps tournaments routable but excludes it from the customer tab bar', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(layout).toContain("2: '/(tabs)/tournaments'");
    expect(layout).toMatch(/key:\s*'tournaments',\s*icon:\s*'trophy-outline',\s*active:\s*'trophy'/);
    expect(layout).toMatch(/const TAB_BAR_TABS = TABS\.filter\(\(tab\) => tab\.key !== 'tournaments'\)\.map/);
    expect(layout).toContain('TAB_BAR_TABS.map((tab, barIndex) => {');
    expect(layout).toContain('onPress={() => goToTab(tab.logicalIdx)}');
    expect(layout).not.toContain('{TABS.map((tab, i) => {');
  });
});
