export const DIAGNOSTICS_VIEWS = Object.freeze([
  'overview', 'app-health', 'archive', 'changelog-0608',
]);

const CAPABILITY_VIEW = Object.freeze({
  'app-health': 'app-health',
  archive: 'archive',
  'changelog-0608': 'changelog-0608',
});

function emptySourceHealth() {
  return [];
}

export function createDiagnosticsState(view = 'overview') {
  return {
    view: DIAGNOSTICS_VIEWS.includes(view) ? view : 'overview',
    state: 'idle',
    error: '',
    filters: {
      periodHours: 24,
      severity: 'all',
      status: 'all',
      feature: '',
      query: '',
    },
    appHealth: {
      items: [],
      kpis: null,
      sourceHealth: emptySourceHealth(),
      nextCursor: '',
      detail: null,
      truncated: false,
      partial: false,
    },
    activity: {
      state: 'idle',
      items: [],
      sourceHealth: emptySourceHealth(),
      nextCursor: '',
      truncated: false,
      error: '',
    },
    archive: {
      type: 'all',
      items: [],
      sourceHealth: emptySourceHealth(),
      nextCursor: '',
      detail: null,
      truncated: false,
      partial: false,
    },
    operationKeys: {},
  };
}

export function diagnosticsViewFromCapability(id) {
  return CAPABILITY_VIEW[id] || (DIAGNOSTICS_VIEWS.includes(id) ? id : 'overview');
}
