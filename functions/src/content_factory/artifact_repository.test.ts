import { buildArtifactReceipt, artifactObjectPath, serializeArtifactPayload } from './artifact_repository';
import { canonicalJsonV1, hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';

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

  it('uses the shared canonical codec for non-ASCII key ordering and hashes', () => {
    const payload = { 'ä': { beta: 2 }, z: 1, a: 'é' };
    expect(serializeArtifactPayload(payload)).toBe(canonicalJsonV1(payload));
    expect(buildArtifactReceipt({ releaseId: 'release', surface: 'lesson', lessonId: 1, payload, objectGeneration: 'g1' }).contentHash).toBe(hashCanonicalBody(payload));
  });

  it('rejects accessors and non-JSON objects without executing getters', () => {
    let getterCalls = 0;
    const hostile = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostile, 'answer', { enumerable: true, get() { getterCalls += 1; return 42; } });
    expect(() => serializeArtifactPayload(hostile)).toThrow('canonical_json_non_json_value');
    expect(getterCalls).toBe(0);
    expect(() => serializeArtifactPayload(new Date())).toThrow('canonical_json_non_json_value');
  });
});
