/**
 * Контракт: игрок ОДИН в лиге — под «Участники клуба» не должно быть немой
 * пустоты.
 *
 * зачем: владелец открыл Медную лигу («1 участник») и увидел под заголовком
 * пустое место — это читалось как поломка экрана. Причина: старое пустое
 * состояние срабатывало только при participantCount <= 0, а список участников
 * рисует игроков после топ-3 (slice(3)). При ровно одном участнике не
 * показывалось ничего.
 */
import {
  shouldShowLeagueEmptyParticipants,
  shouldShowLeagueSoloParticipant,
} from '../app/league_open_cache_policy';

describe('пустое состояние лиги', () => {
  it('нет участников → показываем «Пока нет участников»', () => {
    expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: true, participantCount: 0 })).toBe(true);
    expect(shouldShowLeagueSoloParticipant({ localLeagueHydrated: true, participantCount: 0 })).toBe(false);
  });

  it('игрок один → показываем отдельный текст, а не пустоту', () => {
    expect(shouldShowLeagueSoloParticipant({ localLeagueHydrated: true, participantCount: 1 })).toBe(true);
    // старое состояние при этом молчит — тексты не накладываются друг на друга
    expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: true, participantCount: 1 })).toBe(false);
  });

  it('участников больше одного → оба состояния молчат, рисуется список', () => {
    for (const count of [2, 5, 30]) {
      expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: true, participantCount: count })).toBe(false);
      expect(shouldShowLeagueSoloParticipant({ localLeagueHydrated: true, participantCount: count })).toBe(false);
    }
  });

  it('до гидрации не показываем ничего — иначе мигает текст на старте', () => {
    expect(shouldShowLeagueSoloParticipant({ localLeagueHydrated: false, participantCount: 1 })).toBe(false);
    expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: false, participantCount: 0 })).toBe(false);
  });
});
