import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

describe('admin review prompt previews', () => {
  it('offers all three local-only review prompt previews in the dev menu', () => {
    const section = readFileSync(join(root, 'components', 'admin_panel', 'sections', 'ReviewPromptPreviewSection.tsx'), 'utf8');
    expect(section).toContain('ReviewPromptModal');
    expect(section).toContain('perfect_lesson');
    expect(section).toContain('level_exam_pass');
    expect(section).toContain('streak_milestone');
    expect(section).toContain('preview-only');
  });
});
