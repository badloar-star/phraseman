import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');

describe('lessons tab entry and back navigation', () => {
  it('opens the Classic list on entry without restoring a page preference', () => {
    expect(src).toContain('useState<"lessons" | "dialogs">("lessons")');
    expect(src).toContain('testID="legacy-lessons-catalog"');
    expect(src).not.toContain('lessons_tab_page_v1');
  });

  it('returns from Dialogues to the list and uses the correct back path for each presentation', () => {
    expect(src).toMatch(/if \(page === "dialogs"\) \{[^}]*setPage\("lessons"\)/);
    expect(src).toContain('noteBackDecision("tab_legacy_list → goHome")');
    expect(src).toContain('noteBackDecision("push_legacy_list → safeRouterBack")');
  });
});
