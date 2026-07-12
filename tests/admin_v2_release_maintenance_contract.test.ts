import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 release and maintenance workflow', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');

  test('adds a native guarded workflow for update modal, force update and maintenance', () => {
    expect(core).toContain('function renderReleaseMaintenanceWorkflow');
    expect(core).toContain('data-action="preview-release-maintenance"');
    expect(core).toContain('manual_update_enabled');
    expect(core).toContain('force_update_enabled');
    expect(core).toContain('maintenance_banner');
    expect(core).toContain('maintenance_block');
    expect(core).toContain('force_update_enabled_rollout_pct');
    expect(core).toContain('release-maintenance-reason');
    expect(core).toContain('Предпросмотр релиза и обслуживания');
    expect(core).toContain('data-action="preview-release-maintenance-stop"');
    expect(core).toContain('function ensureReleaseMaintenancePreviewIsFresh');
    expect(core).toContain('function ensureRemoteConfigPreviewIsFresh');
    expect(core).toContain('data-action="preview-remote-config-restore"');
    expect(core).toContain('function buildRemoteConfigRestorePreview');
    expect(core).toContain('Stop condition:');
    expect(core).toContain('Manual modal:');
    expect(core).toContain('Force audience:');
    expect(core).toContain('Manual modal audience:');
    expect(core).toContain('Maintenance audience:');
    expect(core).toContain('Store destination:');
    expect(core).toContain('Укажите явную причину восстановления значений.');
    expect(core).toContain('const editorLocked = releasePreviewActive || restorePreviewActive');
    expect(core).toContain("const releaseFormLocked = state.remoteConfigPreview?.source === 'partial-restore-remote-config'");
    expect(core).toContain('Форма обновлений заблокирована');
    expect(core).toContain('releaseControlDisabled');
    expect(core).toContain('JSON-редактор заблокирован');
    expect(core).toContain("editorLocked ? ' disabled' : ''");
    expect(core).toContain('function remoteConfigPublishQuestion');
    expect(core).toContain('maintenance hard block может закрыть доступ к приложению');
    expect(core).toContain("state.remoteConfigPreview?.source === 'release-maintenance'");
    expect(core).toContain("source: 'generic-remote-config'");
    expect(core).toContain('includeRemoved: true');
    expect(core).not.toContain('⚠️');
    expect(core).not.toContain('>Откатить</button>');
  });

  test('uses the existing server-side remote config command instead of direct browser writes', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPublishRemoteConfig')");
    expect(core).toContain('buildReleaseMaintenancePreview');
    expect(core).toContain('state.remoteConfigPreview = buildReleaseMaintenancePreview()');
    expect(core).not.toContain('saveManualUpdateConfig(');
    expect(core).not.toContain('saveForceUpdateConfig(');
    expect(core).not.toContain('saveControlPanelMaintenance(');
  });

  test('keeps preview rendering source-aware so generic deletions stay visible', () => {
    expect(core).toContain("['release-maintenance', 'partial-restore-remote-config']");
    expect(core).toMatch(/hasPreviewBranch && shouldMergePreview \? \{ \.\.\.current, \.\.\.previewBranch \} : hasPreviewBranch \? previewBranch : current/);
    expect(core).toContain("source: 'partial-restore-remote-config'");
    expect(core).toMatch(/remoteConfigChanges\(nextConfig\);\s+if \(maintenanceBlock\)/);
    expect(core).toMatch(/remoteConfigChanges\(nextConfig, \{ includeRemoved: true \}\)/);
  });
});
