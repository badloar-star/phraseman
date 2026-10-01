import { EPISODE_01_SESSION_08_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_08_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';

describe('episode 1 Full B1 session 8 checkpoint source', () => {
  test('has no new vocabulary and gives every practice card one unique retrieval target', () => {
    expect(EPISODE_01_SESSION_08_SOURCE.sessionKindOverride).toBe('checkpoint');
    // зачем: поле переименовано в newVocabulary (04771d1ca, 2026-08-24); смысл тот же — новых слов нет.
    expect(EPISODE_01_SESSION_08_SOURCE.newVocabulary ?? []).toHaveLength(0);
    const cards = buildSessionShardFromSource(EPISODE_01_SESSION_08_SOURCE).cards.slice(3);
    expect(cards).toHaveLength(6);
    expect(cards.filter((card) => card.family === 'speed_match')).toHaveLength(1);
    expect(new Set(cards.map((card) => card.contentItem.target.text)).size).toBe(cards.length);
  });
});
