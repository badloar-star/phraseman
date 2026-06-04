import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('stats premium blur performance contract', () => {
  it('keeps Android stats premium blur off the expensive native realtime method', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'StatsPremiumBlur.tsx'), 'utf8');

    expect(source).toContain('renderNativeBlur');
    expect(source).toContain("Platform.OS !== 'android'");
    expect(source).not.toContain('dimezisBlurView');
  });
});
