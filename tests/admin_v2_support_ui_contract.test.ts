import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const serverPermissions = fs.readFileSync(path.resolve(__dirname, '..', 'functions', 'src', 'admin', 'permissions.ts'), 'utf8');
const supportStart = core.indexOf('function renderSupport()');
const supportEnd = core.indexOf('\nfunction renderDetailedAnalyticsWorkspace()', supportStart);
const support = core.slice(supportStart, supportEnd);
const supportPermissionStart = core.indexOf('const SUPPORT_ACTION_PERMISSIONS = Object.freeze({');
const supportPermissionEnd = core.indexOf('\nconst FACTORY_STEPS', supportPermissionStart);
const supportPermissions = core.slice(supportPermissionStart, supportPermissionEnd);
const authStart = core.indexOf('export function setAuthState(auth)');
const authEnd = core.indexOf('\nexport function renderRoute', authStart);
const auth = core.slice(authStart, authEnd);

describe('Admin v2 support inbox UI contract', () => {
  test('uses the approved inbox heading and exposes the active filter to assistive technology', () => {
    expect(support).toContain("title: 'Входящие / Поддержка'");
    expect(support).toContain('data-support-filter="new"');
    expect(support).toContain('data-support-filter="answered"');
    expect(support).toContain('data-support-filter="archived"');
    expect(support).toContain('data-support-filter="all"');
    expect(support).toContain("aria-pressed=\"${filter === 'new' ? 'true' : 'false'}\"");
    expect(support).toContain("aria-pressed=\"${filter === 'answered' ? 'true' : 'false'}\"");
    expect(support).toContain("aria-pressed=\"${filter === 'archived' ? 'true' : 'false'}\"");
    expect(support).toContain("aria-pressed=\"${filter === 'all' ? 'true' : 'false'}\"");
  });

  test('announces one loading-or-count status and uses empty copy for the selected folder', () => {
    expect((support.match(/role="status"/g) || [])).toHaveLength(1);
    expect(support).toContain('aria-live="polite"');
    expect(support).toContain('Загружаю входящие…');
    expect(support).toContain('Писем в списке: ${filtered.length}.');
    expect(support).toContain('Новых писем нет.');
    expect(support).toContain('Отвеченных писем нет.');
    expect(support).toContain('В архиве писем нет.');
    expect(support).toContain('Во входящих писем нет.');
  });

  test('keeps the selected message and edited reply in browser memory while switching rows', () => {
    expect(core).toContain('selectedMessageId:');
    expect(core).toContain('replyDrafts: {}');
    expect(support).toContain('data-support-message-id=');
    expect(support).toContain('aria-selected=');
    expect(core).toContain('data-support-draft-id=');
    expect(core).toContain('function handleSupportDraftInput(event)');
    expect(core).toContain("document.addEventListener('input', handleSupportDraftInput)");
  });

  test('clears private support mail, local drafts and sealed confirmation on sign-out', () => {
    expect(core).toContain('function defaultSupportState()');
    expect(core).toContain('support: defaultSupportState()');
    expect(auth).toContain('const previousRole = state.adminRole;');
    expect(auth).toContain('previousRole !== state.adminRole');
    expect(auth).toContain("!can('support.inbox.read')");
    expect(auth).toContain('state.support = defaultSupportState();');
  });

  test('fails closed in the browser before invoking protected support actions', () => {
    expect(core).toContain('const SUPPORT_ACTION_PERMISSIONS = Object.freeze({');
    expect(supportPermissions).toContain("'load-support': 'support.inbox.read'");
    expect(supportPermissions).toContain("'pull-support': 'support.inbox.pull'");
    expect(supportPermissions).toContain("'generate-support-reply': 'support.draft.write'");
    expect(supportPermissions).toContain("'prepare-support-reply': 'support.reply.send'");
    expect(supportPermissions).toContain("'dispatch-support-reply': 'support.reply.send'");
    expect(supportPermissions).toContain("'cancel-support-reply': 'support.reply.send'");
    expect(supportPermissions).toContain("'prepare-support-reply-batch': 'support.reply.send'");
    expect(supportPermissions).toContain("'dispatch-support-reply-batch': 'support.reply.send'");
    expect(supportPermissions).toContain("'cancel-support-reply-batch': 'support.reply.send'");
    expect(supportPermissions).toContain("'save-support-signature': 'support.settings.write'");
    expect(supportPermissions).toContain("'set-support-status': 'support.archive'");
    expect(supportPermissions).toContain("'resolve-support-reply': 'support.reply.resolve_ambiguous'");
    expect(supportPermissions).not.toContain("'reports.");
    expect(serverPermissions).toContain("support: new Set(['users.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS, ...REPORT_OPERATOR_PERMISSIONS])");
    expect(core).toContain("owner: new Set(['users.read', 'money.read', 'money.manual_access.write', 'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'campaigns.read', 'campaigns.write', 'briefing.read', 'briefing.generate', ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous'");
    expect(core).toContain("admin: new Set(['users.read', 'money.read', 'money.manual_access.write', 'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'campaigns.read', 'campaigns.write', 'briefing.read', 'briefing.generate', ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous'");
    expect(core).toContain("support: new Set(['users.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS");
    expect(core).toContain("analyst: new Set(['users.read', 'money.read', 'content.read', 'campaigns.read', 'briefing.read', 'reports.read', 'diagnostics.read'])");
    expect(core).toContain("moderator: new Set(['users.read', 'reports.read', 'reports.status.write', ...IDEA_OPERATOR_PERMISSIONS])");
    expect(core).toContain("const canResolve = state.authorized && can('support.reply.resolve_ambiguous') && !state.busy;");
    expect(support).toContain("disabledWhenUnauthorized('support.inbox.read')");
    expect(support).toContain("disabledWhenUnauthorized('support.inbox.pull')");
    expect(support).not.toContain("can('reports.reply");
    expect(support).not.toContain("disabledWhenUnauthorized('reports.read')");
    expect(core).toContain('const supportPermission = SUPPORT_ACTION_PERMISSIONS[action];');
    expect(core).toContain('if (supportPermission && !can(supportPermission))');
  });

  test('keeps ambiguous delivery recoverable without claiming that a non-prepared operation was cancelled', () => {
    expect(core).toContain('dismissedPendingKey:');
    expect(core).toContain('data-action="review-support-delivery"');
    expect(core).toContain('Перейти к проверке доставки');
    expect(core).toContain('Перейти к проверке писем');
    expect(core).toContain("if (action === 'review-support-delivery')");
    expect(core).toContain('serverPending.filter((candidate) => supportPendingKey(candidate) !== state.support.dismissedPendingKey)');
    expect(core).toContain("if (String(pendingReply.state || '') !== 'prepared')");
    expect(core).toContain("if (result?.state !== 'cancelled')");
    expect(core).toContain("Операция не отменена: сервер вернул состояние");
    expect(core).toContain("state.support.pendingReply = { ...pendingReply, ...result };");
    expect(core).toContain("pending.state !== 'prepared' ? ' disabled' : ''");
  });
});
