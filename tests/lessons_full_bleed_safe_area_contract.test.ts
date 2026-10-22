import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('lessons full-bleed safe-area contract', () => {
  it('extends the lessons background under the status bar while keeping the header safe', () => {
    const lessons = fs.readFileSync(path.join(root, 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    const tabsLayout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(lessons).toContain('const insets = useStableSafeAreaInsets();');
    // R69: своё полотно страницы нужно (под ней плотный слой), но оно поднимается над верхом страницы на inset вкладки и совпадает с полотном оболочки
    expect(lessons).toContain('<ScreenGradient forceFullBleed bleedTop={isRetainedTab ? insets.top : 0}>');
    expect(lessons).toContain('const headerTopPad = isRetainedTab ? 12 : insets.top + 12;');
    expect(lessons).toContain('paddingTop: headerTopPad');
    // зачем: полоса под строкой состояния красится фоном видимой вкладки («Уроки» — свой фон), чтобы арт Главной
    // не просвечивал над списком уроков; фон по-прежнему во весь экран, отступ — у обёртки.
    expect(tabsLayout).toContain("const scaffoldArtBackdrop = visualIdx === 1 ? 'lessons' : 'home';");
    expect(tabsLayout).toMatch(/<ScreenGradient\s+artBackdrop=\{scaffoldArtBackdrop\}\s+style=\{\{ flex: 1 \}\}/);
    // зачем (владелец 22.10: «верхняя сейф-зона всегда часть общей композиции»): отступ под часы — у каждой страницы TabSlider, а не у всей оболочки
    expect(tabsLayout).not.toContain('style={{ flex: 1, paddingTop: insets.top }}');
    expect(tabsLayout).toContain('pageTopInset={insets.top} fullBleedPages={homeFullBleedPages}');

    const tabScaffoldSource = tabsLayout.slice(tabsLayout.indexOf('function TabScaffold'));
    expect(tabScaffoldSource).toContain('const insets = useStableSafeAreaInsets();');
    expect(tabsLayout).not.toContain('marginTop: -topInset');
  });
});
