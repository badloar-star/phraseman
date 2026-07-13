export const SAFETY_MODERATION_VIEWS = Object.freeze([
  'overview', 'user-reports', 'safety-flags', 'age-consent', 'policy-evidence', 'ban-list', 'other-reports',
]);

const CAPABILITY_VIEW = Object.freeze({
  'user-reports': 'user-reports',
  'safety-flags': 'safety-flags',
  'age-consent': 'age-consent',
  'compliance-radar': 'policy-evidence',
  'ban-list': 'ban-list',
  reports: 'other-reports',
  'report-center': 'other-reports',
});

export function createSafetyModerationState(view = 'overview') {
  return {
    state: 'idle',
    view: SAFETY_MODERATION_VIEWS.includes(view) ? view : 'overview',
    workspace: null,
    items: [],
    nextCursor: '',
    snapshotCursor: '',
    filters: { status: '', reason: '', category: '', query: '', sort: 'date_desc' },
    selectedIds: [],
    sensitive: null,
    preview: null,
    approvalId: '',
    manualBanUid: '',
    operationKeys: {},
    error: '',
  };
}

export function safetyModerationViewFromCapability(id) {
  return CAPABILITY_VIEW[id] || (SAFETY_MODERATION_VIEWS.includes(id) ? id : 'overview');
}
