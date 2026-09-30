import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'PlayerProfileModal.tsx'),
  'utf8',
);

describe('PlayerProfileModal post-PM-055 hydration', () => {
  // 30.09: визитка 2.0 без множителей XP (XP удалён); отложенная гидрация больше не нужна.
  it('does not read XP multiplier state', () => {
    expect(source).not.toContain('getCurrentMultiplierBreakdown');
    expect(source).not.toContain('peekLastMultiplierBreakdown');
    expect(source).not.toContain('MultiplierBreakdown');
  });
});
