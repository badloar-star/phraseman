import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('admin explanation cache access contract', () => {
  it('keeps mistake explanations private and routes the admin list through an authorized callable', () => {
    const rules = read('firestore.rules');
    const backend = read('functions/src/admin_explain_cache.ts');
    const exports = read('functions/src/index.ts');
    const admin = read('admin/v2/legacy.html');

    const rulesBlock = rules.match(/match \/mistake_explanations\/\{mistakeHash\} \{[\s\S]*?\n    \}/);
    expect(rulesBlock).not.toBeNull();
    expect(rulesBlock![0]).toContain('allow read: if false;');
    expect(rulesBlock![0]).toContain('allow delete: if isAdmin();');

    expect(backend).toContain("hasVerifiedCallablePermission(auth, 'reports.read')");
    expect(backend).toContain('export const adminListMistakeExplanationCache = onCall(');
    expect(exports).toContain('export { adminListMistakeExplanationCache } from "./admin_explain_cache";');

    expect(admin).toContain("if (coll === 'mistake_explanations')");
    expect(admin).toContain("httpsCallable(functionsUs, 'adminListMistakeExplanationCache')");
  });
});
