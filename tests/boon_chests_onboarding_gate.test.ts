// Retired Weekly Boon hosts must not remain bundled or mounted.
import fs from 'fs';
import path from 'path';

describe('retired weekly boon hosts', () => {
  it.each(['BoonActivatedHost', 'MysteryMondayHost', 'PerfectWeekHost'])('%s is absent', (name) => {
    expect(fs.existsSync(path.join(__dirname, '..', 'components', `${name}.tsx`))).toBe(false);
  });
});
