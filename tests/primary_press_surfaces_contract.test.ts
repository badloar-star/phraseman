import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('primary interaction surfaces', () => {
  test('PrimaryButton uses a real keycap press response (edge layer + translateY, no scale)', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'ui', 'PrimaryButton.tsx'), 'utf8');
    expect(source).toContain("import DuoPressable from '../DuoPressable'");
    expect(source).toContain('edgeColor={edgeColor}');
    expect(source).toContain('edgeHeight={5}');
    expect(source).toContain('disabled={isDisabled}');
  });

  test('notification icon uses one canonical icon response without duplicate haptic', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'NotificationCenterButton.tsx'), 'utf8');
    expect(source).toContain("import PressableScale from './PressableScale'");
    expect(source).toContain('variant="icon"');
    expect(source).not.toMatch(/const open = useCallback\(\(\) => \{\s*hapticTap\(\)/);
  });
});
