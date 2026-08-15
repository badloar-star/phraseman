import fs from 'fs';
import path from 'path';

const tab = (name: string) => path.join(__dirname, '..', 'app', '(tabs)', name);
const layoutPath = tab('_layout.tsx');
const fc = (...parts: string[]) => path.join(__dirname, '..', 'app', ...parts);

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

/**
 * Раздел «Карточки» ведёт себя при скролле ровно как главная (замечание
 * владельца после теста на iPhone, 2026-08-13). Числа живут в
 * `app/flashcards/pill_tabbar_chrome.ts`; здесь — храповик против расхождения
 * с литералами главной, которые заперты выше.
 */
describe('flashcards tabbar mirrors the home scroll chrome', () => {
  const chrome = fs.readFileSync(fc('flashcards', 'pill_tabbar_chrome.ts'), 'utf8');
  const layout = fs.readFileSync(layoutPath, 'utf8');

  it('reuses the same collapse geometry, thresholds and timings', () => {
    for (const name of [
      'TAB_SCROLL_COLLAPSED_SCALE',
      'TAB_SCROLL_COLLAPSED_TRANSLATE_Y',
      'TAB_SCROLL_COLLAPSED_OPACITY',
      'TAB_SCROLL_COLLAPSE_TRIGGER_Y',
      'TAB_SCROLL_EXPAND_TRIGGER_Y',
      'TAB_SCROLL_DIRECTION_EPSILON',
      'TAB_SCROLL_COLLAPSE_MS',
      'TAB_SCROLL_EXPAND_MS',
      'TAB_SCROLL_TOGGLE_COOLDOWN_MS',
    ]) {
      const re = new RegExp(`${name} = ([-0-9.]+);`);
      const home = layout.match(re);
      const cards = chrome.match(re);
      expect([name, cards?.[1]]).toEqual([name, home?.[1]]);
    }
  });

  it('drives the capsule from the lists, without per-frame setState', () => {
    const bar = fs.readFileSync(fc('flashcards', 'FlashcardsTabBar.tsx'), 'utf8');
    expect(bar).toContain('export function useFcTabBarScroll()');
    expect(bar).toContain('useAnimatedScrollHandler');
    expect(bar).toContain('fcTabChromeAction(y, lastY.value)');
    // Хром — только transform/opacity, и ни одного бесконечного цикла.
    expect(bar).not.toMatch(/withRepeat\([\s\S]{0,220}?,\s*-1/);

    const collection = fs.readFileSync(fc('flashcards_collection.tsx'), 'utf8');
    const packs = fs.readFileSync(fc('flashcards_packs.tsx'), 'utf8');
    /* Экран «Мои наборы» живёт на ПЛОСКОМ роуте: внутри `app/flashcards/`
       expo-router его не разрешал и приложение падало (владелец, 2026-08-13). */
    const myPacks = fs.readFileSync(fc('flashcards_my_packs.tsx'), 'utf8');
    expect(collection).toContain('const tabScroll = useFcTabBarScroll();');
    expect(collection).toContain('onScroll={sectionRoot ? tabScroll.onScroll : undefined}');
    expect(packs).toContain('listener: tabScroll.onScroll,');
    expect(myPacks).toContain('onScroll={tabScroll.scrollHandler}');
    for (const source of [collection, packs, myPacks]) {
      expect(source).toContain('scroll={tabScroll}');
    }
  });

  it('keeps the compact capsule aligned with its highlight', () => {
    expect(chrome).toContain('export const TAB_SLOT_WIDTH = 64;');
    // Зона нажатия слота не меньше 44×44 (высота капсулы ≥ 52).
    expect(chrome).toMatch(/export const TAB_SLOT_WIDTH = (\d+);/);
    const slot = Number(chrome.match(/export const TAB_SLOT_WIDTH = (\d+);/)![1]);
    const pillW = Number(chrome.match(/export const TAB_ACTIVE_PILL_WIDTH = (\d+);/)![1]);
    expect(slot).toBeGreaterThanOrEqual(44);
    expect(slot).toBeGreaterThanOrEqual(pillW);
  });
});
