import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const auditDir = path.join(root, '.codex-tmp', 'admin-audit');
const output = path.join(root, 'docs', 'admin', 'ADMIN_V2_MIGRATION_COVERAGE.json');
const hostingOutput = path.join(root, 'admin', 'v2', 'data', 'ADMIN_V2_MIGRATION_COVERAGE.json');
const checkOnly = process.argv.includes('--check');
const buttons = JSON.parse(fs.readFileSync(path.join(auditDir, 'legacy-buttons.json'), 'utf8'));
const functions = JSON.parse(fs.readFileSync(path.join(auditDir, 'legacy-functions.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(auditDir, 'legacy-button-function-links.json'), 'utf8'));
const capabilitySource = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-capabilities.js'), 'utf8');
const capabilityModuleUrl = `data:text/javascript;base64,${Buffer.from(capabilitySource).toString('base64')}`;
const { ADMIN_CAPABILITY_REGISTRY } = await import(capabilityModuleUrl);

const routeMap = {
  overview: 'overview', 'control-panel': 'application', app: 'application', 'app-messages': 'application', 'push-notify': 'application', alerts: 'application', 'daily-digest': 'overview', 'openai-jobs': 'application', 'openai-dialog': 'application',
  users: 'users', reports: 'users', support: 'users', 'user-reports': 'users', 'beta-testers': 'users', testers: 'users',
  revenue: 'money', 'paywall-ab': 'money', premium: 'money', vip: 'money', 'plus-radar': 'money', 'promo-codes': 'money', refunds: 'money', referrals: 'money', 'telegram-premium': 'money', 'openai-budget': 'money', analytics: 'money',
  content: 'content', lessons: 'content', phrases: 'content', translations: 'content', quizzes: 'content', cards: 'content', 'daily-phrases': 'content', 'community-packs': 'content', 'french-quizzes': 'content',
  community: 'community', arena: 'community', chat: 'community', clubs: 'community', league: 'community', 'help-board': 'community', ugc: 'community',
  diagnostics: 'diagnostics', 'app-health': 'diagnostics', 'audit-log': 'diagnostics', ops: 'diagnostics', 'ops-log': 'diagnostics', archive: 'diagnostics', changelog: 'diagnostics', 'advanced-tools': 'diagnostics', system: 'diagnostics',
};
const routes = ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics'];
const capabilityByLegacyTab = new Map(ADMIN_CAPABILITY_REGISTRY.filter((capability) => capability.legacyTab).map((capability) => [capability.legacyTab, capability]));
const capabilityById = new Map(ADMIN_CAPABILITY_REGISTRY.map((capability) => [capability.id, capability]));

const operationKind = (row) => row.danger ? 'danger' : row.write ? 'write' : 'read';
const routeFor = (tab, capabilityId = null) => capabilityById.get(capabilityId)?.route ?? capabilityByLegacyTab.get(tab)?.route ?? routeMap[tab] ?? 'diagnostics';
const permissionFor = (route, kind) => kind === 'read' ? `${route}.read` : `${route}.write`;

const linksByButtonKey = new Map();
const functionRoute = new Map();
for (const link of links) {
  if (!link.buttonKey) throw new Error(`legacy link has no buttonKey: ${link.function || 'unknown'}`);
  const linked = linksByButtonKey.get(link.buttonKey) ?? [];
  linked.push(link);
  linksByButtonKey.set(link.buttonKey, linked);
  const functionKey = `${link.sourceFile || 'admin/index.html'}:${link.function}`;
  if (link.function && (link.tab || link.capabilityId) && !functionRoute.has(functionKey)) {
    functionRoute.set(functionKey, routeFor(link.tab, link.capabilityId));
  }
}

const buttonCoverage = buttons.map((button) => {
  const kind = operationKind(button);
  const route = routeFor(button.tab, button.capabilityId);
  const linked = linksByButtonKey.get(button.buttonKey) ?? [];
  const provenanceKnown = button.provenance === 'static-html' && Boolean(button.tab || button.capabilityId);
  return {
    coverageId: button.buttonKey,
    buttonKey: button.buttonKey,
    legacy: {
      provenance: button.provenance,
      sourceFile: button.sourceFile,
      capabilityId: button.capabilityId ?? null,
      tab: button.tab,
      line: button.line,
      id: button.id || null,
      text: button.text,
      onclick: button.onclick || null,
    },
    target: { route, permission: permissionFor(route, kind), kind },
    linkedFunctions: linked.map((link) => link.function).filter(Boolean),
    status: provenanceKnown ? 'guarded' : 'inventory',
    owner: null,
    notes: provenanceKnown
      ? 'Нативный capability активен; legacy-кнопка сохранена только как инвентарная привязка к серверному процессу.'
      : 'Кнопка найдена внутри script-template; вкладка и native-маршрут не назначаются без доказанного контекста.',
  };
});

const functionCoverage = functions.map((fn, index) => {
  const provenRoute = capabilityById.get(fn.capabilityId)?.route ?? functionRoute.get(`${fn.sourceFile || 'admin/index.html'}:${fn.name}`);
  const route = provenRoute ?? 'diagnostics';
  return {
    coverageId: `function-${index + 1}`,
    legacy: { sourceFile: fn.sourceFile, capabilityId: fn.capabilityId ?? null, name: fn.name, line: fn.line, writes: Boolean(fn.writes), callable: Boolean(fn.callable) },
    target: { route, permission: permissionFor(route, fn.writes ? 'write' : 'read') },
    status: provenRoute ? 'guarded' : 'inventory',
    owner: null,
    notes: fn.writes
      ? 'Нужен server command, audit и rollback/confirm gate.'
      : 'Нужен read-model с loading/empty/error состояниями.',
  };
});

const capabilityCoverage = ADMIN_CAPABILITY_REGISTRY.map((capability) => {
  const capabilityButtons = buttons.filter((button) => button.capabilityId === capability.id || button.tab === capability.legacyTab);
  const capabilityFunctions = functions.filter((fn) => fn.capabilityId === capability.id);
  const capabilityLinks = links.filter((link) => link.capabilityId === capability.id || link.tab === capability.legacyTab);
  return ({
  capabilityId: capability.id,
  label: capability.label,
  route: capability.route,
  legacyTab: capability.legacyTab ?? null,
  legacyPage: capability.legacyPage ?? null,
  status: capability.migrationStatus,
  nativeRoute: capability.nativeRoute || null,
  inventory: {
    buttons: capabilityButtons.length,
    functions: capabilityFunctions.length,
    linkedActions: capabilityLinks.length,
    linkedWritesWithoutConfirm: capabilityLinks.filter((link) => link.writes && !link.confirm).length,
    linkedWritesWithoutAudit: capabilityLinks.filter((link) => link.writes && !link.audit).length,
  },
  notes: capability.nativeRoute
    ? 'Нативный экран использует серверную функцию с проверкой прав. Полнота переноса каждой операции проверяется отдельно.'
    : 'Функция доступна через встроенный старый интерфейс или отдельную ссылку до пофункционального переноса.',
  });
});

function statusSummary(rows) {
  const summary = { total: rows.length, inventory: 0, ported: 0, fallback: 0, guarded: 0, blocked: 0 };
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(summary, row.status)) summary[row.status] += 1;
  }
  return summary;
}

const board = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  source: {
    buttons: buttons.length,
    functions: functions.length,
    links: links.length,
    legacyFiles: [...new Set(buttons.map((button) => button.sourceFile).filter(Boolean))],
  },
  routes,
  statusDefinitions: {
    inventory: 'Найдено в legacy, но точный маршрут или перенос ещё не подтверждён',
    guarded: 'Нативный экран существует; опасные действия остаются под permission/server-command проверками',
    ported: 'Новый UI + handler + focused test + audit/permission проверены',
    fallback: 'Временно доступно через legacy deep-link или iframe, пока native-перенос не завершён',
    blocked: 'Нельзя переносить до решения security/data contract',
  },
  capabilityCoverage,
  buttonCoverage,
  functionCoverage,
  summary: {
    capabilities: statusSummary(capabilityCoverage),
    buttons: statusSummary(buttonCoverage),
    functions: statusSummary(functionCoverage),
  },
};

function comparable(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.generatedAt;
  return copy;
}

if (checkOnly) {
  for (const target of [output, hostingOutput]) {
    if (!fs.existsSync(target)) {
      console.error(`Migration board is missing: ${target}`);
      process.exit(1);
    }
    const tracked = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (JSON.stringify(comparable(tracked)) !== JSON.stringify(comparable(board))) {
      console.error(`Migration board is stale: ${target}. Run node scripts/admin-v2-build-migration-board.mjs and review the diff.`);
      process.exit(1);
    }
  }
  console.log(JSON.stringify({ checked: [output, hostingOutput], state: 'current', buttons: buttons.length, functions: functions.length, capabilities: capabilityCoverage.length }, null, 2));
} else {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(board, null, 2) + '\n');
  fs.mkdirSync(path.dirname(hostingOutput), { recursive: true });
  fs.writeFileSync(hostingOutput, JSON.stringify(board) + '\n');
  console.log(JSON.stringify({ output: [output, hostingOutput], buttons: buttons.length, functions: functions.length, capabilities: capabilityCoverage.length, routes }, null, 2));
}
