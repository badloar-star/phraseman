import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('home weekly dot compact layout', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('keeps the experimental home status week dots compact', () => {
    expect(source).toContain('const experimentalStatusWeekDotSize = eliteStatsCompact ? 28 : 31');
    expect(source).toContain('gap: 6');
    expect(source).toContain('size={eliteStatsCompact ? 16 : 18}');
    expect(source).toContain('fontSize: eliteStatsCompact ? 11 : 13');
  });
});
