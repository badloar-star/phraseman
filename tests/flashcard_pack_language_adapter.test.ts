import {
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from '../app/community_packs/schema';
import {
  normalizePackCardTexts,
  normalizePackLanguageRecord,
} from '../app/flashcards/pack_languages';

function cardsWith<T extends Record<string, unknown>>(card: T): T[] {
  return Array.from({ length: 10 }, (_, index) => ({ ...card, id: `${String(card.id ?? 'card')}-${index}` }));
}

describe('flashcard pack language adapter', () => {
  it('keeps new target and translation text neutral', () => {
    expect(normalizePackCardTexts({
      targetText: 'Bonjour',
      translationText: 'Привет',
      en: 'legacy value',
      ru: 'старое значение',
    }, 'fr')).toEqual({ targetText: 'Bonjour', translationText: 'Привет' });
  });

  it('maps legacy English cards field by field', () => {
    expect(normalizePackCardTexts({ en: 'Hello', ru: 'Привет' }, 'en')).toEqual({
      targetText: 'Hello',
      translationText: 'Привет',
    });
  });

  it('normalizes a missing pack language to English', () => {
    expect(normalizePackLanguageRecord({ studyTarget: 'en' })).toBe('en');
    expect(normalizePackLanguageRecord({})).toBe('en');
  });

  it('requires and round-trips packLanguage for new community payloads', () => {
    const payload = {
      packLanguage: 'de',
      title: 'Deutsch unterwegs',
      description: 'A German travel set',
      cards: cardsWith({ targetText: 'Guten Morgen', translationText: 'Доброе утро', en: '' }),
    } as unknown as CommunityPackSubmissionPayload;

    expect(validateCommunityPackPayload(payload)).toBeNull();
    expect(buildCommunityPackPayloadForCloud(payload)).toMatchObject({
      packLanguage: 'de',
      cards: expect.arrayContaining([
        expect.objectContaining({ targetText: 'Guten Morgen', translationText: 'Доброе утро' }),
      ]),
    });
  });

  it('rejects unsupported pack languages instead of silently changing them', () => {
    const payload = {
      packLanguage: 'it',
      title: 'Italiano',
      description: 'Unsupported',
      cards: cardsWith({ en: 'Ciao', ru: 'Привет' }),
    } as unknown as CommunityPackSubmissionPayload;

    expect(validateCommunityPackPayload(payload)).toBe('pack_language');
  });
});
