import { writeImmutableArtifact, writeImmutableObject, type ArtifactBucketLike } from './artifact_storage';
import { serializeArtifactPayload } from './artifact_repository';
import { createHash } from 'node:crypto';

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
    expect(receipt).toMatchObject({ referenceState: 'pending_commit' });
    expect(receipt.finalizationKey).toMatch(/^[a-f0-9]{64}$/);
    expect(saved).toContain('course-releases/r1/lesson/1.json:');
  });

  it('replays an existing byte-identical artifact after an interrupted receipt write', async () => {
    const payload = { hello: 'world' };
    const contentHash = createHash('sha256').update(serializeArtifactPayload(payload)).digest('hex');
    let saves = 0;
    const bucket: ArtifactBucketLike = { file: () => ({ async exists() { return [true]; }, async save() { saves += 1; }, async getMetadata() { return [{ generation: 'g42', size: '17', metadata: { contentHash } }]; } }) };
    const receipt = await writeImmutableArtifact(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload });
    expect(receipt).toMatchObject({ contentHash, objectGeneration: 'g42' });
    expect(saves).toBe(0);
  });

  it('rejects an existing object when its immutable content hash differs', async () => {
    const bucket: ArtifactBucketLike = { file: () => ({ async exists() { return [true]; }, async save() {}, async getMetadata() { return [{ generation: 'g1', size: '2', metadata: { contentHash: '0'.repeat(64) } }]; } }) };
    await expect(writeImmutableArtifact(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload: {} })).rejects.toThrow('artifact_content_conflict');
  });

  it('replays a byte-identical surface index without overwriting it', async () => {
    const payload = { units: [{ lessonId: 1 }] };
    const contentHash = createHash('sha256').update(serializeArtifactPayload(payload)).digest('hex');
    const bucket: ArtifactBucketLike = { file: () => ({ async exists() { return [true]; }, async save() { throw new Error('must not overwrite'); }, async getMetadata() { return [{ generation: 'g9', size: '26', metadata: { contentHash } }]; } }) };
    await expect(writeImmutableObject(bucket, 'course-releases/r1/lesson/index.json', payload)).resolves.toMatchObject({ contentHash, objectGeneration: 'g9', referenceState: 'pending_commit', finalizationKey: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });
});
