import { buildArtifactReceipt, artifactObjectPath } from './artifact_repository';

describe('immutable artifact repository contract', () => {
  it('builds a release-scoped safe object path and hash-bound receipt', () => {
    const receipt = buildArtifactReceipt({ releaseId: 'fr-ru-release-0001', surface: 'lesson', lessonId: 1, payload: { hello: 'world' }, objectGeneration: 'g1', byteSize: 17 });
    expect(artifactObjectPath('fr-ru-release-0001', 'lesson', 1)).toBe('course-releases/fr-ru-release-0001/lesson/1.json');
    expect(receipt.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.objectGeneration).toBe('g1');
  });

  it('rejects traversal and invalid unit ids', () => {
    expect(() => artifactObjectPath('../escape', 'lesson', 1)).toThrow('artifact_path_invalid');
    expect(() => artifactObjectPath('release', 'lesson', 0)).toThrow('artifact_path_invalid');
  });
});
