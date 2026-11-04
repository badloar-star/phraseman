// зачем (владелец 04.11, Пик): тексты тура в режиме монет держим в дереве до «да» владельца на макет — проверка полноты.
import { SPIRE_GAME_STRINGS } from '../components/spire/spire_game_strings';

const KEYS = ['tour1TextCoins', 'tour3TextCoins', 'tour3TitleCoins'];

describe('тексты тура Пика (режим монет)', () => {
  it('на 9 языках, не пустые', () => {
    for (const k of KEYS) {
      expect(SPIRE_GAME_STRINGS[k]).toHaveLength(9);
      for (const v of SPIRE_GAME_STRINGS[k]) expect(v.trim().length).toBeGreaterThan(0);
    }
  });
  it('страница 3 — текст Переводчика без «15%»', () => {
    expect(SPIRE_GAME_STRINGS.tour3TextCoins[0]).toContain('Кто дошёл до самой вершины');
    expect(SPIRE_GAME_STRINGS.tour3TitleCoins[0]).toBe('Как работает неделя');
  });
});
