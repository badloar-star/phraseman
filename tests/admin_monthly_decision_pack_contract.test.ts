import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin monthly decision pack contract', () => {
  test('lives inside Analytics with one explicit ZIP action and honest preview states', () => {
    const core = read('admin/v2/scripts/admin-analytics-app.js');
    const page = read('admin/v2/scripts/pages/monthly-decision-pack.js');
    const index = read('admin/v2/index.html');
    expect(core).toContain('id="monthly-decision-pack-panel"');
    expect(core).toContain('id="monthly-decision-pack-download"');
    expect(core).toContain('Сформировать и скачать ZIP');
    expect(index).toContain('/v2/scripts/pages/monthly-decision-pack.js');
    expect(page).toContain('window.callAdminMonthlyDecisionPack');
    expect(page).toContain('preliminary');
    expect(page).toContain('truncated_not_decision_grade');
    expect(page).toContain("new Blob([bytes], { type: 'application/zip' })");
    expect(page).toContain('safeDecisionPackFilename');
    expect(page).not.toContain('getDocs(');
  });

  test('routes through the money.read protected callable', () => {
    const firebase = read('admin/v2/scripts/admin-analytics-firebase.js');
    const router = read('admin/v2/scripts/admin-analytics-app.js');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminMonthlyDecisionPack')");
    expect(router).toContain('callAdminMonthlyDecisionPack');
  });
});
