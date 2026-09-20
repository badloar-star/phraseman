import { pickTutorTopics } from './tutor_text_topics';
import { TUTOR_NATIVE_GOAL_CATALOG } from './tutor_text_goal_catalog';

describe('pickTutorTopics target projection', () => {
  it('preserves the English catalog behavior', () => {
    expect(pickTutorTopics({}, 'A1', 3, 'en').map((topic) => topic.goalId))
      .toEqual(['a1_greet', 'a1_intro', 'a1_ask_name']);
  });

  it.each([
    ['es', 'Saludar y despedirse'],
    ['fr', 'Dire bonjour et au revoir'],
    ['de', 'Jemanden begrüßen und sich verabschieden'],
  ] as const)('returns native %s titles', (target, expected) => {
    const topics = pickTutorTopics({}, 'A1', 3, target);
    expect(topics[0].title.en).toBe(expected);
    expect(new Set(Object.values(topics[0].title)).size).toBe(1);
  });

  it('returns mastered native topics as explicit revisits instead of going empty', () => {
    const mastery = Object.fromEntries(TUTOR_NATIVE_GOAL_CATALOG.de.map((row) => [row.goalId, 3]));
    const topics = pickTutorTopics(mastery, 'B1', 3, 'de');
    expect(topics).toHaveLength(3);
    expect(topics.every((topic) => topic.review)).toBe(true);
  });
});
