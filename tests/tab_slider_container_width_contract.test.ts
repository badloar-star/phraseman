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

  it('lets the native iOS vertical scroll win before tab swipe can trim fling velocity', () => {
    const source = readSlider();

    expect(source).toContain("import { Platform, View, StyleSheet, type LayoutChangeEvent } from 'react-native';");
    expect(source).toContain("const TAB_SWIPE_FAIL_OFFSET_Y = Platform.OS === 'ios' ? 4 : 12;");
    expect(source).toContain('.activeOffsetX([-TAB_SWIPE_ACTIVE_OFFSET_X, TAB_SWIPE_ACTIVE_OFFSET_X])');
    expect(source).toContain('.failOffsetY([-TAB_SWIPE_FAIL_OFFSET_Y, TAB_SWIPE_FAIL_OFFSET_Y])');
  });
});
