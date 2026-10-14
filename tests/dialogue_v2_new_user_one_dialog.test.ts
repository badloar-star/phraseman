// зачем (правило владельца 13.10: «с самого начала доступен только 1 диалог»; запрос Авторизации: «стартовый ранг в ai_dialog_level_lock = 1?»).
// Проверка по ФАКТИЧЕСКОМУ стартовому рангу: у нового аккаунта пустая запись ранга = ранг 0 (coin_rank_state_v1.emptyCoinRankState), а не 1.
import { emptyCoinRankState } from '../app/coin_rank_state_v1';
import { dialogScenarioRankAccess } from '../app/ai_dialog_level_lock';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import { getDialogueV2LocalRankAccess } from '../app/dialogue_v2_local_rank_access';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

describe('новый пользователь и диалоги', () => {
  const startRank = emptyCoinRankState('new-owner').rank;
  const openCount = (rank: number) => DIALOGUE_V2_CATALOGUE_INDEX
    .filter((entry) => getDialogueV2LocalRankAccess(entry.id, rank)?.access.status === 'unlocked').length;

  it('фактический стартовый ранг нового аккаунта — 0', () => {
    expect(startRank).toBe(0);
  });

  it('на стартовом ранге открыт ровно один диалог — social_01', () => {
    const open = DIALOGUE_V2_CATALOGUE_INDEX
      .filter((entry) => getDialogueV2LocalRankAccess(entry.id, startRank)?.access.status === 'unlocked')
      .map((entry) => entry.id);
    expect(open).toEqual(['social_01']);
  });

  it('каждый следующий ранг до 19 добавляет свою порцию диалогов, к рангу 19 открыто все 76', () => {
    let previous = openCount(startRank);
    for (let rank = 1; rank <= 19; rank += 1) {
      const open = openCount(rank);
      expect(`ранг ${rank}: ${open > previous}`).toBe(`ранг ${rank}: true`);
      previous = open;
    }
    expect(previous).toBe(76);
  });

  it('два замка не спорят: старый список (D124, лестница по уровню с ранга 1) на стартовом ранге не открывает ничего, V2 — один', () => {
    for (const cefr of ['A1', 'A2', 'B1', 'B2']) {
      expect(dialogScenarioRankAccess({ id: `legacy_${cefr}`, cefr }, startRank)).toEqual({ status: 'locked_by_rank', rankRequired: expect.any(Number) });
    }
    // ранг ещё не прочитан (null) — замок закрыт при сомнении, как раньше
    expect(getDialogueV2LocalRankAccess('social_01', null)?.access.status).toBe('locked_by_rank');
  });
});
