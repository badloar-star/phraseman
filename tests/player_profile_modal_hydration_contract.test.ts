import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'PlayerProfileModal.tsx'),
  'utf8',
);

describe('PlayerProfileModal post-PM-055 hydration', () => {
  it('does not read XP multiplier state while preserving deferred profile hydration', () => {
    expect(source).not.toContain('getCurrentMultiplierBreakdown');
    expect(source).not.toContain('peekLastMultiplierBreakdown');
    expect(source).not.toContain('MultiplierBreakdown');
    expect(source).toContain('InteractionManager.runAfterInteractions');
  });
});
