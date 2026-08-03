// ═══════════════════════════════════════════════════════════════════════════
// tournament_bot_card.ts — карточка профиля для турнирного бота.
//
// зачем (владелец 2026-08-03): тап по участнику лобби открывал самодельную
// панель «Побед % / Турниров», которая для всех показывала нули. Теперь
// открывается ШТАТНАЯ карточка игрока (как в друзьях/лигах/сезоне), а для
// бота — правдоподобная детерминированная «биография»: уровень строго по его
// аватару (кап 50), опыт под этот уровень, серия и лига по хэшу id.
//
// Детерминизм обязателен: у всех зрителей и при каждом открытии бот выглядит
// одинаково. Никакого Math.random. Ни одного чтения Firestore: у PlayerInfo
// бота нет uid, поэтому модалка не ходит ни в leaderboard, ни в лайки.
// ═══════════════════════════════════════════════════════════════════════════

import { LEVEL_XP, TOTAL_XP_FOR_LEVEL } from '../../constants/theme';
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
 * Опыт подобран так, что карточка показывает РОВНО уровень аватара бота —
 * никакого «аватар 34 уровня, а уровень 1».
 */
export function tournamentBotCardInfo(seat: BotSeatLike): PlayerInfo {
  const level = botCardLevel(seat);
  // Прогресс внутри уровня 0..85% — цифра опыта не выглядит «ровной».
  const progress = (fnv1a(`${seat.uid}:xp`) % 850) / 1000;
  const totalXp = TOTAL_XP_FOR_LEVEL(level) + Math.floor(LEVEL_XP(level) * progress);
  // Серия: у трети ботов ноль (как у живых людей), у остальных 1..34 дня.
  const streakHash = fnv1a(`${seat.uid}:streak`);
  const streak = streakHash % 100 < 30 ? 0 : 1 + ((streakHash >>> 7) % 34);
  return {
    name: seat.name,
    points: totalXp,
    totalXp,
    isMe: false,
    avatar: seat.avatar,
    aura: seat.aura,
    streak,
    leagueId: botCardLeagueId(level, fnv1a(`${seat.uid}:league`)),
    // Без uid: модалка не делает ни одного сетевого запроса и не показывает
    // кнопки «в друзья»/лайк — боту нельзя написать заявку.
  };
}
