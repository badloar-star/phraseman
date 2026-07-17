import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Admin v2 Arena question pool', () => {
  const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
  const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');

  test('is a Content → Arena → Pool workspace rather than a root navigation item', () => {
    expect(core).toContain("'arena-question-pool':");
    expect(core).toContain('Content → Arena → Pool');
    expect(core).toContain('open-arena-question-pool');
    expect(core).not.toMatch(/ADMIN_SECTIONS[\s\S]*route:\s*'arena-question-pool'/);
  });

  test('uses only the protected Arena pool callables', () => {
    for (const callable of [
      'adminListArenaQuestionPool',
      'adminPublishArenaQuestionBatch',
      'adminRemoveArenaPoolQuestion',
      'adminRestoreArenaPoolQuestion',
    ]) expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);
    expect(firebase).not.toContain("collection(db, 'arena_questions')");
  });

  test('renders safe filters, question provenance, and all operational states', () => {
    const page = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'pages', 'arena-question-pool.js'), 'utf8');
    expect(page).toContain('Пул вопросов Арены');
    expect(page).toContain('level');
    expect(page).toContain('availability');
    expect(page).toContain('topicArtifactId');
    expect(page).toContain('publishedAtMs');
    expect(page).not.toContain('dateFrom');
    expect(page).toContain('correctIndex');
    expect(page).toContain('sourceStageId');
    expect(page).toContain('contentHash');
    expect(page).toContain('escapeHtml');
    expect(page).not.toContain('objectPath');
    expect(page).toContain("model.state === 'loading'");
    expect(page).toContain("model.state === 'error'");
    expect(page).toContain("model.state === 'empty'");
  });

  test('requires explicit confirmation, a sealed approved fingerprint, and a removal reason', () => {
    const controller = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'arena-question-pool-controller.js'), 'utf8');
    expect(controller).toContain('expectedReviewFingerprint');
    expect(controller).toContain('arenaDraftSealed');
    expect(controller).toContain('globalThis.confirm');
    expect(controller).toContain('expectedRevision');
    expect(controller).toContain('reason');
    expect(controller).toContain('adminPublishArenaQuestionBatch');
    expect(controller).toContain('adminRemoveArenaPoolQuestion');
    expect(controller).toContain('adminRestoreArenaPoolQuestion');
  });
});
