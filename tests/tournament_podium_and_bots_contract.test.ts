// ════════════════════════════════════════════════════════════════════════════
// tournament_podium_and_bots_contract.test.ts — пьедестал и «биография» ботов.
//
// зачем 2026-08-03 (владелец, три требования подряд):
//   • «на пьедестале надо чтобы каждый юзер был кликабельным и его карточка
//     открывалась»;
//   • «рандомные боты не могут получить уровень выше 50 и аватарку выше 50»;
//   • «карточка каждого бота должна быть с заполненной рандом инфой, а не
//     показывать уровень 0, отсутствие опыта и лигу всегда бронзу — там всегда
//     должно быть круто».
//
// Экран в jest не поднимается, поэтому кликабельность проверяется по исходнику,
// а «биография» бота — прямым вызовом чистой функции.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

import { tournamentBotCardInfo } from '../components/tournament/tournament_bot_card';
import {
  TOURNAMENT_BOT_MAX_LEVEL,
  tournamentAvatarValue,
} from '../components/tournament/tournament_avatars';
import { TOTAL_XP_FOR_LEVEL } from '../constants/theme';
import { isSyntheticUid } from '../app/synthetic_friend_requests';

const RESULTS_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'tournament_results.tsx'),
  'utf8',
);

describe('пьедестал кликабелен', () => {
  test('колонка призёра — нажимаемая, а не статичная картинка', () => {
    expect(RESULTS_SOURCE).toContain('onPress={onPress ? () => onPress(winner) : undefined}');
    expect(RESULTS_SOURCE).toMatch(/<TapScale\s+style=\{styles\.podiumColumn\}/);
  });

  test('обработчик передаётся в каждую колонку', () => {
    expect(RESULTS_SOURCE).toContain('onPress={openWinner}');
  });

  test('карточка открывается ШТАТНОЙ модалкой, а не самодельной панелью', () => {
    expect(RESULTS_SOURCE).toContain('UnifiedPlayerModal');
    expect(RESULTS_SOURCE).toContain('player={selectedPlayer}');
  });

  test('у бота карточка собирается локально, без чтения Firestore', () => {
    // Firebase-экономия: на пьедестале до трёх ботов, каждый тап не должен
    // превращаться в запрос.
    expect(RESULTS_SOURCE).toContain('tournamentBotCardInfo');
  });

  test('колонка объявлена доступной для скринридера', () => {
    expect(RESULTS_SOURCE).toContain('Открыть карточку игрока');
  });

  test('пьедестал знает, кто бот и кто ты сам', () => {
    // Без этих полей нельзя выбрать правильный источник карточки.
    //
    // зачем (2026-08-04): здесь стояло дословное `isBot: player.isBot === true`
    // — и контракт охранял РОВНО ту строку, из-за которой бот на пьедестале
    // считался живым: сервер вырезает isBot из публичного документа
    // (publicTournamentPlayer), поэтому прямое чтение поля всегда давало false,
    // а карточка бота показывала выдуманные «0 опыта / Lv.1». Проверяем смысл
    // («экран определяет бота»), а не букву конкретной реализации.
    expect(RESULTS_SOURCE).toContain('isBot: isTournamentBotPlayer(player)');
    expect(RESULTS_SOURCE).toContain('isYou: Boolean(myId) && player.id === myId');
  });
});

describe('кап уровня и аватара бота', () => {
  test('аватар бота никогда не выше 50-го уровня', () => {
    for (let index = 0; index < 400; index += 1) {
      const value = tournamentAvatarValue({ id: `p_bot_${index}`, isBot: true });
      const level = Number(value);
      if (!Number.isInteger(level)) continue; // shop-аватар — не уровневый
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(TOURNAMENT_BOT_MAX_LEVEL);
    }
  });

  test('сырой аватар выше капа заворачивается, а не проходит насквозь', () => {
    const value = tournamentAvatarValue({ id: 'p_bot_x', isBot: true, avatar: '93' });
    const level = Number(value);
    expect(level).toBeLessThanOrEqual(TOURNAMENT_BOT_MAX_LEVEL);
  });

  test('пьедестал прогоняет аватар через кап, а не берёт сырое значение', () => {
    // Раньше здесь стоял player.avatar — кап работал в лобби, но не тут.
    expect(RESULTS_SOURCE).toContain('avatar: tournamentAvatarValue({ id: player.id, isBot: player.isBot, avatar: player.avatar })');
  });
});

describe('карточка бота заполнена, а не пустая', () => {
  // uid в формате реального сервера (p_ + toString(36), см. functions/src/tournaments.ts) —
  // фикстура с подчёркиванием (p_bot_N) не проходила isSyntheticUid и маскировала бы
  // регрессию в защите от сетевых запросов.
  const sample = Array.from({ length: 60 }, (_, index) => tournamentBotCardInfo({
    uid: `p_bot${index}`,
    name: `Бот ${index}`,
    avatar: tournamentAvatarValue({ id: `p_bot${index}`, isBot: true }),
  }));

  test('у бота НЕ нулевой опыт', () => {
    // Жалоба владельца: «показывать уровень 0, отсутствие опыта».
    sample.forEach((info) => {
      expect(info.points).toBeGreaterThan(0);
      expect(info.totalXp ?? 0).toBeGreaterThan(0);
    });
  });

  test('опыт бота соответствует уровню НЕ выше 50', () => {
    // Уровень карточки выводится из totalXp (модалка считает его сама), поэтому
    // кап проверяется по опыту: он не должен дотягивать до 51-го уровня.
    const capExclusive = TOTAL_XP_FOR_LEVEL(TOURNAMENT_BOT_MAX_LEVEL + 1);
    const minLevelOne = TOTAL_XP_FOR_LEVEL(1);
    sample.forEach((info) => {
      expect(info.totalXp ?? 0).toBeGreaterThanOrEqual(minLevelOne);
      expect(info.totalXp ?? 0).toBeLessThan(capExclusive);
    });
  });

  test('лига НЕ всегда бронза — она разная и правдоподобная', () => {
    const leagues = new Set(sample.map((info) => info.leagueId));
    expect(leagues.size).toBeGreaterThan(2);
  });

  test('у бота есть серия — карточка выглядит живой', () => {
    const withStreak = sample.filter((info) => (info.streak ?? 0) > 0);
    expect(withStreak.length).toBeGreaterThan(0);
  });

  test('биография детерминирована: один и тот же бот всегда одинаков', () => {
    // Иначе карточка «дребезжит» между открытиями и у разных зрителей.
    const seat = { uid: 'p_bot_stable', name: 'Бот', avatar: '17' };
    expect(tournamentBotCardInfo(seat)).toEqual(tournamentBotCardInfo(seat));
  });

  test('бот не выдаёт себя за живого игрока', () => {
    // зачем (владелец 2026-08-04, решение поменялось после этого теста): uid
    // бота теперь есть в карточке (иначе не было бы кнопки «в друзья»), а от
    // похода в Firestore за несуществующим профилем защищает isSyntheticUid().
    sample.forEach((info) => {
      expect(info.isMe).toBe(false);
      expect(info.uid).toBeTruthy();
      expect(isSyntheticUid(info.uid)).toBe(true);
    });
  });
});
