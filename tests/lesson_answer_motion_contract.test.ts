import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('lesson answer feedback motion', () => {
  test('uses the existing finite result animation for a subtle wrong-answer shift', () => {
    expect(source).toContain("outputRange: wasWrong ? [0, -3, 3, -2, 0] : [0, 0, 0, 0, 0]");
    expect(source).toContain("outputRange: wasWrong ? [1, 1, 1, 1, 1] : [0.98, 1, 1, 1, 1]");
    expect(source).not.toMatch(/setInterval\([^)]*answer|Animated\.loop\([^)]*answer/s);
    expect(source).toContain('if (reduceMotion)');
    expect(source).toContain('fadeAnim.setValue(1)');
  });
});
