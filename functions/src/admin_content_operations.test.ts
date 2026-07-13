import { buildContentMutationPlan, parseContentWorkspaceInput } from './admin_content_operations';

describe('Admin native Content Operations', () => {
  it('bounds and validates the six capability inputs', () => {
    expect(parseContentWorkspaceInput({ capabilityId: 'daily-phrases', limit: 500 })).toEqual({ capabilityId: 'daily-phrases', limit: 100, cursor: '' });
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
});
