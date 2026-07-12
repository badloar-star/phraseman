import { assertPublishedArtifactMatchesPointer, publishedArtifactDocId, validatePublishedLessonArtifact, type PublishedLessonArtifact } from './published_artifact';

const artifact: PublishedLessonArtifact = {
  packId: 'fr.en.lessons.v1', studyTarget: 'fr', sourceLocale: 'en', surface: 'lessons', revision: 4, contentHash: 'hash-4',
  lessonId: 1,
  phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `source ${index}`, targetText: `target ${index}` })),
  vocabulary: [{ lemma: 'be', partOfSpeech: 'verb', targetText: 'être' }],
  drills: [{ kind: 'part_of_speech' as const, applicable: true, itemCount: 1 }],
};

describe('published content artifact identity', () => {
  it('uses a stable lesson-scoped document id and accepts a complete artifact', () => {
    expect(publishedArtifactDocId(artifact.packId, artifact.lessonId)).toBe('fr.en.lessons.v1:1');
    expect(validatePublishedLessonArtifact(artifact)).toEqual({ ok: true, errors: [] });
  });

  it('rejects a target or revision mismatch before runtime delivery', () => {
    expect(validatePublishedLessonArtifact({ ...artifact, surface: 'quizzes' }).errors).toContain('surface_mismatch');
    expect(() => assertPublishedArtifactMatchesPointer(artifact, { packId: artifact.packId, studyTarget: 'fr', sourceLocale: 'en', revision: 3, contentHash: artifact.contentHash })).toThrow('published_artifact_identity_mismatch');
  });
});
