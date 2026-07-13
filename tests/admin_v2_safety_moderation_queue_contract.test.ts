import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

type SafetyModel = Record<string, unknown>;

function renderSafety(overrides: SafetyModel): string {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-safety-moderation-view.js')).href;
  const model = {
    state: 'ready',
    view: 'overview',
    workspace: { summary: { counts: {} }, sources: [] },
    items: [],
    nextCursor: '',
    filters: { status: '', reason: '', category: '', query: '', sort: 'date_desc' },
    selectedIds: [],
    sensitive: null,
    preview: null,
    approvalId: '',
    approvals: { state: 'ready', items: [], error: '' },
    history: { state: 'ready', items: [], error: '' },
    manualBanUid: '',
    manualBanContext: { source: 'manual', sourceTargetType: '', sourceTargetId: '' },
    ...overrides,
  };
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => {
    const html = m.renderSafetyModerationCenter(${JSON.stringify(model)}, {
      escapeHtml: (value) => String(value ?? ''),
      can: () => true,
    });
    process.stdout.write(html);
  })`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return run.stdout;
}

function buttonFor(html: string, attribute: string, value: string): string {
  const match = html.match(new RegExp(`<button[^>]*${attribute}="${value}"[^>]*>`));
  expect(match).not.toBeNull();
  return match![0];
}

describe('Admin v2 safety moderation approval and history queues', () => {
  test('connects protected list and bulk-resume callable wrappers', () => {
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    for (const callable of [
      'adminListSafetyModerationApprovals',
      'adminListSafetyModerationHistory',
      'adminResumeSafetyModerationBulk',
    ]) {
      expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);
    }
    expect(firebase).toContain('listSafetyModerationApprovals:');
    expect(firebase).toContain('listSafetyModerationHistory:');
    expect(firebase).toContain('resumeSafetyModerationBulk:');
  });

  test('loads overview approvals and history independently from the main workspace', () => {
    const state = read('admin/v2/scripts/admin-safety-moderation-state.js');
    const controller = read('admin/v2/scripts/admin-safety-moderation-controller.js');

    expect(state).toContain("approvals: { state: 'idle', items: [], error: '' }");
    expect(state).toContain("history: { state: 'idle', items: [], error: '' }");
    expect(controller).toContain('listSafetyModerationApprovals');
    expect(controller).toContain('listSafetyModerationHistory');
    expect(controller).toContain('Promise.allSettled');
    expect(controller).toContain("approvals: { state: 'error'");
    expect(controller).toContain("history: { state: 'error'");
  });

  test('renders a concrete protected approval row and prevents self-approval', () => {
    const html = renderSafety({
      approvals: {
        state: 'ready',
        error: '',
        items: [
          {
            approvalId: 'approval-self', action: 'user_ban', targetId: 'user-1',
            reason: 'Confirmed abuse', risk: 'Global block', fingerprint: 'fingerprint-self',
            requestedBy: 'admin-1', expiresAtMs: 2_000_000_000_000, canApprove: false,
          },
          {
            approvalId: 'approval-other', action: 'report_rename', targetId: 'report-2',
            reason: 'Identity repair', risk: 'Public identity change', fingerprint: 'fingerprint-other',
            requestedBy: 'admin-1', expiresAtMs: 2_000_000_000_000, canApprove: true,
          },
        ],
      },
    });

    expect(html).toContain('user_ban');
    expect(html).toContain('user-1');
    expect(html).toContain('Confirmed abuse');
    expect(html).toContain('Global block');
    expect(html).toContain('fingerprint-self');
    expect(html).toContain('admin-1');
    expect(html).toContain('data-label="Риск"');
    expect(html).toContain('class="table-scroll"');
    expect(html).not.toContain('<span class="badge warning">Global block</span>');
    expect(html).not.toContain('id="safety-approval-id"');
    expect(buttonFor(html, 'data-approval-id', 'approval-self')).toContain('disabled');
    expect(buttonFor(html, 'data-approval-id', 'approval-other')).not.toContain('disabled');
    expect(html).toContain('id="safety-approval-reason-approval-other"');
  });

  test('keeps approval and history failures local to their overview sections', () => {
    const html = renderSafety({
      approvals: { state: 'error', items: [], error: 'approval queue unavailable' },
      history: {
        state: 'ready', error: '', items: [{
          historyId: 'history-ok', action: 'report_set_status', targetId: 'report-1',
          actorUid: 'admin-2', createdAtMs: 1_900_000_000_000, reversible: true, canRestore: true,
        }],
      },
    });

    expect(html).toContain('data-safety-resource-error="approvals"');
    expect(html).toContain('approval queue unavailable');
    expect(html).toContain('history-ok');
    expect(html).not.toContain('data-safety-resource-error="history"');
  });

  test('keeps the last approval rows visible during a quiet refresh', () => {
    const html = renderSafety({
      approvals: {
        state: 'loading', error: '', items: [{
          approvalId: 'approval-cached', action: 'user_ban', targetId: 'user-cached',
          reason: 'Cached reason', risk: 'Cached risk', fingerprint: 'cached-fingerprint',
          requestedBy: 'admin-1', expiresAtMs: 2_000_000_000_000, canApprove: true,
        }],
      },
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('approval-cached');
    expect(buttonFor(html, 'data-approval-id', 'approval-cached')).not.toContain('disabled');
  });

  test('renders restore preparation and resumable bulk progress from history rows', () => {
    const html = renderSafety({
      history: {
        state: 'ready', error: '', items: [
          {
            historyId: 'history-restore', action: 'report_set_status', targetId: 'report-1',
            actorUid: 'admin-2', createdAtMs: 1_900_000_000_000, reversible: true, canRestore: true,
          },
          {
            historyId: 'history-bulk', action: 'report_archive_bulk', targetId: 'selection',
            actorUid: 'admin-2', createdAtMs: 1_900_000_000_000, reversible: false, canRestore: false,
            bulkManifestId: 'bulk-1', bulkStatus: 'running', processedCount: 200, targetCount: 205,
          },
        ],
      },
    });

    expect(buttonFor(html, 'data-operation-id', 'history-restore')).toContain('data-action="safety-preview-restore"');
    expect(html).toContain('id="safety-history-reason-history-restore"');
    expect(html).toContain('<progress');
    expect(html).toContain('value="200"');
    expect(html).toContain('max="205"');
    expect(html).toContain('200 / 205');
    expect(html).toContain('id="safety-bulk-resume-reason-bulk-1"');
    expect(html).toContain('data-label="Действия"');
    expect(buttonFor(html, 'data-manifest-id', 'bulk-1')).toContain('data-action="safety-resume-bulk"');
  });

  test('resumes an exact bulk manifest with audited idempotent control fields', () => {
    const controller = read('admin/v2/scripts/admin-safety-moderation-controller.js');
    expect(controller).toContain("action === 'safety-resume-bulk'");
    expect(controller).toContain('resumeSafetyModerationBulk({');
    expect(controller).toContain('manifestId');
    expect(controller).toContain("requestId: context.id('safety-bulk-resume')");
    expect(controller).toContain('idempotencyKey: operationKeys[key]');
    expect(controller).toContain('safety-bulk-resume-reason-');
  });

  test('shows validated Help Board handoff context on the manual ban preview', () => {
    const html = renderSafety({
      view: 'ban-list',
      manualBanUid: 'user-from-board',
      manualBanContext: { source: 'help_board', sourceTargetType: 'comment', sourceTargetId: 'comment-42' },
    });

    expect(html).toContain('Передано из Help Board.');
    expect(html).toContain('comment');
    expect(html).toContain('comment-42');
    expect(html).toContain('Контекст будет сохранён в preview, истории и аудите.');
    expect(html).toContain('value="user-from-board"');
  });
});
