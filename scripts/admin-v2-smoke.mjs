import fs from 'node:fs';

const liveBase = process.env.ADMIN_V2_SMOKE_URL || 'https://phraseman-ea0b3.web.app';
const localIndex = fs.readFileSync('admin/v2/index.html', 'utf8');
const rootIndex = fs.readFileSync('admin/index.html', 'utf8');

const scriptFiles = [
  'admin/v2/scripts/admin-core.js',
  'admin/v2/scripts/admin-router.js',
  'admin/v2/scripts/admin-firebase.js',
  'admin/v2/scripts/admin-migration.js',
  'admin/v2/scripts/admin-completion.js',
  'admin/v2/scripts/admin-function-transfer.js',
  'admin/v2/scripts/admin-operational-audit.js',
  'admin/v2/scripts/admin-launch-readiness.js'
];

const scriptText = scriptFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

const failures = [];
const warnings = [];

await checkLive();
checkRootSync();
checkRoutes();
checkActions();
checkButtonsAndLinks();
checkDialogs();
checkTextQuality();
checkFirebaseGuardCopy();
checkMoneyAnalyticsControls();
checkAnalyticsAndLegacyDiscoverability();
checkDiagnosticsPeriodControls();

const result = {
  verdict: failures.length ? 'FAIL' : 'PASS',
  liveBase,
  failures,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

async function checkLive() {
  const urls = [
    ['root', `${liveBase}/#control-panel`],
    ['firebase-js', `${liveBase}/v2/scripts/admin-firebase.js`],
    ['migration-js', `${liveBase}/v2/scripts/admin-migration.js`],
    ['completion-js', `${liveBase}/v2/scripts/admin-completion.js`]
  ];

  for (const [label, url] of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        failures.push(`${label}: live ${url} returned ${response.status}`);
        continue;
      }
      const text = await response.text();
      if (label === 'root') {
        assert(text.includes('./v2/scripts/admin-router.js'), 'live root does not load v2 router');
        assert(text.includes('Скопировать все'), 'live root does not include updated user reports copy button');
        assert(!badVisibleText(text), 'live root still contains blocked visible text');
      }
      if (label.endsWith('-js')) {
        assert(!/Ð|Ñ|\?\?\?\?/.test(text), `${label}: live script has mojibake or broken text`);
      }
    } catch (error) {
      failures.push(`${label}: live fetch failed: ${error.message}`);
    }
  }
}

function checkRootSync() {
  assert(/src="\.[/]v2[/]scripts[/]admin-router\.js(?:\?[^"]*)?"/.test(rootIndex), 'admin/index.html does not point to v2 scripts');
  assert(/href="\.[/]v2[/]styles[/]admin\.css(?:\?[^"]*)?"/.test(rootIndex), 'admin/index.html does not point to v2 styles');
  assert(!rootIndex.includes('href="../legacy/'), 'admin/index.html still has ../legacy links');
  assert(rootIndex.includes('Скопировать все'), 'admin/index.html was not synced from v2 after user reports update');
}

