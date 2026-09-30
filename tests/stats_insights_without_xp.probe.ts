import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'stats_insights_client.ts'), 'utf8');
assert.equal(/\b(?:xp7|totalXp)\b/.test(source), false);
assert.equal(/\bXP\b/.test(source.slice(source.indexOf('export function buildLocalStatsInsights'))), false);
assert.equal(source.includes("'percentiles'"), false);
assert.equal(source.includes('briefing.rhythm.minutes7'), true);
assert.equal(source.includes("key === 'rhythm' && /\\bXP\\b/i.test(clean)"), true,
  'legacy cached rhythm notes containing XP must be hidden');
