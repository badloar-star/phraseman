import { useEffect } from 'react';
import { FLOATING_PILL_BOTTOM_GAP, V2_TAB_BAR_HEIGHT, tabPillTopOffset } from '../components/v2/tab_bar_geometry';
import { useScreen } from './use-screen';

export { FLOATING_PILL_BOTTOM_GAP };
/** Воздух между последним элементом контента и верхом капсулы при докрутке до конца. */
export const CONTENT_BREATHING_GAP = 16;

/**
 * Расстояние от низа окна до ВЕРХА плавающей капсулы таб-бара (реальная высота 66, а не старая 56/60 из useScreen).
 * зачем (владелец 15.10): доки, подсказки и тосты вкладок ставятся «верх капсулы + зазор» — только от этого значения, без жёстких «bottomPad − N».
 */
export function useTabPillTop(): number {
  const { bottomInset, height, uiScale, tabBarHeight } = useScreen();
  const top = tabPillTopOffset(bottomInset);
  // зачем (владелец 15.10, «сперва логи»): откуда берётся нижний отступ вкладок — insets, высота экрана, старая высота таб-бара (56/60) против настоящей капсулы (66), верх капсулы; только dev
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || __DEV__ !== true) return;
    console.log('[TAB-PILL]', JSON.stringify({ bottomInset, screenH: height, uiScale, oldTabBarHeight: tabBarHeight, pillHeight: V2_TAB_BAR_HEIGHT, pillTop: top })); // guard-ok: dev-журнал раскладки таб-бара
  }, [bottomInset, height, uiScale, tabBarHeight, top]);
  return top;
}

/**
 * Нижний padding скролл-контента пяти таб-экранов.
 *
 * Таб-бар — плавающая капсула-оверлей: контент рисуется до самого низа экрана
 * (заезжает ПОД капсулу и блурится ею), а этот padding гарантирует, что последний
 * элемент можно докрутить ВЫШЕ капсулы и он останется доступным для нажатия.
 */
export function useTabContentBottomPad(): number {
  return useTabPillTop() + CONTENT_BREATHING_GAP;
}
