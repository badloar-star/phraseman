import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'report_replies.ts'), 'utf8');

for (const retiredField of ['getLevelFromXP', 'userXP', 'user_level', 'gameLevel', 'leagueCrownCount', 'leagueCrownExpiresAt']) {
  assert.equal(source.includes(retiredField), false, `Retired XP/league projection remains: ${retiredField}`);
}
assert.equal(source.includes('HELPFUL_REPORTS_CONFIRMED_KEY'), true, 'Confirmed report counter must remain');
assert.equal(source.includes('buildUserNotification'), true, 'Report notification must remain');
assert.equal(source.includes('profileCardLevel'), true, 'Independent profile-card level must remain');
