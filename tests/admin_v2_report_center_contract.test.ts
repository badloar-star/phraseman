import fs from 'fs';
import path from 'path';

describe('Admin V2 report-center delivery contract', () => {
  const root = path.resolve(__dirname, '..');
  const core = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-core.js'), 'utf8');
  const firebase = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-firebase.js'), 'utf8');
  const functionsIndex = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');

  test('wires complete unresolved export, archive and safe Office intake', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminExportUnresolvedReports')");
    expect(functionsIndex).toContain('adminExportUnresolvedReports');
    expect(core).toContain('data-action="copy-all-unresolved-reports"');
    expect(core).toContain('data-action="view-report-archive"');
    expect(core).toContain('data-report-office-source=');
    expect(core).toContain("sourceType: 'report'");
  });

  test('disables complete unresolved export unless diagnostics are readable', () => {
    const buttonStart = core.indexOf('<button class="button" data-action="copy-all-unresolved-reports"');
    const button = core.slice(buttonStart, core.indexOf('</button>', buttonStart));

    expect(buttonStart).toBeGreaterThan(-1);
    expect(button).toContain("disabledWhenUnauthorized('reports.read', 'diagnostics.read')");
    expect(button).toContain('Требуются права reports.read и diagnostics.read');
    expect(button).toContain('полный экспорт включает ошибки приложения');
  });

  test('uses resolution plus the exact one-coin UI contract', () => {
    expect(core).toContain('value="confirmed_fixed"');
    expect(core).toContain('id="${replyId}-coins"');
    expect(core).toContain('resolution, coins');
    expect(core).not.toContain('id="${replyId}-shards"');
  });

  test('wires the stable-uid personal message composer through its dedicated callable', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSendPersonalAppMessage')");
    expect(core).toContain('data-action="send-personal-app-message"');
    expect(core).toContain("uid = String(state.users.profile?.canonicalUid");
    expect(core).toContain("deliveryMode");
  });
});
