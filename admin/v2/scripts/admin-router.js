import { ADMIN_SECTIONS, initAdminUi, renderRoute, reportInitializationError, setAdminActions, setAuthState } from './admin-core.js';
import { createFirebaseAdminActions } from './admin-firebase.js';
import { resolveCapabilityHash } from './admin-capabilities.js';

export const LEGACY_ROUTE_MAP = Object.freeze({
  '': 'overview',
  overview: 'overview',
  'control-panel': 'control-panel',
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
  emails: 'emails',
  money: 'money',
  subscriptions: 'money',
  'promo-codes': 'money',
  analytics: 'analytics',
  content: 'content',
  lessons: 'content',
  'language-factory': 'content',
  'asset-studio': 'asset-studio',
  community: 'community',
  reports: 'community',
  arena: 'community',
  diagnostics: 'diagnostics',
  health: 'diagnostics',
  'audit-log': 'diagnostics',
  'openai-budget': 'diagnostics',
});

const TOP_LEVEL_ROUTES = new Set(ADMIN_SECTIONS.map((section) => section.route));
const SUB_ROUTES = new Set(['support', 'emails', 'analytics', 'daily-briefing', 'report-center', 'asset-studio', 'campaigns', 'control-panel']);

function routeFromLocation() {
  const capabilityRoute = resolveCapabilityHash(globalThis.location.hash);
  if (capabilityRoute.resolved) return { route: capabilityRoute.route, capabilityId: capabilityRoute.capabilityId };
  const route = LEGACY_ROUTE_MAP[capabilityRoute.route] ?? capabilityRoute.route;
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
  createFirebaseAdminActions({ onAuth: setAuthState }).then(setAdminActions).catch(reportInitializationError);
  globalThis.addEventListener('hashchange', syncRoute);
  syncRoute();
} catch (error) {
  reportInitializationError(error);
}
