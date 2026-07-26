import fs from 'fs';
import path from 'path';

const layoutPath = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');

function readLayout(): string {
  return fs.readFileSync(layoutPath, 'utf8');
}

describe('tabbar scroll chrome contract', () => {
  // 2026-07-26: владелец уточнил модель до «ровно как у Bevel» — прогресс схлопывания
  // ведёт ПАЛЕЦ (медленная тяга = частичное сжатие), а не пороговый триггер с таймером.
  it('drives collapse progress from the gesture, not from a threshold toggle', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_SCROLL_COLLAPSE_DISTANCE = 92;');
    expect(source).toContain('const TAB_SCROLL_TOP_ZONE_Y = 10;');
    expect(source).toContain('const TAB_SCROLL_SETTLE_THRESHOLD = 0.5;');
    expect(source).toContain('const tabScrollProgress = useSharedValue(0);');
    // Прогресс пишется покадрово из жеста…
    expect(source).toContain('tabScrollProgress.value = progress;');
    // …а довод после отпускания — ПРУЖИНА, не временная кривая: только пружина
    // перецеливается с текущей скорости при развороте жеста (иначе «клевок»).
    expect(source).toContain('withSpring(target, TAB_CHROME_SPRING)');
    expect(source).toContain('const TAB_CHROME_SPRING = { duration: 380, dampingRatio: 1 }');
    // Кубическая кривая на схлопывании удалена осознанно — владелец забраковал её
    // как «клюющую»; не возвращать без нового решения владельца.
    expect(source).not.toContain('Easing.out(Easing.cubic)');
    expect(source).not.toContain('TAB_SCROLL_COLLAPSE_MS');
    expect(source).not.toContain('TAB_SCROLL_EXPAND_MS');

    // Пороговая модель удалена, а не сосуществует второй веткой.
    expect(source).not.toContain('TAB_SCROLL_COLLAPSE_TRIGGER_Y');
    expect(source).not.toContain('TAB_SCROLL_TOGGLE_COOLDOWN_MS');
    expect(source).not.toContain('TAB_SCROLL_DIRECTION_EPSILON');
    expect(source).not.toContain('LESSONS_TAB_IDX');
  });

  // Разворот только из верхнего положения страницы — прямое требование владельца.
  it('expands only when the page is back at the top', () => {
    const source = readLayout();

    expect(source).toContain('if (y <= TAB_SCROLL_TOP_ZONE_Y) {');
    expect(source).toContain('animateTabChrome(false)');
  });

  // 2026-07-26: на экране БЕЗ скролла (друзья) отскок резинки разворачивал бар сам.
  // Владелец: там бар должен ждать, пока экран приподнимут вручную. Критично, что
  // это НЕ распространяется на скроллящиеся экраны — иначе бар залипал свёрнутым.
  it('waits for a manual lift only on non-scrolling screens', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_SCROLL_LIFT_TO_EXPAND = 14;');
    expect(source).toContain('tabScrollCollapsedFromBounceRef');
    // Скроллящийся экран определяется по ФАКТУ (офсет поднимался выше нуля), а не по
    // знаку офсета в одном кадре: быстрый флик на длинной ленте тоже проскакивает ноль.
    expect(source).toContain('tabScrollMaxSeenYRef');
    expect(source).toContain('const screenScrolls = tabScrollMaxSeenYRef.current > TAB_SCROLL_TOP_ZONE_Y;');
    // Ожидание ручного подъёма включается ТОЛЬКО когда скроллить нечего.
    expect(source).toContain('if (!screenScrolls && tabScrollCollapsedFromBounceRef.current) {');
    expect(source).toContain('const collapsedFromBounce = !screenScrolls;');
    // Признак не переживает разворот — иначе залип бы навсегда.
    expect(source).toContain('if (!collapsed) tabScrollCollapsedFromBounceRef.current = false;');
  });

  // 2026-07-26, вторая итерация: владелец забраковал scaleX — иконки видимо
  // растягивало. Ресёрч боевых реализаций (expo-glass-tabs, SwiftUI Liquid Glass)
  // подтвердил: анимируется НАСТОЯЩАЯ ширина, иконки не масштабируются вообще.
  it('shrinks real width and never scales the icons', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_ORB_HIT_SLOP');
    expect(source).toContain('tabChromeCollapsed');
    expect(source).toContain('testID="tab-collapsed-orb"');

    // Ширина капсулы — настоящая, интерполируется от измеренной до диаметра круга.
    expect(source).toContain('[tabPillWidth, tabBarHeight]');
    // Лишнее срезается клипом, а не сжатием содержимого.
    expect(source).toContain("overflow: 'hidden'");
    // Неактивные иконки гаснут задолго до конца схлопывания.
    expect(source).toContain('const TAB_ICONS_FADE_OUT_END = 0.34;');

    // НИКАКОГО масштабирования содержимого от прогресса схлопывания.
    expect(source).not.toContain('tabCapsuleScaleX');
    expect(source).not.toContain('tabCapsuleContentScaleX');
    expect(source).not.toContain('TAB_CAPSULE_EXIT_SCALE');
    expect(source).not.toContain('TAB_COLLAPSED_ORB_ENTER_SCALE');

    // Анимация ширины обязана идти worklet'ом на UI-потоке, не через JS-поток.
    expect(source).toContain('useAnimatedStyle');
    expect(source).not.toContain('useNativeDriver: false');

    // Тап по орбу только разворачивает — навигации нет.
    expect(source).toContain('// contract: collapsed-tap-expands-only');
    // Свайп и программная смена таба разворачивают немедленно.
    expect(source).toContain('handleSwipeStartChrome');
    expect(source).toContain('goToTabExpanded');
    // Старый «gentle»-режим удалён, а не сосуществует второй веткой.
    expect(source).not.toContain('TAB_SCROLL_COLLAPSED_OPACITY');
  });

  it('keeps swipe tab chrome responsive without moving route state early', () => {
    const source = readLayout();

    expect(source).toContain('const [visualIdx, setVisualIdx]');
    expect(source).toContain('const visualTabIdx = visualIdx;');
    expect(source).toContain('setVisualIdx(idx);');
    expect(source).toContain('visualIdx={visualIdx}');
    expect(source).toContain('а реальный activeIdx/URL переключаются после UI-thread анимации.');
  });
});
