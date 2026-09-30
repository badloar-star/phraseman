/**
 * зачем: D107 — починка серии уроком («Streak Repair») удалена решением владельца:
 * пропуск дня спасает только бесплатная заморозка Plus (app/streak_freeze.ts).
 *
 * Модуль остаётся ТОЛЬКО потому, что app/(tabs)/home.tsx (зона сессии «Дизайн»)
 * ещё импортирует эти два вызова для карточки починки. Они всегда отвечают
 * «починки нет», поэтому карточка не показывается. Когда «Дизайн» уберёт
 * карточку и импорт с Главной — удалить файл целиком (D78).
 */

export const isRepairEligible = async (): Promise<boolean> => false;

export const getRepairProgress = async (): Promise<{ lessons: number; repaired: boolean }> => (
  { lessons: 0, repaired: false }
);

// Required by Expo Router — not a screen
export default {};
