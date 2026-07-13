import {
  clearLingmanVideoTitleHandoff,
  consumeLingmanVideoTitle,
  setLingmanVideoTitleHandoff,
} from '../app/lingman_video_title_handoff';

describe('bounded Lingman video title handoff', () => {
  beforeEach(clearLingmanVideoTitleHandoff);

  test('returns a title once only for the matching valid video id', () => {
    setLingmanVideoTitleHandoff('abc_123', 'Catalog title', 1_000);
    expect(consumeLingmanVideoTitle('wrong_1', 1_001)).toBeNull();
    expect(consumeLingmanVideoTitle('abc_123', 1_002)).toBe('Catalog title');
    expect(consumeLingmanVideoTitle('abc_123', 1_003)).toBeNull();
  });

  test('expires, clears, rejects invalid ids, and replaces the single slot', () => {
    expect(setLingmanVideoTitleHandoff('bad id', 'Title', 1_000)).toBe(false);
    setLingmanVideoTitleHandoff('video_1', 'First', 1_000);
    setLingmanVideoTitleHandoff('video_2', 'Second', 1_001);
    expect(consumeLingmanVideoTitle('video_1', 1_002)).toBeNull();
    expect(consumeLingmanVideoTitle('video_2', 1_002)).toBe('Second');
    setLingmanVideoTitleHandoff('video_3', 'Third', 1_000);
    expect(consumeLingmanVideoTitle('video_3', 1_000 + 60_001)).toBeNull();
    setLingmanVideoTitleHandoff('video_4', 'Fourth', 2_000);
    clearLingmanVideoTitleHandoff();
    expect(consumeLingmanVideoTitle('video_4', 2_001)).toBeNull();
  });
});
