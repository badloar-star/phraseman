"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const artifact_repository_1 = require("./artifact_repository");
describe('immutable artifact repository contract', () => {
    it('builds a release-scoped safe object path and hash-bound receipt', () => {
        const receipt = (0, artifact_repository_1.buildArtifactReceipt)({ releaseId: 'fr-ru-release-0001', surface: 'lesson', lessonId: 1, payload: { hello: 'world' }, objectGeneration: 'g1', byteSize: 17 });
        expect((0, artifact_repository_1.artifactObjectPath)('fr-ru-release-0001', 'lesson', 1)).toBe('course-releases/fr-ru-release-0001/lesson/1.json');
        expect(receipt.contentHash).toMatch(/^[a-f0-9]{64}$/);
        expect(receipt.objectGeneration).toBe('g1');
    });
    it('rejects traversal and invalid unit ids', () => {
        expect(() => (0, artifact_repository_1.artifactObjectPath)('../escape', 'lesson', 1)).toThrow('artifact_path_invalid');
        expect(() => (0, artifact_repository_1.artifactObjectPath)('release', 'lesson', 0)).toThrow('artifact_path_invalid');
    });
});
//# sourceMappingURL=artifact_repository.test.js.map