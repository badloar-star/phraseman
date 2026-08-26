import { shouldLoadTabScreen } from '../app/tab_mount_policy';

describe('tab mount policy', () => {
  it('paints the active cold-tab shell before evaluating its heavy module', () => {
    const mountedTabs = new Set<number>([0]);

    expect(shouldLoadTabScreen(1, 1, mountedTabs)).toBe(false);
  });

  it('loads a tab only after its module was mounted outside the tap hot path', () => {
    const mountedTabs = new Set<number>([0, 3]);

    expect(shouldLoadTabScreen(1, 3, mountedTabs)).toBe(true);
    expect(shouldLoadTabScreen(1, 4, mountedTabs)).toBe(false);
  });
});
