import fs from 'fs';
import path from 'path';

const sliderPath = path.join(__dirname, '..', 'app', 'TabSlider.tsx');

function readSlider(): string {
  return fs.readFileSync(sliderPath, 'utf8');
}

describe('TabSlider container width contract', () => {
  it('sizes tab pages from the rendered container, not directly from window width', () => {
    const source = readSlider();

    expect(source).toContain('const { width: screenW } = useScreen();');
    expect(source).toContain('const [layoutWidth, setLayoutWidth] = useState(screenW);');
    expect(source).toContain('const W = layoutWidth > 0 ? layoutWidth : screenW;');
    expect(source).toContain('const handleLayout = useCallback((event: LayoutChangeEvent) =>');
    expect(source).toContain('onLayout={handleLayout}');
    expect(source).toContain('{ width: W * tabs.length }');
    expect(source).toContain('{ width: W }');
    expect(source).not.toContain('const { width: W } = useScreen();');
  });

  it('commits programmatic tab changes without a second transition delay', () => {
    const source = readSlider();
    const programmaticSyncStart = source.indexOf('// Programmatic tab changes');
    const programmaticSyncEnd = source.indexOf('const fireSwipeStart');
    const programmaticSync = source.slice(programmaticSyncStart, programmaticSyncEnd);

    expect(programmaticSyncStart).toBeGreaterThan(-1);
    expect(programmaticSyncEnd).toBeGreaterThan(programmaticSyncStart);
    expect(programmaticSync).toContain('translateX.value = -activeIndex * W;');
    expect(programmaticSync).not.toContain('withTiming(');
  });
});
