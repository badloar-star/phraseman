import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 Safety & Moderation Center', () => {
  test('uses one native state/view/controller workspace for all seven views', () => {
    const state = read('admin/v2/scripts/admin-safety-moderation-state.js');
    const view = read('admin/v2/scripts/admin-safety-moderation-view.js');
    const controller = read('admin/v2/scripts/admin-safety-moderation-controller.js');
    const core = read('admin/v2/scripts/admin-core.js');

    for (const id of ['overview', 'user-reports', 'safety-flags', 'age-consent', 'policy-evidence', 'ban-list', 'other-reports']) {
      expect(state).toContain(`'${id}'`);
    }
    expect(state).toContain('createSafetyModerationState');
    expect(state).toContain('safetyModerationViewFromCapability');
    expect(view).toContain('safety-moderation-tabs');
    expect(view).toContain('safety-moderation-mobile-view');
    expect(controller).toContain('createSafetyModerationController');
    expect(core).toContain("from './admin-safety-moderation-controller.js'");
    expect(core).toContain('renderSafetyModerationCenter');
  });

  test('maps the five migrated capabilities to their exact internal views', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    const state = read('admin/v2/scripts/admin-safety-moderation-state.js');
    for (const id of ['user-reports', 'safety-flags', 'age-consent', 'compliance-radar', 'ban-list']) {
      expect(capabilities).toContain(`'${id}': 'safety-moderation'`);
    }
    expect(state).toContain("'compliance-radar': 'policy-evidence'");
    expect(capabilities).toContain("label: 'Политика и доказательства'");
    expect(capabilities).not.toContain("label: 'Правовые риски'");
  });

  test('loads server snapshots and keeps sensitive details behind audited intent', () => {
    const source = ['admin-safety-moderation-state.js', 'admin-safety-moderation-view.js', 'admin-safety-moderation-controller.js']
      .map((file) => read(`admin/v2/scripts/${file}`)).join('\n');
    const controller = read('admin/v2/scripts/admin-safety-moderation-controller.js');
    const view = read('admin/v2/scripts/admin-safety-moderation-view.js');

    expect(source).not.toMatch(/collection\(|getDocs\(|setDoc\(|updateDoc\(|deleteDoc\(/);
    for (const stateName of ['loading', 'empty', 'ready', 'partial', 'error']) expect(source).toContain(stateName);
    expect(controller).toContain('getSafetyModerationWorkspace');
    expect(controller).toContain('snapshotCursor');
    expect(controller).toContain('nextCursor');
    expect(controller).toContain('exportCsv');
    expect(controller).toContain('getSafetyModerationSensitiveDetail');
    expect(controller).toContain("requestId: context.id('safety-sensitive')");
    expect(controller).toContain('safety-sensitive-reason');
    expect(view).toContain('textPreview');
    expect(view).not.toContain('historyContext');
    expect(view).toContain('data-user-profile-uid');
  });

  test('routes every mutation through preview, approval when required, and apply', () => {
    const controller = read('admin/v2/scripts/admin-safety-moderation-controller.js');
    const view = read('admin/v2/scripts/admin-safety-moderation-view.js');

    expect(controller).toContain('previewSafetyModerationMutation');
    expect(controller).toContain('requestSafetyModerationApproval');
    expect(controller).toContain('approveSafetyModerationMutation');
    expect(controller).toContain('applySafetyModerationMutation');
    for (const action of ['report_set_status', 'report_archive_bulk', 'report_warn', 'report_rename', 'safety_set_disposition', 'safety_handle_bulk', 'user_ban', 'user_unban', 'restore_operation']) {
      expect(controller).toContain(`'${action}'`);
    }
    expect(view).toContain('safety-confirmation');
    expect(view).toContain('requiresApproval');
    expect(view).toContain('rollbackPath');
    expect(view).toContain('irreversible');
    expect(view).toContain('safety-manual-ban-uid');
    expect(controller).toContain('safety-preview-manual-ban');
    expect(controller).toContain("new URLSearchParams(globalThis.location.search).get('moderateUser')");
  });

  test('exposes all protected callable wrappers and no direct browser data SDK', () => {
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    for (const callable of [
      'adminGetSafetyModerationWorkspace',
      'adminGetSafetyModerationSensitiveDetail',
      'adminPreviewSafetyModerationMutation',
      'adminRequestSafetyModerationApproval',
      'adminApproveSafetyModerationMutation',
      'adminApplySafetyModerationMutation',
    ]) expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);
  });

  test('keeps the workspace accessible, compact, and evidence-based', () => {
    const view = read('admin/v2/scripts/admin-safety-moderation-view.js');
    const css = read('admin/v2/styles/admin.css');

    expect(view).toContain('aria-label="Раздел центра безопасности"');
    expect(view).toContain('data-tooltip=');
    expect(view).toContain('<svg');
    expect(view).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(view).toContain('Клиентская телеметрия, не юридический реестр');
    expect(view).toContain('Не является юридическим заключением');
    expect(view).toContain('missingEvidence');
    expect(view).toContain('delegatedRoute');
    expect(css).toContain('.safety-moderation-mobile-view');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('.safety-responsive-table td::before');
    expect(read('admin/v2/scripts/admin-core.js')).toContain("cell.setAttribute('data-label'");
    expect(view).toContain('export function ensureButtonTooltips');
    expect(view).toContain("data-tooltip=\"${label}\"");
  });
});
