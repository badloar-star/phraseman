import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('home interaction contract', () => {
  const helperStart = source.indexOf('function TouchableOpacity(');
  const helperEnd = source.indexOf('function getHomeMenuIconAlignment', helperStart);
  const helper = source.slice(helperStart, helperEnd);

  it('forwards children and every press handler explicitly', () => {
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helper).toMatch(/function TouchableOpacity\(\{[\s\S]*children[\s\S]*onPress[\s\S]*onLongPress[\s\S]*onPressIn[\s\S]*onPressOut/);
    expect(helper).toContain('onPress={onPress}');
    expect(helper).toContain('onLongPress={onLongPress}');
    expect(helper).toContain('onPressIn={onPressIn}');
    expect(helper).toContain('onPressOut={onPressOut}');
    expect(helper).toContain('{children}');
  });

  it('never sends an undefined transform to Fabric', () => {
    const lessonMenu = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');
    expect(lessonMenu).not.toMatch(/transform\s*:\s*[^\n]*\?\s*undefined/);
  });

  it('keeps a native press scale without wrapping button children', () => {
    expect(helper).toContain('transform: [{ scale: HOME_BUTTON_PRESS_SCALE }]');
    expect(helper).not.toContain('<Animated.View');
  });
});
