import type { ArenaTaskMode } from './contract';
import type { ArenaStoreItemId } from './expansion_store_copy';

export type ArenaTelemetryFeature = 'hub' | 'today' | 'lab' | 'ghost' | 'rivalry' | 'mastery' | 'partner' | 'store';
export type ArenaTelemetrySource = 'hub' | 'resume' | 'result' | 'invite' | 'deep_link' | 'direct';

export type ArenaTelemetryDescriptor = Readonly<{ event: 'arena_feature_open' | 'arena_action' | 'arena_run_complete' | 'arena_store_action'; params: Readonly<Record<string, string | number>> }>;

export const arenaFeatureOpenEvent = (feature: ArenaTelemetryFeature, source: ArenaTelemetrySource): ArenaTelemetryDescriptor => ({ event: 'arena_feature_open', params: { feature, source } });
export const arenaActionEvent = (feature: ArenaTelemetryFeature, operation: 'start' | 'continue' | 'accept' | 'decline' | 'share' | 'retry' | 'claim' | 'pause' | 'resume' | 'leave', mode: ArenaTaskMode | 'mixed' | 'recording' | 'series' | 'none'): ArenaTelemetryDescriptor => ({ event: 'arena_action', params: { feature, operation, mode } });
export const arenaRunCompleteEvent = (feature: 'today' | 'ghost', mode: 'mixed' | 'recording', outcome: 'complete' | 'expired' | 'aborted', correctCount: number, durationMs: number): ArenaTelemetryDescriptor => ({ event: 'arena_run_complete', params: { feature, mode, outcome, correct_count: Math.max(0, Math.min(10, Math.trunc(correctCount))), duration_bucket: durationMs < 60_000 ? 'under_1m' : durationMs < 180_000 ? '1_3m' : durationMs < 600_000 ? '3_10m' : '10m_plus' } });
export const arenaStoreActionEvent = (operation: 'purchase' | 'equip', itemId: ArenaStoreItemId, slot: 'title' | 'reaction_pack' | 'result_theme' | 'victory_stamp' | 'entry', price: number): ArenaTelemetryDescriptor => ({ event: 'arena_store_action', params: { operation, item_id: itemId, slot, price_bucket: price < 500 ? 'under_500' : price < 1000 ? '500_999' : '1000_plus' } });
