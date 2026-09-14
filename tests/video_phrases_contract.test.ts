import { normalizeVideoPhraseDraft, normalizeVideoPhraseList, videoPhraseId } from '../app/video_phrases_contract';
import { fetchPublishedVideoPhrasesWithReader } from '../app/video_phrases_client';

describe('video phrase contract', () => {
  it('normalizes a phrase to phrase, translation and explanation only', () => {
    const result = normalizeVideoPhraseDraft({
      videoId: 'abc12345678',
      ordinal: 1,
      phrase: ' Ich habe es eilig. ',
      translation: ' Я спешу. ',
      explanation: ' Устойчивое выражение. ',
      example: 'Wir haben es eilig.',
      grammarSchema: 'Ich | habe | es eilig',
      exercise: 'Переведи сам',
    });

    expect(result).toEqual({
      id: videoPhraseId('abc12345678', 1),
      ordinal: 1,
      phrase: 'Ich habe es eilig.',
      translation: 'Я спешу.',
      explanation: 'Устойчивое выражение.',
    });
    expect(result).not.toHaveProperty('example');
    expect(result).not.toHaveProperty('grammarSchema');
    expect(result).not.toHaveProperty('exercise');
  });

  it('rejects missing required fields and invalid ordinals', () => {
    expect(() => normalizeVideoPhraseDraft({
      videoId: 'abc12345678', ordinal: 0, phrase: 'x', translation: 'x', explanation: 'x',
    })).toThrow('video_phrase_ordinal_invalid');

    expect(() => normalizeVideoPhraseDraft({
      videoId: 'abc12345678', ordinal: 1, phrase: 'x', translation: '', explanation: 'x',
    })).toThrow('video_phrase_translation_required');
  });

  it('requires contiguous ordinals for a publishable list', () => {
    expect(() => normalizeVideoPhraseList('abc12345678', [
      { ordinal: 1, phrase: 'A', translation: 'А', explanation: 'Е' },
      { ordinal: 3, phrase: 'B', translation: 'Б', explanation: 'Е' },
    ])).toThrow('video_phrase_ordinals_must_be_contiguous');
  });

  it('assigns ordinals when AI returns only the three content fields', () => {
    expect(normalizeVideoPhraseList('abc12345678', [
      { phrase: 'A', translation: 'А', explanation: 'Е' },
      { phrase: 'B', translation: 'Б', explanation: 'Е' },
    ])).toEqual([
      { id: videoPhraseId('abc12345678', 1), ordinal: 1, phrase: 'A', translation: 'А', explanation: 'Е' },
      { id: videoPhraseId('abc12345678', 2), ordinal: 2, phrase: 'B', translation: 'Б', explanation: 'Е' },
    ]);
  });

  it('normalizes and rejects malformed published payloads before showing them', async () => {
    const result = await fetchPublishedVideoPhrasesWithReader('abc12345678', {
      get: async (path) => {
        if (path === 'video_phrase_sets/abc12345678') return { activeVersion: 'v1' };
        return {
          status: 'published',
          phrases: [
            { phrase: ' A ', translation: ' А ', explanation: ' Е ' },
            { phrase: '', translation: 'Б', explanation: 'Е' },
          ],
        };
      },
    });
    expect(result).toEqual([]);
  });

  it('normalizes a valid published payload to the canonical learner shape', async () => {
    const result = await fetchPublishedVideoPhrasesWithReader('abc12345678', {
      get: async (path) => path === 'video_phrase_sets/abc12345678'
        ? { activeVersion: 'v1' }
        : { status: 'published', phrases: [{ phrase: ' A ', translation: ' А ', explanation: ' Е ' }] },
    });
    expect(result).toEqual([{
      id: videoPhraseId('abc12345678', 1),
      ordinal: 1,
      phrase: 'A',
      translation: 'А',
      explanation: 'Е',
    }]);
  });
});
