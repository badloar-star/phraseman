import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const adminIndexPath = path.join(ROOT, 'admin', 'legacy.html');
const adminSurfacePath = path.join(ROOT, 'admin', 'french-daily-phrases-admin.js');
const workflowPath = path.join(ROOT, 'admin', 'french-daily-phrases-workflow.js');

describe('Gustav French Daily Phrases admin surface wiring', () => {
  const html = fs.readFileSync(adminIndexPath, 'utf8');
  const surfaceSource = fs.readFileSync(adminSurfacePath, 'utf8');
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');

  it('wires French Daily Phrases inside the Daily Phrases content tab', () => {
    expect(html).toContain('id="tab-daily-phrases"');
    expect(html).toContain('data-gustav-admin-surface="french-daily-phrases"');
    expect(html).toContain('french-daily-phrases-workflow.js');
    expect(html).toContain('french-daily-phrases-admin.js');
    expect(html).toContain('renderFrenchDailyPhrasesAdmin()');
    expect(html).toContain('frenchDailyPhraseAdminCreateDraft()');
    expect(html).toContain('frenchDailyPhraseAdminRequestApproval()');
    expect(html).toContain('frenchDailyPhraseAdminCreateRollback()');
  });

  it('keeps the surface preview/draft/approval/rollback guarded and activation closed', () => {
    expect(surfaceSource).toContain('root.renderFrenchDailyPhrasesAdmin');
    expect(surfaceSource).toContain('root.frenchDailyPhraseAdminCreateDraft');
    expect(surfaceSource).toContain('root.frenchDailyPhraseAdminRequestApproval');
    expect(surfaceSource).toContain('root.frenchDailyPhraseAdminCreateRollback');
    expect(surfaceSource).toContain('activationApproved: false');
    expect(surfaceSource).not.toContain('activationApproved: true');
    expect(workflowSource).toContain('adminContentDrafts/fr/daily-phrases/');
    expect(workflowSource).toContain('adminContentRollbacks/fr/daily-phrases/');
    expect(workflowSource).toContain('REQUEST FRENCH DAILY PHRASES ACTIVATION');
  });
});
