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
  const firestoreIndexes = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
    fieldOverrides?: Array<Record<string, unknown>>;
  };

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

  it('tracks onboarding paywall source from the onboarding flow', () => {
    expect(premiumModalSource).toContain("openPremiumPaywall(router, params, 'replace')");
    expect(paywallASource).toContain('params.source');
    expect(paywallASource).toContain("|| 'direct'");
    expect(onboardingSource).toContain("trackEvent('onboarding_plan_paywall_view'");
    expect(onboardingSource).toContain("trackOnboardingActivity('onboarding_plan_paywall_view'");
    expect(onboardingSource).not.toContain('queuePendingPersonalPlanActivation');
    expect(onboardingSource).toContain('AsyncStorage.setItem(PLAN_BILLING_KEY, next)');
    expect(onboardingSource).toContain('[PLAN_BILLING_KEY, billing]');
  });

  it('adds the requested revenue analytics controls and charts to the admin analytics tab', () => {
    [
      'id="an2-range"',
      'id="an2-refresh"',
      'id="an2-status"',
      'id="an2-paying"',
      'id="an2-rc-real"',
      'id="an2-summary"',
      'async function an2Fetch(force = false)',
      'function an2RenderFunnels()',
      'function an2RenderSummary()',
      "httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot')",
      "httpsCallable(functionsUs, 'adminGetAnalyticsTrends')",
      "httpsCallable(functionsUs, 'adminGetRevenueCatOverviewMetrics')",
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
      "where('action', '==', 'onboarding_source_select')",
      "orderBy('createdAtMs', 'desc')",
      "limit(ONBOARDING_SOURCE_MAX_ROWS + 1)",
      "const truncated = snap.docs.length > ONBOARDING_SOURCE_MAX_ROWS",
      "const latestByUser = new Map()",
      "Последние ответы",
      "onboarding_source_mix",
      "'onboarding-sources'",
      "Onboarding sources",
    ].forEach((needle) => expect(adminHtml).toContain(needle));

    expect(onboardingSource).toContain("trackOnboarding('onboarding_source_select'");
    expect(onboardingSource).toContain("writeToFirestore: action === 'onboarding_source_select'");
    expect(onboardingSource).toContain("consented: true");
  });

  it('keeps analytics visible before Firestore data loads or when one query fails', () => {
    expect(adminHtml).toContain('function an2SourceExact(snapshot, sourceId)');
    expect(adminHtml).toContain("state === 'ready' || state === 'empty'");
    expect(adminHtml).toContain("return exact ? AN2_NUM(value) : 'n/a'");
    expect(adminHtml).toContain('an2RenderSourceHealth');
    expect(adminHtml).toContain('серверная выборка частичная');
  });

  it('separates protected RevenueCat active totals from cancelled subscriptions that still have access', () => {
    expect(adminHtml).toContain('id="an2-pay-cancelled"');
    expect(adminHtml).toContain('Cancelled, access active');
    expect(adminHtml).toContain("an2Set('an2-pay-cancelled', 'n/a')");
    expect(adminHtml).toContain('Авторитетного current-cancelled поля нет.');
    expect(adminHtml).toContain('overview?.activeSubscriptions');
    expect(adminHtml).toContain('an2ExactCell(overviewExact, overview?.activeSubscriptions)');
  });

  it('does not infer a current cancellation total from historical lifecycle events', () => {
    expect(adminHtml).not.toContain('function an2CurrentCancelledUids(events)');
    expect(adminHtml).toContain("an2Set('an2-pay-cancelled', 'n/a')");
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
    expect(adminHtml).toContain('id="an2-range"');
    expect(adminHtml).toContain('<option value="7">7 дней</option>');
    expect(adminHtml).toContain('<option value="28" selected>28 дней</option>');
    expect(adminHtml).toContain('<option value="90">90 дней</option>');
    expect(adminHtml).toContain('rangeDays: _an2.range');
    expect(adminHtml).toContain('function an2Series()');
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
    const sidebarRule = Array.from(adminHtml.matchAll(/body\[data-admin-skin="onboarding"\] \.tabs \{([\s\S]*?)\n    \}/g))
      .map((match) => match[1])
      .find((rule) => rule.includes('position: fixed')) || '';
    expect(adminHtml).toContain('margin-left: 304px');
    expect(sidebarRule).toContain('left: 14px');
    expect(sidebarRule).not.toMatch(/\bright\s*:/);
  });

  it('adds search inside the left admin section menu', () => {
    expect(adminHtml).toContain('id="admin-tab-search"');
    expect(adminHtml).toContain('class="admin-tab-search-wrap"');
    expect(adminHtml).toContain('class="admin-tab-empty"');
    expect(adminHtml).toContain('.admin-tab-group-label');
    expect(adminHtml).toContain('function applyGroupedAdminTabs');
    expect(adminHtml).toContain('function applyAdminTabFilter');
    expect(adminHtml).toContain('function setupAdminTabSearch');
    expect(adminHtml).toContain("content: 'Разделы' !important");
    expect(adminHtml).toContain("tabsBox.dataset.filterEmpty");
    expect(adminHtml).toContain("visibleGroups.add(tabEl.dataset.adminGroup)");
    expect(adminHtml).toContain("if (matched) tabEl.style.removeProperty('display')");
    expect(adminHtml).toContain("else tabEl.style.display = 'none'");
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
    expect(adminHtml).not.toContain('data-admin-goto="arena-live"');
    expect(adminHtml).toContain("panel.classList.toggle('active', panel.id === 'tab-' + tab)");
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
    expect(adminHtml).toContain("'safety-flags': 'core'");
    expect(adminHtml).toContain("'age-consent': 'core'");
  });

  it('keeps safety and consent loaders retryable after auth or permission failures', () => {
    const safetyStart = adminHtml.indexOf('async function fetchSafetyFlagsPage(reset)');
    const ageStart = adminHtml.indexOf('window.loadAgeConsent = async function()');
    expect(safetyStart).toBeGreaterThan(0);
    expect(ageStart).toBeGreaterThan(safetyStart);
    const safetyLoader = adminHtml.slice(safetyStart, ageStart);
    const ageLoader = adminHtml.slice(ageStart, adminHtml.indexOf('window.loadUserReports = async function()', ageStart));

    expect(safetyLoader).toContain('getAdminListSafetyFlagsCallable()');
    expect(safetyLoader).not.toContain("collection(db, 'safety_flags')");
    expect(safetyLoader).toContain('filteredTotal');
    expect(safetyLoader).toContain('scanBoundReached');
    expect(safetyLoader.indexOf('window._safetyFlagsLoaded = _safetyFlagsComplete')).toBeGreaterThan(safetyLoader.indexOf('renderSafetyFlags(_allSafetyFlags)'));
    expect(safetyLoader.indexOf('window._safetyFlagsLoaded = false')).toBeGreaterThan(safetyLoader.indexOf('catch(e)'));

    expect(ageLoader).toContain('getAdminGetComplianceOverviewCallable()');
    expect(ageLoader).not.toContain("collection(db, 'user_consents')");
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
    expect(adminHtml).toContain("users: 'Пользователи'");
    expect(adminHtml).toContain("analytics: 'Доход и paywall'");
    expect(adminHtml).toContain("'app-messages': 'Плашки и сообщения'");
    expect(adminHtml).toContain("'push-notify': 'Push-уведомления'");
    expect(adminHtml).toContain('function applyCleanAdminTabLabels');
    expect(adminHtml).toContain('function decodeAdminMojibake');
    expect(adminHtml).toContain('function normalizeAdminStatusText');
    expect(adminHtml).toContain('Loading users...');
    expect(adminHtml).toContain('const cp1252');
    expect(adminHtml).toContain('0x0178: 0x9F');
    expect(adminHtml).toContain('new MutationObserver');
    expect(adminHtml).toContain("ADMIN_TAB_BASE_HTML");
    expect(adminHtml).not.toContain("'arena-live'");
    expect(adminHtml).toContain(`onclick="switchTab('users')" data-i18n-es="Usuarios">Users</div>`);
    expect(adminHtml).toContain(`onclick="switchTab('analytics')" data-i18n-es="Analítica">Analytics</div>`);
    expect(adminHtml).toContain(`onclick="switchTab('app-messages')" data-i18n-es="Placas y mensajes">Плашки и сообщения</div>`);
    expect(adminHtml).toContain(`onclick="switchTab('push-notify')" data-i18n-es="Push">Push</div>`);
    expect(adminHtml).toContain('placeholder="Никнейм или UID"');
    expect(adminHtml).toContain('>Выйти</button>');
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
    expect(adminHtml).toContain('<div class="label">Платформа</div>');
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
    expect(adminHtml).toContain('function applyCleanPremiumChrome()');
    expect(adminHtml).toContain('Plus accounts');
    expect(adminHtml).toContain('Real Plus only: RevenueCat metadata');
    expect(adminHtml).toContain('Search UID, email, name...');
    expect(adminHtml).toContain('No Plus users match this filter.');
    expect(countOccurrences(adminHtml, 'window.renderPremiumList = function renderPremiumList()')).toBe(1);
    expect(adminHtml).toContain('window.loadPremiumData = async function loadPremiumData()');
    expect(adminHtml).toContain('window.renderPremiumList?.()');
    expect(adminHtml).toContain('applyCleanCancelSurveysChrome');
    expect(adminHtml).toContain('cs-pill');
    expect(adminHtml).toContain('Loading cancel surveys...');
    expect(adminHtml).toContain('Cancel surveys loaded');
    expect(adminHtml).toContain('Cancel survey load failed');
    expect(adminHtml).toContain('Search UID, name, reason, comment...');
    expect(adminHtml).toContain('Shows why users opened subscription management');
    expect(countOccurrences(adminHtml, 'window.renderCancelSurveys = function renderCancelSurveys()')).toBe(1);
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
    expect(adminHtml).toContain('class="ugc-purchase-refund"');
    expect(adminHtml).toContain('applyCleanCardPacksChrome');
    expect(adminHtml).toContain('class="report-card cp-pack-card"');
    expect(adminHtml).toContain('Loading card packs...');
    expect(adminHtml).toContain('No card packs for this filter.');
    expect(adminHtml).toContain('Shard price');
    expect(adminHtml).toContain('Card pack updated');
    expect(adminHtml).toContain('Publish card pack?');
    expect(adminHtml).toContain('Unpublish card pack?');
    expect(countOccurrences(adminHtml, 'window.renderUgcPurchases = function renderUgcPurchases()')).toBe(1);
    expect(adminHtml.lastIndexOf('Total purchases')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderUgcPurchases = function renderUgcPurchases()'));
    expect(countOccurrences(adminHtml, 'window.renderCardPacks = function renderCardPacks()')).toBe(1);
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
    expect(adminHtml).toContain('id="dp-summary"');
    expect(adminHtml).toContain('id="clubs-wrap"');
    expect(adminHtml).toContain('id="league-chest-archive"');
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
    expect(countOccurrences(adminHtml, 'window.renderDailyPhrases = function renderDailyPhrases()')).toBe(1);
    expect(adminHtml.lastIndexOf('<div class="label">Future queue</div>')).toBeGreaterThan(adminHtml.lastIndexOf('window.renderDailyPhrases = function renderDailyPhrases()'));
    expect(adminHtml.lastIndexOf('window.renderClubsPanel = renderClubsPanel = function renderClubsPanel()')).toBeGreaterThan(adminHtml.indexOf('function renderClubsPanel()'));
    expect(adminHtml.lastIndexOf('Loading clubs...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadClubsData = async function loadClubsData(force)'));
    expect(countOccurrences(adminHtml, 'window.openDailyPhraseEditor = function openDailyPhraseEditor(id)')).toBe(1);
    expect(adminHtml.lastIndexOf('English is required')).toBeGreaterThan(adminHtml.lastIndexOf('window.saveDailyPhraseEditor = async function saveDailyPhraseEditor()'));
  });

  it('keeps referrals and push operations sections after Arena retirement', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-referrals');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-push-notify');
    expect(adminHtml).toContain('id="ref-aggregates"');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-referrals .ref-panel');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #push-panel-uid');
    expect(adminHtml).toContain('#push-mode-scheduled');
    expect(adminHtml).toContain('applyCleanReferralsChrome');
    expect(adminHtml).toContain('ref-status-pill');
    expect(adminHtml).toContain('data-open="${escapeHtml(row.referrerId)}"');
    expect(adminHtml).toContain('data-open="${escapeHtml(row.refereeId)}"');
    expect(adminHtml).toContain('Loading referrals...');
    expect(adminHtml).toContain('Attributions');
    expect(adminHtml).toContain('Top referrers by completed invites');
    expect(adminHtml).toContain('Load 300 more');
    expect(countOccurrences(adminHtml, 'window.renderReferralsTable = function renderReferralsTable()')).toBe(1);
    expect(adminHtml.lastIndexOf('Top referrers by completed invites')).toBeGreaterThan(adminHtml.lastIndexOf('function renderCleanReferralSummary(rows, sumByRef, top)'));
  });

  it('renders referrals from the server-owned Plus and roulette dashboard projection', () => {
    expect(adminHtml).toContain('adminGetReferralDashboard');
    expect(adminHtml).toContain('Всего приглашено');
    expect(adminHtml).toContain('Купили Plus');
    expect(adminHtml).toContain('Конверсия в Plus');
    expect(adminHtml).toContain('Прокрутили рулетку');
    expect(adminHtml).toContain('Ожидает покупки');
    expect(adminHtml).toContain('ref-filter');
    expect(adminHtml).toContain("row.refCode || ''");
    expect(adminHtml).toContain('@media (max-width: 1360px)');
    expect(firestoreIndexes.fieldOverrides).toContainEqual({
      collectionGroup: 'referral_spins',
      fieldPath: 'creditId',
      indexes: [{ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' }],
    });
    expect(adminHtml).not.toContain('ждём урок');
  });

  it('auto-loads the referral dashboard without a persistent refresh control', () => {
    expect(adminHtml).toContain("if (tab === 'referrals' && typeof window.loadReferralsData === 'function')");
    expect(adminHtml).toContain('void window.loadReferralsData(false, false)');
    expect(adminHtml).not.toContain("tab === 'referrals' && !window._referralsLoaded");
    expect(adminHtml).not.toContain('id="ref-refresh"');
    expect(adminHtml).not.toContain('<header class="ref-dashboard-header">');
    expect(adminHtml).toContain('<div class="ref-dashboard-header">');
    expect(adminHtml).toContain('id="ref-retry"');
  });

  it('renders referrals from the server-owned Plus and roulette dashboard projection', () => {
    expect(adminHtml).toContain('adminGetReferralDashboard');
    expect(adminHtml).toContain('Всего приглашено');
    expect(adminHtml).toContain('Купили Plus');
    expect(adminHtml).toContain('Конверсия в Plus');
    expect(adminHtml).toContain('Прокрутили рулетку');
    expect(adminHtml).toContain('Ожидает покупки');
    expect(adminHtml).toContain('ref-filter');
    expect(adminHtml).toContain("row.refCode || ''");
    expect(adminHtml).toContain('@media (max-width: 1360px)');
    expect(firestoreIndexes.fieldOverrides).toContainEqual({
      collectionGroup: 'referral_spins',
      fieldPath: 'creditId',
      indexes: [{ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' }],
    });
    expect(adminHtml).not.toContain('ждём урок');
  });

  it('auto-loads the referral dashboard without a persistent refresh control', () => {
    expect(adminHtml).toContain("if (tab === 'referrals' && typeof window.loadReferralsData === 'function')");
    expect(adminHtml).toContain('void window.loadReferralsData(false, false)');
    expect(adminHtml).not.toContain("tab === 'referrals' && !window._referralsLoaded");
    expect(adminHtml).not.toContain('id="ref-refresh"');
    expect(adminHtml).not.toContain('<header class="ref-dashboard-header">');
    expect(adminHtml).toContain('<div class="ref-dashboard-header">');
    expect(adminHtml).toContain('id="ref-retry"');
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
    expect(countOccurrences(adminHtml, 'window.submitPushJob = async function(mode)')).toBe(1);
    expect(adminHtml.lastIndexOf('Push job created. Cloud Function will deliver it.')).toBeGreaterThan(adminHtml.lastIndexOf("window.submitPushJob = async function(mode)"));
  });

  it('keeps the admin module free of duplicate function declarations so auth can boot', () => {
    const names = topLevelFunctionNames(adminModuleScript);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicateNames).toEqual([]);
  });

  it('neutralizes legacy inline colors in dynamic commerce lists', () => {
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-ugc-purchases .report-card span[style*="background"]');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-card-packs .report-card span[style*="background"]');
    expect(adminHtml).toContain('body[data-admin-skin="onboarding"] #tab-daily-phrases td span[style*="background"]');
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
    expect(countOccurrences(adminHtml, 'window.renderBanList = function renderBanList()')).toBe(1);
    expect(adminHtml.lastIndexOf('Loading ban list...')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadBanList = async function loadBanList(force)'));
    expect(adminHtml).toContain('applyCleanWebsiteInboxChrome');
    expect(adminHtml).toContain('wi-pill');
    expect(adminHtml).toContain('Loading first site-support page…');
    expect(adminHtml).toContain('Site support updated');
    expect(adminHtml).toContain('Mark read');
    expect(adminHtml).toContain('No site support messages for this filter.');
    expect(adminHtml).toContain('Messages from the public contact page.');
    expect(adminHtml.lastIndexOf('renderWebsiteInbox = function renderWebsiteInbox(rows)')).toBeGreaterThan(adminHtml.indexOf('function renderWebsiteInbox(rows)'));
    expect(adminHtml.lastIndexOf('Loading first site-support page…')).toBeGreaterThan(adminHtml.lastIndexOf('window.loadWebsiteInbox = async function loadWebsiteInbox(force, append = false)'));
    expect(adminHtml).toContain('#tab-review-promo .review-promo-lang');
    expect(adminHtml).toContain('applyCleanVipSurveyChrome');
    expect(adminHtml).toContain('vs-pill');
    expect(adminHtml).toContain('Loading Plus survey responses...');
    expect(adminHtml).toContain('Plus survey responses loaded');
    expect(adminHtml).toContain('No Plus survey responses yet.');
    expect(adminHtml).toContain('Grant Plus');
    expect(adminHtml).toContain('Revoke Plus');
    expect(adminHtml).toContain('Full free tier only');
    expect(countOccurrences(adminHtml, 'window.renderVipSurveyResponses = function renderVipSurveyResponses()')).toBe(1);
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

  it('reads revenue evidence through the authoritative bounded server projection', () => {
    const from = adminHtml.indexOf('async function revenueSafeGetDocs(');
    const to = adminHtml.indexOf('const ADMIN_BADGE_CACHE_MS', from);
    expect(from).toBeGreaterThanOrEqual(0);
    expect(to).toBeGreaterThan(from);
    const revenueWorkspace = adminHtml.slice(from, to);
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot')");
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsTrends')");
    expect(revenueWorkspace).not.toMatch(/collection\(db, '(?:app_activity|revenuecat_premium_events|revenuecat_shard_transactions)'\)/);
    expect(revenueWorkspace).not.toMatch(/\bgetDocs\s*\(/);
  });
});
