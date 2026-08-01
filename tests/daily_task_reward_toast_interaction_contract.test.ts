import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'DailyTaskRewardToast.tsx'),
  'utf8',
);

describe('daily task completion toast', () => {
  it('is informational and can be dismissed with a swipe', () => {
    expect(source).not.toContain('styles.claimButton');
    expect(source).not.toContain('claimedLabel');
    expect(source).toContain('PanResponder.create');
    expect(source).toContain('onPanResponderRelease');
    expect(source).toContain('dismissCurrent(false)');
    expect(source).toContain('pointerEvents="auto"');
  });
});
