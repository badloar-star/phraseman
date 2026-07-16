import { createHash } from 'node:crypto';
import { ARENA_COMPARATOR_VERSION } from './surface_convergence';

export type ArenaConvergenceMode = 'legacy' | 'shadow' | 'stage_canary' | 'stage';
type ArenaConfig = { readonly mode: ArenaConvergenceMode; readonly revision: number; readonly canaryBps: number; readonly comparatorVersion: string; readonly minimumEvidenceWindow: { readonly comparisons: number; readonly jobs: number; readonly days: number }; readonly requiredLocalePairs: readonly string[]; readonly disabledReason: string | null };

export function defaultSurfaceConvergenceConfig() {
  return Object.freeze({ arena: Object.freeze({ mode: 'legacy' as const, revision: 0, canaryBps: 0, comparatorVersion: ARENA_COMPARATOR_VERSION, minimumEvidenceWindow: Object.freeze({ comparisons: 200, jobs: 20, days: 7 }), requiredLocalePairs: Object.freeze([]), disabledReason: 'not_initialized' }) });
}

function record(value: unknown): Record<string, unknown> | undefined { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function parseArenaConfig(value: unknown): ArenaConfig | null {
  const root = record(value); const arena = record(root?.arena); const window = record(arena?.minimumEvidenceWindow);
  if (!arena || !['legacy', 'shadow', 'stage_canary', 'stage'].includes(String(arena.mode)) || !Number.isSafeInteger(arena.revision) || Number(arena.revision) < 0 || !Number.isSafeInteger(arena.canaryBps) || Number(arena.canaryBps) < 0 || Number(arena.canaryBps) > 500 || arena.comparatorVersion !== ARENA_COMPARATOR_VERSION || !window || Number(window.comparisons) !== 200 || Number(window.jobs) !== 20 || Number(window.days) !== 7) return null;
  const rawPairs = Array.isArray(arena.requiredLocalePairs) ? arena.requiredLocalePairs : []; const requiredLocalePairs = [...new Set(rawPairs.map(String).map((pair) => pair.trim()).filter((pair) => /^[a-z]{2,12}(?:-[A-Z]{2})?:[a-z]{2,12}(?:-[A-Z]{2})?$/.test(pair)))].sort();
  if (requiredLocalePairs.length !== rawPairs.length || requiredLocalePairs.length > 20) return null;
  return Object.freeze({ mode: arena.mode as ArenaConvergenceMode, revision: Number(arena.revision), canaryBps: Number(arena.canaryBps), comparatorVersion: String(arena.comparatorVersion), minimumEvidenceWindow: Object.freeze({ comparisons: 200, jobs: 20, days: 7 }), requiredLocalePairs: Object.freeze(requiredLocalePairs), disabledReason: typeof arena.disabledReason === 'string' && arena.disabledReason.trim() ? arena.disabledReason.trim() : null });
}

export function arenaCanaryAssignment(unitId: string, canaryBps: number): boolean {
  if (!unitId || !Number.isSafeInteger(canaryBps) || canaryBps < 0 || canaryBps > 500) throw new Error('arena_canary_bps_invalid');
  const bucket = Number.parseInt(createHash('sha256').update(`arena-canary-v1:${unitId}`).digest('hex').slice(0, 8), 16) % 10_000;
  return bucket < canaryBps;
}

export function resolveArenaEnginePolicy(input: { readonly config: unknown; readonly unit: Record<string, unknown>; readonly allowStageCanary?: boolean }) {
  const config = parseArenaConfig(input.config);
  if (!config) return Object.freeze({ engineRequested: 'legacy' as const, engineResolved: 'legacy' as const, mode: 'legacy' as const, configRevision: 0, comparatorVersion: ARENA_COMPARATOR_VERSION, reason: 'config_invalid' as const });
  if (config.mode !== 'legacy' && config.requiredLocalePairs.length === 0) return Object.freeze({ engineRequested: 'legacy' as const, engineResolved: 'legacy' as const, mode: 'legacy' as const, configRevision: config.revision, comparatorVersion: config.comparatorVersion, reason: 'config_invalid' as const });
  const requested = String(input.unit.engineRequested ?? 'legacy');
  if (input.unit.engineResolved === 'legacy') return Object.freeze({ engineRequested: requested, engineResolved: 'legacy' as const, mode: config.mode, configRevision: Number(input.unit.configRevision ?? config.revision), comparatorVersion: String(input.unit.comparatorVersion ?? config.comparatorVersion), reason: 'pinned_provenance' as const });
  if (input.unit.isNew !== true) return Object.freeze({ engineRequested: 'legacy' as const, engineResolved: 'legacy' as const, mode: config.mode, configRevision: config.revision, comparatorVersion: config.comparatorVersion, reason: 'legacy_provenance' as const });
  if (config.mode === 'shadow') return Object.freeze({ engineRequested: 'shadow' as const, engineResolved: 'legacy' as const, mode: config.mode, configRevision: config.revision, comparatorVersion: config.comparatorVersion, reason: 'shadow_legacy_authority' as const });
  if ((config.mode === 'stage_canary' || config.mode === 'stage') && !input.allowStageCanary) return Object.freeze({ engineRequested: requested, engineResolved: 'legacy' as const, mode: config.mode, configRevision: config.revision, comparatorVersion: config.comparatorVersion, reason: 'wave1_stage_disabled' as const });
  if (config.mode === 'stage_canary' && requested === 'stage_canary' && arenaCanaryAssignment(String(input.unit.id ?? ''), config.canaryBps)) return Object.freeze({ engineRequested: 'stage_canary' as const, engineResolved: 'stage' as const, mode: config.mode, configRevision: config.revision, comparatorVersion: config.comparatorVersion, reason: 'canary_assignment' as const });
  return Object.freeze({ engineRequested: requested, engineResolved: 'legacy' as const, mode: config.mode, configRevision: config.revision, comparatorVersion: config.comparatorVersion, reason: 'legacy_default' as const });
}

export function planArenaConvergenceConfigUpdate(current: unknown, input: { readonly expectedRevision: number; readonly mode: ArenaConvergenceMode; readonly actorUid: string; readonly canaryBps?: number; readonly requiredLocalePairs?: readonly string[]; readonly disabledReason?: string }) {
  const config = parseArenaConfig(current);
  if (!config || config.revision !== input.expectedRevision) throw new Error('surface_convergence_revision_conflict');
  if (!input.actorUid.trim()) throw new Error('surface_convergence_actor_required');
  if (input.mode === 'stage') throw new Error('surface_convergence_full_stage_not_allowed_wave1');
  const nextBps = input.mode === 'stage_canary' ? Number(input.canaryBps ?? 100) : 0;
  if (!Number.isSafeInteger(nextBps) || nextBps < 0 || nextBps > 500) throw new Error('arena_canary_bps_invalid');
  const requestedPairs = input.requiredLocalePairs ?? config.requiredLocalePairs; const requiredLocalePairs = [...new Set(requestedPairs.map(String).map((pair) => pair.trim()))].sort();
  if ((input.mode !== 'legacy' && requiredLocalePairs.length === 0) || requiredLocalePairs.length > 20 || requiredLocalePairs.some((pair) => !/^[a-z]{2,12}(?:-[A-Z]{2})?:[a-z]{2,12}(?:-[A-Z]{2})?$/.test(pair))) throw new Error('arena_required_locale_pairs_invalid');
  const arena = Object.freeze({ ...config, mode: input.mode, revision: config.revision + 1, canaryBps: nextBps, requiredLocalePairs: Object.freeze(requiredLocalePairs), disabledReason: input.disabledReason?.trim() || null });
  return Object.freeze({ arena, audit: Object.freeze({ beforeMode: config.mode, afterMode: input.mode, actorUid: input.actorUid, expectedRevision: input.expectedRevision, nextRevision: arena.revision, emergencyStop: input.mode === 'legacy' }) });
}
