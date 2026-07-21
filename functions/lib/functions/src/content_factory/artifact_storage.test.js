"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const artifact_storage_1 = require("./artifact_storage");
const artifact_repository_1 = require("./artifact_repository");
const node_crypto_1 = require("node:crypto");
describe('immutable cloud artifact storage', () => {
    it('writes one release-scoped JSON object and returns provider generation metadata', async () => {
        let saved = '';
        const bucket = {
            file(path) {
                return {
                    async exists() { return [false]; },
                    async save(data) { saved = `${path}:${data.toString('utf8')}`; },
                    async getMetadata() { return [{ generation: 'g42', size: String(Buffer.byteLength(saved, 'utf8')) }]; },
                };
            },
        };
        const receipt = await (0, artifact_storage_1.writeImmutableArtifact)(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload: { hello: 'world' } });
        expect(receipt.objectGeneration).toBe('g42');
        expect(saved).toContain('course-releases/r1/lesson/1.json:');
    });
    it('replays an existing byte-identical artifact after an interrupted receipt write', async () => {
        const payload = { hello: 'world' };
        const contentHash = (0, node_crypto_1.createHash)('sha256').update((0, artifact_repository_1.serializeArtifactPayload)(payload)).digest('hex');
        let saves = 0;
        const bucket = { file: () => ({ async exists() { return [true]; }, async save() { saves += 1; }, async getMetadata() { return [{ generation: 'g42', size: '17', metadata: { contentHash } }]; } }) };
        const receipt = await (0, artifact_storage_1.writeImmutableArtifact)(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload });
        expect(receipt).toMatchObject({ contentHash, objectGeneration: 'g42' });
        expect(saves).toBe(0);
    });
    it('rejects an existing object when its immutable content hash differs', async () => {
        const bucket = { file: () => ({ async exists() { return [true]; }, async save() { }, async getMetadata() { return [{ generation: 'g1', size: '2', metadata: { contentHash: '0'.repeat(64) } }]; } }) };
        await expect((0, artifact_storage_1.writeImmutableArtifact)(bucket, { releaseId: 'r1', surface: 'lesson', lessonId: 1, payload: {} })).rejects.toThrow('artifact_content_conflict');
    });
    it('replays a byte-identical surface index without overwriting it', async () => {
        const payload = { units: [{ lessonId: 1 }] };
        const contentHash = (0, node_crypto_1.createHash)('sha256').update((0, artifact_repository_1.serializeArtifactPayload)(payload)).digest('hex');
        const bucket = { file: () => ({ async exists() { return [true]; }, async save() { throw new Error('must not overwrite'); }, async getMetadata() { return [{ generation: 'g9', size: '26', metadata: { contentHash } }]; } }) };
        await expect((0, artifact_storage_1.writeImmutableObject)(bucket, 'course-releases/r1/lesson/index.json', payload)).resolves.toMatchObject({ contentHash, objectGeneration: 'g9' });
    });
});
//# sourceMappingURL=artifact_storage.test.js.map