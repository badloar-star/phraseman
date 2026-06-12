import { useScreen } from './use-screen';

/** Зазор между плавающей капсулой таб-бара и зоной системных жестов — синхрон с app/(tabs)/_layout.tsx. */
export const FLOATING_PILL_BOTTOM_GAP = 6;
/** Воздух между последним элементом контента и верхом капсулы при докрутке до конца. */
const CONTENT_BREATHING_GAP = 16;
/** Минимальный отступ капсулы от низа экрана, когда insets.bottom = 0 (аппаратные кнопки). */
const MIN_PILL_EDGE_INSET = 8;

/**
 * Нижний padding скролл-контента пяти таб-экранов.
 *
 * Таб-бар — плавающая капсула-оверлей: контент рисуется до самого низа экрана
 * (заезжает ПОД капсулу и блурится ею), а этот padding гарантирует, что последний
 * элемент можно докрутить ВЫШЕ капсулы и он останется доступным для нажатия.
 */
export function useTabContentBottomPad(): number {
  const { tabBarHeight, bottomInset } = useScreen();
  return (
    tabBarHeight +
    Math.max(bottomInset, MIN_PILL_EDGE_INSET) +
    FLOATING_PILL_BOTTOM_GAP +
    CONTENT_BREATHING_GAP
  );
}
