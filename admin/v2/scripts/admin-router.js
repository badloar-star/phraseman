import { ADMIN_SECTIONS, initAdminUi, renderRoute, reportInitializationError, setAdminActions, setAuthState } from './admin-core.js';
import { createFirebaseAdminActions } from './admin-firebase.js';
import { resolveCapabilityHash } from './admin-capabilities.js';

const TOP_LEVEL_ROUTES = new Set(ADMIN_SECTIONS.map((section) => section.route));
const SUB_ROUTES = new Set(['support', 'analytics', 'daily-briefing', 'report-center', 'asset-studio', 'plans', 'campaigns', 'coin-center', 'control-panel', 'admin-settings', 'agent-office', 'agent-manager']);
const CANONICAL_ROUTE_ALIASES = Object.freeze({
  'agent-office': 'agent-office',
});

function canonicalRoute(route) {
  return CANONICAL_ROUTE_ALIASES[route] || route;
}

function routeFromLocation() {
  const capabilityRoute = resolveCapabilityHash(globalThis.location.hash);
  if (capabilityRoute.resolved) return { route: capabilityRoute.route, capabilityId: capabilityRoute.capabilityId };
  const route = canonicalRoute(capabilityRoute.route);
  return {
    route: TOP_LEVEL_ROUTES.has(route) || SUB_ROUTES.has(route) ? route : 'overview',
    capabilityId: '',
  };
}

function syncRoute() {
  const location = routeFromLocation();
  renderRoute(location.route, location.capabilityId);
}

try {
  initAdminUi();
  createFirebaseAdminActions({ onAuth: setAuthState }).then((actions) => {
    setAdminActions(actions);
    globalThis.callAdminProductAnalytics = async (input) => ({ data: await actions.loadProductAnalytics(input) });
    globalThis.callAdminSubscriptionAnalytics = async (input) => ({ data: await actions.loadSubscriptionAnalytics(input) });
    syncRoute();
  }).catch(reportInitializationError);
  globalThis.addEventListener('hashchange', syncRoute);
  syncRoute();
} catch (error) {
  reportInitializationError(error);
}
