import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
const metrics = source.slice(
  source.indexOf('function buildLearningCoachMetrics('),
  source.indexOf('function rollingAvg3Series('),
);

assert.ok(metrics.length > 0, 'weekly metrics builder must exist');
const xpDependencies = metrics.match(/\bxp7\b|\btodayXp\b|\bvolumePart\b|\bpoints\b/gi) ?? [];
assert.equal(xpDependencies.length, 0, `XP dependencies remain: ${[...new Set(xpDependencies)].join(', ')}`);
assert.equal(metrics.includes('const focusPart = clampNumber(minutes7 / 60, 0, 1) * 35;'), true);
