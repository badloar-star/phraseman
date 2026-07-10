import { parsePublishedLessonArtifact } from '../app/language_runtime/content_client';

const artifact = {
  packId: 'fr.en.lessons.v1', studyTarget: 'fr', sourceLocale: 'en', surface: 'lessons', revision: 4, contentHash: 'hash-4', lessonId: 1,
  phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `source ${index}`, targetText: `target ${index}` })),
  vocabulary: [{ lemma: 'be', partOfSpeech: 'verb', targetText: 'être' }],
  drills: [{ kind: 'part_of_speech', applicable: true, itemCount: 1 }],
};

describe('published content client', () => {
  it('accepts a complete server artifact with its identity intact', () => {
    expect(parsePublishedLessonArtifact(artifact)).toMatchObject({ packId: 'fr.en.lessons.v1', studyTarget: 'fr', lessonId: 1 });
  });

  it('rejects incomplete payloads instead of falling through as another language', () => {
    expect(() => parsePublishedLessonArtifact({ ...artifact, studyTarget: 'es', phrases: [] })).toThrow('published_lesson_invalid');
  });
});
