import { moderateLeagueChatMessage } from '../app/league_chat_moderation';

describe('league chat moderation', () => {
  it('blocks profanity and common spacing/transliteration evasions', () => {
    for (const text of ['Hui', 'h u i', 'xui', 'f u c k', 's h i t']) {
      expect(moderateLeagueChatMessage(text).status).toBe('blocked');
    }
  });

  it('does not block common clean words just because they contain short substrings', () => {
    for (const text of ['class', 'pass', 'assignment', 'studies', 'Diego', 'Essex', 'analysis']) {
      expect(moderateLeagueChatMessage(text).status).toBe('clean');
    }
  });

  it('keeps protected-identity terms out of visible chat through review, not auto-visible send', () => {
    expect(moderateLeagueChatMessage('gay').status).toBe('review');
  });

  it('blocks links and contacts separately from the word list', () => {
    expect(moderateLeagueChatMessage('join https://example.com').categories).toContain('link');
    expect(moderateLeagueChatMessage('write me test@example.com').categories).toContain('contact');
  });
});
