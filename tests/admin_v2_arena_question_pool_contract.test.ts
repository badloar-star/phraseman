import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Admin v2 Arena exclusion', () => {
  const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
  const generator = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'pages', 'content-generator.js'), 'utf8');
  const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');
  const router = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-router.js'), 'utf8');

  test('removes every Arena entry point from the V2 shell while preserving the legacy implementation', () => {
    expect(core).not.toContain('arena-question-pool');
    expect(core).not.toContain('data-create-arena-batch');
    expect(core).not.toContain('enable-arena-shadow');
    expect(core).not.toContain('data-select-content-generator="arena"');
    expect(router).not.toContain("'arena-question-pool': 'arena-question-pool'");
  });

  test('does not connect V2 routing to protected Arena pool callables', () => {
    for (const callable of [
      'adminListArenaQuestionPool',
      'adminPublishArenaQuestionBatch',
      'adminRemoveArenaPoolQuestion',
      'adminRestoreArenaPoolQuestion',
    ]) expect(core).not.toContain(callable);
  });

  test('does not mount Arena or moderation-queue entry points in Content and Community', () => {
    expect(generator).not.toContain("id: 'arena'");
    expect(generator).not.toContain('data-create-arena-batch');
    expect(generator).not.toContain('arena-convergence-title');
    expect(generator).not.toContain('enable-arena-shadow');
    expect(core).not.toContain("'Контент на модерации'");
    expect(core).not.toContain("'Инциденты Арены'");
  });
});
