import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('lessons full-bleed safe-area contract', () => {
  it('extends the lessons background under the status bar while keeping the header safe', () => {
    const lessons = fs.readFileSync(path.join(root, 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    const tabsLayout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(lessons).toContain('const insets = useStableSafeAreaInsets();');
    expect(lessons).toContain('<ScreenGradient forceFullBleed>');
    expect(lessons).toContain('const headerTopPad = isRetainedTab ? 12 : insets.top + 12;');
    expect(lessons).toContain('paddingTop: headerTopPad');
    expect(tabsLayout).toContain('<ScreenGradient artBackdrop="home" style={{ flex: 1 }}');
    expect(tabsLayout).toContain('style={{ flex: 1, paddingTop: insets.top }}');

    const tabScaffoldSource = tabsLayout.slice(tabsLayout.indexOf('function TabScaffold'));
    expect(tabScaffoldSource).toContain('const insets = useStableSafeAreaInsets();');
    expect(tabsLayout).not.toContain('marginTop: -topInset');
  });
});
