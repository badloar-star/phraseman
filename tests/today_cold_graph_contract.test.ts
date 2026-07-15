import fs from 'node:fs';
import path from 'node:path';

describe('Today cold module graph', () => {
  test('loads Compass builders and recommendation engine only after Today owns runtime', () => {
    const screen = fs.readFileSync(path.join(process.cwd(), 'components/today/TodayScreen.tsx'), 'utf8');
    expect(screen).toContain("if (!active) return");
    expect(screen).toContain("import('../../app/compass/signal_bus')");
    expect(screen).toContain("import('../../app/compass/compass_brain')");
    expect(screen).toContain("import('../../lib/today/recommendation_selector')");
    expect(screen).not.toMatch(/from ['"]\.\.\/\.\.\/app\/compass\//);
    expect(screen).not.toMatch(/from ['"]\.\.\/\.\.\/lib\/today\/recommendation_catalog/);
  });
});
