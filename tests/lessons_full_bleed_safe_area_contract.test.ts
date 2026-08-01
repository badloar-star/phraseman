import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('lessons full-bleed safe-area contract', () => {
  it('extends the lessons background under the status bar while keeping the header safe', () => {
    const lessons = fs.readFileSync(path.join(root, 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    const tabsLayout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(lessons).toContain('const insets = useStableSafeAreaInsets();');
    expect(lessons).toContain('<ScreenGradient forceFullBleed>');
    expect(lessons).toContain('paddingTop: insets.top + 12');
    expect(tabsLayout).toContain('marginTop: -topInset');
    expect(tabsLayout).toContain('topInset={insets.top}');

    const tabLayoutSource = tabsLayout.slice(tabsLayout.indexOf('export default function TabLayout()'));
    expect(tabLayoutSource).toContain('const insets = useStableSafeAreaInsets();');
    expect(tabLayoutSource).toContain('topInset={insets.top}');
  });
});
