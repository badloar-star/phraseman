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

/** Левый край ЯЧЕЙКИ активной вкладки (в координатах капсулы). */
export function tabCapLeft(slotW: number, index: number): number {
  return TAB_BAR_PAD + Math.max(0, index) * slotW;
}

/**
 * Предельная ширина плашки активной вкладки.
 * зачем (владелец, фото планшета Samsung Galaxy Tab, 06.11: «фон вкладки справа обрезан, слева скруглён»): на планшете ячейка 150–250 dp, а плашка
 * растягивалась на всю ячейку запечённой маской 128×64 с градиентом от яркого левого края к бледному правому — правый край таял и казался срезанным.
 * Теперь плашка не шире TAB_CAP_MAX_W и стоит ПО ЦЕНТРУ ячейки с равными отступами слева и справа; на телефоне (ячейка ≤ 120 dp) всё как раньше.
 */
export const TAB_CAP_MAX_W = 120;

export type TabCapMetrics = Readonly<{ capW: number; inset: number }>;

/** Ширина плашки и отступ слева/справа от краёв ячейки (равные). */
export function tabCapMetrics(slotW: number): TabCapMetrics {
  const safe = Math.max(0, slotW);
  const capW = Math.min(safe, TAB_CAP_MAX_W);
  return { capW, inset: (safe - capW) / 2 };
}

/** Левый край самой ПЛАШКИ (в координатах капсулы): ячейка + равный отступ. */
export function tabCapPillLeft(slotW: number, index: number): number {
  return tabCapLeft(slotW, index) + tabCapMetrics(slotW).inset;
}

/** Плашка целиком внутри своей ячейки (с равными отступами) и внутри внутреннего правого края капсулы. */
export function tabCapRightFits(width: number, slotW: number, index: number): boolean {
  const { capW, inset } = tabCapMetrics(slotW);
  const pillLeft = tabCapLeft(slotW, index) + inset;
  const cellRight = tabCapLeft(slotW, index) + slotW;
  return pillLeft >= tabCapLeft(slotW, index) - 0.001 && pillLeft + capW <= cellRight + 0.001 && pillLeft + capW <= width - TAB_BAR_PAD + 0.001;
}
