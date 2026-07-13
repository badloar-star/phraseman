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
});
