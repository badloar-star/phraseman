import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  resolvePinnedV2AccessPolicy,
  type DecisionRegistryArtifactStore,
} from './learning_v2_decision_registry_resolver';
import { resolveDecisionRegistry } from '../../modules/learning-v2/policies/decision_registry';

const corpus = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json'), 'utf8'),
);
const registry = resolveDecisionRegistry(corpus.baseline);
const ref = registry.record.ref;

class Store implements DecisionRegistryArtifactStore {
  path = '';
  constructor(private readonly artifact: unknown) {}
  async download(objectPath: string) { this.path = objectPath; return this.artifact as Record<string, unknown>; }
}

describe('server pinned DecisionRegistry resolver', () => {
  it('downloads only the exact content-addressed object and derives policy', async () => {
    const store = new Store(corpus.baseline);
    const result = await resolvePinnedV2AccessPolicy(store, ref);
    expect(store.path).toContain(`/v${ref.version}/${ref.contentHash}.json`);
    expect(result.access.policy.unitPriceShards).toBe(3);
    expect(result.access.registryRef).toEqual(ref);
  });

  it('rejects a mutable latest ref, artifact mismatch and unavailable object', async () => {
    await expect(resolvePinnedV2AccessPolicy(new Store(corpus.baseline), {
      ...ref,
      version: 2,
    })).rejects.toThrow('ref_mismatch');
    const mismatched = new Store({ ...corpus.baseline, body: { ...corpus.baseline.body, version: 2 } });
    await expect(resolvePinnedV2AccessPolicy(mismatched, ref)).rejects.toThrow();
    const unavailable: DecisionRegistryArtifactStore = { download: async () => { throw new Error('missing'); } };
    await expect(resolvePinnedV2AccessPolicy(unavailable, ref)).rejects.toThrow('artifact_unavailable');
    await expect(resolvePinnedV2AccessPolicy(new Store('{bad json'), ref)).rejects.toThrow('artifact_invalid');
    await expect(resolvePinnedV2AccessPolicy(new Store(corpus.baseline), { ...ref, id: 'bad id' })).rejects.toThrow('ref_invalid');
  });
});
