// ═══════════════════════════════════════════════════════════════════════════
// Страж: клиент обязан узнавать бота БЕЗ поля isBot.
//
// зачем (2026-08-04, владелец: «карточки ботов всегда показывают 0 опыта и
// 1 уровень»): сервер намеренно вырезает isBot из публичного документа комнаты
// (publicTournamentPlayer в functions/src/tournaments.ts), чтобы игрок не мог
// отличить бота от человека по данным. Клиент же проверял именно player.isBot —
// у всех ботов выходило false/undefined. Последствия были молчаливыми:
//   • карточка бота уходила в ветку «живой незнакомец» → 0 опыта, Lv.1;
//   • кап 50 уровня на аватаре бота не срабатывал вовсе;
//   • uid бота (p_…) улетал в батч профилей, где его не существует.
//
// Обычные тесты бот-карточки это НЕ ловят: они зовут tournamentBotCardInfo
// напрямую, а баг был в том, что до неё не доходило исполнение. Поэтому здесь
// проверяется РАЗВИЛКА на документе ровно той формы, что приходит с сервера.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  isTournamentBotPlayer,
  tournamentAvatarValue,
  TOURNAMENT_BOT_MAX_LEVEL,
} from '../components/tournament/tournament_avatars';
import { tournamentBotCardInfo } from '../components/tournament/tournament_bot_card';
import { getLevelFromXP } from '../constants/theme';
import { isSyntheticUid } from '../app/synthetic_friend_requests';

/** Игрок ровно в том виде, в каком его отдаёт сервер: БЕЗ isBot. */
const publicBot = { id: 'p_1kx9d2', name: 'quiet_hunter', avatar: '34' };
const publicHuman = { id: 'stable-uid-abc123', name: 'Максим', avatar: '12' };

describe('tournament bot identity survives the public document (owner 2026-08-04)', () => {
  test('бот узнаётся без поля isBot — оно вырезано сервером', () => {
    expect(publicBot).not.toHaveProperty('isBot');
    expect(isTournamentBotPlayer(publicBot)).toBe(true);
  });

  test('живой игрок ботом НЕ считается: его id — не p_<hash>', () => {
    expect(isTournamentBotPlayer(publicHuman)).toBe(false);
    // uid реальных форматов, которые не должны попасть под маску бота.
    for (const id of [
      'p', 'player_42', 'p_', 'p_ABC', 'p-9f2', 'Pq7x1',
      'zK3nQpLmR8vT2wYs', 'user_p_9f2',
    ]) {
      expect(isTournamentBotPlayer({ id, avatar: '5' })).toBe(false);
    }
  });

  test('старые комнаты с явным isBot по-прежнему главнее формата id', () => {
    expect(isTournamentBotPlayer({ id: 'legacy-uid', isBot: true, avatar: '5' })).toBe(true);
    // Защита от ложного срабатывания, если человек когда-то сядет под p_-id.
    expect(isTournamentBotPlayer({ id: 'p_1kx9d2', isBot: false, avatar: '5' })).toBe(false);
  });

  test('карточка бота из публичного документа показывает его опыт, а не 0 / Lv.1', () => {
    // Ровно тот путь, которым идёт экран: документ → seat → карточка.
    const seat = {
      uid: publicBot.id,
      name: publicBot.name,
      avatar: tournamentAvatarValue({ id: publicBot.id, isBot: isTournamentBotPlayer(publicBot), avatar: publicBot.avatar }),
    };
    const card = tournamentBotCardInfo(seat);
    expect(card.totalXp).toBeGreaterThan(0);
    expect(getLevelFromXP(card.totalXp ?? 0)).toBe(34);
    // Именно это владелец видел на экране — регрессия должна ронять тест.
    expect(getLevelFromXP(card.totalXp ?? 0)).not.toBe(1);
    // зачем (владелец 2026-08-04, решение поменялось внутри того же дня): uid
    // бота теперь СОЗНАТЕЛЬНО кладётся в карточку — иначе на ней не было бы
    // кнопки «в друзья» и бот отличался бы от живого игрока. Защита от похода
    // в leaderboard/лайки живёт не в отсутствии uid, а в isSyntheticUid()
    // (PlayerProfileModal глушит там все сетевые запросы для p_-id).
    expect(card.uid).toBe(publicBot.id);
    expect(isSyntheticUid(card.uid)).toBe(true);
  });

  test('кап 50 уровня на аватаре бота работает без isBot в документе', () => {
    // Комнаты, созданные до серверного капа, ещё несут аватары 51..60.
    for (let index = 51; index <= 60; index += 1) {
      const value = tournamentAvatarValue({ id: 'p_legacy9', avatar: String(index) });
      expect(Number(value)).toBeLessThanOrEqual(TOURNAMENT_BOT_MAX_LEVEL);
      expect(Number(value)).toBeGreaterThanOrEqual(1);
    }
    // Настоящему игроку аватар не режем — это его покупка.
    expect(tournamentAvatarValue({ id: 'stable-uid-abc123', avatar: '57' })).toBe('57');
  });
});

describe('источники правды не разъезжаются', () => {
  const read = (relative: string) => readFileSync(join(__dirname, '..', relative), 'utf8');

  test('сервер всё ещё вырезает isBot — иначе предикат по id больше не нужен', () => {
    const source = read('functions/src/tournaments.ts');
    expect(source).toContain('isBot: _isBot');
  });

  test('турнирные экраны не читают player.isBot напрямую', () => {
    for (const file of [
      'app/tournament_lobby.tsx',
      'app/tournament_results.tsx',
      'app/tournament_table.tsx',
    ]) {
      const source = read(file);
      // Разрешено только внутри аргумента tournamentAvatarValue (там предикат
      // применяется повторно) и в комментариях, объясняющих сам баг.
      const offenders = source
        .split('\n')
        .filter((line) => /\bplayer\.isBot\b/.test(line))
        .filter((line) => !line.includes('tournamentAvatarValue'))
        .filter((line) => !/^\s*(\/\/|\*|\\)/.test(line.trim()));
      expect(offenders).toEqual([]);
    }
  });

  test('боты садятся под p_-id — формат, на котором держится предикат', () => {
    const source = read('functions/src/tournaments.ts');
    expect(source).toContain('id: `p_${tournamentHash32(');
  });
});
