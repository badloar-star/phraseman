import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 DALL-E asset studio contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const index = read('functions/src/index.ts');
  const permissions = read('functions/src/admin/permissions.ts');

  test('adds Asset Studio as a native content section, not a loose legacy fallback', () => {
    expect(capabilities).toContain("id: 'asset-studio'");
    expect(capabilities).toMatch(/\{\s*id: 'asset-studio',[^}]*nativeRoute: 'asset-studio'/);
    expect(capabilities).not.toMatch(/\{\s*id: 'asset-studio',[^}]*legacy(?:Tab|Page)/);
    expect(core).toContain("'asset-studio': { title:");
    expect(core).toContain('renderAssetStudio');
    expect(core).toContain('data-action="create-asset-job"');
    expect(core).toContain('data-action="run-asset-job"');
    expect(router).toContain("'asset-studio'");
  });

  test('uses server callables and content permissions for DALL-E jobs', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListAssetJobs')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminCreateAssetJob')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminRunAssetJob')");
    expect(index).toContain("adminListAssetJobs, adminCreateAssetJob, adminRunAssetJob");
    expect(permissions).toContain("'content.draft.write'");
    expect(core).toContain("disabledWhenUnauthorized('content.draft.write')");
  });

  test('shows draft-review-publish safety language without an old-admin archive link', () => {
    expect(core).toContain('Создание → проверка → публикация');
    expect(core).toContain('Ключ генератора остаётся на сервере');
    expect(core).not.toMatch(/href=["'][^"']*admin\/index\.html#openai-budget/);
  });
});
