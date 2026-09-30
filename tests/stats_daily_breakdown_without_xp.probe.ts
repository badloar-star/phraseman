import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'stats_daily_breakdown.ts'), 'utf8');
const appDays = source.slice(source.indexOf("if (kind === 'app_days')"), source.indexOf('\n  let store: Store', source.indexOf("if (kind === 'app_days')")));

assert.ok(appDays.startsWith("if (kind === 'app_days')"));
assert.equal(source.includes('extractDailyPoints'), false, 'lifetime chart must not interpret XP points');
assert.equal(appDays.includes("'daily_stats'"), false, 'app days must not load the legacy XP archive');
assert.equal(appDays.includes('getForegroundDailyMsMap()'), true);
assert.equal(appDays.includes('ms >= MIN_ACTIVE_MS'), true);
