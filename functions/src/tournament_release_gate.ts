import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Owner lock (2026-08-10): tournaments are conserved source code, not a released product.
 * Remote Config, admin schedule documents and environment variables must never bypass this
 * constant. Re-enabling requires an explicit owner request and a reviewed source change.
 */
export const TOURNAMENTS_RELEASED = false as const;

/**
 * ⛔ ПРИМЕТКА ВЛАДЕЛЬЦА (2026-08-23): ТУРНИРЫ ВЫКЛЮЧЕНЫ ФУЛЛ. БОЛЬШЕ НЕ ВКЛЮЧАТЬ.
 *
 * Гейт выше (2026-08-10) глушил только ЛОГИКУ. Четыре крона при этом оставались
 * задеплоены и продолжали просыпаться по расписанию — два ежеминутно
 * (tournamentFillBots, tournamentAdvanceRooms), один раз в 5 минут
 * (tournamentCreateRooms) и недельный (tournamentWeeklyBankCron) — чтобы сразу
 * выйти по `if (!TOURNAMENTS_RELEASED) return;`. Это ~95 000 оплачиваемых
 * холостых запусков в месяц ради нуля работы. 2026-08-23 владелец распорядился
 * снять их с деплоя: экспорты убраны из functions/src/index.ts.
 *
 * ЗАПРЕЩЕНО без отдельного явного задания владельца:
 *  - возвращать tournamentCreateRooms / tournamentFillBots /
 *    tournamentAdvanceRooms / tournamentWeeklyBankCron в exports index.ts;
 *  - ставить TOURNAMENTS_RELEASED = true;
 *  - «чинить» падающий тест, который ждёт включённых турниров — такой тест
 *    сторожит отменённое правило, чинить надо тест.
 *
 * Callable-функции турниров НЕ удалены намеренно: они фейлятся этим гейтом, а
 * tournamentClaimReward обязан остаться живым, чтобы уже начисленные награды
 * никто не потерял.
 */
export const TOURNAMENT_CRONS_RETIRED_BY_OWNER_2026_08_23 = true as const;
export const TOURNAMENTS_DISABLED_REASON = 'tournaments_disabled_by_owner' as const;

export function assertTournamentsReleased(): void {
  if (!TOURNAMENTS_RELEASED) {
    throw new HttpsError('failed-precondition', TOURNAMENTS_DISABLED_REASON);
  }
}
