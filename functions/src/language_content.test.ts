import { HttpsError } from 'firebase-functions/v2/https';
import { parsePublishedLessonRequest } from './language_content';

describe('published lesson delivery request', () => {
  it('accepts one bounded target/source/lesson identity', () => {
    expect(parsePublishedLessonRequest({ studyTarget: 'fr', sourceLocale: 'en', lessonId: 3 })).toEqual({ studyTarget: 'fr', sourceLocale: 'en', lessonId: 3 });
  });

  it('rejects malformed or out-of-range identities', () => {
    expect(() => parsePublishedLessonRequest({ studyTarget: 'fr', sourceLocale: 'en', lessonId: 0 })).toThrow(HttpsError);
    expect(() => parsePublishedLessonRequest({ studyTarget: 'fr/../es', sourceLocale: 'en', lessonId: 1 })).toThrow(HttpsError);
    expect(() => parsePublishedLessonRequest({ studyTarget: 'fr', sourceLocale: 'en', lessonId: 101 })).toThrow(HttpsError);
  });
});