function checkRoutes() {
  const routes = unique([...localIndex.matchAll(/data-route="([^"]+)"/g)].map((match) => match[1]));
  const pages = new Set([...localIndex.matchAll(/data-page="([^"]+)"/g)].map((match) => match[1]));
  const targets = unique([...localIndex.matchAll(/data-route-target="([^"]+)"/g)].map((match) => match[1]));
  const router = fs.readFileSync('admin/v2/scripts/admin-router.js', 'utf8');

  assert(routes.length === 9, `expected 9 primary routes, got ${routes.length}`);
  routes.forEach((route) => assert(pages.has(route), `route ${route} has no data-page`));
  targets.forEach((route) => assert(pages.has(route), `route target ${route} has no data-page`));
  assert(router.includes("'control-panel': 'application'"), 'legacy #control-panel route is not mapped to application');
}

function checkActions() {
  const actionFiles = ['admin/v2/index.html', 'admin/v2/scripts/admin-firebase.js', 'admin/v2/scripts/admin-migration.js'];
  const handlerFiles = [
    'admin/v2/scripts/admin-core.js',
    'admin/v2/scripts/admin-firebase.js',
    'admin/v2/scripts/admin-migration.js',
    'admin/v2/scripts/admin-button-audit.js',
    'admin/v2/scripts/admin-function-transfer.js'
  ];
  const actionText = actionFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const handlerText = handlerFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const actions = unique([...actionText.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1]));
  const handled = new Set([...handlerText.matchAll(/action(?:El\.getAttribute\('data-action'\))?\s*(?:!==|===|==)\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
  const missing = actions.filter((action) => !handled.has(action));
  assert(actions.includes('open-report-user'), 'open-report-user action missing from rendered action set');
  assert(!missing.length, `actions without handlers: ${missing.join(', ')}`);
}

function checkButtonsAndLinks() {
  const buttons = [...localIndex.matchAll(/<button\b[\s\S]*?>/g)].map((match) => match[0]);
  const actionableButtons = buttons.filter((tag) => !tag.includes('aria-hidden="true"'));
  const missingTooltip = actionableButtons.filter((tag) => !tag.includes('data-tooltip=') && !tag.includes('aria-label='));
  assert(!missingTooltip.length, `${missingTooltip.length} static buttons lack tooltip or aria-label`);

  const buttonLabels = [...localIndex.matchAll(/<button\b[\s\S]*?<\/button>/g)]
    .map((match) => stripTags(match[0]).trim())
    .filter(Boolean);
  const blockedLabels = buttonLabels.filter((text) => /(open|preview|refresh|registry|archive|copy visible|mark visible)/i.test(text));
  assert(!blockedLabels.length, `button labels still contain English/old words: ${blockedLabels.join(' | ')}`);

  const buttonLinks = [...localIndex.matchAll(/<a\b[^>]*class="[^"]*\bbutton\b[^"]*"[^>]*>/g)].map((match) => match[0]);
  const linksMissingTooltip = buttonLinks.filter((tag) => !tag.includes('data-tooltip='));
  assert(!linksMissingTooltip.length, `${linksMissingTooltip.length} button-like links lack tooltip`);
}

function checkDialogs() {
  const dialogIds = unique([...localIndex.matchAll(/<dialog\b[^>]*id="([^"]+)"/g)].map((match) => match[1]));
  ['previewDialog', 'migrationDetailDialog', 'savedViewsDialog'].forEach((id) => {
    assert(dialogIds.includes(id), `dialog ${id} is missing`);
  });
  assert(scriptText.includes('openUpdatePreview'), 'preview update modal handler missing');
  assert(scriptText.includes('openSavedViews'), 'saved views handler missing');
  assert(scriptText.includes('openDetail'), 'migration detail handler missing');
}

function checkTextQuality() {
  const combined = [localIndex, rootIndex, scriptText].join('\n');
  assert(!/Ð|Ñ|\?\?\?\?/.test(combined), 'mojibake or broken question marks found');
  assert(!badVisibleText(localIndex), 'admin/v2/index.html contains blocked visible text');
  assert(!badVisibleText(rootIndex), 'admin/index.html contains blocked visible text');
  assert(scriptText.includes('Пульт управления'), 'migration coverage is not Russian');
  assert(scriptText.includes('Открыть профиль'), 'user report open profile action is not rendered from JS');
}

function checkMoneyAnalyticsControls() {
  [
    'moneyAnalyticsDate',
    'moneyAnalyticsStartHour',
    'moneyAnalyticsEndHour',
    'moneyAnalyticsPeriodSummary',
    'moneyHourlyList'
  ].forEach((id) => {
    assert(localIndex.includes(`id="${id}"`), `money analytics control ${id} is missing`);
    assert(rootIndex.includes(`id="${id}"`), `root money analytics control ${id} is missing`);
  });
  assert(scriptText.includes('readMoneyAnalyticsPeriod'), 'money analytics period reader is missing');
  assert(scriptText.includes('renderMoneyHourly'), 'money hourly chart renderer is missing');
  assert(scriptText.includes("where('createdAtMs', '<'"), 'money activity query does not cap the selected period end');
}

function checkAnalyticsAndLegacyDiscoverability() {
  [
    'Деньги и аналитика',
    'Открыть аналитику',
    'VIP из Telegram',
    'Старые графики',
    'Детальная карточка',
    'Где старые денежные инструменты'
  ].forEach((text) => {
    assert(localIndex.includes(text), `discoverability text missing in v2: ${text}`);
    assert(rootIndex.includes(text), `discoverability text missing in root: ${text}`);
  });
  assert(localIndex.includes('href="/testers.html"'), 'Telegram VIP link to testers.html is missing');
  assert(localIndex.includes('href="../legacy/index.html#analytics"'), 'legacy analytics link is missing in v2');
  assert(rootIndex.includes('href="./legacy/index.html#analytics"'), 'legacy analytics link is missing or not rewritten in root');
  assert(scriptText.includes('moneyLegacyTitle'), 'money legacy subsection is not registered');
}

function checkDiagnosticsPeriodControls() {
  [
    'diagnosticsDate',
    'diagnosticsStartHour',
    'diagnosticsEndHour',
    'diagnosticsPeriodSummary'
  ].forEach((id) => {
    assert(localIndex.includes(`id="${id}"`), `diagnostics period control ${id} is missing`);
    assert(rootIndex.includes(`id="${id}"`), `root diagnostics period control ${id} is missing`);
  });
  assert(localIndex.includes('id="telegramVipList"'), 'Telegram VIP read-only list is missing');
  assert(rootIndex.includes('id="telegramVipList"'), 'root Telegram VIP read-only list is missing');
  assert(scriptText.includes('readDiagnosticsPeriod'), 'diagnostics period reader is missing');
  assert(scriptText.includes('telegram_premium_orders'), 'Telegram VIP Firestore source is missing');
  assert(scriptText.includes('selectTelegramVipOrder'), 'Telegram VIP select handler is missing');
  assert(scriptText.includes('grantSelectedTelegramVip'), 'Telegram VIP guarded grant handler is missing');
  assert(scriptText.includes("action: 'telegram_vip_grant'"), 'Telegram VIP grant does not write admin_log action');
  assert(scriptText.includes("'progress.vip_plan': 'telegram_tester'"), 'Telegram VIP grant does not set telegram_tester plan');
  assert(scriptText.includes("where(item.orderField, '>='"), 'diagnostics queries do not use selected period start');
  assert(scriptText.includes("where(item.orderField, '<'"), 'diagnostics queries do not use selected period end');
}

function checkFirebaseGuardCopy() {
  assert(scriptText.includes('Это изменит жалобы пользователей в Firebase'), 'bulk reviewed confirm copy does not explain Firebase write');
  assert(scriptText.includes("addDoc(collection(db, 'admin_log')"), 'user report mark-reviewed flow does not write admin_log');
  assert(scriptText.includes('нет прав на этот источник'), 'Firebase permission errors are not humanized');
}

function badVisibleText(text) {
  return /Скопировать видимые|Отметить видимые|community packs|explain cache|League chat|Arena live|Marketplace health|Queue, reports|pending review|New explain reports|Daily phrases publish|Card pack publish|Source health|review first|guarded write|backend contract|archive\./i.test(text);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}
