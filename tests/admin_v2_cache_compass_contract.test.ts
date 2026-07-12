import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 protected cache and Compass workspaces', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const router = read('admin/v2/scripts/admin-router.js');

  test('promotes both legacy capabilities to native guarded routes', () => {
    expect(capabilities).toContain("'explain-cache': 'explain-cache'");
    expect(capabilities).toContain("compass: 'compass'");
    expect(router).toContain("'explain-cache': 'explain-cache'");
    expect(router).toContain("compass: 'compass'");
    expect(core).toContain("'explain-cache': renderExplainCache");
    expect(core).toContain('compass: renderCompass');
  });

  test('uses protected callables for every cache read, export and exact reset', () => {
    for (const callable of ['adminListCacheEntries', 'adminExportCacheEntries', 'adminPreviewCacheReset', 'adminResetCacheEntry']) {
      expect(firebase).toContain(callable);
    }
    expect(core).toContain("action === 'confirm-cache-reset'");
    expect(core).toContain('confirmation !== preview.confirmation');
    expect(core).toContain('Удалена ровно одна запись кэша; генерация не запускалась.');
    expect(core).toContain('выборка обрезана после проверки');
    expect(core).not.toContain('deleteDoc(');
  });

  test('protects Compass changes with revision preview, emergency-off and second-admin flows', () => {
    for (const callable of ['adminGetCompassWorkspace', 'adminPreviewCompassChange', 'adminRequestCompassApproval', 'adminApproveCompassChange', 'adminApplyCompassChange']) {
      expect(firebase).toContain(callable);
    }
    expect(core).toContain('expectedRevision: Number(config.revision || 0)');
    expect(core).toContain("action === 'request-compass-approval'");
    expect(core).toContain("action === 'approve-compass-change'");
    expect(core).toContain("action === 'apply-approved-compass-change'");
    expect(core).toContain('Точное подтверждение не совпадает.');
    expect(core).toContain('function compassReviewPacket');
    expect(core).toContain('Неизменяемый пакет решения');
    expect(core).toContain('rollbackPath: item.rollbackPath');
  });

  test('does not expose a content-generation action on either workspace', () => {
    const cacheWorkspace = core.slice(core.indexOf('function renderExplainCache'), core.indexOf('function compassDraftFromDom'));
    const compassWorkspace = core.slice(core.indexOf('function renderCompass()'), core.indexOf('function renderCurrentPage'));
    expect(cacheWorkspace).not.toMatch(/data-action=["'`][^"'`]*(generate|генерир)/i);
    expect(compassWorkspace).not.toMatch(/data-action=["'`][^"'`]*(generate|генерир)/i);
  });
});
