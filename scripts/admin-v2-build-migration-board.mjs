import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditDir = path.join(root, '.codex-tmp', 'admin-audit');
const output = path.join(root, 'docs', 'admin', 'ADMIN_V2_MIGRATION_COVERAGE.json');
const buttons = JSON.parse(fs.readFileSync(path.join(auditDir, 'legacy-buttons.json'), 'utf8'));
const functions = JSON.parse(fs.readFileSync(path.join(auditDir, 'legacy-functions.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(auditDir, 'legacy-button-function-links.json'), 'utf8'));

const routeMap = {
  overview: 'overview', 'control-panel': 'application', app: 'application', 'app-messages': 'application', 'push-notify': 'application', alerts: 'application', 'daily-digest': 'application', 'openai-jobs': 'application', 'openai-dialog': 'application',
  users: 'users', reports: 'users', support: 'users', 'user-reports': 'users', 'beta-testers': 'users', testers: 'users',
  revenue: 'money', 'paywall-ab': 'money', premium: 'money', vip: 'money', 'plus-radar': 'money', 'promo-codes': 'money', refunds: 'money', referrals: 'money', 'telegram-premium': 'money', 'openai-budget': 'money', analytics: 'money',
  content: 'content', lessons: 'content', phrases: 'content', translations: 'content', quizzes: 'content', cards: 'content', 'daily-phrases': 'content', 'community-packs': 'content', 'french-quizzes': 'content',
  community: 'community', arena: 'community', chat: 'community', clubs: 'community', league: 'community', 'help-board': 'community', 'ugc': 'community',
  diagnostics: 'diagnostics', 'app-health': 'diagnostics', 'audit-log': 'diagnostics', 'ops-log': 'diagnostics', archive: 'diagnostics', changelog: 'diagnostics', 'advanced-tools': 'diagnostics', system: 'diagnostics',
};
const routes = ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics'];

const operationKind = (row) => row.danger ? 'danger' : row.write ? 'write' : 'read';
const routeFor = (tab) => routeMap[tab] ?? 'diagnostics';
const permissionFor = (route, kind) => kind === 'read' ? `${route}.read` : `${route}.write`;
const functionRoute = new Map(links.filter((link) => link.function).map((link) => [link.function, routeFor(link.tab)]));

const buttonCoverage = buttons.map((button, index) => {
  const kind = operationKind(button);
  const route = routeFor(button.tab);
  const linked = links[index]?.function ? [links[index].function] : [];
  return {
    coverageId: `button-${index + 1}`,
    legacy: { tab: button.tab, line: button.line, id: button.id || null, text: button.text, onclick: button.onclick || null },
    target: { route, permission: permissionFor(route, kind), kind },
    linkedFunctions: Array.isArray(linked) ? linked : [],
    status: 'inventory',
    owner: null,
    notes: 'Перенести только через новый handler; прямой legacy write не копировать.',
  };
});

const functionCoverage = functions.map((fn, index) => ({
  coverageId: `function-${index + 1}`,
  legacy: { name: fn.name, line: fn.line, writes: Boolean(fn.writes), callable: Boolean(fn.callable) },
  target: { route: functionRoute.get(fn.name) ?? 'diagnostics', permission: permissionFor(functionRoute.get(fn.name) ?? 'diagnostics', fn.writes ? 'write' : 'read') },
  status: 'inventory',
  owner: null,
  notes: fn.writes ? 'Нужен server command, audit и rollback/confirm gate.' : 'Нужен read-model с loading/empty/error состояниями.',
}));

const board = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { buttons: buttons.length, functions: functions.length, links: links.length, legacyFile: 'admin/index.html' },
  routes,
  statusDefinitions: {
    inventory: 'Найдено в legacy, перенос ещё не начат',
    guarded: 'Новый UI есть, действие доступно только через server command',
    ported: 'Новый UI + handler + focused test + audit/permission проверены',
    fallback: 'Временно доступно через legacy deep-link, пока native перенос не завершён',
    blocked: 'Нельзя переносить до решения security/data contract',
  },
  buttonCoverage,
  functionCoverage,
  summary: {
    buttons: { total: buttonCoverage.length, inventory: buttonCoverage.length, ported: 0, fallback: 0, guarded: 0, blocked: 0 },
    functions: { total: functionCoverage.length, inventory: functionCoverage.length, ported: 0, fallback: 0, guarded: 0, blocked: 0 },
  },
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(board, null, 2) + '\n');
console.log(JSON.stringify({ output, buttons: buttons.length, functions: functions.length, routes }, null, 2));
