/**
 * Контракт: под «Участники клуба» не должно быть немой пустоты.
 *
 * зачем: владелец открыл Медную лигу («1 участник») и увидел под заголовком
 * пустое место — это читалось как поломка экрана. Причины две:
 *   1) старое пустое состояние срабатывает только при participantCount <= 0;
 *   2) сам список рисует ТОЛЬКО игроков после топ-3 (publicListGroup = slice(3)).
 * Значит при 1..3 участниках не показывалось ничего. Считаем по числу ВИДИМЫХ
 * в списке строк, а не по общему числу участников.
 */
import {
  shouldShowLeagueEmptyParticipants,
  shouldShowLeagueSoloParticipant,
} from '../app/league_open_cache_policy';

describe('пустое состояние лиги', () => {
  it('нет участников → «Пока нет участников», solo-текст молчит', () => {
    expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: true, participantCount: 0 })).toBe(true);
    expect(shouldShowLeagueSoloParticipant({
      localLeagueHydrated: true, participantCount: 0, visibleListCount: 0,
    })).toBe(false);
  });

  it('игрок один → показываем solo-текст вместо пустоты', () => {
    expect(shouldShowLeagueSoloParticipant({
      localLeagueHydrated: true, participantCount: 1, visibleListCount: 0,
    })).toBe(true);
    // старое состояние при этом молчит — тексты не накладываются
    expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: true, participantCount: 1 })).toBe(false);
  });

  it('2..3 участника (все влезли в топ-3, список пуст) → тоже solo-текст', () => {
    for (const count of [2, 3]) {
      expect(shouldShowLeagueSoloParticipant({
        localLeagueHydrated: true, participantCount: count, visibleListCount: 0,
      })).toBe(true);
    }
  });

  it('в списке есть строки → solo-текст молчит, рисуется список', () => {
    expect(shouldShowLeagueSoloParticipant({
      localLeagueHydrated: true, participantCount: 5, visibleListCount: 2,
    })).toBe(false);
    expect(shouldShowLeagueSoloParticipant({
      localLeagueHydrated: true, participantCount: 30, visibleListCount: 27,
    })).toBe(false);
  });

  it('до гидрации не показываем ничего — иначе текст мигает на старте', () => {
    expect(shouldShowLeagueSoloParticipant({
      localLeagueHydrated: false, participantCount: 1, visibleListCount: 0,
    })).toBe(false);
    expect(shouldShowLeagueEmptyParticipants({ localLeagueHydrated: false, participantCount: 0 })).toBe(false);
  });
});
