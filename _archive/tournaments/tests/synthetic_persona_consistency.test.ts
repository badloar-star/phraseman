// ═══════════════════════════════════════════════════════════════════════════
// Страж: один персонаж — один опыт, уровень и аватар в ЛЮБОМ месте приложения.
//
// зачем (владелец 2026-08-04): «будет неправильно, если они будут замечены в
// двух разных местах с разным опытом и уровнем и аватаром». До объединения
// бот турнира получал случайный номер аватара и выдуманный статичный опыт, а
// житель лиги жил по растущей кривой — один и тот же ник показывал разные
// цифры в двух режимах. Этот тест фиксирует, что расхождения больше нет.
// ═══════════════════════════════════════════════════════════════════════════

import { tournamentBotCardInfo } from '../components/tournament/tournament_bot_card';
import {
  RESIDENT_EPOCH_MS,
  RESIDENT_MAX_LEVEL,
  residentAvatar,
  residentLevelFromXp,
  residentProfileAt,
  residentXpForLevel,
} from '../constants/synthetic_residents';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('синтетический персонаж выглядит одинаково в лиге и в турнире', () => {
  it('аватар персонажа — это его уровень, и наоборот', () => {
    for (const days of [1, 30, 200, 700]) {
      const at = RESIDENT_EPOCH_MS + days * DAY_MS;
      for (let index = 0; index < 25; index++) {
        const profile = residentProfileAt(index, at);
        // Лига показывает этот аватар; турнир кладёт его же в запись бота.
        expect(profile.avatar).toBe(residentAvatar(profile.level));
        expect(Number(profile.avatar)).toBe(profile.level);
      }
    }
  });

  it('карточка бота турнира показывает уровень своего аватара', () => {
    for (let level = 1; level <= RESIDENT_MAX_LEVEL; level++) {
      const card = tournamentBotCardInfo({
        uid: `p_${level.toString(36)}abc`,
        name: 'tester',
        avatar: String(level),
      });
      // Уровень, который посчитает модалка из опыта, обязан совпасть с аватаром.
      expect(residentLevelFromXp(card.totalXp ?? 0)).toBe(level);
    }
  });

  it('опыт в карточке лежит внутри своего уровня, а не «где-то рядом»', () => {
    for (let level = 2; level <= 40; level++) {
      const xp = residentXpForLevel(level, `seat_${level}`);
      expect(residentLevelFromXp(xp)).toBe(level);
    }
  });

  it('опыт бота больше не статичная выдумка: уровень 40 весит больше уровня 5', () => {
    const low = residentXpForLevel(5, 'seat');
    const high = residentXpForLevel(40, 'seat');
    expect(high).toBeGreaterThan(low * 10);
  });

  it('карточка бота детерминирована — при каждом открытии те же цифры', () => {
    const seat = { uid: 'p_1a2b3c', name: 'frostbyte', avatar: '17' };
    const first = tournamentBotCardInfo(seat);
    const second = tournamentBotCardInfo(seat);
    expect(first).toEqual(second);
  });

  it('карточка бота несёт uid — кнопка «в друзья» на месте, как у живого', () => {
    const card = tournamentBotCardInfo({ uid: 'p_9z9z', name: 'nova.k', avatar: '12' });
    // Без uid модалка прячет кнопку, и карточка отличалась бы от человеческой.
    expect(card.uid).toBe('p_9z9z');
  });
});
