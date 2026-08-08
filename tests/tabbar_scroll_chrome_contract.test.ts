import fs from 'fs';
import path from 'path';

const tab = (name: string) => path.join(__dirname, '..', 'app', '(tabs)', name);
const layoutPath = tab('_layout.tsx');

describe('tabbar scroll chrome contract', () => {
  it('uses the shared scroll transport on every scrollable tab', () => {
    const tournament = fs.readFileSync(tab('tournaments.tsx'), 'utf8');
    const friends = fs.readFileSync(tab('friends.tsx'), 'utf8');
    const settings = fs.readFileSync(tab('settings.tsx'), 'utf8');

    expect(tournament).toContain('<BouncyScrollView');
    // Владелец (2026-08-02): на «Турнирах» таббар НЕ сворачивается от скролла —
    // таб кормит только верхнюю маску, не tabBarScrollY. Машина состояний в
    // _layout при этом остаётся одна на всех (см. тест ниже).
    expect(tournament).toContain('onScroll={topFadeScroll?.onScroll}');
    expect(tournament).not.toContain('onScroll={topFadeScroll?.onScrollMaskOnly}');
    expect(friends).toContain('const handleFriendsScroll = useCallback((e: any) => {');
    expect(friends).toContain('topFadeScroll?.onScroll?.(e);');
    expect(friends).toContain('onScroll: handleFriendsScroll,');
    expect(settings).toContain('const handleSettingsScroll = useCallback((e: any) => {');
    expect(settings).toContain('topFadeScroll?.onScroll?.(e);');
    expect(settings).toContain('onScroll={handleSettingsScroll}');
  });

  it('compacts the whole capsule without replacing it with a side orb', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');

    expect(layout).not.toContain('manualLiftTab');
    expect(layout).not.toContain('TAB_MANUAL_LIFT_TAB_IDX');
    expect(layout).not.toContain('TAB_SCROLL_LIFT_TO_EXPAND');
    expect(layout).toContain('const TAB_SCROLL_COLLAPSED_SCALE = 0.9;');
    expect(layout).toContain('const TAB_SCROLL_COLLAPSED_TRANSLATE_Y = 8;');
    expect(layout).toContain('const TAB_SCROLL_COLLAPSED_OPACITY = 0.94;');
    expect(layout).toContain('transform: [{ translateY: tabScrollTranslateY }, { scale: tabScrollScale }, { scale: tabPillPressScale }]');
    expect(layout).not.toContain('TAB_ORB_HIT_SLOP');
    expect(layout).not.toContain('tab-collapsed-orb');
  });

  it('uses scroll-direction hysteresis and always expands at the top', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).toContain('const TAB_SCROLL_COLLAPSE_TRIGGER_Y = 36;');
    expect(layout).toContain('const TAB_SCROLL_EXPAND_TRIGGER_Y = 10;');
    expect(layout).toContain('const TAB_SCROLL_DIRECTION_EPSILON = 5;');
    expect(layout).toContain('if (y <= TAB_SCROLL_EXPAND_TRIGGER_Y) {');
    expect(layout).toContain('if (y <= TAB_SCROLL_EXPAND_TRIGGER_Y) {\n        animateTabChrome(false, true);');
  });
});
