import {
  COMPASS_PUSH_COMEBACK,
  COMPASS_PUSH_NEW_PHRASES,
  COMPASS_PUSH_STREAK_GAIN,
  COMPASS_PUSH_STREAK_KEEP,
  COMPASS_STATS_TITLE,
  COMPASS_STATS_STREAK,
  COMPASS_STATS_DAYS,
  COMPASS_STATS_TOPICS,
  COMPASS_TOPIC_STATUS,
  COMPASS_TOPIC_LABEL,
  type CompassText,
} from '../app/compass/compass_copy';

const TEXTS: CompassText[] = [
  COMPASS_PUSH_COMEBACK,
  COMPASS_PUSH_NEW_PHRASES,
  COMPASS_PUSH_STREAK_GAIN,
  COMPASS_PUSH_STREAK_KEEP,
  COMPASS_STATS_TITLE,
  COMPASS_STATS_STREAK,
  COMPASS_STATS_DAYS,
  COMPASS_STATS_TOPICS,
  ...Object.values(COMPASS_TOPIC_STATUS),
  ...Object.values(COMPASS_TOPIC_LABEL),
];

const LANGS: (keyof CompassText)[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('compass_copy — preserved non-interrupting surfaces', () => {
  it('keeps retention and topic-map copy complete in all supported languages', () => {
    for (const text of TEXTS) {
      for (const lang of LANGS) {
        expect(text[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('does not reintroduce briefing or day-closing copy', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'app', 'compass', 'compass_copy.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/BRIEFING|DAY_CLOSING|buildCompassGreeting|buildCompassInduction/);
  });
});
