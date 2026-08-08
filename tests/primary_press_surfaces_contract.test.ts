import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('primary interaction surfaces', () => {
  test('PrimaryButton uses the canonical primary press response', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'ui', 'PrimaryButton.tsx'), 'utf8');
    expect(source).toContain("import PressableScale from '../PressableScale'");
    expect(source).toContain('variant="primary"');
    expect(source).toContain('busy={loading}');
  });

  test('notification icon uses one canonical icon response without duplicate haptic', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'NotificationCenterButton.tsx'), 'utf8');
    expect(source).toContain("import PressableScale from './PressableScale'");
    expect(source).toContain('variant="icon"');
    expect(source).not.toMatch(/const open = useCallback\(\(\) => \{\s*hapticTap\(\)/);
  });
});
