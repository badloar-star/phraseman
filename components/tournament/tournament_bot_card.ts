// ═══════════════════════════════════════════════════════════════════════════
// tournament_bot_card.ts — карточка профиля для турнирного бота.
//
// зачем (владелец 2026-08-03): тап по участнику лобби открывал самодельную
// панель «Побед % / Турниров», которая для всех показывала нули. Теперь
// открывается ШТАТНАЯ карточка игрока (как в друзьях/лигах/сезоне), а для
// бота — правдоподобная детерминированная «биография».
//
// зачем (владелец 2026-08-04): раньше опыт бота вычислялся здесь собственной
// формулой и НИКОГДА не рос, а номер аватара сервер выдавал случайно. Тот же
// персонаж в лиге жил по общему реестру и рос каждые 6 часов — цифры не
// совпадали. Владелец: «будет неправильно, если они будут замечены в двух
// разных местах с разным опытом и уровнем и аватаром». Теперь сервер ставит
// боту аватар = его уровень из ОБЩЕГО реестра (synthetic_residents), а карточка
// восстанавливает по этому уровню опыт той же кривой, что у живых игроков и
// жителей лиг.
//
// Индекс персонажа в реестре сюда намеренно НЕ передаётся: поле, которое есть
// только у ботов, само по себе выдавало бы бота — сервер по той же причине
// вырезает isBot из публичного документа комнаты.
//
// Детерминизм обязателен: у всех зрителей и при каждом открытии бот выглядит
// одинаково. Никакого Math.random. Ни одного чтения Firestore: PlayerProfileModal
// глушит сеть для синтетических uid (isSyntheticUid).
// ═══════════════════════════════════════════════════════════════════════════

import { residentStreak, residentXpForLevel } from '../../constants/synthetic_residents';
import { fnv1a, TOURNAMENT_BOT_MAX_LEVEL, wrapBotLevel } from './tournament_avatars';
import type { PlayerInfo } from '../PlayerProfileModal';

type BotSeatLike = {
  /** Стабильный id игрока комнаты (p_...) — сид всей «биографии». */
  uid: string;
  name: string;
  /** Значение для AvatarView: числовой уровневый аватар или custom:... */
  avatar: string;
  aura?: string;
};

/** Уровень бота: номер его уровневого аватара; для shop-аватара — по хэшу. */
function botCardLevel(seat: BotSeatLike): number {
  const index = Number(seat.avatar);
  // Аватар уже прошёл кламп в tournamentAvatarValue; заворачиваем защитно той
  // же формулой (wrapBotLevel — единственный источник правды, аудит 2026-08-03).
  if (Number.isInteger(index) && index >= 1) return wrapBotLevel(index);
  return 5 + (fnv1a(`${seat.uid}:level`) % (TOURNAMENT_BOT_MAX_LEVEL - 4));
}

/** Лига правдоподобна для уровня: новичок не сидит в алмазе и наоборот. */
function botCardLeagueId(level: number, hash: number): number {
  const bands: ReadonlyArray<readonly [number, number, number]> = [
    // [макс. уровень, мин. лига, макс. лига] — id лиг из CLUBS (0..11).
    [7, 0, 1],
    [15, 1, 3],
    [25, 2, 4],
    [35, 4, 6],
    [45, 5, 7],
    [Infinity, 6, 8],
  ];
  const band = bands.find(([maxLevel]) => level <= maxLevel) ?? bands[bands.length - 1];
  return band[1] + (hash % (band[2] - band[1] + 1));
}

/**
 * Детерминированная PlayerInfo турнирного бота для штатной PlayerProfileModal.
 * Опыт соответствует уровню аватара по ОБЩЕЙ кривой реестра — те же цифры
 * этот персонаж показывает в лиге.
 */
export function tournamentBotCardInfo(seat: BotSeatLike): PlayerInfo {
  const level = botCardLevel(seat);
  const totalXp = residentXpForLevel(level, seat.uid);
  // Серия: у трети персонажей ноль (как у живых), у остальных 1..34 дня.
  // Формула общая с реестром — житель и бот считают серию одинаково.
  const streak = residentStreak(fnv1a(seat.uid) % 200);
  return {
    name: seat.name,
    points: totalXp,
    totalXp,
    isMe: false,
    avatar: seat.avatar,
    aura: seat.aura,
    streak,
    leagueId: botCardLeagueId(level, fnv1a(`${seat.uid}:league`)),
    // зачем (владелец 2026-08-04): «у них такая же карточка как у других
    // игроков, единственное что заявка в друзья таким жителям уйдёт в никуда
    // (но юзер не должен догадаться)». Раньше uid не передавался вовсе, и
    // кнопки «в друзья» на карточке бота не было — она отличалась от
    // человеческой. Теперь uid есть, кнопка на месте, а заявка перехватывается
    // в PlayerProfileModal по isSyntheticUid: запоминается локально на
    // устройстве и никуда не уходит. Сетевые запросы (лайки, leaderboard) для
    // такого uid там же заглушены — ни одного лишнего чтения Firestore.
    uid: seat.uid,
  };
}
