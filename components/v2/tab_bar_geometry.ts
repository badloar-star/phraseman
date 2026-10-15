// зачем (владелец 11.10, капсом: «кнопки на таб-баре справа все обрезаны — исправить»): расчёт геометрии капсулы таб-бара вынесен в одну чистую
// функцию. Капсула обязана целиком помещаться в ширину окна с равными боковыми отступами (учитывая безопасные зоны слева/справа),
// а сумма ширин слотов — не превышать внутреннюю ширину капсулы, при любом числе вкладок и любой ширине окна (360/393/412 dp и уже).
// Сторож — tests/tab_bar_geometry.test.ts. Логи реальной геометрии — префикс [TABBAR] (components/v2/V2TabBar.tsx).

/** Боковой отступ капсулы от края окна (макет tabbar-variants.html). */
export const TAB_BAR_SIDE_MARGIN = 12;
/** Внутренний отступ капсулы: от края до первого/последнего слота и от верха до плашки. */
export const TAB_BAR_PAD = 9;
/** Высота плавающей капсулы таб-бара (референс владельца 24.09, макет tabbar-variants.html). */
export const V2_TAB_BAR_HEIGHT = 66;
/** Зазор между капсулой и зоной системных жестов. */
export const FLOATING_PILL_BOTTOM_GAP = 6;
/** Минимальный отступ капсулы от низа окна, когда системной полосы нет (аппаратные кнопки). */
export const TAB_DOCK_MIN_BOTTOM_PAD = 8;

/**
 * Расстояние от низа окна до НИЗА капсулы.
 *
 * зачем (владелец 15.10, «такого нигде не должно быть»; Ревизор): кнопка «Играть» Пика уходила под капсулу, потому что общий отступ считал СТАРУЮ высоту таб-бара (56/60 из useScreen), а настоящая
 * капсула — 66. Теперь «низ» и «верх» капсулы считаются в ОДНОМ месте: `app/(tabs)/_layout.tsx`, скролл-отступ вкладок, тосты и доки берут отсюда.
 */
export function tabPillBottomOffset(bottomInset: number): number {
  return Math.max(bottomInset, TAB_DOCK_MIN_BOTTOM_PAD) + FLOATING_PILL_BOTTOM_GAP;
}

/** Расстояние от низа окна до ВЕРХА капсулы: всё, что должно стоять над таб-баром, отсчитывается от него (+ зазор), без «− N» от отступа. */
export function tabPillTopOffset(bottomInset: number): number {
  return tabPillBottomOffset(bottomInset) + V2_TAB_BAR_HEIGHT;
}

export type TabBarGeometry = Readonly<{
  /** Левый и правый отступ капсулы от края окна (с учётом безопасных зон). */
  left: number;
  right: number;
  /** Ширина капсулы. */
  width: number;
  /** Ширина одного слота (плашка активной вкладки). */
  slotW: number;
  /** Сумма ширин слотов + внутренние отступы минус ширина капсулы: ≤ 0.001 — помещается. */
  overflow: number;
}>;

export function computeTabBarGeometry(input: Readonly<{
  windowWidth: number;
  insetLeft?: number;
  insetRight?: number;
  count: number;
}>): TabBarGeometry {
  const insetLeft = Math.max(0, input.insetLeft ?? 0);
  const insetRight = Math.max(0, input.insetRight ?? 0);
  const left = TAB_BAR_SIDE_MARGIN + insetLeft;
  const right = TAB_BAR_SIDE_MARGIN + insetRight;
  const width = Math.max(0, input.windowWidth - left - right);
  const count = Math.max(1, Math.floor(input.count));
  const slotW = Math.max(0, (width - TAB_BAR_PAD * 2) / count);
  const overflow = slotW * count + TAB_BAR_PAD * 2 - width;
  return { left, right, width, slotW, overflow };
}

/** Левый край плашки активной вкладки (в координатах капсулы). */
export function tabCapLeft(slotW: number, index: number): number {
  return TAB_BAR_PAD + Math.max(0, index) * slotW;
}

/** Правый край плашки не должен выходить за внутренний правый край капсулы. */
export function tabCapRightFits(width: number, slotW: number, index: number): boolean {
  return tabCapLeft(slotW, index) + slotW <= width - TAB_BAR_PAD + 0.001;
}
