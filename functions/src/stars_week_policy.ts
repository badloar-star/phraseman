/**
 * stars_week_policy.ts — какие начисления входят в «монеты недели» (счёт Пика).
 *
 * зачем (владелец 11.11, U35): «все монеты заработанные везде считать!» — человек был на 6 месте, получил монеты за уроки,
 * задания дня и бонусы, а счёт Пика их не видел: в неделю шёл только класс earn журнала. Уточнение, подтверждённое
 * владельцем в тот же день: считать всё, что получено ЗА ДЕЙСТВИЯ, кроме приза недели и подарков.
 *
 * Почему отдельный файл, а не правка STAR_OP_CLASS: класс операции решает ещё и «заработано за всё время» (ранги монет),
 * сезон и разрез источников. Перевод подарка в earn сдвинул бы их все задним числом. Здесь — ТОЛЬКО недельный счётчик.
 *
 * Чистый модуль: ни Firestore, ни часов. Подключение — одна строка в stars_ledger.ts (prepareStarOperations).
 */
import type { StarOpClass, StarOpReason } from './stars_ledger';

/**
 * Начисления класса grant, которые идут в счёт недели: получены за действия ученика.
 * НЕ входят (и не должны появиться здесь без слова владельца):
 *   • spire_week_reward — приз за место/повышение ПРОШЛОЙ недели: дал бы топ-5 фору на следующей, победители закреплялись бы;
 *   • welcome_gift, global_broadcast, admin_grant — подарки, не действия;
 *   • coin_exchange — обмен/покупка; account_merge_in — перенос баланса; legacy_bonus — конвертация старых бонусов.
 */
export const STAR_GRANTS_COUNTED_FOR_WEEK: ReadonlySet<StarOpReason> = new Set<StarOpReason>([
  // бонус за урок целиком, задания дня, полное видео, первый урок, награда за жалобу — всё идёт через кошелёк телефона
  'level_spin_grant',
  'video_watch',
  'referral_spin',
  'referral_ladder',
  'community_pack_sale',
  'community_month_reward',
]);

/** Входит ли операция в «монеты недели»: любой заработок (earn) и подарки-за-действия из списка; траты — никогда. */
export function starOpCountsForWeek(reason: StarOpReason, opClass: StarOpClass): boolean {
  if (opClass === 'earn') return true;
  if (opClass === 'grant') return STAR_GRANTS_COUNTED_FOR_WEEK.has(reason);
  return false;
}
