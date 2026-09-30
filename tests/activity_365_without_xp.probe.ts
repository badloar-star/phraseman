import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'activity_365_analytics.ts'), 'utf8');

assert.equal(/\b(?:xp|totalXp|statsMap|extractPoints|xpsInWindow)\b/i.test(source), false,
  'annual activity must not keep XP fields or read the legacy XP archive');
assert.equal(source.includes("'daily_stats'"), false);
assert.equal(source.includes("if (filter === 'all') return day.minutes"), true);
assert.equal(source.includes('ms >= MIN_ACTIVE_MS || metricSum > 0'), true);
