import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
const statusStart = source.indexOf('const renderExperimentalHomeStatus');
const statusEnd = source.indexOf('const renderClassicHomeStatus', statusStart);
const statusSurface = source.slice(statusStart, statusEnd > statusStart ? statusEnd : statusStart + 14000);

describe('Home contextual streak freeze', () => {
  it('puts the freeze shield inside the main streak status only when at risk', () => {
    expect(statusSurface).toContain('testID="home-streak-freeze-shield"');
    expect(statusSurface).toContain('streakAtRisk && !freezeActive');
    expect(statusSurface).toContain('event.stopPropagation?.()');
    expect(statusSurface).toContain('void handleFreezeStreak()');
  });

  it('does not render the former standalone freeze card', () => {
    expect(source).toContain('{false && streakAtRisk && !freezeActive && (');
  });
});
