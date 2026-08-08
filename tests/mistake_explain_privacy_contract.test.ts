import fs from 'node:fs';
import path from 'node:path';

describe('mistake explanation cache privacy boundary', () => {
  it('denies every direct client read and write while preserving admin reset', () => {
    const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
    const block = rules.match(/match \/mistake_explanations\/\{mistakeHash\} \{[\s\S]*?\n    \}/);

    expect(block).not.toBeNull();
    expect(block![0]).toContain('allow read: if false;');
    expect(block![0]).toContain('allow create, update: if false;');
    expect(block![0]).toContain('allow delete: if isAdmin();');

    const adminCatchAll = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/);
    expect(adminCatchAll).not.toBeNull();
    expect(adminCatchAll![0]).toContain("collection != 'mistake_explanations'");
    expect(adminCatchAll![0]).toContain("collection != 'mistake_explain_billing'");
  });
});
