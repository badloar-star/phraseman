import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('support inbox server-read boundary', () => {
  test('admin inbox uses the protected callable instead of a direct client collection read', () => {
    const adminHtml = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
    expect(adminHtml).toContain("supportCallable('adminSupportList')({ limit: 500 })");
    expect(adminHtml).not.toContain("collection(db, 'support_inbox')");
  });

  test('the callable is exported and requires the existing admin guard', () => {
    const source = fs.readFileSync(path.join(root, 'functions', 'src', 'support_inbox.ts'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    expect(source).toContain('export const adminSupportList = onCall(');
    expect(source).toContain('requireAdmin(request);');
    expect(index).toContain('  adminSupportList,');
  });
});
