import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lifetime_profile_stats.ts'), 'utf8');

assert.equal(source.includes('extractPoints'), false);
assert.equal(source.includes("AsyncStorage.getItem('daily_stats')"), false);
assert.equal(source.includes('ms >= MIN_ACTIVE_MS'), true);
