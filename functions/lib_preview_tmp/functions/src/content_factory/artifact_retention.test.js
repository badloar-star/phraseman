"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const artifact_retention_1 = require("./artifact_retention");
describe('artifact retention manifest', () => {
    const nowMs = 10 * 24 * 60 * 60 * 1000;
    test('is dry-run, bounded and age-gated by default', () => {
        const manifest = (0, artifact_retention_1.buildArtifactRetentionManifest)({
            nowMs,
            candidates: [
                { objectPath: 'content-factory-stages/old.json', objectGeneration: '1', createdAtMs: 0 },
                { objectPath: 'content-factory-stages/new.json', objectGeneration: '2', createdAtMs: nowMs - 1000 },
            ],
            references: [],
        });
        expect(manifest).toMatchObject({ mode: 'dry-run', scanned: 2, eligibleCount: 1, skippedYoungCount: 1 });
        expect(manifest.eligible).toEqual([{ objectPath: 'content-factory-stages/old.json', objectGeneration: '1' }]);
    });
    test('never marks an object referenced by any protected collection eligible', () => {
        const candidate = { objectPath: 'course-releases/r1/lesson/1.json', objectGeneration: '7', createdAtMs: 0 };
        const manifest = (0, artifact_retention_1.buildArtifactRetentionManifest)({
            nowMs,
            candidates: [candidate],
            references: [
                { collection: 'content_factory_stages', objectPath: candidate.objectPath, objectGeneration: candidate.objectGeneration },
                { collection: 'admin_log', objectPath: candidate.objectPath, objectGeneration: candidate.objectGeneration },
            ],
        });
        expect(manifest).toMatchObject({ eligibleCount: 0, referencedCount: 1 });
    });
    test('rejects unbounded scans and non-dry-run planning without an explicit guard', () => {
        expect(() => (0, artifact_retention_1.buildArtifactRetentionManifest)({ nowMs, candidates: Array.from({ length: 501 }, (_, index) => ({ objectPath: `x/${index}.json`, objectGeneration: '1', createdAtMs: 0 })), references: [] })).toThrow('artifact_retention_scan_limit_exceeded');
        expect(() => (0, artifact_retention_1.buildArtifactRetentionManifest)({ nowMs, mode: 'delete', candidates: [], references: [] })).toThrow('artifact_retention_delete_not_authorized');
    });
    test('builds a deterministic candidate only after a lost terminal race', () => {
        const receipt = { objectPath: 'content-factory-stages/x.json', objectGeneration: '9', contentHash: 'a'.repeat(64), byteSize: 10, finalizationKey: 'b'.repeat(64) };
        expect((0, artifact_retention_1.artifactOrphanCandidateId)(receipt)).toBe((0, artifact_retention_1.artifactOrphanCandidateId)(receipt));
        expect((0, artifact_retention_1.buildArtifactOrphanCandidate)(receipt, { entityCollection: 'content_factory_stages', entityId: 'stage-1', attempt: 2, detectedAtMs: 1000 })).toMatchObject({ state: 'orphan_candidate', reason: 'terminal_lease_lost', objectPath: receipt.objectPath, objectGeneration: '9' });
    });
});
//# sourceMappingURL=artifact_retention.test.js.map