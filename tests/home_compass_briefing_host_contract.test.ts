import fs from 'node:fs';
import path from 'node:path';

const homeSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'),
  'utf8',
);

describe('Home Compass briefing host contract', () => {
  test('imports the mounted Compass host from the public Compass surface', () => {
    expect(homeSource).toContain("import { CompassBriefingHost } from '../compass';");
    expect(homeSource).toContain('<CompassBriefingHost onStartDay={openPersonalPlan} />');
  });
});
