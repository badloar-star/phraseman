import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HOME_SOURCE = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('home XP progress presentation', () => {
  it('keeps the progress bar without rendering the numeric XP quantity', () => {
    expect(HOME_SOURCE).toContain('width: `${xpPct}%`');
    expect(HOME_SOURCE).not.toContain('formatHomeXpProgressLabel');
    expect(HOME_SOURCE).not.toContain('{homeXpProgressLabel}');
  });
});
