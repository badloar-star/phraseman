import {
  MAX_TUTOR_PREVIEW_TTL_MS,
  clearMaxTutorPreviewCacheForTests,
  maxTutorPreviewKey,
  parseMaxTutorPreview,
  peekMaxTutorPreview,
  primeMaxTutorPreview,
} from '../app/max_tutor_preview';

const rawPreview = {
  name: 'Max', lessonOrdinal: 4, lessonType: 'new_material', dueCount: 1, homeworkCount: 0,
  nextTopic: 'Introductions',
  displayTitle: 'Первый контакт', outcome: 'Научишься уверенно здороваться.',
  goal: { id: 'a1_greet', level: 'A1', title: { en: 'Greet', ru: 'Поздороваться', uk: 'Привітатися' }, mastery: 1 },
};

describe('MAX tutor preview parser and cache', () => {
  beforeEach(clearMaxTutorPreviewCacheForTests);

  test('defensively parses and localizes the server preview', () => {
    expect(parseMaxTutorPreview(rawPreview, 'ru')).toEqual({
      tutorName: 'Max', lessonOrdinal: 4, lessonType: 'new_material', dueCount: 1, homeworkCount: 0,
      nextTopic: 'Introductions', goalId: 'a1_greet', goalTitle: 'Поздороваться', goalLevel: 'A1',
      goalMastery: 1, displayTitle: 'Первый контакт',
      outcome: 'Научишься уверенно здороваться.',
    });
    expect(parseMaxTutorPreview({ lessonOrdinal: 'bad' }, 'ru')).toBeNull();
  });

  test('key includes every input that changes lesson copy', () => {
    expect(maxTutorPreviewKey({ format: 'tutor', cefr: 'A1', interfaceLang: 'ru', studyTarget: 'en' }))
      .not.toBe(maxTutorPreviewKey({ format: 'tutor', cefr: 'A1', interfaceLang: 'uk', studyTarget: 'en' }));
  });

  test('peek is synchronous, respects TTL, and deduplicates in-flight fetches', async () => {
    const key = 'tutor|A1|ru|en';
    let resolve!: (value: ReturnType<typeof parseMaxTutorPreview>) => void;
    const fetcher = jest.fn(() => new Promise<ReturnType<typeof parseMaxTutorPreview>>((done) => { resolve = done; }));
    const a = primeMaxTutorPreview(key, fetcher, 1_000);
    const b = primeMaxTutorPreview(key, fetcher, 1_100);
    expect(a).toBe(b);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const parsed = parseMaxTutorPreview(rawPreview, 'ru');
    resolve(parsed);
    await a;
    expect(peekMaxTutorPreview(key, 1_000 + MAX_TUTOR_PREVIEW_TTL_MS)).toEqual(parsed);
    expect(peekMaxTutorPreview(key, 1_001 + MAX_TUTOR_PREVIEW_TTL_MS)).toBeNull();
  });

  test('failed refresh preserves the last usable preview', async () => {
    const key = 'tutor|A1|ru|en';
    const parsed = parseMaxTutorPreview(rawPreview, 'ru');
    await primeMaxTutorPreview(key, async () => parsed, 1_000);
    await expect(primeMaxTutorPreview(key, async () => { throw new Error('offline'); }, 1_000 + MAX_TUTOR_PREVIEW_TTL_MS + 1))
      .rejects.toThrow('offline');
    expect(peekMaxTutorPreview(key, 1_000 + MAX_TUTOR_PREVIEW_TTL_MS + 2, true)).toEqual(parsed);
  });

  test('malformed empty response clears the in-flight slot so retry can recover', async () => {
    const key = 'tutor|A1|ru|en';
    const parsed = parseMaxTutorPreview(rawPreview, 'ru');
    const fetcher = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(parsed);

    await expect(primeMaxTutorPreview(key, fetcher, 1_000))
      .rejects.toThrow('max_tutor_preview_malformed');
    await expect(primeMaxTutorPreview(key, fetcher, 1_001)).resolves.toEqual(parsed);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
