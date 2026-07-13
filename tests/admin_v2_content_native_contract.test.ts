import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string): string => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';

describe('Admin v2 native Content Operations', () => {
  test('ships isolated state, controller, view and six guarded callables', () => {
    const state = read('admin/v2/scripts/admin-content-operations-state.js');
    const controller = read('admin/v2/scripts/admin-content-operations-controller.js');
    const view = read('admin/v2/scripts/admin-content-operations-view.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    expect(state).toContain('createContentOperationsState');
    expect(controller).toContain('createContentOperationsController');
    expect(view).toContain('renderContentOperationsWorkspace');
    for (const callable of [
      'adminGetContentOperationsWorkspace', 'adminGetContentOperationDetail', 'adminPreviewContentMutation',
      'adminRequestContentApproval', 'adminApproveContentMutation', 'adminApplyContentMutation',
    ]) expect(firebase).toContain(callable);
  });

  test('covers all six content capabilities without changing Language Factory generation', () => {
    const state = read('admin/v2/scripts/admin-content-operations-state.js');
    const view = read('admin/v2/scripts/admin-content-operations-view.js');
    const core = read('admin/v2/scripts/admin-core.js');
    for (const id of ['community-packs', 'card-packs', 'daily-phrases', 'french-quizzes', 'explain-reports', 'full-content-control']) {
      expect(`${state}\n${view}`).toContain(id);
    }
    expect(core).toContain('renderFactoryCreate');
    expect(view).toContain('data-content-mobile-view');
    expect(view).toContain('sourceHealth');
  });

  test('keeps French workflow fail-closed and non-activating', () => {
    const controller = read('admin/v2/scripts/admin-content-operations-controller.js');
    const view = read('admin/v2/scripts/admin-content-operations-view.js');
    expect(`${controller}\n${view}`).toContain('activationApproved');
    expect(`${controller}\n${view}`).toContain('productionReady');
    expect(`${controller}\n${view}`).toContain('false');
    expect(`${controller}\n${view}`).not.toContain('activateFrench');
  });

  test('uses capability-specific forms for the complete content workflow', () => {
    const controller = read('admin/v2/scripts/admin-content-operations-controller.js');
    const view = read('admin/v2/scripts/admin-content-operations-view.js');
    const backend = read('functions/src/admin_content_operations.ts');
    expect(view).not.toContain('content-payload');
    for (const marker of ['content-decision', 'content-price', 'content-category', 'content-card-status', 'content-import-lines', 'content-reorder-lines', 'content-report-lines', 'content-from-date', 'content-to-date']) expect(view).toContain(marker);
    for (const action of ['community-submission-decision', 'community-pack-status', 'card-pack-update', 'daily-phrase-upsert', 'daily-phrase-import', 'daily-phrase-reorder', 'daily-phrase-rollback', 'explain-report-status', 'explain-reports-bulk']) expect(`${controller}\n${view}\n${backend}`).toContain(action);
    expect(backend).toContain("collection('plan_content_telemetry_events').doc(key).collection('events')");
    expect(backend).toContain('applyCommunitySubmissionModerationInTransaction');
    expect(backend).toContain('applyCommunityPackModerationInTransaction');
    expect(backend).toContain('daily_phrase_expected_version_required');
    expect(backend).not.toContain('row.expectedVersion || documentVersion');
  });
});
