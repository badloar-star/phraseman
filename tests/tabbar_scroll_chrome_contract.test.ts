import fs from 'fs';
import path from 'path';

const tab = (name: string) => path.join(__dirname, '..', 'app', '(tabs)', name);
const layoutPath = tab('_layout.tsx');

describe('tabbar scroll chrome contract', () => {
  it('uses the same scroll transport as Home and Lessons on every tab', () => {
    const tournament = fs.readFileSync(tab('tournaments.tsx'), 'utf8');
    const friends = fs.readFileSync(tab('friends.tsx'), 'utf8');
    const settings = fs.readFileSync(tab('settings.tsx'), 'utf8');

    expect(tournament).toContain('<BouncyScrollView');
    expect(tournament).toContain('onScroll={topFadeScroll?.onScroll}');
    expect(friends).toContain('const handleFriendsScroll = useCallback((e: any) => {');
    expect(friends).toContain('topFadeScroll?.onScroll?.(e);');
    expect(friends).toContain('onScroll: handleFriendsScroll,');
    expect(settings).toContain('const handleSettingsScroll = useCallback((e: any) => {');
    expect(settings).toContain('topFadeScroll?.onScroll?.(e);');
    expect(settings).toContain('onScroll={handleSettingsScroll}');
  });

  it('keeps one tabbar state machine with no per-screen scroll exceptions', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');

    expect(layout).not.toContain('manualLiftTab');
    expect(layout).not.toContain('TAB_MANUAL_LIFT_TAB_IDX');
    expect(layout).not.toContain('TAB_SCROLL_LIFT_TO_EXPAND');
    expect(layout).toContain('const TAB_SCROLL_COLLAPSE_DISTANCE = 92;');
    expect(layout).toContain('const TAB_SCROLL_TOP_ZONE_Y = 10;');
    expect(layout).toContain('tabScrollProgress.value = progress;');
    expect(layout).toContain('withSpring(target, TAB_CHROME_SPRING)');
  });

  it('expands only when the page is back at the top', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).toContain('if (y <= TAB_SCROLL_TOP_ZONE_Y) {');
    expect(layout).toContain('animateTabChrome(false)');
  });
});
