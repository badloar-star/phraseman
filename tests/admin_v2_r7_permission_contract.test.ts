import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');
const serverPermissions = fs.readFileSync(path.join(root, 'functions', 'src', 'admin', 'permissions.ts'), 'utf8');

describe('Admin v2 R7 permission contract', () => {
  it('keeps draft actions behind draft-write and publication actions behind publish', () => {
    expect(serverPermissions).toContain("content_editor: new Set(['content.read', 'content.draft.write'])");
    expect(serverPermissions).not.toContain("content_editor: new Set(['content.read', 'content.draft.write', 'content.publish'])");
    expect(admin).toContain("disabledWhenUnauthorized('content.draft.write')");
    expect(admin).toContain("can('content.publish')");
  });

  it('does not expose activation or rollback as draft-write actions', () => {
    expect(firebase).toContain('adminActivateCourseRelease');
    expect(firebase).toContain('adminRollbackCourseRelease');
    expect(admin).toContain("activeReleaseId !== releaseId && can('content.publish')");
    expect(admin).toContain("rollbackTargets.length && can('content.publish')");
  });
});
