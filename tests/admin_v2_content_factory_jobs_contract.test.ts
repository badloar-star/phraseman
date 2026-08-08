import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Language Factory job visibility', () => {
  test('v2 exposes a bounded server-side job read behind the content workflow', () => {
    const source = fs.readFileSync(path.join(root, 'functions', 'src', 'admin_content_factory.ts'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');
    expect(source).toContain('export const adminListContentFactoryJobs = onCall(');
    expect(source).toContain("hasPermission(role, 'content.read')");
    expect(source).toContain('.limit(100)');
    expect(index).toContain('adminListContentFactoryJobs');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListContentFactoryJobs')");
  });

  test('retains actionable unit errors instead of swallowing worker failures', () => {
    const worker = fs.readFileSync(path.join(root, 'functions', 'src', 'content_factory_worker.ts'), 'utf8');
    const read = fs.readFileSync(path.join(root, 'functions', 'src', 'admin_content_factory_read.ts'), 'utf8');
    const admin = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');

    expect(worker).toContain('errorCode');
    expect(worker).toContain('errorMessage');
    expect(worker).toContain('retryable');
    expect(read).toContain('attemptHistory');
    expect(admin).toContain('unit.errorCode');
    expect(admin).toContain('unit.retryable');
    expect(admin).not.toMatch(/catch\s*\{\s*state\.generation\.failed\s*\+=\s*1;\s*\}/);
  });

  test('keeps successful partial drafts out of publication review', () => {
    const admin = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
    expect(admin).toContain('job?.releaseCandidate === true');
    expect(admin).toContain('Черновик готов; для публикационной проверки нужны урок, квиз, карточки и Арена.');
    expect(admin).toContain('allReady && releaseCandidate');
  });

  test('exposes callable-only independent stage operations', () => {
    const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');
    for (const callable of ['adminCreateContentStage', 'adminControlContentStage', 'adminListContentStages', 'adminListContentStageDependencies', 'adminGetContentStageCapabilities', 'adminCreateContentStageBulkPlan', 'adminEditContentStageArtifact', 'adminRunContentStage', 'adminPreviewContentStage', 'adminReviewContentStage']) {
      expect(index).toContain(callable);
      expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);
    }
    expect(firebase).not.toContain("collection(db, 'content_factory_stages')");
    expect(fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8')).toContain('expectedReviewFingerprint');
  });
});
