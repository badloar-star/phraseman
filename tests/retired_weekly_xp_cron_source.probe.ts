import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
for (const file of ['functions/src/reset_weekly_xp.ts', 'functions/src/reset_weekly_xp.test.ts']) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `${file} must be retired with XP`);
}
const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
const reminders = fs.readFileSync(path.join(root, 'functions', 'src', 're_engage_push.ts'), 'utf8');
assert.equal(index.includes('resetWeeklyXpCron'), false, 'Retired cron must not be exported');
assert.equal(reminders.includes('reset_weekly_xp.ts'), false, 'Notifications must not cite the retired XP cron');
assert.equal(reminders.includes('runReEngagePush'), true, 'Notification job must remain');
