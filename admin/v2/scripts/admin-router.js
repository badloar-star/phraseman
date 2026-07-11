import { ADMIN_SECTIONS, initAdminUi, renderRoute, reportInitializationError, setAdminActions, setAuthState } from './admin-core.js';
import { createFirebaseAdminActions } from './admin-firebase.js';
import { capabilityById } from './admin-capabilities.js';

export const LEGACY_ROUTE_MAP = Object.freeze({
  '': 'overview',
  overview: 'overview',
  app: 'application',
  application: 'application',
  updates: 'application',
  banners: 'application',
  'remote-config': 'application',
  users: 'users',
  'daily-briefing': 'daily-briefing',
  'report-center': 'report-center',
  support: 'support',
  'gmail-support': 'support',
  money: 'money',
  subscriptions: 'money',
  'promo-codes': 'money',
  analytics: 'analytics',
  content: 'content',
  lessons: 'content',
  'language-factory': 'content',
  community: 'community',
  reports: 'community',
  arena: 'community',
  diagnostics: 'diagnostics',
  health: 'diagnostics',
  'audit-log': 'diagnostics',
  'openai-budget': 'diagnostics',
});

const TOP_LEVEL_ROUTES = new Set(ADMIN_SECTIONS.map((section) => section.route));
const SUB_ROUTES = new Set(['support', 'analytics', 'daily-briefing', 'report-center']);

function routeFromLocation() {
  const requested = globalThis.location.hash.replace(/^#/, '').trim();
  const [requestedRoute, requestedCapability = ''] = requested.split(':');
  const directCapability = capabilityById(requestedRoute);
  if (directCapability && !requestedCapability) return { route: directCapability.route, capabilityId: directCapability.id };
  const route = LEGACY_ROUTE_MAP[requestedRoute] ?? requestedRoute;
  const capability = capabilityById(requestedCapability);
  return {
    route: TOP_LEVEL_ROUTES.has(route) || SUB_ROUTES.has(route) ? route : 'overview',
    capabilityId: capability?.route === route ? capability.id : '',
  };
}

function syncRoute() {
  const location = routeFromLocation();
  renderRoute(location.route, location.capabilityId);
}

try {
  initAdminUi();
  createFirebaseAdminActions({ onAuth: setAuthState }).then(setAdminActions).catch(reportInitializationError);
  globalThis.addEventListener('hashchange', syncRoute);
  syncRoute();
} catch (error) {
  reportInitializationError(error);
}
