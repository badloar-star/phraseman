"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const surface_convergence_policy_1 = require("./surface_convergence_policy");
const valid = { arena: { mode: 'shadow', revision: 4, canaryBps: 0, comparatorVersion: 'arena-parity-v1', minimumEvidenceWindow: { comparisons: 200, jobs: 20, days: 7 }, requiredLocalePairs: ['en:ru'], disabledReason: null } };
describe('Arena convergence policy', () => {
    it('provides an explicit default-legacy bootstrap document', () => {
        expect((0, surface_convergence_policy_1.defaultSurfaceConvergenceConfig)()).toEqual({ arena: { mode: 'legacy', revision: 0, canaryBps: 0, comparatorVersion: 'arena-parity-v1', minimumEvidenceWindow: { comparisons: 200, jobs: 20, days: 7 }, requiredLocalePairs: [], disabledReason: 'not_initialized' } });
    });
    it.each([undefined, null, {}, { arena: { ...valid.arena, comparatorVersion: 'stale' } }, { arena: { ...valid.arena, revision: -1 } }])('defaults missing or invalid config to legacy', (config) => {
        expect((0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config, unit: { id: 'new-1' } })).toMatchObject({ engineRequested: 'legacy', engineResolved: 'legacy', reason: 'config_invalid' });
    });
    it('keeps old jobs and retries pinned to legacy regardless of current mode', () => {
        const stageConfig = { arena: { ...valid.arena, mode: 'stage_canary', canaryBps: 500 } };
        expect((0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config: stageConfig, unit: { id: 'old', createdAtMs: 1 } })).toMatchObject({ engineResolved: 'legacy', reason: 'legacy_provenance' });
        expect((0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config: stageConfig, unit: { id: 'retry', engineResolved: 'legacy', configRevision: 3 } })).toMatchObject({ engineResolved: 'legacy', reason: 'pinned_provenance' });
    });
    it('uses deterministic bounded assignment only for explicitly new canary units', () => {
        const first = (0, surface_convergence_policy_1.arenaCanaryAssignment)('arena-unit-42', 100);
        expect(first).toBe((0, surface_convergence_policy_1.arenaCanaryAssignment)('arena-unit-42', 100));
        expect((0, surface_convergence_policy_1.arenaCanaryAssignment)('arena-unit-42', 0)).toBe(false);
        expect(() => (0, surface_convergence_policy_1.arenaCanaryAssignment)('arena-unit-42', 501)).toThrow('arena_canary_bps_invalid');
        const config = { arena: { ...valid.arena, mode: 'stage_canary', canaryBps: first ? 100 : 0 } };
        expect((0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config, unit: { id: 'arena-unit-42', engineRequested: 'stage_canary', isNew: true } })).toMatchObject({ engineResolved: 'legacy', reason: 'wave1_stage_disabled' });
        expect((0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config, unit: { id: 'arena-unit-42', engineRequested: 'stage_canary', isNew: true }, allowStageCanary: true }).engineResolved).toBe(first ? 'stage' : 'legacy');
    });
    it('runs shadow through legacy authority and records the comparator provenance', () => {
        expect((0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config: valid, unit: { id: 'new-shadow', engineRequested: 'shadow', isNew: true } })).toEqual({ engineRequested: 'shadow', engineResolved: 'legacy', mode: 'shadow', configRevision: 4, comparatorVersion: 'arena-parity-v1', reason: 'shadow_legacy_authority' });
    });
    it('requires CAS and makes kill-switch transition immediately default legacy', () => {
        expect(() => (0, surface_convergence_policy_1.planArenaConvergenceConfigUpdate)(valid, { expectedRevision: 3, mode: 'legacy', actorUid: 'admin' })).toThrow('surface_convergence_revision_conflict');
        const update = (0, surface_convergence_policy_1.planArenaConvergenceConfigUpdate)(valid, { expectedRevision: 4, mode: 'legacy', actorUid: 'admin', disabledReason: 'operator_stop' });
        expect(update).toMatchObject({ arena: { mode: 'legacy', revision: 5, canaryBps: 0, disabledReason: 'operator_stop' }, audit: { beforeMode: 'shadow', afterMode: 'legacy', actorUid: 'admin', emergencyStop: true } });
    });
    it('requires explicit authoritative locale pairs before shadow evidence collection', () => {
        expect(() => (0, surface_convergence_policy_1.planArenaConvergenceConfigUpdate)(valid, { expectedRevision: 4, mode: 'shadow', actorUid: 'admin', requiredLocalePairs: [] })).toThrow('arena_required_locale_pairs_invalid');
        const update = (0, surface_convergence_policy_1.planArenaConvergenceConfigUpdate)(valid, { expectedRevision: 4, mode: 'shadow', actorUid: 'admin', requiredLocalePairs: ['fr:ru', 'en:ru', 'fr:ru'] });
        expect(update.arena.requiredLocalePairs).toEqual(['en:ru', 'fr:ru']);
    });
});
//# sourceMappingURL=surface_convergence_policy.test.js.map