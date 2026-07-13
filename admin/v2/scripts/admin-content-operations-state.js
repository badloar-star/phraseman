export const CONTENT_OPERATION_CAPABILITIES = Object.freeze([
  'community-packs', 'card-packs', 'daily-phrases', 'french-quizzes', 'explain-reports', 'full-content-control',
]);

export function createContentOperationsState() {
  return { status: 'idle', capabilityId: 'community-packs', workspace: null, detail: null, preview: null, approvalStatus: '', activationApproved: false, productionReady: false, error: '' };
}
