import { buildContentMutationPlan, parseContentWorkspaceInput } from './admin_content_operations';

describe('Admin native Content Operations', () => {
  it('bounds and validates the six capability inputs', () => {
    expect(parseContentWorkspaceInput({ capabilityId: 'daily-phrases', limit: 500 })).toEqual({ capabilityId: 'daily-phrases', limit: 100, cursor: '', fromDate: '', toDate: '', query: '', status: '' });
    expect(() => parseContentWorkspaceInput({ capabilityId: 'language-generation' })).toThrow('invalid_content_capability');
  });

  it('keeps every French draft in HOLD', () => {
    const plan = buildContentMutationPlan('french-draft', 'candidate-v1', {}, {});
    expect(plan.collection).toBe('adminContentDrafts/fr/quiz');
    expect(plan.forcedPatch).toMatchObject({ activationApproved: false, productionReady: false, status: 'HOLD' });
  });

  it('never exposes a French activation action', () => {
    expect(() => buildContentMutationPlan('french-activate', 'candidate-v1', {}, {})).toThrow('unsupported_content_action');
  });

  it('routes bounded bulk work through audited manifests and keeps rollback explicit', () => {
    expect(buildContentMutationPlan('daily-phrase-import', 'import-1', {}, {})).toMatchObject({ collection: 'admin_native_bulk_manifests', allowMissing: true });
    expect(buildContentMutationPlan('daily-phrase-reorder', 'order-1', {}, {})).toMatchObject({ collection: 'admin_native_bulk_manifests', allowMissing: true });
    expect(buildContentMutationPlan('explain-reports-bulk', 'reports-1', {}, {})).toMatchObject({ collection: 'admin_native_bulk_manifests', allowMissing: true });
    expect(buildContentMutationPlan('daily-phrase-rollback', 'phrase-1', {}, {}).collection).toBe('daily_phrases');
  });
});
