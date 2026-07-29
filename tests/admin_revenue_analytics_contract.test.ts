import fs from 'fs';
import path from 'path';

describe('admin revenue analytics contract', () => {
  const root = process.cwd();
  const adminHtml = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
  const adminModuleScript = adminHtml.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] || '';
  const firebaseSource = fs.readFileSync(path.join(root, 'app', 'firebase.ts'), 'utf8');
  const premiumModalSource = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');
  const paywallASource = fs.readFileSync(path.join(root, 'app', 'paywall_a.tsx'), 'utf8');
  const onboardingSource = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');
  const shardsShopSource = fs.readFileSync(path.join(root, 'app', 'shards_shop.tsx'), 'utf8');

  const countOccurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;
  const topLevelFunctionNames = (source: string): string[] =>
    Array.from(source.matchAll(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/gm)).map((match) => match[1]);

  it('persists paywall funnel events into admin-readable app_activity', () => {
    expect(firebaseSource).toContain('function trackRevenueActivity');
    expect(firebaseSource).toContain("writeToFirestore: true");
    expect(firebaseSource).toContain("trackRevenueActivity('paywall:view'");
    expect(firebaseSource).toContain("trackRevenueActivity('paywall:plan_select'");
    expect(firebaseSource).toContain("trackRevenueActivity('paywall:cta_click'");
    expect(firebaseSource).toContain("trackRevenueActivity('paywall:purchase_success'");
    expect(firebaseSource).toContain("trackRevenueActivity('paywall:trial_offer_accepted'");
    expect(firebaseSource).toContain("source: paywallSourceForContext(context)");
  });

  it('persists shards shop funnel events into admin-readable app_activity', () => {
    expect(shardsShopSource).toContain("trackActivity('shards_shop:open'");
    expect(shardsShopSource).toContain("trackActivity('shards_shop:pack_click'");
    expect(shardsShopSource).toContain("trackActivity('shards_shop:purchase_success'");
    expect(shardsShopSource).toContain("writeToFirestore: true");
    expect(shardsShopSource).toContain("tags: { packId, productId, shards");
  });

  it('tracks onboarding paywall source from the personal-plan flow', () => {
    expect(premiumModalSource).toContain('params: { ...params }');
    expect(paywallASource).toContain('params.source');
    expect(paywallASource).toContain("|| 'direct'");
    expect(onboardingSource).toContain("trackOnboarding('onboarding_plan_paywall_view'");
    expect(onboardingSource).toContain('onPersonalPlanPaywallStart');
    expect(onboardingSource).toContain('queuePendingPersonalPlanActivation');
    expect(onboardingSource).toContain("[PLAN_BILLING_KEY, 'yearly']");
  });

  it('adds the requested revenue analytics controls and charts to the admin analytics tab', () => {
    [
      'id="revenue-range"',
      'id="revenue-date-from"',
      'id="revenue-date-to"',
      'id="revenue-scale"',
      'id="revenue-platform"',
      'id="revenue-status"',
      'revenue-empty-state',
      'revenueOnRangeChange(this.value)',
      'revenueUseCustomRange()',
      'loadRevenueAnalytics(true)',
      'Paywall analytics',
      'paywall_settings_views',
      'paywall_auto_views',
      'paywall_onboarding_views',
      'purchase_settings',
      'purchase_auto',
      'purchase_onboarding',
      'conversion_settings',
      'conversion_auto',
      'conversion_onboarding',
      'trial_to_paid',
      'shards_shop_opened',
      'shards_product_clicked',
      'shards_purchase_completed',
      'paywall_repeat_views_before_purchase',
      'best_app_screen_before_purchase',
      'cohort_onboarding_purchase',
    ].forEach((needle) => expect(adminHtml).toContain(needle));
  });

  it('adds admin onboarding source statistics from app_activity', () => {
    [
      "switchTab('onboarding-sources')",
      "id=\"tab-onboarding-sources\"",
      "id=\"onboarding-source-range\"",
      "id=\"onboarding-source-platform\"",
      "loadOnboardingSources(true)",
      "window.loadOnboardingSources",
      "collection(db, 'app_activity')",
      "row.action === 'onboarding_source_select'",
      "Latest answer per user",
      "onboarding_source_mix",
      "'onboarding-sources'",
      "Onboarding sources",
    ].forEach((needle) => expect(adminHtml).toContain(needle));

    expect(onboardingSource).toContain("trackOnboarding('onboarding_source_select'");
    expect(onboardingSource).toContain("writeToFirestore: action === 'onboarding_source_select'");
    expect(onboardingSource).toContain("consented: true");
  });

  it('keeps analytics visible before Firestore data loads or when one query fails', () => {
    expect(adminHtml).toContain('function revenueFallbackCards');
    expect(adminHtml).toContain('function revenueSafeGetDocs');
    expect(adminHtml).toContain("revenueSafeGetDocs('app_activity'");
    expect(adminHtml).toContain("revenueSafeGetDocs('revenuecat_premium_events'");
    expect(adminHtml).toContain("revenueSafeGetDocs('revenuecat_shard_transactions'");
    expect(adminHtml).toContain('Analytics opens with a safe dashboard shell first');
    expect(adminHtml).toContain('Loaded with limited data');
    expect(adminHtml).toContain('_revenueAnalyticsLoaded = false');
  });

  it('keeps the revenue analytics dashboard compact without horizontal overflow', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-analytics');
    expect(adminHtml).toContain('overflow-x: hidden');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #revenue-analytics-grid {');
    expect(adminHtml).toContain('flex-direction: column');
    expect(adminHtml).toContain('class="rsv-scroll" tabindex="0"');
    expect(adminHtml).toContain('class="rsv-track"');
    expect(adminHtml).toContain('class="rsv-bars"');
    expect(adminHtml).toContain("class=\"rsv-bar${isPeak ? ' is-peak' : ''}\"");
    expect(adminHtml).toContain('class="rsv-bar-track"');
    expect(adminHtml).toContain('class="rsv-bar-label"');
    expect(adminHtml).toContain('overflow-x: auto');
    expect(adminHtml).toContain('min-width: 0 !important');
    expect(adminHtml).not.toContain('min-width:18px;flex:1');
    expect(adminHtml).not.toContain('style="min-width:320px"');
  });

  it('supports selectable revenue date windows and adjustable chart scale', () => {
    expect(adminHtml).toContain('function revenueSelectedRange');
    expect(adminHtml).toContain('function revenueDaysFromRange');
    expect(adminHtml).toContain('function revenueSeriesBucketMode');
    expect(adminHtml).toContain('function revenueBuildDateBuckets');
    expect(adminHtml).toContain('function revenueSeriesDayWidth');
    expect(adminHtml).toContain('function revenueDateFromKey');
    expect(adminHtml).toContain("const range = revenueSelectedRange()");
    expect(adminHtml).toContain("const days = revenueDaysFromRange(range.fromKey, range.toKey)");
    expect(adminHtml).toContain("if (n >= 180) return 'month'");
    expect(adminHtml).toContain("if (n >= 60) return 'week'");
    expect(adminHtml).toContain('const bucketed = revenueBuildDateBuckets(days)');
    expect(adminHtml).toContain('const bucketKey = bucketed.dayToBucket[d]');
    expect(adminHtml).toContain("const rows = await revenueFetchRows(range, platform)");
    expect(adminHtml).toContain("['Period', `${range.fromKey} -> ${range.toKey}`]");
    expect(adminHtml).toContain("['Buckets', bucketLabel]");
    expect(adminHtml).toContain('title="Bar width"');
    expect(adminHtml).toContain('style="width:${dayWidth}px;min-width:${dayWidth}px"');
    expect(adminHtml).toContain('aria-label="${escapeHtml(title)} date scale from ${escapeHtml(firstFull)} to ${escapeHtml(lastFull)}"');
  });

  it('uses a compact zero-data revenue state instead of many empty charts', () => {
    expect(adminHtml).toContain('function revenueZeroStateDashboard');
    expect(adminHtml).toContain('class="revenue-zero-panel"');
    expect(adminHtml).toContain('class="revenue-zero-metrics"');
    expect(adminHtml).toContain('Expected events');
    expect(adminHtml).toContain('Tracking checklist');
    expect(adminHtml).toContain('No matching events for ${range.fromKey} -> ${range.toKey}. Showing compact zero overview.');
    expect(adminHtml).toContain('grid.innerHTML = revenueZeroStateDashboard({');
    expect(adminHtml).toContain('data-revenue-chart="zero_state_overview"');
  });

  it('hides the legacy bulky analytics UI from the admin analytics tab', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-analytics > .reports-toolbar');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #analytics-stats');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #a-retention-section');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #analytics-grid');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .analytics-legacy-block');
    expect(adminHtml).toContain('display: none !important');
    expect(adminHtml).toContain('class="analytics-legacy-block"');
  });

  it('keeps the admin section menu as a left-side scrollable sidebar', () => {
    expect(adminHtml).toContain('margin-left: 304px');
    expect(adminHtml).toContain('left: 14px');
    expect(adminHtml).not.toContain('right: 14px');
  });

  it('adds search inside the left admin section menu', () => {
    expect(adminHtml).toContain('id="admin-tab-search"');
    expect(adminHtml).toContain('class="admin-tab-search-wrap"');
    expect(adminHtml).toContain('class="admin-tab-empty"');
    expect(adminHtml).toContain('.admin-tab-group-label');
    expect(adminHtml).toContain('function applyGroupedAdminTabs');
    expect(adminHtml).toContain('function applyAdminTabFilter');
    expect(adminHtml).toContain('function setupAdminTabSearch');
    expect(adminHtml).toContain("content: 'Sections' !important");
    expect(adminHtml).toContain("tabsBox.dataset.filterEmpty");
    expect(adminHtml).toContain("visibleGroups.add(tabEl.dataset.adminGroup)");
    expect(adminHtml).toContain("tabEl.style.display = matched ? '' : 'none'");
  });

  it('adds an operations overview as the first admin workspace screen', () => {
    expect(adminHtml).toMatch(/const ADMIN_DEFAULT_TAB = '(overview|control-panel)'/);
    expect(adminHtml).toContain("'overview'");
    expect(adminHtml).toContain(`onclick="switchTab('overview')" data-i18n-es="Overview">Overview</div>`);
    expect(adminHtml).toContain('id="tab-overview"');
    expect(adminHtml).toContain('class="admin-overview-hero"');
    expect(adminHtml).toContain('class="admin-overview-worklist"');
    expect(adminHtml).toContain('window.renderAdminOverview = function renderAdminOverview()');
    expect(adminHtml).toContain('function setupAdminHashRouting');
    expect(adminHtml).toContain("window.addEventListener('hashchange'");
    expect(adminHtml).toContain('data-admin-goto="app-health"');
    expect(adminHtml).toContain('data-admin-goto="arena-live"');
    expect(adminHtml).toContain("if (overviewTab) overviewTab.classList.toggle('active', tab === 'overview')");
  });

  it('sorts the sidebar into contiguous operational groups before adding group labels', () => {
    expect(adminHtml).toContain('const tabsByKey = new Map()');
    expect(adminHtml).toContain('ADMIN_TAB_KEYS.forEach((key) =>');
    expect(adminHtml).toContain('if (tabEl) tabsBox.appendChild(tabEl)');
    expect(adminHtml).toContain("analytics: 'core'");
    expect(adminHtml).toContain("'app-health': 'core'");
    expect(adminHtml).toContain("archive: 'system'");
  });

  it('keeps safety and consent sections registered with the admin router', () => {
    const match = adminHtml.match(/const ADMIN_TAB_KEYS = \[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const keys = Array.from((match?.[1] || '').matchAll(/'([^']+)'/g)).map((item) => item[1]);

    for (const key of ['safety-flags', 'age-consent']) {
      expect(keys).toContain(key);
      expect(adminHtml).toContain(`onclick="switchTab('${key}')`);
      expect(adminHtml).toContain(`id="tab-${key}"`);
      expect(adminHtml).toContain(`tab==='${key}'`);
    }
    expect(adminHtml).toContain("'safety-flags': 'users'");
    expect(adminHtml).toContain("'age-consent': 'users'");
  });

  it('keeps safety and consent loaders retryable after auth or permission failures', () => {
    const safetyStart = adminHtml.indexOf('window.loadSafetyFlags = async function()');
    const ageStart = adminHtml.indexOf('window.loadAgeConsent = async function()');
    expect(safetyStart).toBeGreaterThan(0);
    expect(ageStart).toBeGreaterThan(safetyStart);
    const safetyLoader = adminHtml.slice(safetyStart, ageStart);
    const ageLoader = adminHtml.slice(ageStart, adminHtml.indexOf('window.loadUserReports = async function()', ageStart));

    expect(safetyLoader.indexOf('getIdToken(true)')).toBeLessThan(safetyLoader.indexOf("collection(db, 'safety_flags')"));
    expect(safetyLoader.indexOf('window._safetyFlagsLoaded = true')).toBeGreaterThan(safetyLoader.indexOf('filterSafetyFlags()'));
    expect(safetyLoader.indexOf('window._safetyFlagsLoaded = false')).toBeGreaterThan(safetyLoader.indexOf('catch(e)'));

    expect(ageLoader.indexOf('getIdToken(true)')).toBeLessThan(ageLoader.indexOf("collection(db, 'user_consents')"));
    expect(ageLoader.indexOf('window._ageConsentLoaded = true')).toBeGreaterThan(ageLoader.indexOf('box.innerHTML = `'));
    expect(ageLoader.indexOf('window._ageConsentLoaded = false')).toBeGreaterThan(ageLoader.indexOf('catch(e)'));
  });

  it('compacts repeated loading and permission states into diagnostic cards', () => {
    expect(adminHtml).toContain('function adminStateHtml');
    expect(adminHtml).toContain('function adminLoadingStateDetails');
    expect(adminHtml).toContain('class="admin-state-card"');
    expect(adminHtml).toContain('function compactAdminStateNode');
    expect(adminHtml).toContain('/missing or insufficient permissions/i.test(text)');
    expect(adminHtml).toContain("adminStateHtml('Access'");
    expect(adminHtml).toContain('Job history is loading.');
    expect(adminHtml).toContain('Diagnostics are loading.');
    expect(adminHtml).toContain('Revenue analytics are loading.');
    expect(adminHtml).toContain('Chart data is loading.');
    expect(adminHtml).toContain('\\u0440\\u0435\\u043f\\u043e\\u0440\\u0442');
    expect(adminHtml).toContain('function setupAdminStateCompaction');
  });

  it('cleans admin menu labels and decodes mojibake text at runtime', () => {
    expect(adminHtml).toContain('const ADMIN_CLEAN_TAB_LABELS');
    expect(adminHtml).toContain("users: 'Users'");
    expect(adminHtml).toContain("analytics: 'Analytics'");
    expect(adminHtml).toContain("'app-messages': 'Messages'");
    expect(adminHtml).toContain("'push-notify': 'Push'");
    expect(adminHtml).toContain('function applyCleanAdminTabLabels');
    expect(adminHtml).toContain('function decodeAdminMojibake');
    expect(adminHtml).toContain('function normalizeAdminStatusText');
    expect(adminHtml).toContain('Loading users...');
    expect(adminHtml).toContain('const cp1252');
    expect(adminHtml).toContain('0x0178: 0x9F');
    expect(adminHtml).toContain('new MutationObserver');
    expect(adminHtml).toContain("ADMIN_TAB_BASE_HTML");
    expect(adminHtml).toContain("'arena-live'");
    expect(adminHtml).toContain(`onclick="switchTab('users')" data-i18n-es="Usuarios">Users</div>`);
    expect(adminHtml).toContain(`onclick="switchTab('analytics')" data-i18n-es="Analítica">Analytics</div>`);
    expect(adminHtml).toContain(`onclick="switchTab('app-messages')" data-i18n-es="Mensajes">Messages</div>`);
    expect(adminHtml).toContain(`onclick="switchTab('push-notify')" data-i18n-es="Push">Push</div>`);
    expect(adminHtml).toContain('placeholder="UID or name"');
    expect(adminHtml).toContain('>Sign out</button>');
    expect(adminHtml).not.toContain(`onclick="switchTab('users')" data-i18n-es="👥 Usuarios">👥 Пользователи</div>`);
    expect(adminHtml).not.toContain(`onclick="location.href='testers.html'" data-i18n-es="🧪 Testers">🧪 Тестеры</div>`);
    expect(adminHtml).not.toContain(`onclick="switchTab('analytics')" data-i18n-es="📊 Analítica">📊 Аналитика</div>`);
    expect(adminHtml).not.toContain(`onclick="switchTab('review-promo')">💚 VIP survey</div>`);
    expect(adminHtml).not.toContain('placeholder="🔍 UID / имя → Enter"');
  });

  it('forces the clean admin skin instead of returning to Matrix from localStorage', () => {
    expect(adminHtml).toContain('function setupAdminSkin()');
    expect(adminHtml).toContain("document.body.dataset.adminSkin = 'onboarding'");
    expect(adminHtml).toContain("localStorage.setItem(STORAGE_KEY, 'onboarding')");
    expect(adminHtml).toContain("localStorage.removeItem('phraseman_admin_matrix_theme')");
    expect(adminHtml).toContain('background: var(--admin-bg) !important');
    expect(adminHtml).not.toContain("const VALID = new Set(['onboarding', 'matrix'])");
    expect(adminHtml).not.toContain('data-admin-skin-choice');
    expect(adminHtml).not.toContain('class="theme-dot"');
    expect(adminHtml).not.toContain('<canvas id="matrix-rain"');
    expect(adminHtml).not.toContain('matrix-rain');
    expect(adminHtml).not.toContain('theme-dot');
    expect(adminHtml).not.toContain('admin-skin-btn');
    expect(adminHtml).not.toContain('data-theme=');
    expect(adminHtml).not.toContain('Theme switcher (matrix color)');
    expect(adminHtml).not.toContain('Color de la matriz');
    expect(adminHtml).not.toContain('Red matrix');
    expect(adminHtml).not.toContain('Matriz vermelha');
    expect(adminHtml).toMatch(/content="2026-\d{2}-\d{2}[-\w]*"/);
    expect(adminHtml).not.toContain('onboarding-admin-theme-v2');
    expect(adminHtml).not.toContain('#ff0033');
    expect(adminHtml).not.toContain('#ff4d6d');
    expect(adminHtml).not.toContain('#0c0000');
  });

  it('applies a neutral Claude-like admin chrome layer', () => {
    expect(adminHtml).toContain('Clean admin unification layer');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .tab.active');
    expect(adminHtml).toContain('background: rgba(255,255,255,0.075) !important');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .stat-card[style]');
    expect(adminHtml).toContain('border-color: var(--admin-border) !important');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .stat-card .value[style]');
    expect(adminHtml).toContain('text-shadow: none !important');
    expect(adminHtml).toContain('id="admin-signin-google"');
    expect(adminHtml).not.toContain('ONBOARDING THEME v2');
    expect(adminHtml).not.toContain('admin-skin-version');
    expect(adminHtml).not.toContain('Inicio de sesión solo con Google');
    expect(adminHtml).not.toContain('Importante: abre https://phraseman-ea0b3.web.app');
    expect(adminHtml).not.toContain('ACCESS DENIED');
    expect(adminHtml).not.toContain('cardPulse');
    expect(adminHtml).not.toContain('@keyframes caret');
    expect(adminHtml).not.toContain('.admin-login-form h2::before');
    expect(adminHtml).not.toContain('.admin-login-form h2::after');
    expect(adminHtml).not.toContain("font-family: 'Courier New', monospace; opacity: 0.7");
    expect(adminHtml).not.toContain('border-bottom: 2px solid transparent');
    expect(adminHtml).not.toContain('button:hover { background: rgba(var(--acc-rgb), 0.32); box-shadow: 0 0 12px');
    expect(adminHtml).not.toContain('#FFE0A0');
    expect(adminHtml).not.toContain('#FFD47D');
    expect(adminHtml).not.toContain('#18130A');
    expect(adminHtml).not.toContain('0 0 26px rgba(var(--acc-rgb)');
    expect(adminHtml).not.toContain('text-transform: uppercase;\n    }\n    .admin-login-google');
  });

  it('keeps the user stats strip neutral and text-first', () => {
    expect(adminHtml).toContain('<div class="label" data-i18n-es="Total">Total</div>');
    expect(adminHtml).toContain('<div class="label" data-i18n-es="XP medio">Avg XP</div>');
    expect(adminHtml).toContain('<div class="label" data-i18n-es="Racha media">Avg streak</div>');
    expect(adminHtml).toContain('<div class="label" data-i18n-es="Tema">Theme</div>');
    expect(adminHtml).toContain('<div class="label">Language</div>');
    expect(adminHtml).toContain('<div class="label">Platform</div>');
    expect(adminHtml).toContain('<div class="label" data-i18n-es="Fragmentos medios">Avg shards</div>');
    expect(adminHtml).not.toContain('<div class="label" data-i18n-es="Tema: oscuro">');
    expect(adminHtml).not.toContain('<div class="label">🇷🇺 / 🇺🇦</div>');
    expect(adminHtml).not.toContain('<div class="label">📱 iOS / 🤖 Android</div>');
    expect(adminHtml).not.toContain('data-i18n-es="💎 Fragmentos medios">');
  });

  it('keeps the users toolbar and table headers neutral', () => {
    expect(adminHtml).toContain('placeholder="Search name or UID"');
    expect(adminHtml).toContain('<option value="xp" data-i18n-es="Por XP">Sort by XP</option>');
    expect(adminHtml).toContain('<option value="" data-i18n-es="Todos los idiomas">All languages</option>');
    expect(adminHtml).toContain('<option value="ios" data-i18n-es="iOS">iOS</option>');
    expect(adminHtml).toContain('<option value="any" data-i18n-es="Registradas">Registered</option>');
    expect(adminHtml).toContain('>Hide duplicates</span>');
    expect(adminHtml).toContain('>Duplicates</button>');
    expect(adminHtml).toContain('>Email list</button>');
    expect(adminHtml).toContain('>Grant shards</button>');
    expect(adminHtml).toContain('>Ban users</button>');
    expect(adminHtml).toContain('<th onclick="setSort(\'name\')" data-i18n-es="Usuario">User</th>');
    expect(adminHtml).toContain('data-i18n-es="Progreso">Progress');
    expect(adminHtml).toContain('setSort(\'streak\')">Streak</button>');
    expect(adminHtml).toContain('setSort(\'lessons\')">Lessons</button>');
    expect(adminHtml).toContain('data-i18n-es="App"');
    expect(adminHtml).toContain('data-i18n-es="Cuenta">Account');
    expect(adminHtml).toContain('setSort(\'shards\')">Shards</button>');
    expect(adminHtml).toContain('>Previous</button>');
    expect(adminHtml).toContain('>Next</button>');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-users .table-wrap');
    expect(adminHtml).toContain('overflow-x: hidden !important');
    expect(adminHtml).toContain('min-width: 0');
    expect(adminHtml).toContain('table-layout: fixed');
    expect(adminHtml).toContain('users-compact-cell');
    expect(adminHtml).toContain('users-compact-email');
    expect(adminHtml).toContain('position: sticky');
    expect(adminHtml).not.toContain('placeholder="🔍 Поиск по имени или UID..."');
    expect(adminHtml).not.toContain('data-i18n-es="📧 Email">📧 Email</th>');
    expect(adminHtml).not.toContain('data-i18n-es="💎 Fragmentos">💎 Осколки</th>');
  });

  it('lets auth session auto-check without showing a fake Firebase loading error', () => {
    expect(adminHtml).toMatch(/id="admin-signin-google"[\s\S]*?onclick="if\(typeof window\._pmAdminGoogleSignIn==='function'\)/);
    expect(adminHtml).not.toMatch(/id="admin-signin-google"[\s\S]{0,240}?disabled/);
    expect(adminHtml).toContain('setAdminSignInBusy(false);');
    expect(adminHtml).toContain("window._pmAdminGoogleSignIn==='function'");
    expect(adminHtml).toContain('const _adminAuthPersistenceReady = setPersistence(auth, browserLocalPersistence)');
    expect(adminHtml).toContain('await _adminAuthPersistenceReady;');
    expect(adminHtml).not.toContain('const _adminAuthReady = setPersistence(auth, browserLocalPersistence)');
    expect(adminHtml).not.toContain('await _adminAuthReady;');
    expect(adminHtml).not.toContain('withAdminAuthTimeout(getRedirectResult(auth)');
    expect(adminHtml).not.toContain("else{var e=document.getElementById('admin-login-err')");
    expect(adminHtml).not.toContain('Firebase).');
  });

  it('unifies Reports and User reports cards with the clean admin style', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-reports');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-user-reports');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #reports-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #user-reports-list');
    expect(adminHtml).toContain('function applyCleanReportsChrome');
    expect(adminHtml).toContain('function setAdminText');
    expect(adminHtml).toContain('function setAdminAttr');
    expect(adminHtml).toContain('if (option.textContent !== next) option.textContent = next');
    expect(adminHtml).toContain("setSelectOptionLabels('r-filter-status', { open: 'Open', fixed: 'Fixed', '': 'All statuses' })");
    expect(adminHtml).toContain('Mark visible fixed');
    expect(adminHtml).toContain('Copy visible reports');
    expect(adminHtml).toContain('Global one-time modal');
    expect(adminHtml).toContain('Message UK (optional; RU is used if empty)');
    expect(adminHtml).toContain('Recent sends are loading.');
    expect(adminHtml).toContain('Checking...');
    expect(adminHtml).toContain('No active broadcast');
    expect(adminHtml).toContain('#tab-reports .report-card');
    expect(adminHtml).toContain('#tab-user-reports .report-card');
    expect(adminHtml).toContain('#tab-reports .btn-fixed');
    expect(adminHtml).toContain('background: #16181f !important');
  });

  it('unifies Premium, VIP, and cancel survey revenue sections', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-premium');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-vip');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-cancel-surveys');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #pr-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #vip-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #cs-list');
    expect(adminHtml).toContain('#tab-premium .report-card span[style*="background"]');
    expect(adminHtml).toContain('#tab-vip .report-card button');
    expect(adminHtml).toContain('#tab-cancel-surveys .report-card button');
    expect(adminHtml).toContain('applyCleanPremiumChrome');
    expect(adminHtml).toContain('pr-pill');
    expect(adminHtml).toContain('Load Users first to inspect Plus accounts.');
    expect(adminHtml).toContain('Plus list refreshed');
    expect(adminHtml).toContain('Plus accounts');
    expect(adminHtml).toContain('Real Plus only: RevenueCat metadata');
    expect(adminHtml).toContain('Search UID, email, name...');
    expect(adminHtml).toContain('No Plus users match this filter.');
    expect(adminHtml.lastIndexOf('window.renderPremiumList = function renderPremiumList()')).toBeGreaterThan(adminHtml.indexOf('window.renderPremiumList = function renderPremiumList()'));
    expect(adminHtml.lastIndexOf('Plus list refreshed')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadPremiumData = async function loadPremiumData(force)'));
    expect(adminHtml).toContain('applyCleanCancelSurveysChrome');
    expect(adminHtml).toContain('cs-pill');
    expect(adminHtml).toContain('Loading cancel surveys...');
    expect(adminHtml).toContain('Cancel surveys loaded');
    expect(adminHtml).toContain('Cancel survey load failed');
    expect(adminHtml).toContain('Search UID, name, reason, comment...');
    expect(adminHtml).toContain('Shows why users opened subscription management');
    expect(adminHtml.lastIndexOf('window.renderCancelSurveys = function renderCancelSurveys()')).toBeGreaterThan(adminHtml.indexOf('window.renderCancelSurveys = function renderCancelSurveys()'));
    expect(adminHtml.lastIndexOf('Loading cancel surveys...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadCancelSurveys = async function loadCancelSurveys(force)'));
  });

  it('unifies App messages form, preview, KPI, and list cards', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-app-messages');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-kpis');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-kpi');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-panel');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-preview');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-card');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-poll-option');
    expect(adminHtml).toContain('#tab-app-messages .app-msg-card-actions button');
  });

  it('unifies UGC purchases, Community, and Card packs content-commerce sections', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-ugc-purchases');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-community-packs');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-card-packs');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #up-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #cp-pack-reports-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #cp-list');
    expect(adminHtml).toContain('#tab-ugc-purchases .report-card span[style*="background"]');
    expect(adminHtml).toContain('#tab-community-packs .report-card button');
    expect(adminHtml).toContain('#tab-card-packs .report-card button');
    expect(adminHtml).toContain('applyCleanUgcPurchasesChrome');
    expect(adminHtml).toContain('class="report-card ugc-purchase-card"');
    expect(adminHtml).toContain('Loading UGC purchases...');
    expect(adminHtml).toContain('No purchases for this filter.');
    expect(adminHtml).toContain('Refund UGC purchase');
    expect(adminHtml).toContain('applyCleanCardPacksChrome');
    expect(adminHtml).toContain('class="report-card cp-pack-card"');
    expect(adminHtml).toContain('Loading card packs...');
    expect(adminHtml).toContain('No card packs for this filter.');
    expect(adminHtml).toContain('Shard price');
    expect(adminHtml).toContain('Card pack updated');
    expect(adminHtml).toContain('Publish card pack?');
    expect(adminHtml).toContain('Unpublish card pack?');
    expect(adminHtml.lastIndexOf('window.renderUgcPurchases = function renderUgcPurchases()')).toBeGreaterThan(adminHtml.indexOf('window.renderUgcPurchases = function renderUgcPurchases()'));
    expect(adminHtml.lastIndexOf('Total purchases')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderUgcPurchases = function renderUgcPurchases()'));
    expect(adminHtml.lastIndexOf('window.renderCardPacks = function renderCardPacks()')).toBeGreaterThan(adminHtml.indexOf('window.renderCardPacks = function renderCardPacks()'));
    expect(adminHtml.lastIndexOf('Total packs')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderCardPacks = function renderCardPacks()'));
  });

  it('unifies App Health, archive, audit, and ops log diagnostics sections', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-app-health');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-archive');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-audit');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-ops-log');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #ah-activity-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .admin-inline-hint');
    expect(adminHtml).toContain('class="reports-empty admin-inline-hint"');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #audit-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #ops-list');
    expect(adminHtml).toContain('#tab-app-health .report-card span[style*="background"]');
    expect(adminHtml).toContain('#tab-archive .report-card button');
    expect(adminHtml).toContain('#ar-detail-panel');
  });

  it('unifies daily phrases and clubs sections', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-daily-phrases');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-clubs');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #dp-summary');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #clubs-wrap');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #league-chest-archive');
    expect(adminHtml).not.toContain("switchTab('personal-training')");
    expect(adminHtml).not.toContain("'personal-training': 'Personal Training'");
    expect(adminHtml).not.toContain('tab-personal-training');
    expect(adminHtml).not.toContain('personal-trainings.js');
    expect(adminHtml).not.toContain('renderPersonalTrainingAdmin');
    expect(adminHtml).not.toContain('PERSONAL_TRAININGS_MANIFEST');
    expect(adminHtml).not.toContain('pt-summary');
    expect(adminHtml).not.toContain('pt-card');
    expect(adminHtml).toContain('applyCleanClubsChrome');
    expect(adminHtml).toContain('club-clean-table');
    expect(adminHtml).toContain('club-count-pill');
    expect(adminHtml).toContain('Source: <code>league_groups</code>. Mini groups by league');
    expect(adminHtml).toContain('Loading clubs...');
    expect(adminHtml).toContain('Select a league to view mini groups and members.');
    expect(adminHtml).toContain('Move league');
    expect(adminHtml).toContain('function isVisibleClubMember(member)');
    expect(adminHtml).toContain('function visibleClubMemberEntries(members)');
    expect(adminHtml).toContain('realCount: countVisibleClubMembers(members)');
    expect(adminHtml).toContain('hidden tails');
    expect(adminHtml).not.toContain('realCount: Object.keys(members).length');
    expect(adminHtml).not.toContain('Object.keys(group.members || {}).map');
    expect(adminHtml).toContain('applyCleanDailyPhrasesChrome');
    expect(adminHtml).toContain('Loading daily phrases...');
    expect(adminHtml).toContain('No daily phrases for this filter.');
    expect(adminHtml).toContain('class="daily-phrase-row"');
    expect(adminHtml).toContain('class="dp-pill is-${status}"');
    expect(adminHtml).toContain('Daily phrase queue updated');
    expect(adminHtml).toContain('applyCleanDailyPhraseEditorChrome');
    expect(adminHtml).toContain('Edit daily phrase');
    expect(adminHtml).toContain('New daily phrase');
    expect(adminHtml).toContain('English is required');
    expect(adminHtml).toContain('Daily phrase updated');
    expect(adminHtml).toContain('Daily phrase disabled');
    expect(adminHtml).toContain('Seed daily phrases bundle?');
    expect(adminHtml.lastIndexOf('window.renderDailyPhrases = function renderDailyPhrases()')).toBeGreaterThan(adminHtml.indexOf('window.renderDailyPhrases = function renderDailyPhrases()'));
    expect(adminHtml.lastIndexOf('<div class="label">Future queue</div>')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderDailyPhrases = function renderDailyPhrases()'));
    expect(adminHtml.lastIndexOf('window.renderClubsPanel = renderClubsPanel = function renderClubsPanel()')).toBeGreaterThan(adminHtml.indexOf('function renderClubsPanel()'));
    expect(adminHtml.lastIndexOf('Loading clubs...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadClubsData = async function loadClubsData(force)'));
    expect(adminHtml.lastIndexOf('window.openDailyPhraseEditor = function openDailyPhraseEditor(id)')).toBeGreaterThan(adminHtml.indexOf('window.openDailyPhraseEditor = function openDailyPhraseEditor(id)'));
    expect(adminHtml.lastIndexOf('English is required')).toBeGreaterThan(adminHtml.lastIndexOf('window.saveDailyPhraseEditor = async function saveDailyPhraseEditor()'));
  });

  it('unifies Arena, referrals, and push operations sections', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-arena-ranks');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-arena-live');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-arena-bets');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-arena-rooms');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-referrals');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-push-notify');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #al-content');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #ar-content');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #ref-aggregates');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #push-panel-uid');
    expect(adminHtml).toContain('#tab-arena-bets > div:first-child');
    expect(adminHtml).toContain('#push-mode-scheduled');
    expect(adminHtml).toContain('applyCleanArenaBetsChrome');
    expect(adminHtml).toContain('arena-bets-card');
    expect(adminHtml).toContain('Ranked wagers');
    expect(adminHtml).toContain('Feature flag for wager mode in ranked Arena matches.');
    expect(adminHtml).toContain('Arena wager status loaded');
    expect(adminHtml).toContain('Enable ranked wagers?');
    expect(adminHtml).toContain('Disable ranked wagers?');
    expect(adminHtml).toContain('Ranked wagers enabled');
    expect(adminHtml).toContain('applyCleanArenaRanksChrome');
    expect(adminHtml).toContain('Loading arena ranks...');
    expect(adminHtml).toContain('Arena profiles');
    expect(adminHtml).toContain('With matches');
    expect(adminHtml).toContain('class="arena-rank-row"');
    expect(adminHtml).toContain('Load Users first, then open the arena profile row again.');
    expect(adminHtml).toContain('applyCleanArenaLiveChrome');
    expect(adminHtml).toContain('class="report-card arena-live-card');
    expect(adminHtml).toContain('Loading arena live state...');
    expect(adminHtml).toContain('Matchmaking queue');
    expect(adminHtml).toContain('Active sessions');
    expect(adminHtml).toContain('Private rooms');
    expect(adminHtml).toContain('Force finish arena session?');
    expect(adminHtml).toContain('Clean all stuck arena objects?');
    expect(adminHtml).toContain('applyCleanArenaRoomsChrome');
    expect(adminHtml).toContain('class="report-card arena-room-card');
    expect(adminHtml).toContain('Loading arena rooms...');
    expect(adminHtml).toContain('No arena rooms for this filter.');
    expect(adminHtml).toContain('Total rooms');
    expect(adminHtml).toContain('Close arena room?');
    expect(adminHtml).toContain('Delete arena room?');
    expect(adminHtml).toContain('applyCleanReferralsChrome');
    expect(adminHtml).toContain('ref-status-pill');
    expect(adminHtml).toContain('Open referrer');
    expect(adminHtml).toContain('Open invited');
    expect(adminHtml).toContain('Loading referrals...');
    expect(adminHtml).toContain('Attributions');
    expect(adminHtml).toContain('Top referrers by completed invites');
    expect(adminHtml).toContain('Load 300 more');
    expect(adminHtml.lastIndexOf('window.renderArenaLive = function renderArenaLive()')).toBeGreaterThan(adminHtml.indexOf('window.renderArenaLive = function renderArenaLive()'));
    expect(adminHtml.lastIndexOf('Stuck over 5m')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderArenaLive = function renderArenaLive()'));
    expect(countOccurrences(adminHtml, 'window.loadArenaBetsFeature = async function loadArenaBetsFeature(force)')).toBe(1);
    expect(adminHtml.lastIndexOf('window.renderArenaRanksTable = function renderArenaRanksTable()')).toBeGreaterThan(adminHtml.indexOf('window.renderArenaRanksTable = function renderArenaRanksTable()'));
    expect(adminHtml.lastIndexOf('window.renderReferralsTable = function renderReferralsTable()')).toBeGreaterThan(adminHtml.indexOf('window.renderReferralsTable = function renderReferralsTable()'));
    expect(adminHtml.lastIndexOf('Top referrers by completed invites')).toBeGreaterThan(adminHtml.lastIndexOf('function renderCleanReferralSummary(rows, sumByRef, top)'));
    expect(adminHtml.lastIndexOf('Arena profiles')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderArenaRanksTable = function renderArenaRanksTable()'));
    expect(adminHtml.lastIndexOf('window.renderArenaRooms = function renderArenaRooms()')).toBeGreaterThan(adminHtml.indexOf('window.renderArenaRooms = function renderArenaRooms()'));
    expect(adminHtml.lastIndexOf('Total rooms')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderArenaRooms = function renderArenaRooms()'));
  });

  it('renders referrals from the server-owned Plus and roulette dashboard projection', () => {
    expect(adminHtml).toContain('adminGetReferralDashboard');
    expect(adminHtml).toContain('Всего приглашено');
    expect(adminHtml).toContain('Купили Plus');
    expect(adminHtml).toContain('Конверсия в Plus');
    expect(adminHtml).toContain('Прокрутили рулетку');
    expect(adminHtml).toContain('Ожидает покупки');
    expect(adminHtml).toContain('ref-filter');
    expect(adminHtml).not.toContain('ждём урок');
  });

  it('turns Push into a workflow composer with mode tabs and preview panel', () => {
    expect(adminHtml).toContain('class="push-workspace"');
    expect(adminHtml).toContain('class="push-modebar"');
    expect(adminHtml).toContain('.push-preview-card');
    expect(adminHtml).toContain('#push-panel-uid::after');
    expect(adminHtml).toContain('>By UID</button>');
    expect(adminHtml).toContain('>Schedule</button>');
    expect(adminHtml).toContain('Preview: one UID receives this push.');
    expect(adminHtml).toContain('Preview: segment filters define the audience.');
    expect(adminHtml).toContain('Preview: inactive users in the selected day range');
    expect(adminHtml).toContain('Preview: audience and time are saved as a scheduled job');
    expect(adminHtml).toContain("panel.style.display = m === mode ? 'grid' : 'none'");
    expect(adminHtml).toContain("btn.classList.toggle('active', active)");
    expect(adminHtml).toContain('setTimeout(() => window.setPushMode(_pushMode), 0)');
    expect(adminHtml).toContain('content: "Preview: one UID receives this push.');
    expect(adminHtml).toContain('class="push-history-title"');
    expect(adminHtml).toContain('class="report-card push-job-card"');
    expect(adminHtml).toContain('Push job created. Cloud Function will deliver it.');
    expect(adminHtml).toContain('Loading push jobs...');
    expect(adminHtml).toContain('No push jobs yet.');
    expect(adminHtml.lastIndexOf("window.submitPushJob = async function(mode)")).toBeGreaterThan(adminHtml.indexOf("window.submitPushJob = async function(mode)"));
    expect(adminHtml.lastIndexOf('Push job created. Cloud Function will deliver it.')).toBeGreaterThan(adminHtml.lastIndexOf("window.submitPushJob = async function(mode)"));
  });

  it('keeps the admin module free of duplicate function declarations so auth can boot', () => {
    const names = topLevelFunctionNames(adminModuleScript);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicateNames).toEqual([]);
    expect(countOccurrences(adminHtml, 'function renderArenaWagerFeature(data)')).toBe(1);
    expect(countOccurrences(adminHtml, 'window.loadArenaBetsFeature = async function loadArenaBetsFeature(force)')).toBe(1);
  });

  it('neutralizes legacy inline colors in dynamic commerce and arena lists', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-ugc-purchases .report-card span[style*="background"]');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-card-packs .report-card span[style*="background"]');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-daily-phrases td span[style*="background"]');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-arena-live .report-card span[style*="background"]');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-arena-rooms .report-card span[style*="background"]');
    expect(adminHtml).toContain('background: rgba(255,255,255,0.045) !important');
    expect(adminHtml).toContain('color: var(--admin-muted) !important');
  });

  it('unifies users, website support, ban list, VIP survey, and detail panel sections', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-users');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-website-inbox');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-ban-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-review-promo');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #bulk-toolbar');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #users-table');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #wi-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #bl-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #vs-list');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #detail-overlay');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .detail');
    expect(adminHtml).toContain('applyCleanBanListChrome');
    expect(adminHtml).toContain('bl-pill');
    expect(adminHtml).toContain('Loading ban list...');
    expect(adminHtml).toContain('Ban list loaded');
    expect(adminHtml).toContain('Ban list load failed');
    expect(adminHtml).toContain('Search UID or name...');
    expect(adminHtml).toContain('No users in the ban list.');
    expect(adminHtml).toContain('Unban');
    expect(adminHtml).toContain('Banning also sets <code>users.banned = true</code>');
    expect(adminHtml.lastIndexOf('window.renderBanList = function renderBanList()')).toBeGreaterThan(adminHtml.indexOf('window.renderBanList = function renderBanList()'));
    expect(adminHtml.lastIndexOf('Loading ban list...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadBanList = async function loadBanList(force)'));
    expect(adminHtml).toContain('applyCleanWebsiteInboxChrome');
    expect(adminHtml).toContain('wi-pill');
    expect(adminHtml).toContain('Loading site support...');
    expect(adminHtml).toContain('Site support loaded');
    expect(adminHtml).toContain('Mark read');
    expect(adminHtml).toContain('No site support messages for this filter.');
    expect(adminHtml).toContain('Messages from the public contact page.');
    expect(adminHtml.lastIndexOf('renderWebsiteInbox = function renderWebsiteInbox(rows)')).toBeGreaterThan(adminHtml.indexOf('function renderWebsiteInbox(rows)'));
    expect(adminHtml.lastIndexOf('Loading site support...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadWebsiteInbox = async function loadWebsiteInbox(force)'));
    expect(adminHtml).toContain('#tab-review-promo .review-promo-lang');
    expect(adminHtml).toContain('applyCleanVipSurveyChrome');
    expect(adminHtml).toContain('vs-pill');
    expect(adminHtml).toContain('Loading Plus survey responses...');
    expect(adminHtml).toContain('Plus survey responses loaded');
    expect(adminHtml).toContain('No Plus survey responses yet.');
    expect(adminHtml).toContain('Grant Plus');
    expect(adminHtml).toContain('Revoke Plus');
    expect(adminHtml).toContain('Full free tier only');
    expect(adminHtml.lastIndexOf('window.renderVipSurveyResponses = function renderVipSurveyResponses()')).toBeGreaterThan(adminHtml.indexOf('window.renderVipSurveyResponses = function()'));
    expect(adminHtml.lastIndexOf('Loading Plus survey responses...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadVipSurveyResponses = async function loadVipSurveyResponses(force = false)'));
  });

  it('unifies modals, overlays, toasts, and pack preview surfaces', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .umodal-overlay');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .dp-modal');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .pg-modal');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #cp-pack-preview-panel');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #pct-preview-overlay');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #user-analytics-overlay');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #email-export-modal');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .broadcast-panel');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] .toast');
    expect(adminHtml).toContain('#cp-pack-preview-backdrop');
  });

  it('keeps local visual screenshots free of repeated Firestore access toasts', () => {
    expect(adminHtml).toContain("const toastType = ({ success: 'ok', error: 'err', danger: 'err' }[type] || type || 'ok')");
    expect(adminHtml).toContain('window.__pmAdminLocalVisualTest && accessNoise');
    expect(adminHtml).toContain('window.__pmAdminToastSeen');
    expect(adminHtml).toContain("now - window.__pmAdminToastSeen[dedupeKey] < 2500");
    expect(adminHtml).toContain('missing or insufficient permissions');
  });

  it('reads app_activity and RevenueCat purchase collections for the dashboard', () => {
    expect(adminHtml).toContain("collection(db, 'app_activity')");
    expect(adminHtml).toContain("collection(db, 'revenuecat_premium_events')");
    expect(adminHtml).toContain("collection(db, 'revenuecat_shard_transactions')");
    expect(adminHtml).toContain("where('createdAtMs', '>=',");
    expect(adminHtml).toContain("where('createdAtMs', '<=',");
  });
});
