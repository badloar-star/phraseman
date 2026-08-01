import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'PlayerProfileModal.tsx'),
  'utf8',
);

describe('PlayerProfileModal multiplier hydration', () => {
  it('starts loading own XP modifiers before the entrance animation settles', () => {
    const multiplierLoad = source.indexOf('getCurrentMultiplierBreakdown().then');
    // The modal body has an unrelated deferred stats refresh; this assertion
    // targets the outer modal-opening effect, which is the last such queue.
    const afterInteractions = source.lastIndexOf('InteractionManager.runAfterInteractions');

    expect(multiplierLoad).toBeGreaterThan(-1);
    expect(afterInteractions).toBeGreaterThan(-1);
    expect(multiplierLoad).toBeLessThan(afterInteractions);
  });
});
