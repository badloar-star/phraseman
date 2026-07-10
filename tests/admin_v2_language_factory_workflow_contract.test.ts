import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 Language Factory workflow', () => {
  test('uses modular seven-section navigation and the complete guarded release workflow', () => {
    const html = read('admin/v2/index.html');
    const core = read('admin/v2/scripts/admin-core.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const router = read('admin/v2/scripts/admin-router.js');

    expect(html).toContain('admin/v2/styles/admin.css');
    expect(html).toContain('admin/v2/scripts/admin-router.js');
    for (const route of ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics']) {
      expect(router).toContain(`'${route}'`);
    }
    expect(core).toContain('english-core-32:v1');
    expect(core).toContain('arena_questions');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetContentFactoryJobDetail')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetContentFactoryUnitPreview')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminRunContentGenerationUnit')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminReviewCourseGeneration')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSealCourseRelease')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminActivateCourseRelease')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminRollbackCourseRelease')");
    expect(firebase).not.toContain("collection(db, 'content_factory_");
    expect(firebase).toContain('/__/firebase/init.json');
    expect(firebase).not.toContain('AIza');
    expect(core).toContain('const ADMIN_ROLE_PERMISSIONS');
    expect(core).toContain("disabledWhenUnauthorized('content.draft.write')");
    expect(core).toContain("can('content.publish')");
    const createAction = core.slice(core.indexOf("if (action === 'create-factory-job')"), core.indexOf("if (action === 'refresh-factory-detail')"));
    expect(createAction.indexOf('readCreateForm()')).toBeGreaterThanOrEqual(0);
    expect(createAction.indexOf('readCreateForm()')).toBeLessThan(createAction.indexOf('return runBusy'));
  });
});
