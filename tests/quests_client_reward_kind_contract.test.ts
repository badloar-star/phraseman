/**
 * Граница парсинга наград задания на клиенте (app/quests_client.ts).
 *
 * зачем (PM-232, 2026-09-24): 'pearls'/'spins' убраны из допустимых видов
 * награды синхронно с сервером (functions/src/quests_core.ts) — обе выдачи
 * давно no-op (PM-058/PM-047), редактор заданий в админке предлагал создать
 * задание, которое обещает награду и молча её не выдаёт. Этот тест фиксирует
 * контракт границы: неизвестный/отключённый kind отбрасывается при разборе
 * ответа сервера и локального кэша, а не приводится типом вслепую (`as`).
 */
import { isQuestRewardKind, CLIENT_QUEST_REWARD_KINDS } from '../app/quests_client';

describe('quests_client — reward kind boundary', () => {
  it('признаёт только живые виды награды', () => {
    expect(CLIENT_QUEST_REWARD_KINDS).toEqual(['runes', 'plus_days', 'freeze']);
    for (const kind of CLIENT_QUEST_REWARD_KINDS) {
      expect(isQuestRewardKind(kind)).toBe(true);
    }
  });

  it('отклоняет отключённые виды pearls/spins и любой мусор', () => {
    expect(isQuestRewardKind('pearls')).toBe(false);
    expect(isQuestRewardKind('spins')).toBe(false);
    expect(isQuestRewardKind('')).toBe(false);
    expect(isQuestRewardKind(undefined)).toBe(false);
    expect(isQuestRewardKind(null)).toBe(false);
    expect(isQuestRewardKind(42)).toBe(false);
    expect(isQuestRewardKind('xp')).toBe(false);
  });
});
