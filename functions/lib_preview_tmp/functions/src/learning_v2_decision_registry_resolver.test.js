"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const learning_v2_decision_registry_resolver_1 = require("./learning_v2_decision_registry_resolver");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
const corpus = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, '../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json'), 'utf8'));
const registry = (0, decision_registry_1.resolveDecisionRegistry)(corpus.baseline);
const ref = registry.record.ref;
class Store {
    constructor(artifact) {
        this.artifact = artifact;
        this.path = '';
    }
    async download(objectPath) { this.path = objectPath; return this.artifact; }
}
describe('server pinned DecisionRegistry resolver', () => {
    it('downloads only the exact content-addressed object and derives policy', async () => {
        const store = new Store(corpus.baseline);
        const result = await (0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)(store, ref);
        expect(store.path).toContain(`/v${ref.version}/${ref.contentHash}.json`);
        expect(result.access.policy.unitPriceShards).toBe(3);
        expect(result.access.registryRef).toEqual(ref);
    });
    it('rejects a mutable latest ref, artifact mismatch and unavailable object', async () => {
        await expect((0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)(new Store(corpus.baseline), {
            ...ref,
            version: 2,
        })).rejects.toThrow('ref_mismatch');
        const mismatched = new Store({ ...corpus.baseline, body: { ...corpus.baseline.body, version: 2 } });
        await expect((0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)(mismatched, ref)).rejects.toThrow();
        const unavailable = { download: async () => { throw new Error('missing'); } };
        await expect((0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)(unavailable, ref)).rejects.toThrow('artifact_unavailable');
        await expect((0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)(new Store('{bad json'), ref)).rejects.toThrow('artifact_invalid');
        await expect((0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)(new Store(corpus.baseline), { ...ref, id: 'bad id' })).rejects.toThrow('ref_invalid');
    });
});
//# sourceMappingURL=learning_v2_decision_registry_resolver.test.js.map