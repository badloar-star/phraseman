import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('Home return stability', () => {
  it('does not run the full Home refresh again merely because the user returned to the tab', () => {
    expect(source).toContain('const homeRefreshKey = `${studyTarget}:${lang}`;');
    expect(source).toContain('if (homeRefreshKeyRef.current === homeRefreshKey) return;');
    expect(source).toContain('homeRefreshKeyRef.current = homeRefreshKey;');
    expect(source).not.toContain('}, [focusTick, isHomeOwner, studyTarget, lang, refreshDailyTaskSummary]);');
  });
});
