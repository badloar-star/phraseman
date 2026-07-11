import {
  buildPmDecisionAudit,
  buildPmPublicationWrites,
  validatePmItemMutation,
} from './admin_pm_memory';

test('accounts full publication as exactly seven writes', () => {
  const writes = buildPmPublicationWrites({ mode: 'full', runId: 'run-1', briefId: 'brief-1' });
  expect(writes.map((write) => write.path)).toEqual([
    'admin_pm_runs/run-1',
    'admin_pm_state/latest',
    'admin_pm_briefs/brief-1',
    'admin_pm_evidence_manifests/brief-1',
    'admin_pm_recommendation_bundles/brief-1',
    'admin_pm_idea_bundles/brief-1',
    'admin_pm_experiment_bundles/brief-1',
  ]);
  expect(writes).toHaveLength(7);
});

test('accounts coverage-only publication as exactly four writes', () => {
  expect(buildPmPublicationWrites({ mode: 'coverage_only', runId: 'run-1', briefId: 'brief-1' })).toHaveLength(4);
});

test('validates bounded recommendation and experiment mutations', () => {
  expect(validatePmItemMutation({ itemType: 'recommendation', from: 'proposed', to: 'deferred', comment: 'later' })).toEqual({ ok: true });
  expect(validatePmItemMutation({ itemType: 'experiment', from: 'running', to: 'validated', result: 'worked' })).toEqual({ ok: true });
  expect(validatePmItemMutation({ itemType: 'recommendation', from: 'completed', to: 'proposed', comment: 'back' })).toMatchObject({ ok: false });
  expect(validatePmItemMutation({ itemType: 'experiment', from: 'proposed', to: 'running', result: 'x'.repeat(2001) })).toMatchObject({ ok: false });
});

test('builds mandatory atomic decision audit records', () => {
  const audit = buildPmDecisionAudit({
    briefId: 'brief-1',
    itemId: 'rec-1',
    itemType: 'recommendation',
    from: 'proposed',
    to: 'accepted',
    actorEmail: 'admin@example.com',
    comment: 'ship it',
    nowMs: 123,
  });
  expect(audit.path).toBe('admin_pm_decisions/brief-1_rec-1_123');
  expect(audit.data).toMatchObject({ briefId: 'brief-1', itemId: 'rec-1', from: 'proposed', to: 'accepted', actorEmail: 'admin@example.com' });
});
