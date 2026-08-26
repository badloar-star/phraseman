// ════════════════════════════════════════════════════════════════════════════
// section_sheet_navigation.ts — опции native-stack для «шторок разделов».
//
// presentation:'modal' сохраняет нативную семантику и swipe-dismiss, а OWNER
// 2026-08-25 требует показывать сам раздел немедленно, без выезда/fade.
// presentation:'modal' даёт на iOS нативный pageSheet (скруглённые углы,
// подложенный назад предыдущий экран, системный свайп-вниз), на Android —
// полноэкранный modal. Нулевая route-анимация не меняет Back/dismiss contract.
// Контракт: tests/navigation_back_underlay_contract.test.ts.
// ════════════════════════════════════════════════════════════════════════════
/** OWNER 2026-08-25: presentation и swipe-dismiss сохраняются, но сама шторка
 * появляется в первый кадр без slide/fade задержки. */
export const SECTION_SHEET_STACK_OPTIONS = {
  presentation: 'modal',
  gestureEnabled: true,
  animation: 'none', animationDuration: 0,
} as const;
