import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'review_utils.ts'), 'utf8');
const start = source.indexOf('export const getReviewActiveDays = async');
const end = source.indexOf('/** Вызывать когда пользователь нажал', start);
assert.ok(start >= 0 && end > start);
const counter = source.slice(start, end);
assert.equal(counter.includes('daily_stats'), false, 'review prompt must not depend on XP history');
assert.equal(counter.includes('getForegroundDailyMsMap()'), true);
assert.equal(counter.includes('>= 60_000'), true);
