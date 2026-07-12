import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

const SERVER_OWNED_PM_COLLECTIONS = [
  'admin_pm_state',
  'admin_pm_runs',
  'admin_pm_briefs',
  'admin_pm_evidence_manifests',
  'admin_pm_recommendation_bundles',
  'admin_pm_idea_bundles',
  'admin_pm_experiment_bundles',
  'admin_pm_decisions',
];

describe('admin Product Manager Firestore rule contract', () => {
  test('all server-owned PM collections have explicit admin read and denied client writes', () => {
    for (const collection of SERVER_OWNED_PM_COLLECTIONS) {
      const block = rules.match(new RegExp(`match /${collection}/\\{docId\\} \\{[\\s\\S]*?\\n    \\}`));
      expect(block).not.toBeNull();
      expect(block![0]).toContain('allow read: if isAdmin();');
      expect(block![0]).toContain('allow create, update, delete: if false;');
    }
  });

  test('broad admin catch-all explicitly excludes server-owned PM writes', () => {
    expect(rules).toContain('function isServerOwnedAdminPmPath(document)');
    const catchAll = rules.match(/match \/\{document=\*\*\} \{[\s\S]*?\n    \}/);
    expect(catchAll).not.toBeNull();
    expect(catchAll![0]).toContain('allow write: if isAdmin() && !isServerOwnedAdminPmPath(document);');
    for (const collection of SERVER_OWNED_PM_COLLECTIONS) {
      expect(rules).toContain(`string(document).matches('${collection}/[^/]+')`);
    }
  });
});
