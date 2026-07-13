import { buildCommunityMutationPlan, isSafeArenaPlaceholder, parseCommunityWorkspaceInput } from './admin_community_operations';

describe('Admin native Community Operations', () => {
  it('bounds and validates nine capability inputs', () => {
    expect(parseCommunityWorkspaceInput({ capabilityId: 'arena-live', limit: 999 })).toEqual({ capabilityId: 'arena-live', limit: 100, cursor: '', query: '', status: '' });
    expect(() => parseCommunityWorkspaceInput({ capabilityId: 'ban-list' })).toThrow('invalid_community_capability');
  });

  it('classifies deletable Arena placeholders from state, not name alone', () => {
    expect(isSafeArenaPlaceholder({ displayName: 'Игрок', stats: { matchesPlayed: 0 } })).toBe(true);
    expect(isSafeArenaPlaceholder({ displayName: 'Игрок', stats: { matchesPlayed: 1 } })).toBe(false);
    expect(isSafeArenaPlaceholder({ displayName: 'Игрок', 'stats.matchesPlayed': 1 })).toBe(false);
    expect(isSafeArenaPlaceholder({ displayName: 'Игрок', matchesPlayed: 1 })).toBe(false);
    expect(isSafeArenaPlaceholder({ displayName: 'Real player', stats: { matchesPlayed: 0 } })).toBe(false);
  });

  it('never targets users or Auth in destructive plans', () => {
    const plan = buildCommunityMutationPlan('arena-placeholder-cleanup', 'manifest-1', {}, {});
    expect(plan.collection).toBe('admin_native_bulk_manifests');
    expect(plan.deletionTargets).toEqual(['arena_profiles']);
    expect(plan.deletionTargets).not.toContain('users');
  });
});
