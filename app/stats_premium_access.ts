import type { DevLocalPlusOverride } from './dev_plus_controls';

/**
 * Снимать ли блюр премиальной статистики в DEV-сборке.
 *
 * зачем (владелец 2026-09-14: «статистика не скрыта в DEV, когда фри-мод
 * включаю»): раньше правило знало только старый тестерский флаг «Снять
 * премиум» (`tester_no_premium`). DEV-центр снимает Plus другим механизмом —
 * `dev_local_plus_override = 'removed'` (это и есть «Фри»). usePremium() его
 * учитывал, а обход блюра — нет, и статистика оставалась открытой поверх
 * `isPremium === false`. Проверить пейволы статистики в DEV было невозможно.
 *
 * Обход действует ТОЛЬКО когда оба DEV-механизма подтверждают, что премиум не
 * снят намеренно. Любое явное «сними Plus» — и экран показывает ровно то, что
 * видит обычный аккаунт.
 */
export function shouldDevUnlockStatsPremiumContent(
  enableDevTools: boolean,
  testerStripsPremium: boolean | null,
  devLocalPlusOverride: DevLocalPlusOverride = 'inherit',
): boolean {
  return enableDevTools
    && testerStripsPremium === false
    && devLocalPlusOverride !== 'removed';
}
