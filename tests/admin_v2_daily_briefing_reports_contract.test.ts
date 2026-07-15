import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('admin v2 daily briefing and report center', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const reportsServer = read('functions/src/admin_reports_center.ts');

  it('keeps seven top-level sections and adds both workflows as subroutes', () => {
    expect(core.match(/\{ route: '(overview|application|users|money|content|community|diagnostics)'/g)).toHaveLength(7);
    expect(router).toContain("'daily-briefing'");
    expect(router).toContain("'report-center'");
    expect(core).toContain("'daily-briefing':");
    expect(core).toContain("'report-center':");
  });

  it('uses callable-only briefing controls and renders source health explicitly', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetDailyBriefing')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGenerateDailyDigest')");
    expect(core).toContain("data-action=\"load-daily-briefing\"");
    expect(core).toContain("data-action=\"generate-daily-briefing\"");
    expect(core).toContain('Утренний отчёт руководителя');
    expect(core).toContain('Сформировать отчёт');
    expect(core).toContain('Сделать сегодня');
    expect(core).toContain('Рост и деньги');
    expect(core).toContain('Риски продукта');
    expect(core).toContain('Очереди');
    expect(core).toContain('Идеи пользователей');
    expect(core).toContain('Показать server facts JSON');
    expect(core).toContain('sourceHealth');
    expect(core).toContain('Неполная сводка');
  });

  it('uses bounded server report queue, preserves raw source/status and requires a reason for changes', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListReportQueue')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminUpdateReportStatus')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminDraftReportReply')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminReplyToReport')");
    expect(core).toContain('report-source-filter');
    expect(core).toContain('report-lane-filter');
    expect(core).toContain('report-raw-status-filter');
    expect(core).toContain('report-category-filter');
    expect(core).toContain('rawStatus');
    expect(core).toContain('data-report-next-status');
    expect(core).toContain('Укажите причину изменения статуса');
    expect(core).toContain('data-report-user-uid');
    expect(core).toContain('data-action="draft-report-reply"');
    expect(core).toContain('data-action="send-report-reply"');
    expect(core).toContain('data-action="load-report-next"');
    expect(core).toContain('sendReportReply({ reportCollection: source, reportId, title, body, shards })');
    expect(core).not.toContain('sendReportReply({ uid:');
    expect(reportsServer).toContain("where('createdAtMs', '>=', sinceMs).orderBy('createdAtMs', 'desc').limit(scanLimit)");
    expect(reportsServer.indexOf("orderBy('createdAtMs', 'desc').limit(scanLimit)")).toBeLessThan(reportsServer.indexOf('.filter((doc) => matchesReportFilters'));
    expect(reportsServer).toContain('hasFilters && docs.length >= scanLimit');
  });

  it('guards asynchronous results against auth changes and clears sensitive state on sign-out', () => {
    expect(core).toContain('loadDailyBriefing');
    expect(core).toContain('loadReportQueue');
    expect(core).toContain('authGeneration !== state.authGeneration');
    expect(core).toContain("const STALE_AUTH_RESULT = Symbol('stale-auth-result')");
    expect(core).toContain('busyAuthGeneration === state.authGeneration');
    expect(core).toContain("authStillValid(authGeneration, 'reports.reply.draft')");
    expect(core).toContain("authStillValid(authGeneration, 'reports.reply.send')");
    expect(core).toContain('generationResult?.preservedExisting');
    expect(core).toContain('не означает, что репортов нет вообще');
    expect(core).toContain("state.briefing = { state: 'idle'");
    expect(core).toContain('defaultReportState(state.adminSettings)');
    expect(core).toContain("items: []");
    expect(core).toContain("replyDrafts: {}");

    const statusBlock = core.slice(core.indexOf('async function updateReportStatus'), core.indexOf('async function handleAction'));
    expect(statusBlock.indexOf('await actions.updateReportStatus')).toBeLessThan(statusBlock.indexOf('authStillValid(authGeneration, requiredPermission)'));
    expect(statusBlock.indexOf('authStillValid(authGeneration, requiredPermission)')).toBeLessThan(statusBlock.indexOf('await loadReportQueue()'));

    const draftBlock = core.slice(core.indexOf("if (action === 'draft-report-reply')"), core.indexOf("if (action === 'send-report-reply')"));
    expect(draftBlock.indexOf('await actions.draftReportReply')).toBeLessThan(draftBlock.indexOf("authStillValid(authGeneration, 'reports.reply.draft')"));
    expect(draftBlock.indexOf("authStillValid(authGeneration, 'reports.reply.draft')")).toBeLessThan(draftBlock.indexOf('state.reports.replyDrafts ='));

    const sendBlock = core.slice(core.indexOf("if (action === 'send-report-reply')"), core.indexOf("if (action === 'search-admin-users')"));
    expect(sendBlock.indexOf('await actions.sendReportReply')).toBeLessThan(sendBlock.indexOf("authStillValid(authGeneration, 'reports.reply.send')"));
    expect(sendBlock.indexOf("authStillValid(authGeneration, 'reports.reply.send')")).toBeLessThan(sendBlock.indexOf('delete nextDrafts'));
  });

  it('rerenders the report center after accepting a successful background response', () => {
    const loadBlock = core.slice(core.indexOf('async function loadReportQueue'), core.indexOf('function scheduleAdminAutoRefresh'));
    const acceptedResult = loadBlock.indexOf('state.reports = {', loadBlock.indexOf('const result = await actions.listReportQueue'));

    expect(acceptedResult).toBeGreaterThan(-1);
    expect(loadBlock.indexOf('renderCurrentPage();', acceptedResult)).toBeGreaterThan(acceptedResult);
  });

  it('does not schedule a second report refresh while one is loading', () => {
    const scheduleBlock = core.slice(core.indexOf('function scheduleAdminAutoRefresh'), core.indexOf('function assertFactoryWorkspaceCoverage'));

    expect(scheduleBlock).toContain("state.reports.state === 'loading'");
  });
});
