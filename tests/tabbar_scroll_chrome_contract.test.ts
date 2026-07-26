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
    expect(source).toContain('const tabScrollProgress = useRef(new Animated.Value(0)).current;');
    // Прогресс пишется покадрово из жеста…
    expect(source).toContain('tabScrollProgress.setValue(progress)');
    // …а довод после отпускания остаётся нативной анимацией с ease-out.
    expect(source).toContain('Animated.timing(tabScrollProgress');
    expect(source).toContain('useNativeDriver: true');
    expect(source).toContain('Easing.out(Easing.cubic)');

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

  it('collapses by shrinking width into the left orb, never via layout animation', () => {
    const source = readLayout();

    expect(source).toContain('const TAB_COLLAPSED_ORB_ENTER_SCALE = 0.9;');
    expect(source).toContain('const TAB_ORB_HIT_SLOP');
    expect(source).toContain('tabChromeCollapsed');
    expect(source).toContain('testID="tab-collapsed-orb"');

    // Сужение — scaleX + компенсирующий translateX, чтобы левый край стоял на месте.
    expect(source).toContain('tabCapsuleScaleX');
    expect(source).toContain('tabCapsuleTranslateX');
    // Иконки не сплющиваются: контр-масштаб содержимого.
    expect(source).toContain('tabCapsuleContentScaleX');
    // Активная вкладка доезжает ровно в центр круга.
    expect(source).toContain('tabIconsRowTranslateX');

    // Ширину/позицию как layout-свойства не анимируем — это ушло бы на JS-поток.
    expect(source).not.toMatch(/Animated\.timing\(\s*tabPillWidth/);
    expect(source).not.toContain('useNativeDriver: false');

    // Тап по орбу только разворачивает — навигации нет.
    expect(source).toContain('// contract: collapsed-tap-expands-only');
    // Свайп и программная смена таба разворачивают немедленно.
    expect(source).toContain('handleSwipeStartChrome');
    expect(source).toContain('goToTabExpanded');
    // Старый «gentle»-режим удалён, а не сосуществует второй веткой.
    expect(source).not.toContain('TAB_SCROLL_COLLAPSED_OPACITY');
    expect(source).not.toContain('TAB_CAPSULE_EXIT_SCALE');
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
