import { writeImmutableArtifact, type ArtifactBucketLike } from './artifact_storage';

describe('immutable cloud artifact storage', () => {
  it('writes one release-scoped JSON object and returns provider generation metadata', async () => {
    let saved = '';
    const bucket: ArtifactBucketLike = {
      file(path) {
        return {
          async exists() { return [false]; },
          async save(data) { saved = `${path}:${data.toString('utf8')}`; },
          async getMetadata() { return [{ generation: 'g42', size: String(Buffer.byteLength(saved, 'utf8')) }]; },
        };
      },
    };
    const receipt = await writeImmutableArtifact(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload: { hello: 'world' } });
    expect(receipt.objectGeneration).toBe('g42');
    expect(saved).toContain('course-releases/r1/lesson/1.json:');
  });

  it('never overwrites an existing immutable object', async () => {
    const bucket: ArtifactBucketLike = { file: () => ({ async exists() { return [true]; }, async save() {}, async getMetadata() { return [{}]; } }) };
    await expect(writeImmutableArtifact(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload: {} })).rejects.toThrow('artifact_already_exists');
  });
});
