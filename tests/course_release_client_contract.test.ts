import fs from 'node:fs';
import path from 'node:path';

describe('course release runtime seam', () => {
  it('uses the canonical release callable and exact identity checks', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/language_runtime/course_release_client.ts'), 'utf8');
    expect(source).toContain("'getPublishedCourseRelease'");
    expect(source).toContain('course_release_identity_mismatch');
    expect(source).toContain('parseCourseRelease');
  });
});
